// Phase 3 (paid content): supabase/security/2026-11-25_phase3_content.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const OUTSIDER = '00000000-0000-0000-0000-00000000000b'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const PAID = 'c0000000-0000-0000-0000-000000000001'
const DRAFT = 'c0000000-0000-0000-0000-000000000002'
const M1 = 'a1000000-0000-0000-0000-000000000001'

const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
const asSqlEditor = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false);`)
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
    insert into auth.users values ('${STUDENT}', 's@x.ke'), ('${OUTSIDER}', 'o@x.ke'), ('${ADMIN}', 'a@x.ke');
    insert into user_profiles (id, email, role, admin_role) values ('${STUDENT}', 's@x.ke', 'student', null),
      ('${OUTSIDER}', 'o@x.ke', 'student', null), ('${ADMIN}', 'a@x.ke', 'admin', 'super');
    insert into courses (id, title, is_published, is_free, price) values ('${PAID}', 'Paid course', true, false, 2500), ('${DRAFT}', 'Draft', false, true, 0);
    insert into course_modules (id, course_id, title, description, video_url, content, order_index, duration_minutes) values
      ('${M1}', '${PAID}', 'Lesson 1', 'Intro', 'https://cdn.example/paid-lesson.mp4', 'Paid notes', 1, 12),
      ('a1000000-0000-0000-0000-000000000009', '${DRAFT}', 'Draft lesson', null, 'https://cdn.example/draft.mp4', null, 1, 5);
    insert into lesson_attachments (lesson_id, title, file_url) values ('${M1}', 'Handout', 'https://cdn.example/handout.pdf');
    insert into course_enrollments (user_id, course_id, status) values ('${STUDENT}', '${PAID}', 'enrolled');`)
  if (withFix) {
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    await db.exec(read('../security/2026-11-24_phase1_quizzes_completion.sql'))
    const sql = read('../security/2026-11-25_phase3_content.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  }
  return db
}

describe('Phase 3: the hole exists today', () => {
  it('a signed-out visitor reads the paid video link and the handout', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, null)
    assert.equal((await db.query(`select video_url from course_modules where course_id = $1`, [PAID])).rows[0].video_url, 'https://cdn.example/paid-lesson.mp4')
    assert.equal((await db.query(`select file_url from lesson_attachments`)).rows.length, 1)
  })
})

describe('Phase 3: after the fix', () => {
  let db
  before(async () => { db = await freshDb({ withFix: true }) })

  it('signed-out visitors cannot read lessons or attachments at all', async () => {
    await asUser(db, null)
    await refused(db.query(`select video_url from course_modules`), /permission denied/)
    await refused(db.query(`select file_url from lesson_attachments`), /permission denied/)
  })

  it('the public outline shows title, description, order and duration of published courses only', async () => {
    await asUser(db, null)
    const rows = (await db.query(`select * from course_outline`)).rows
    assert.equal(rows.length, 1, 'draft course modules are not listed')
    assert.deepEqual(Object.keys(rows[0]).sort(), ['course_id', 'description', 'duration_minutes', 'id', 'order_index', 'title'])
    assert.equal(rows[0].title, 'Lesson 1')
    await refused(db.query(`select video_url from course_outline`), /does not exist/)
  })

  it('a signed-in user who is not enrolled sees no lesson rows or attachments', async () => {
    await asUser(db, OUTSIDER)
    assert.equal((await db.query(`select video_url from course_modules`)).rows.length, 0)
    assert.equal((await db.query(`select file_url from lesson_attachments`)).rows.length, 0)
  })

  it('an enrolled student still opens the lesson and its handout', async () => {
    await asUser(db, STUDENT)
    assert.equal((await db.query(`select video_url from course_modules where course_id = $1`, [PAID])).rows[0].video_url, 'https://cdn.example/paid-lesson.mp4')
    assert.equal((await db.query(`select file_url from lesson_attachments`)).rows.length, 1)
  })

  it('a pending (unpaid) enrolment does not unlock lessons', async () => {
    await asSqlEditor(db)
    await db.query(`update course_enrollments set status = 'pending' where user_id = $1`, [STUDENT])
    await asUser(db, STUDENT)
    assert.equal((await db.query(`select video_url from course_modules`)).rows.length, 0)
    await asSqlEditor(db)
    await db.query(`update course_enrollments set status = 'enrolled' where user_id = $1`, [STUDENT])
  })

  it('admins still see and edit every lesson', async () => {
    await asUser(db, ADMIN)
    assert.equal((await db.query(`select id from course_modules`)).rows.length, 2)
    await db.query(`update course_modules set title = 'Lesson 1 (updated)' where id = $1`, [M1])
  })

  it('the rollback script restores today\'s behaviour', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/2026-11-25_phase3_content_rollback.sql'))
    await asUser(db, null)
    assert.equal((await db.query(`select video_url from course_modules where course_id = $1`, [PAID])).rows.length, 1)
  })
})
