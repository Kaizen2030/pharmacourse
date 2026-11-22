// Phase 13 (real CPD hours): supabase/security/2026-12-05_phase13_cpd_hours.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const U = '00000000-0000-0000-0000-00000000000a'
const rows = async (db, sql) => (await db.query(sql)).rows

describe('Phase 13 CPD hours', () => {
  let db
  before(async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(read('./live-fixture.sql'))
    // The live state: the old setup file (default 2, not null) and the old leaderboard.
    await db.exec(`alter table public.courses add column cpd_hours numeric(5, 2) not null default 2;`)
    await db.exec(`
      create table if not exists public.certificates (id uuid primary key default gen_random_uuid(), user_id uuid, course_id uuid);
      insert into auth.users values ('${U}', 'l@x.ke');
      insert into user_profiles (id, email, role, full_name) values ('${U}', 'l@x.ke', 'student', 'Amina');
      insert into courses (title, is_published) values ('Auto two', true), ('Also auto', true);
      insert into courses (title, is_published, cpd_hours) values ('Real five', true, 5);`)
    await db.exec(read('../leaderboard_setup.sql'))
    await db.exec(`insert into course_enrollments (user_id, course_id, status, completed_at)
      select '${U}', id, 'completed', now() from courses where title in ('Auto two', 'Real five');`)
    const sql = read('../security/2026-12-05_phase13_cpd_hours.sql')
    await db.exec(sql)
  })

  it('clears the automatic 2 and keeps real values', async () => {
    const r = Object.fromEntries((await rows(db, `select title, cpd_hours from courses`)).map((x) => [x.title, x.cpd_hours]))
    assert.equal(r['Auto two'], null)
    assert.equal(r['Also auto'], null)
    assert.equal(Number(r['Real five']), 5)
  })

  it('new courses start with no CPD hours, and the clean-up never runs twice', async () => {
    await db.exec(`insert into courses (title) values ('Brand new')`)
    assert.equal((await rows(db, `select cpd_hours from courses where title = 'Brand new'`))[0].cpd_hours, null)
    await db.exec(`update courses set cpd_hours = 2 where title = 'Also auto'`) // an admin really sets 2
    await db.exec(read('../security/2026-12-05_phase13_cpd_hours.sql'))
    assert.equal(Number((await rows(db, `select cpd_hours from courses where title = 'Also auto'`))[0].cpd_hours), 2)
  })

  it('rejects nonsense values', async () => {
    let msg = null
    try { await db.exec(`update courses set cpd_hours = -1 where title = 'Brand new'`) } catch (e) { msg = e.message }
    assert.match(msg || '', /courses_cpd_hours_range/)
  })

  it('the leaderboard no longer adds 2 for courses without CPD hours', async () => {
    const lb = await rows(db, `select * from get_leaderboard('all')`)
    assert.equal(Number(lb[0].total_cpd_hours), 5)
  })

  it('the rollback runs cleanly, twice', async () => {
    const rb = read('../security/rollback-emergency-only/2026-12-05_phase13_cpd_hours_rollback.sql')
    await db.exec(rb); await db.exec(rb)
  })
})
