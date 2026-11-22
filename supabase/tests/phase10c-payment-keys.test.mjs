// Phase 10c (payment keys in Vault): supabase/security/2026-12-03_phase10c_payment_keys_vault.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const SUPER = '00000000-0000-0000-0000-0000000000f0'
const CONTENT = '00000000-0000-0000-0000-0000000000c0'
const LEARNER = '00000000-0000-0000-0000-00000000000a'
const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
const asServer = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', 'service_role', false); set role service_role;`)
async function refused(promise, re) {
  let msg = null
  try { await promise } catch (e) { msg = e.message }
  assert.ok(msg, 'should have been refused')
  if (re) assert.match(msg, re)
}

describe('Phase 10c payment keys', () => {
  let db
  before(async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(read('./live-fixture.sql'))
    // Stand-in for Supabase Vault (same function names; real Vault encrypts the value).
    await db.exec(`
      create schema vault;
      create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
      create function vault.create_secret(new_secret text, new_name text, new_description text default '') returns uuid language sql as
        $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
      create function vault.update_secret(secret_id uuid, new_secret text) returns void language sql as $$ update vault.secrets set secret = new_secret where id = secret_id $$;
      create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
      revoke all on schema vault from public;
      create table if not exists public.testimonials (id uuid primary key default gen_random_uuid(), is_published boolean default false);
      insert into auth.users values ('${SUPER}', 's@x.ke'), ('${CONTENT}', 'c@x.ke'), ('${LEARNER}', 'l@x.ke');
      insert into user_profiles (id, email, role, admin_role) values ('${SUPER}', 's@x.ke', 'admin', 'super'), ('${CONTENT}', 'c@x.ke', 'admin', 'content'), ('${LEARNER}', 'l@x.ke', 'student', null);
      insert into courses (title, is_published) values ('x', true);`)
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    await db.exec(read('../security/2026-11-24_phase1_quizzes_completion.sql'))
    await db.exec(read('../security/2026-11-28_phase9_enrolments.sql'))
    await db.exec(read('../security/2026-11-29_phase10_payments.sql'))
    const sql = read('../security/2026-12-03_phase10c_payment_keys_vault.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  })

  it('a super admin saves keys; the page only gets a hint, never the value', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_set_payment_keys('mpesa_stk', '{"env":"sandbox","consumer_key":"CK_abcd1234","consumer_secret":"CS_secret9876","shortcode":"174379","passkey":"PK_longpasskey5555","transaction_type":"CustomerPayBillOnline"}')`)
    const rows = (await db.query(`select name, hint from payment_secret_status where provider = 'mpesa_stk' order by name`)).rows
    const hints = Object.fromEntries(rows.map((r) => [r.name, r.hint]))
    assert.equal(hints.consumer_secret, '••••9876')
    assert.equal(hints.shortcode, '174379')
    assert.equal(hints.callback_token, 'generated')
    assert.ok(!JSON.stringify(rows).includes('CS_secret9876'))
  })

  it('nobody on the website can read the keys back', async () => {
    for (const who of [SUPER, CONTENT, LEARNER, null]) {
      await asUser(db, who)
      await refused(db.query(`select get_payment_config('mpesa_stk')`), /permission denied|Not allowed/)
      await refused(db.query(`select * from vault.decrypted_secrets`), /permission denied/)
    }
  })

  it('only a super admin can save or clear keys; bad values are rejected', async () => {
    await asUser(db, CONTENT)
    await refused(db.query(`select admin_set_payment_keys('paystack', '{"secret_key":"sk_test_x"}')`), /super admin/)
    await asUser(db, LEARNER)
    await refused(db.query(`select admin_clear_payment_keys('mpesa_stk')`), /super admin/)
    await asUser(db, SUPER)
    await refused(db.query(`select admin_set_payment_keys('paystack', '{"secret_key":"not-a-key"}')`), /sk_test_/)
    await refused(db.query(`select admin_set_payment_keys('mpesa_stk', '{"callback_token":"mine"}')`), /Unknown key/)
    await refused(db.query(`select admin_set_payment_keys('mpesa_stk', '{"shortcode":"12"}')`), /5 to 7 digit/)
  })

  it('the payment server (server key) reads the decrypted config', async () => {
    await asServer(db)
    const cfg = (await one(db, `select get_payment_config('mpesa_stk') c`)).c
    assert.equal(cfg.consumer_secret, 'CS_secret9876')
    assert.equal(cfg.shortcode, '174379')
    assert.match(cfg.callback_token, /^[0-9a-f]{64}$/)
  })

  it('updating one key keeps the others; clearing removes them and switches the method off', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_set_payment_keys('mpesa_stk', '{"passkey":"PK_new_1111"}')`)
    await asServer(db)
    const cfg = (await one(db, `select get_payment_config('mpesa_stk') c`)).c
    assert.deepEqual([cfg.passkey, cfg.consumer_key], ['PK_new_1111', 'CK_abcd1234'])
    await asUser(db, SUPER)
    await db.query(`select admin_clear_payment_keys('mpesa_stk')`)
    await asServer(db)
    assert.deepEqual((await one(db, `select get_payment_config('mpesa_stk') c`)).c, {})
  })
})
