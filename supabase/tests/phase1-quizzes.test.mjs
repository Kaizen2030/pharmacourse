// Phase 1 (quizzes, completion, certificates): supabase/security/2026-11-24_phase1_quizzes_completion.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const STUDENT = '00000000-0000-0000-0000-00000000000a'
const OUTSIDER = '00000000-0000-0000-0000-00000000000b'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const COURSE = 'c0000000-0000-0000-0000-000000000001'
const M1 = 'a1000000-0000-0000-0000-000000000001' // video, 10 min, has a quiz
const M2 = 'a1000000-0000-0000-0000-000000000002' // reading, no video, no quiz
const QUIZ = 'b1000000-0000-0000-0000-000000000001'
const Q1 = 'd1000000-0000-0000-0000-000000000001' // correct_answer style
const Q2 = 'd1000000-0000-0000-0000-000000000002' // options[].is_correct style

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
const RIGHT = { [Q1]: 'Amoxicillin', [Q2]: 'Twice daily' }
const WRONG = { [Q1]: 'Ibuprofen', [Q2]: 'Once weekly' }
const allowNextAttempt = (db) => asSqlEditor(db).then(() => db.query(`update user_quiz_attempts set created_at = created_at - interval '1 minute'`))
const backdateBeat = (db, seconds) => asSqlEditor(db).then(() => db.query(`update module_watch_progress set last_beat_at = last_beat_at - ($1 || ' seconds')::interval`, [String(seconds)]))

async function freshDb({ withFix }) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('./live-fixture.sql'))
  await db.exec(`
    insert into auth.users values ('${STUDENT}', 'student@x.ke'), ('${OUTSIDER}', 'outsider@x.ke'), ('${ADMIN}', 'admin@x.ke');
    insert into user_profiles (id, email, role, admin_role) values ('${STUDENT}', 'student@x.ke', 'student', null),
      ('${OUTSIDER}', 'outsider@x.ke', 'student', null), ('${ADMIN}', 'admin@x.ke', 'admin', 'super');
    insert into courses (id, title, is_published, is_free) values ('${COURSE}', 'Antibiotics', true, true);
    insert into course_modules (id, course_id, title, video_url, duration_minutes, order_index) values
      ('${M1}', '${COURSE}', 'Penicillins', 'https://player.vimeo.com/video/1', 10, 1),
      ('${M2}', '${COURSE}', 'Reading', null, null, 2);
    insert into course_enrollments (user_id, course_id) values ('${STUDENT}', '${COURSE}');
    insert into lesson_quizzes (id, lesson_id, title, passing_score) values ('${QUIZ}', '${M1}', 'Check', 80);
    insert into quiz_questions (id, quiz_id, question_text, options, correct_answer, explanation, order_index) values
      ('${Q1}', '${QUIZ}', 'Which is a penicillin?', '[{"text":"Amoxicillin"},{"text":"Ibuprofen"}]', 'Amoxicillin', 'Amoxicillin is a beta-lactam', 1),
      ('${Q2}', '${QUIZ}', 'Usual frequency?', '[{"text":"Twice daily","is_correct":true},{"text":"Once weekly","is_correct":false}]', null, 'Usually BD', 2);`)
  if (withFix) {
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    const sql = read('../security/2026-11-24_phase1_quizzes_completion.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  }
  return db
}

describe('Phase 1: the holes exist today', () => {
  it('anyone, signed out, reads the quiz answer key', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, null)
    const rows = (await db.query(`select correct_answer, options from quiz_questions order by order_index`)).rows
    assert.equal(rows[0].correct_answer, 'Amoxicillin')
    assert.equal(rows[1].options[0].is_correct, true)
  })

  it('a student forges a passed attempt, marks modules complete and gets a certificate', async () => {
    const db = await freshDb({ withFix: false })
    await asUser(db, STUDENT)
    await db.query(`insert into user_quiz_attempts (user_id, quiz_id, score, passed) values ($1, $2, 100, true)`, [STUDENT, QUIZ])
    for (const m of [M1, M2]) await db.query(`insert into course_progress (user_id, course_id, module_id, completed) values ($1, $2, $3, true)`, [STUDENT, COURSE, m])
    await db.query(`insert into certificates (user_id, course_id, score) values ($1, $2, 100)`, [STUDENT, COURSE])
    assert.equal((await db.query(`select id from certificates`)).rows.length, 1)
  })
})

