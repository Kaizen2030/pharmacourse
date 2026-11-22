// Phase 12 (tutor studio): supabase/security/2026-12-02_phase12_tutor_studio.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const TUTOR_A = '00000000-0000-0000-0000-0000000000a1'
const TUTOR_B = '00000000-0000-0000-0000-0000000000b1'
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const INS_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const INS_B = 'bbbbbbbb-0000-0000-0000-000000000001'
const COURSE_B = 'c0000000-0000-0000-0000-0000000000b1'
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

describe('Phase 12 tutor studio', () => {
  let db
  let courseA
  before(async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(read('./live-fixture.sql'))
    await db.exec(`
      create table if not exists public.testimonials (id uuid primary key default gen_random_uuid(), is_published boolean default false);
      alter table public.courses add column if not exists slug text;
      insert into auth.users values ('${TUTOR_A}', 'a@x.ke'), ('${TUTOR_B}', 'b@x.ke'), ('${STUDENT}', 's@x.ke'), ('${ADMIN}', 'admin@x.ke');
      insert into user_profiles (id, email, full_name, role, admin_role) values ('${TUTOR_A}', 'a@x.ke', 'Tutor A', 'student', null),
        ('${TUTOR_B}', 'b@x.ke', 'Tutor B', 'student', null), ('${STUDENT}', 's@x.ke', 'Amina W', 'student', null), ('${ADMIN}', 'admin@x.ke', 'Admin', 'admin', 'super');
      insert into instructors (id, name, linked_user_id) values ('${INS_A}', 'Tutor A', '${TUTOR_A}'), ('${INS_B}', 'Tutor B', '${TUTOR_B}');
      insert into courses (id, title, instructor_id, is_published, price, is_free) values ('${COURSE_B}', 'B course', '${INS_B}', true, 1500, false);`)
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    await db.exec(read('../security/2026-11-24_phase1_quizzes_completion.sql'))
    await db.exec(read('../security/2026-11-25_phase3_content.sql'))
    await db.exec(read('../security/2026-11-28_phase9_enrolments.sql'))
    const sql = read('../security/2026-12-02_phase12_tutor_studio.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  })

  it('a tutor creates a course: always a draft, always their own', async () => {
    await asUser(db, TUTOR_A)
    const r = await one(db, `insert into courses (title, instructor_id, is_published, price, is_free) values ('My course', $1, true, 999, false) returning id, instructor_id, is_published, review_status`, [INS_B])
    courseA = r.id
    assert.equal(r.instructor_id, INS_A, 'owner is forced to the creator')
    assert.equal(r.is_published, false)
    assert.equal(r.review_status, 'draft')
  })

  it('a learner (not a tutor) cannot create courses', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`insert into courses (title) values ('Spam')`))
  })

  it('a tutor cannot see, edit or add lessons to another tutor\'s course', async () => {
    await asUser(db, TUTOR_A)
    const titles = (await db.query(`select title from tutor_my_courses()`)).rows.map((r) => r.title)
    assert.deepEqual(titles, ['My course'])
    await db.query(`update courses set title = 'Hijacked' where id = $1`, [COURSE_B])
    await asSqlEditor(db)
    assert.equal((await one(db, `select title from courses where id = $1`, [COURSE_B])).title, 'B course')
    await asUser(db, TUTOR_A)
    await refused(db.query(`insert into course_modules (course_id, title, order_index) values ($1, 'Injected', 9)`, [COURSE_B]), /row-level security/)
    await refused(db.query(`select * from tutor_course_students($1)`, [COURSE_B]), /own courses/)
  })

  it('a tutor cannot publish, move the course, or approve it', async () => {
    await asUser(db, TUTOR_A)
    await refused(db.query(`update courses set is_published = true where id = $1`, [courseA]), /administrator after review/)
    await refused(db.query(`update courses set instructor_id = $2 where id = $1`, [courseA, INS_B]))
    await refused(db.query(`update courses set review_status = 'approved' where id = $1`, [courseA]), /Only an administrator/)
    await refused(db.query(`select admin_review_course($1, 'approve')`, [courseA]), /Admins only/)
  })

  it('a tutor builds lessons and quizzes on their own course, then submits it', async () => {
    await asUser(db, TUTOR_A)
    const m = await one(db, `insert into course_modules (course_id, title, order_index, duration_minutes) values ($1, 'Lesson 1', 1, 10) returning id`, [courseA])
    const q = await one(db, `insert into lesson_quizzes (lesson_id, title, passing_score) values ($1, 'Check', 70) returning id`, [m.id])
    await db.query(`insert into quiz_questions (quiz_id, question_text, options, correct_answer, order_index) values ($1, 'Q?', '[{"text":"A"},{"text":"B"}]', 'A', 1)`, [q.id])
    assert.equal((await one(db, `select count(*)::int n from quiz_questions where quiz_id = $1`, [q.id])).n, 1, 'tutor can read their own answer key')
    await db.query(`update courses set review_status = 'in_review' where id = $1`, [courseA])
    assert.equal((await one(db, `select review_status from courses where id = $1`, [courseA])).review_status, 'in_review')
  })

  it('admin approves; then the tutor cannot change the live price or delete lessons', async () => {
    await asUser(db, ADMIN)
    await db.query(`select admin_review_course($1, 'approve')`, [courseA])
    await asUser(db, TUTOR_A)
    assert.equal((await one(db, `select is_published from courses where id = $1`, [courseA])).is_published, true)
    await refused(db.query(`update courses set price = 1 where id = $1`, [courseA]), /price of a live course/)
    await db.query(`update courses set title = 'My course (updated)' where id = $1`, [courseA])
    await db.query(`delete from course_modules where course_id = $1`, [courseA])
    await asSqlEditor(db)
    assert.equal((await one(db, `select count(*)::int n from course_modules where course_id = $1`, [courseA])).n, 1, 'live lessons are not deleted')
    assert.equal((await one(db, `select title from courses where id = $1`, [courseA])).title, 'My course (updated)')
  })

  it('tutors see student names and progress, never emails', async () => {
    await asSqlEditor(db)
    await db.query(`insert into course_enrollments (user_id, course_id, status) values ($1, $2, 'enrolled')`, [STUDENT, courseA])
    await asUser(db, TUTOR_A)
    const rows = (await db.query(`select * from tutor_course_students($1)`, [courseA])).rows
    assert.equal(rows[0].learner, 'Amina W')
    assert.ok(!('email' in rows[0]))
  })

  it('admin requests changes with a note; the tutor cannot edit the note', async () => {
    await asUser(db, ADMIN)
    await refused(db.query(`select admin_review_course($1, 'request_changes')`, [courseA]), /what to change/)
    await db.query(`select admin_review_course($1, 'request_changes', 'Add a quiz to lesson 2')`, [courseA])
    await asUser(db, TUTOR_A)
    await db.query(`update courses set review_note = 'all good' where id = $1`, [courseA])
    const c = await one(db, `select review_status, review_note, is_published from courses where id = $1`, [courseA])
    assert.deepEqual([c.review_status, c.review_note, c.is_published], ['changes_requested', 'Add a quiz to lesson 2', false])
  })

  it('rollback removes tutor powers', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/rollback-emergency-only/2026-12-02_phase12_tutor_studio_rollback.sql'))
    assert.equal((await one(db, `select to_regprocedure('public.tutor_my_courses()') f`)).f, null)
  })
})
