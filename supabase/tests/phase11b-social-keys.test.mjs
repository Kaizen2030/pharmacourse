// Phase 11b (auto-posting key in Vault): supabase/security/2026-12-04_phase11b_social_keys_vault.sql
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

describe('Phase 11b social keys', () => {
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
      insert into auth.users values ('${SUPER}', 's@x.ke'), ('${CONTENT}', 'c@x.ke'), ('${LEARNER}', 'l@x.ke');
      insert into user_profiles (id, email, role, admin_role) values ('${SUPER}', 's@x.ke', 'admin', 'super'), ('${CONTENT}', 'c@x.ke', 'admin', 'content'), ('${LEARNER}', 'l@x.ke', 'student', null);`)
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    await db.exec(read('../security/2026-11-30_phase11_social.sql'))
    const sql = read('../security/2026-12-04_phase11b_social_keys_vault.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  })

  it('creates the scheduler token once, on its own', async () => {
    await asServer(db)
    const cfg = (await one(db, `select get_social_config() c`)).c
    assert.match(cfg.cron_token, /^[0-9a-f]{64}$/)
    await db.exec('reset role')
    assert.equal((await one(db, `select count(*)::int n from vault.secrets where name = 'sc_cron_token'`)).n, 1)
  })

  it('a super admin pastes the Ayrshare key; the page only sees a hint', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_set_social_keys('{"ayrshare_api_key":"AB12CD34-EF56GH78-IJ90KL12-wxyz"}')`)
    const rows = (await db.query(`select name, hint from social_secret_status order by name`)).rows
    const hints = Object.fromEntries(rows.map((r) => [r.name, r.hint]))
    assert.equal(hints.ayrshare_api_key, '••••wxyz')
    assert.ok(!JSON.stringify(rows).includes('AB12CD34'))
  })

  it('a webhook link gets a signing secret automatically', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_set_social_keys('{"webhook_url":"https://hook.eu1.make.com/abc123def456"}')`)
    const hints = Object.fromEntries((await db.query(`select name, hint from social_secret_status`)).rows.map((r) => [r.name, r.hint]))
    assert.equal(hints.webhook_url, 'hook.eu1.make.com/••••f456')
    assert.equal(hints.webhook_secret, 'generated')
    await asServer(db)
    const cfg = (await one(db, `select get_social_config() c`)).c
    assert.equal(cfg.webhook_url, 'https://hook.eu1.make.com/abc123def456')
    assert.equal(cfg.ayrshare_api_key, 'AB12CD34-EF56GH78-IJ90KL12-wxyz')
    assert.ok(cfg.webhook_secret.length >= 16)
  })

  it('nobody on the website can read the keys back', async () => {
    for (const who of [SUPER, CONTENT, LEARNER, null]) {
      await asUser(db, who)
      await refused(db.query(`select get_social_config()`), /permission denied|Not allowed/)
      await refused(db.query(`select * from vault.decrypted_secrets`), /permission denied/)
    }
    await asUser(db, LEARNER)
    assert.equal((await db.query(`select * from social_secret_status`)).rows.length, 0)
  })

  it('only a super admin can save or remove; bad values are rejected', async () => {
    await asUser(db, CONTENT)
    await refused(db.query(`select admin_set_social_keys('{"ayrshare_api_key":"AAAAAAAAAAAAAAAAAAAA"}')`), /super admin/)
    await asUser(db, LEARNER)
    await refused(db.query(`select admin_clear_social_keys('ayrshare')`), /super admin/)
    await asUser(db, SUPER)
    await refused(db.query(`select admin_set_social_keys('{"webhook_url":"http://insecure.example/x"}')`), /https/)
    await refused(db.query(`select admin_set_social_keys('{"cron_token":"mine"}')`), /Unknown key/)
    await refused(db.query(`select admin_set_social_keys('{"ayrshare_api_key":"short"}')`), /Ayrshare/)
  })

  it('disconnecting removes only that service', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_clear_social_keys('webhook')`)
    await asServer(db)
    const cfg = (await one(db, `select get_social_config() c`)).c
    assert.equal(cfg.webhook_url, undefined)
    assert.equal(cfg.webhook_secret, undefined)
    assert.ok(cfg.ayrshare_api_key && cfg.cron_token)
  })

  it('the rollback runs cleanly, twice', async () => {
    await db.exec('reset role')
    const rb = read('../security/rollback-emergency-only/2026-12-04_phase11b_social_keys_vault_rollback.sql')
    await db.exec(rb); await db.exec(rb)
    assert.equal((await one(db, `select count(*)::int n from vault.secrets where name like 'sc\\_%' escape '\\'`)).n, 0)
  })
})
