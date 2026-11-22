// Phase 5 (admin two-step verification): supabase/security/2026-11-27_phase5_admin_mfa.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const SUPER = '00000000-0000-0000-0000-0000000000f0'
const CONTENT = '00000000-0000-0000-0000-0000000000c0'
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
// aal: 'aal1' = password only, 'aal2' = password + authenticator code.
const asUser = (db, id, aal = 'aal1') => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id}', false);
  select set_config('request.jwt.claim.role', 'authenticated', false); select set_config('request.jwt.claim.aal', '${aal}', false); set role authenticated;`)
const asSqlEditor = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false); select set_config('request.jwt.claim.aal', '', false);`)
async function refused(promise, re) {
  let msg = null
  try { await promise } catch (e) { msg = e.message }
  assert.ok(msg, 'should have been refused')
  if (re) assert.match(msg, re)
}

async function freshDb({ withFix }) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('./live-fixture.sql'))
  await db.exec(`
    insert into auth.users values ('${SUPER}', 'super@x.ke'), ('${CONTENT}', 'content@x.ke'), ('${STUDENT}', 'student@x.ke');
    insert into user_profiles (id, email, role, admin_role) values ('${SUPER}', 'super@x.ke', 'admin', 'super'),
      ('${CONTENT}', 'content@x.ke', 'admin', 'content'), ('${STUDENT}', 'student@x.ke', 'student', null);
    insert into auth.mfa_factors (user_id, status) values ('${SUPER}', 'verified');
    insert into courses (title, is_published) values ('Draft course', false);`)
  await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
  if (withFix) {
    const sql = read('../security/2026-11-27_phase5_admin_mfa.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  }
  return db
}

describe('Phase 5 admin MFA: the gap today', () => {
  it('an admin password alone (no authenticator code) gives full admin powers', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, SUPER, 'aal1')
    assert.equal((await one(db, `select is_admin() a`)).a, true)
    assert.equal((await db.query(`select id from courses where is_published = false`)).rows.length, 1)
  })
})

describe('Phase 5 admin MFA: after the fix', () => {
  let db
  before(async () => { db = await freshDb({ withFix: true }) })

  it('the readiness check lists admins and whether they set up an authenticator', async () => {
    await asSqlEditor(db)
    const step1 = read('../security/2026-11-27_phase5_admin_mfa.sql').split('-- STEP 2')[0]
    const rows = (await db.query(step1.slice(step1.indexOf('select up.email')))).rows
    assert.deepEqual(rows.map((r) => [r.email, r.has_authenticator]), [['content@x.ke', false], ['super@x.ke', true]])
  })

  it('a password-only session has no admin powers', async () => {
    await asUser(db, SUPER, 'aal1')
    assert.equal((await one(db, `select is_admin() a, is_super_admin() s`)).a, false)
    assert.equal((await db.query(`select id from courses where is_published = false`)).rows.length, 0, 'unpublished courses stay hidden')
    await refused(db.query(`select admin_set_role($1, 'super')`, [STUDENT]), /Only a super admin/)
  })

  it('the same admin after entering the authenticator code has full powers', async () => {
    await asUser(db, SUPER, 'aal2')
    assert.deepEqual(await one(db, `select is_admin() a, is_super_admin() s`), { a: true, s: true })
    assert.equal((await db.query(`select id from courses where is_published = false`)).rows.length, 1)
    await db.query(`select admin_set_role($1, 'content')`, [STUDENT])
  })

  it('a student with a verified session is still just a student', async () => {
    await asUser(db, STUDENT, 'aal2')
    assert.equal((await one(db, `select is_super_admin() s`)).s, false)
  })

  it('the SQL editor can always fix things (no lock-out)', async () => {
    await asSqlEditor(db)
    await db.query(`update user_profiles set role = 'student', admin_role = null where id = $1`, [STUDENT])
    assert.equal((await one(db, `select role from user_profiles where id = $1`, [STUDENT])).role, 'student')
  })

  it('the rollback script restores password-only admin access', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/2026-11-27_phase5_admin_mfa_rollback.sql'))
    await asUser(db, SUPER, 'aal1')
    assert.equal((await one(db, `select is_admin() a`)).a, true)
  })
})