describe('Phase 1: after the fix', () => {
  let db
  before(async () => { db = await freshDb({ withFix: true }) })

  it('nobody but admins can read quiz_questions directly', async () => {
    await asUser(db, null)
    await refused(db.query(`select correct_answer from quiz_questions`), /permission denied/)
    await asUser(db, STUDENT)
    assert.equal((await db.query(`select correct_answer from quiz_questions`)).rows.length, 0)
    await asUser(db, ADMIN)
    assert.equal((await db.query(`select correct_answer from quiz_questions`)).rows.length, 2)
  })

  it('get_lesson_quiz gives enrolled students the questions with every answer marker removed', async () => {
    await asUser(db, STUDENT)
    const quiz = (await one(db, `select get_lesson_quiz($1) q`, [M1])).q
    assert.equal(quiz.passing_score, 80)
    assert.equal(quiz.questions.length, 2)
    const text = JSON.stringify(quiz)
    assert.ok(!text.includes('is_correct'), 'no option correctness flags')
    assert.ok(!text.includes('correct_answer'), 'no correct_answer field')
    assert.ok(!text.includes('beta-lactam') && !text.includes('Usually BD'), 'no explanations')
    assert.deepEqual(quiz.questions[1].options, [{ text: 'Twice daily' }, { text: 'Once weekly' }])
  })

  it('students not enrolled, and signed-out visitors, get no quiz', async () => {
    await asUser(db, OUTSIDER)
    await refused(db.query(`select get_lesson_quiz($1)`, [M1]), /Enrol in this course/)
    await asUser(db, null)
    await refused(db.query(`select get_lesson_quiz($1)`, [M1]), /permission denied/)
  })

  it('students cannot write attempts themselves', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`insert into user_quiz_attempts (user_id, quiz_id, score, passed) values ($1, $2, 100, true)`, [STUDENT, QUIZ]), /permission denied/)
  })

  it('submit_quiz grades on the server with the quiz\'s own pass mark, and requires every answer', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`select submit_quiz($1, $2)`, [QUIZ, JSON.stringify({ [Q1]: 'Amoxicillin' })]), /answer all questions/)
    const half = (await one(db, `select submit_quiz($1, $2) r`, [QUIZ, JSON.stringify({ [Q1]: 'Amoxicillin', [Q2]: 'Once weekly' })])).r
    assert.deepEqual(half, { score: 50, passed: false, passing_score: 80 }, '50% fails an 80% quiz (the old code passed at 70)')
    await allowNextAttempt(db)
    await asUser(db, STUDENT)
    const pass = (await one(db, `select submit_quiz($1, $2) r`, [QUIZ, JSON.stringify(RIGHT)])).r
    assert.deepEqual(pass, { score: 100, passed: true, passing_score: 80 })
    assert.equal((await db.query(`select id from user_quiz_attempts where user_id = $1`, [STUDENT])).rows.length, 2)
  })

  it('submit_quiz is rate limited against guessing the key', async () => {
    await asUser(db, STUDENT)
    await refused(db.query(`select submit_quiz($1, $2)`, [QUIZ, JSON.stringify(WRONG)]), /wait a few seconds/)
    for (let i = 0; i < 8; i += 1) { await allowNextAttempt(db); await asUser(db, STUDENT); await db.query(`select submit_quiz($1, $2)`, [QUIZ, JSON.stringify(WRONG)]) }
    await allowNextAttempt(db)
    await asUser(db, STUDENT)
    await refused(db.query(`select submit_quiz($1, $2)`, [QUIZ, JSON.stringify(WRONG)]), /Too many attempts/)
  })

  it('students cannot mark a module complete directly', async () => {
    await asUser(db, STUDENT)
    await db.query(`insert into course_progress (user_id, course_id, module_id, completed, completed_at) values ($1, $2, $3, true, now())`, [STUDENT, COURSE, M2])
    assert.equal((await one(db, `select completed from course_progress where module_id = $1`, [M2])).completed, false, 'insert is forced to not completed')
    await refused(db.query(`update course_progress set completed = true where user_id = $1 and module_id = $2`, [STUDENT, M2]), /recorded by the course player/)
    await db.query(`update course_progress set last_position = 42 where user_id = $1 and module_id = $2`, [STUDENT, M2])
  })

  it('watch time is credited by the server clock, not by how often the player calls', async () => {
    await asUser(db, STUDENT)
    await db.query(`select record_watch_heartbeat($1, $2, 30)`, [COURSE, M1])
    for (let i = 0; i < 20; i += 1) await db.query(`select record_watch_heartbeat($1, $2, 30)`, [COURSE, M1])
    assert.equal((await one(db, `select watched_seconds from module_watch_progress where module_id = $1`, [M1])).watched_seconds, 0, 'rapid calls earn nothing')
    await backdateBeat(db, 300)
    await asUser(db, STUDENT)
    await db.query(`select record_watch_heartbeat($1, $2, 30)`, [COURSE, M1])
    assert.equal((await one(db, `select watched_seconds from module_watch_progress where module_id = $1`, [M1])).watched_seconds, 0, 'a long gap (tab closed) earns nothing')
    await backdateBeat(db, 15)
    await asUser(db, STUDENT)
    const beat = (await one(db, `select record_watch_heartbeat($1, $2, 95) r`, [COURSE, M1])).r
    assert.equal(beat.watched_seconds, 15)
    assert.equal(beat.required_seconds, 480, '80% of 10 minutes')
    assert.equal((await one(db, `select last_position from course_progress where module_id = $1`, [M1])).last_position, 95, 'resume point saved')
    await refused(db.query(`insert into module_watch_progress (user_id, module_id, course_id, watched_seconds) values ($1, $2, $3, 9999)`, [STUDENT, M2, COURSE]), /permission denied/)
  })

  it('complete_module needs enough watch time and a passed quiz', async () => {
    await asSqlEditor(db)
    await db.query(`delete from user_quiz_attempts`)
    await asUser(db, STUDENT)
    await refused(db.query(`select complete_module($1, $2)`, [COURSE, M1]), /Pass the lesson quiz/)
    await db.query(`select submit_quiz($1, $2)`, [QUIZ, JSON.stringify(RIGHT)])
    await refused(db.query(`select complete_module($1, $2)`, [COURSE, M1]), /Keep watching: about 8 more minute/)
    await asSqlEditor(db)
    await db.query(`update module_watch_progress set watched_seconds = 480 where module_id = $1`, [M1])
    await asUser(db, STUDENT)
    assert.deepEqual((await one(db, `select complete_module($1, $2) r`, [COURSE, M1])).r, { completed: true })
    assert.equal((await one(db, `select completed from course_progress where module_id = $1 and user_id = $2`, [M1, STUDENT])).completed, true)
  })

  it('a reading module (no video, no quiz) completes straight away; outsiders cannot complete anything', async () => {
    await asUser(db, STUDENT)
    await db.query(`select complete_module($1, $2)`, [COURSE, M2])
    await asUser(db, OUTSIDER)
    await refused(db.query(`select complete_module($1, $2)`, [COURSE, M2]), /Enrol in this course/)
    await refused(db.query(`select complete_module($1, $2)`, [COURSE, 'a1000000-0000-0000-0000-0000000000ff']), /not part of this course/)
  })

  it('the certificate is issued only after real completion, with a server-set score', async () => {
    await asUser(db, OUTSIDER)
    await refused(db.query(`insert into certificates (user_id, course_id) values ($1, $2)`, [OUTSIDER, COURSE]), /row-level security/)
    await asUser(db, STUDENT)
    const cert = await one(db, `insert into certificates (user_id, course_id, score, verification_url) values ($1, $2, 1, 'https://evil.example') returning score, verification_url`, [STUDENT, COURSE])
    assert.equal(Number(cert.score), 100, 'score comes from the best quiz attempts, not the request')
    assert.equal(cert.verification_url, null)
  })

  it('certificates issued by an admin are written to the audit log', async () => {
    await asUser(db, ADMIN)
    await db.query(`insert into certificates (user_id, course_id) values ($1, $2)`, [OUTSIDER, COURSE])
    const log = await one(db, `select action, target_user_id, new_value from admin_audit_log where action = 'certificate_issued_by_admin'`)
    assert.equal(log.target_user_id, OUTSIDER)
    assert.equal(log.new_value.modules_completed, 0)
    assert.equal(log.new_value.modules_total, 2)
  })

  it('the rollback script restores today\'s behaviour', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/rollback-emergency-only/2026-11-24_phase1_quizzes_completion_rollback.sql'))
    await asUser(db, null)
    assert.equal((await db.query(`select correct_answer from quiz_questions`)).rows.length, 2)
  })
})
