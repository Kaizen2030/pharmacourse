// Phase 2 (roles): supabase/security/2026-11-23_phase2_roles.sql
// Each test tries to break the rule the way a user could from the browser console.
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const OTHER = '00000000-0000-0000-0000-00000000000b'
const CONTENT = '00000000-0000-0000-0000-0000000000c0'
const SUPER = '00000000-0000-0000-0000-0000000000f0'
const TUTOR = '00000000-0000-0000-0000-0000000000d0'

const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
// A website request: signed token with role 'authenticated' (or 'anon' when signed out).
const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
// The Supabase SQL editor: no token.
const asSqlEditor = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false);`)
async function refused(promise, re) {
  let msg = null
  try { await promise } catch (e) { msg = e.message }
  assert.ok(msg, 'should have been refused')
  if (re) assert.match(msg, re)
}
const roleOf = async (db, id) => { await asSqlEditor(db); return one(db, `select role, admin_role from user_profiles where id = $1`, [id]) }

async function freshDb({ withFix }) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('./live-fixture.sql'))
  await db.exec(`
    insert into auth.users values ('${STUDENT}', 'student@x.ke'), ('${OTHER}', 'other@x.ke'), ('${CONTENT}', 'content@x.ke'), ('${SUPER}', 'super@x.ke'), ('${TUTOR}', 'tutor@x.ke');
    insert into user_profiles (id, email, full_name, role, admin_role) values
      ('${STUDENT}', 'student@x.ke', 'Sam', 'student', null), ('${OTHER}', 'other@x.ke', 'Olive', 'student', null),
      ('${CONTENT}', 'content@x.ke', 'Cara', 'admin', 'content'), ('${SUPER}', 'super@x.ke', 'Sue', 'admin', 'super'),
      ('${TUTOR}', 'tutor@x.ke', 'Tom', 'student', null);
    insert into instructors (id, name, linked_user_id) values ('11111111-0000-0000-0000-000000000001', 'Tom T', '${TUTOR}');`)
  if (withFix) {
    const sql = read('../security/2026-11-23_phase2_roles.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  }
  return db
}

describe('Phase 2 roles: the hole exists today', () => {
  it('a student promotes themselves to admin from the console (live behaviour)', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, STUDENT)
    await db.query(`update user_profiles set role = 'admin', admin_role = 'super' where id = $1`, [STUDENT])
    assert.deepEqual(await roleOf(db, STUDENT), { role: 'admin', admin_role: 'super' })
  })

  it('a student creates an instructor profile and publishes a course (live behaviour)', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, STUDENT)
    await db.query(`insert into instructors (id, name) values ($1, 'Fake tutor')`, [STUDENT])
    await db.query(`insert into courses (title, instructor_id, is_published) values ('Spam course', $1, true)`, [STUDENT])
    await asUser(db, null)
    assert.equal((await db.query(`select title from courses`)).rows[0].title, 'Spam course')
  })
})

describe('Phase 2 roles: after the fix', () => {
  let db
  before(async () => { db = await freshDb({ withFix: true }) })

  it('a student cannot promote themselves', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`update user_profiles set role = 'admin' where id = $1`, [STUDENT]), /Only a super admin can change roles/)
    await refused(db.query(`update user_profiles set admin_role = 'super' where id = $1`, [STUDENT]), /Only a super admin/)
    await refused(db.query(`select admin_set_role($1, 'super')`, [STUDENT]), /Only a super admin/)
    assert.deepEqual(await roleOf(db, STUDENT), { role: 'student', admin_role: null })
  })

  it('a student can still edit their own name, professional ID and WhatsApp settings', async () => {
    await asUser(db, STUDENT)
    await db.query(`update user_profiles set full_name = 'Sam K', professional_id = 'PPB-1', whatsapp_number = '254700000000', whatsapp_opted_in = true where id = $1`, [STUDENT])
    assert.equal((await one(db, `select full_name from user_profiles where id = $1`, [STUDENT])).full_name, 'Sam K')
  })

  it('a student cannot change their email or organisation', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`update user_profiles set email = 'boss@x.ke' where id = $1`, [STUDENT]), /cannot be changed/)
  })

  it('a self-created profile always starts as a student with the sign-in email', async () => {
    await asSqlEditor(db)
    const NEW = '00000000-0000-0000-0000-0000000000e1'
    await db.query(`insert into auth.users values ($1, 'new@x.ke')`, [NEW])
    await asUser(db, NEW)
    await db.query(`insert into user_profiles (id, email, role, admin_role) values ($1, 'fake@x.ke', 'admin', 'super')`, [NEW])
    await asSqlEditor(db)
    assert.deepEqual(await one(db, `select email, role, admin_role from user_profiles where id = $1`, [NEW]), { email: 'new@x.ke', role: 'student', admin_role: null })
  })

  it('a content admin cannot change roles or edit other people\'s profiles', async () => {
    await asUser(db, CONTENT)
    await refused(db.query(`select admin_set_role($1, 'super')`, [OTHER]), /Only a super admin/)
    await refused(db.query(`update user_profiles set role = 'admin', admin_role = 'super' where id = $1`, [CONTENT]), /Only a super admin/)
    const res = await db.query(`update user_profiles set full_name = 'hacked' where id = $1`, [OTHER])
    assert.equal(res.affectedRows, 0)
    assert.deepEqual(await roleOf(db, OTHER), { role: 'student', admin_role: null })
  })

  it('a super admin changes roles through admin_set_role, and every change is audited', async () => {
    await asUser(db, SUPER)
    await db.query(`select admin_set_role($1, 'content')`, [OTHER])
    assert.deepEqual(await roleOf(db, OTHER), { role: 'admin', admin_role: 'content' })
    await asUser(db, SUPER)
    await db.query(`select admin_set_role($1, 'student')`, [OTHER])
    assert.deepEqual(await roleOf(db, OTHER), { role: 'student', admin_role: null })
    await asUser(db, SUPER)
    const log = (await db.query(`select actor_email, action, target_user_id, old_value, new_value from admin_audit_log order by id`)).rows
    assert.equal(log.length, 2)
    assert.equal(log[0].actor_email, 'super@x.ke')
    assert.deepEqual(log[0].new_value, { role: 'admin', admin_role: 'content' })
    await asUser(db, CONTENT)
    assert.equal((await db.query(`select id from admin_audit_log`)).rows.length, 0, 'only super admins read the log')
    await refused(db.query(`insert into admin_audit_log (action) values ('forged')`), /permission denied/)
  })

  it('a super admin cannot change their own level (so they cannot lock themselves out) or set an unknown level', async () => {
    await asUser(db, SUPER)
    await refused(db.query(`select admin_set_role($1, 'student')`, [SUPER]), /your own access level/)
    await refused(db.query(`select admin_set_role($1, 'boss')`, [OTHER]), /Unknown access level/)
    assert.deepEqual(await roleOf(db, SUPER), { role: 'admin', admin_role: 'super' })
  })

  it('the SQL editor can always fix roles (no lock-out)', async () => {
    await asSqlEditor(db)
    await db.query(`update user_profiles set role = 'admin', admin_role = 'content' where id = $1`, [TUTOR])
    assert.deepEqual(await roleOf(db, TUTOR), { role: 'admin', admin_role: 'content' })
    await db.query(`update user_profiles set role = 'student', admin_role = null where id = $1`, [TUTOR])
  })

  it('a student cannot create an instructor profile, a course or a module', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`insert into instructors (id, name) values ($1, 'Fake tutor')`, [STUDENT]), /row-level security/)
    await refused(db.query(`insert into courses (title, instructor_id, is_published) values ('Spam', $1, true)`, [STUDENT]), /row-level security/)
    await asSqlEditor(db)
    const course = (await one(db, `insert into courses (title, is_published) values ('Real', true) returning id`)).id
    await asUser(db, STUDENT)
    await refused(db.query(`insert into course_modules (course_id, title) values ($1, 'x')`, [course]), /row-level security/)
  })

  it('a linked tutor can still update their own instructor profile; admins still manage courses', async () => {
    await asUser(db, TUTOR)
    const res = await db.query(`update instructors set bio = 'Pharmacist, 10 years' where linked_user_id = $1`, [TUTOR])
    assert.equal(res.affectedRows, 1)
    await asUser(db, CONTENT)
    await db.query(`insert into courses (title, is_published) values ('By content admin', true)`)
  })

  it('signed-out visitors have no privileges on simulation responses', async () => {
    await asUser(db, null)
    await refused(db.query(`select * from simulation_responses`), /permission denied/)
    await refused(db.query(`insert into simulation_responses (answers) values ('{}')`), /permission denied/)
  })

  it('the rollback script restores today\'s behaviour (and can be re-fixed)', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/rollback-emergency-only/2026-11-23_phase2_roles_rollback.sql'))
    await asUser(db, STUDENT)
    await db.query(`update user_profiles set role = 'admin' where id = $1`, [STUDENT])
    assert.equal((await roleOf(db, STUDENT)).role, 'admin')
    await asSqlEditor(db)
    await db.query(`update user_profiles set role = 'student' where id = $1`, [STUDENT])
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    await asUser(db, STUDENT)
    await refused(db.query(`update user_profiles set role = 'admin' where id = $1`, [STUDENT]), /Only a super admin/)
  })
})
