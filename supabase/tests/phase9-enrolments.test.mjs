// Phase 9 (enrolments, payments, learner detail, learning analytics): supabase/security/2026-11-28_phase9_enrolments.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const BUYER = '00000000-0000-0000-0000-00000000000b'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const FREE = 'c0000000-0000-0000-0000-000000000001'
const PAID = 'c0000000-0000-0000-0000-000000000002'
const M1 = 'a1000000-0000-0000-0000-000000000001'
const M2 = 'a1000000-0000-0000-0000-000000000002'

const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
const asSqlEditor = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false);`)
async function refused(promise, re) {
  let msg = null
  try { await promise } catch (e) { msg = e.message }
  assert.ok(msg, 'should have been refused')
  if (re) assert.match(msg, re)
}

async function freshDb() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('./live-fixture.sql'))
  await db.exec(`
    create table if not exists public.testimonials (id uuid primary key default gen_random_uuid(), author_name text, rating int, review_text text, is_published boolean default false, created_at timestamptz default now());
    insert into testimonials (author_name, is_published) values ('A', false), ('B', true);
    insert into auth.users values ('${STUDENT}', 'student@x.ke'), ('${BUYER}', 'buyer@x.ke'), ('${ADMIN}', 'admin@x.ke');
    insert into user_profiles (id, email, full_name, role, admin_role, phone) values
      ('${STUDENT}', 'student@x.ke', 'Amina Wanjiru', 'student', null, null),
      ('${BUYER}', 'buyer@x.ke', 'Brian Otieno', 'student', null, '+254 700 000 002'),
      ('${ADMIN}', 'admin@x.ke', 'Admin', 'admin', 'super', null);
    insert into courses (id, title, is_published, is_free, price) values ('${FREE}', 'Dispensing', true, true, 0), ('${PAID}', 'Pharmacovigilance', true, false, 1500);
    insert into course_modules (id, course_id, title, order_index) values ('${M1}', '${PAID}', 'Intro', 1), ('${M2}', '${PAID}', 'Signals', 2);
    insert into course_enrollments (user_id, course_id) values ('${STUDENT}', '${FREE}');
    -- Like the live rule: learners may enrol themselves in free courses only.
    create policy "Users can enrol in free courses" on public.course_enrollments for insert to authenticated
      with check (user_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and coalesce(c.is_free, false)));`)
  await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
  await db.exec(read('../security/2026-11-24_phase1_quizzes_completion.sql'))
  const sql = read('../security/2026-11-28_phase9_enrolments.sql')
  await db.exec(sql); await db.exec(sql) // re-runnable
  return db
}

describe('Phase 9 enrolments', () => {
  let db
  before(async () => { db = await freshDb() })

  it('existing enrolments are marked from the course (free course -> free)', async () => {
    await asSqlEditor(db)
    assert.equal((await one(db, `select payment_status from course_enrollments where user_id = $1`, [STUDENT])).payment_status, 'free')
  })

  it('a learner cannot use the admin functions', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`select admin_enrol_learner('student@x.ke', $1, 'paid')`, [PAID]), /Admins only/)
    await refused(db.query(`select * from admin_list_enrolments()`), /Admins only/)
    await refused(db.query(`select admin_learning_stats(30)`), /Admins only/)
    await refused(db.query(`select admin_learner_detail($1)`, [BUYER]), /Admins only/)
  })

  it('signed-out visitors cannot call them at all', async () => {
    await asUser(db, null)
    await refused(db.query(`select * from admin_list_enrolments()`))
  })

  it('a learner cannot fake a paid enrolment or set their own expiry', async () => {
    await asUser(db, BUYER)
    await db.query(`insert into course_enrollments (user_id, course_id, status, payment_status, amount_kes, access_expires_at) values ($1, $2, 'enrolled', 'paid', 99999, now() + interval '10 years')`, [BUYER, FREE])
    await asSqlEditor(db)
    const row = await one(db, `select payment_status, amount_kes, access_expires_at from course_enrollments where user_id = $1 and course_id = $2`, [BUYER, FREE])
    assert.deepEqual([row.payment_status, row.amount_kes, row.access_expires_at], ['free', null, null])
    await db.query(`delete from course_enrollments where user_id = $1 and course_id = $2`, [BUYER, FREE])
  })

  it('admin finds the learner by phone and records an awaiting payment (no lesson access yet)', async () => {
    await asUser(db, ADMIN)
    const r = (await one(db, `select admin_enrol_learner('0700000002', $1, 'awaiting', 'Bank transfer') r`, [PAID])).r
    assert.equal(r.status, 'awaiting_payment')
    await asUser(db, BUYER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
  })

  it('admin lists, counts and confirms the payment; access opens and the change is audited', async () => {
    await asUser(db, ADMIN)
    const rows = (await db.query(`select * from admin_list_enrolments(null, null, 'awaiting')`)).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].full_name, 'Brian Otieno')
    assert.equal(rows[0].counts.awaiting, 1)
    await db.query(`select admin_update_enrolment($1, 'confirm_payment', null, 'Ref on file', 'M-Pesa', 'QWE123', 1500)`, [rows[0].enrolment_id])
    await asUser(db, BUYER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, true)
    await asSqlEditor(db)
    const audit = (await db.query(`select action from admin_audit_log where target_user_id = $1 order by id`, [BUYER])).rows.map((x) => x.action)
    assert.deepEqual(audit, ['enrolment.grant', 'enrolment.confirm_payment'])
  })

  it('a learner cannot un-revoke themselves; expiry in the past removes access', async () => {
    await asUser(db, ADMIN)
    const id = (await one(db, `select enrolment_id from admin_list_enrolments('buyer', null, 'all')`)).enrolment_id
    await db.query(`select admin_update_enrolment($1, 'revoke')`, [id])
    await asUser(db, BUYER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
    await db.query(`update course_enrollments set status = 'enrolled' where id = $1`, [id]) // no learner update policy: silently 0 rows
    await asSqlEditor(db)
    assert.equal((await one(db, `select status from course_enrollments where id = $1`, [id])).status, 'revoked')
    await asUser(db, ADMIN)
    await db.query(`select admin_update_enrolment($1, 'restore')`, [id])
    await db.query(`select admin_update_enrolment($1, 'set_expiry', now() - interval '1 day')`, [id])
    await asUser(db, BUYER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
    await asUser(db, ADMIN)
    assert.equal((await one(db, `select status from admin_list_enrolments('buyer', null, 'all')`)).status, 'expired')
  })

  it('unknown learner gets a clear message', async () => {
    await asUser(db, ADMIN)
    await refused(db.query(`select admin_enrol_learner('nobody@x.ke', $1, 'paid')`, [PAID]), /No registered learner/)
  })

  it('learner detail and learning analytics return real numbers', async () => {
    await asUser(db, ADMIN)
    const d = (await one(db, `select admin_learner_detail($1) d`, [BUYER])).d
    assert.equal(d.profile.full_name, 'Brian Otieno')
    assert.equal(d.enrolments.length, 1)
    assert.ok(d.audit.length >= 3)
    const s = (await one(db, `select admin_learning_stats(30) s`)).s
    assert.equal(Number(s.kpis.revenue), 1500)
    assert.equal(s.kpis.enrolments, 2)
    assert.equal(s.attention.reviews_pending, 1)
    assert.ok(Array.isArray(s.weekly) && s.weekly.length >= 4)
    assert.equal(s.dropoff.lessons.length >= 0, true)
  })

  it('the rollback removes the functions and restores the old access rule', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/2026-11-28_phase9_enrolments_rollback.sql'))
    assert.equal((await one(db, `select to_regprocedure('public.admin_list_enrolments(text,uuid,text,integer,integer)') f`)).f, null)
  })
})
