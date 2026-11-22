// Phase 11 (social links and posts): supabase/security/2026-11-30_phase11_social.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const LEARNER = '00000000-0000-0000-0000-00000000000a'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
async function refused(promise, re) {
  let msg = null
  try { await promise } catch (e) { msg = e.message }
  assert.ok(msg, 'should have been refused')
  if (re) assert.match(msg, re)
}

describe('Phase 11 social', () => {
  let db
  before(async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(read('./live-fixture.sql'))
    await db.exec(`insert into auth.users values ('${LEARNER}', 'l@x.ke'), ('${ADMIN}', 'a@x.ke');
      insert into user_profiles (id, email, role, admin_role) values ('${LEARNER}', 'l@x.ke', 'student', null), ('${ADMIN}', 'a@x.ke', 'admin', 'super');`)
    await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
    const sql = read('../security/2026-11-30_phase11_social.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  })

  it('visitors read the channel links but cannot change them', async () => {
    await asUser(db, null)
    assert.equal((await db.query(`select * from site_social_links`)).rows.length, 7)
    await refused(db.query(`update site_social_links set url = 'https://evil.example' where network = 'facebook'`))
    await asUser(db, LEARNER)
    await db.query(`update site_social_links set url = 'https://evil.example' where network = 'facebook'`)
    assert.equal((await one(db, `select url from site_social_links where network = 'facebook'`)).url, null)
  })

  it('learners and visitors cannot see or write social posts', async () => {
    await asUser(db, ADMIN)
    await db.query(`insert into social_posts (title, caption, networks) values ('Launch', 'New course!', '{facebook,linkedin}')`)
    await asUser(db, LEARNER)
    assert.equal((await db.query(`select * from social_posts`)).rows.length, 0)
    await refused(db.query(`insert into social_posts (title) values ('Spam')`), /row-level security/)
    await asUser(db, null)
    await refused(db.query(`select * from social_posts`), /permission denied/)
    await refused(db.query(`select * from due_social_posts()`))
  })

  it('admins edit links; only https links and known networks are accepted', async () => {
    await asUser(db, ADMIN)
    await db.query(`update site_social_links set url = 'https://facebook.com/pharmacourse' where network = 'facebook'`)
    await refused(db.query(`update site_social_links set url = 'javascript:alert(1)' where network = 'x'`), /check/)
    await refused(db.query(`insert into social_posts (title, networks) values ('Bad', '{myspace}')`), /check/)
    await refused(db.query(`insert into social_posts (title, media_url) values ('Bad', 'http://insecure.example/a.png')`), /check/)
  })

  it('the scheduler sees only due posts', async () => {
    await asUser(db, ADMIN)
    await db.query(`insert into social_posts (title, status, scheduled_for) values ('Due', 'scheduled', now() - interval '1 minute'), ('Later', 'scheduled', now() + interval '1 day')`)
    const due = (await db.query(`select title from due_social_posts()`)).rows.map((r) => r.title)
    assert.deepEqual(due, ['Due'])
  })

  it('rollback removes the scheduler function', async () => {
    await db.exec(`reset role`)
    await db.exec(read('../security/2026-11-30_phase11_social_rollback.sql'))
    assert.equal((await one(db, `select to_regprocedure('public.due_social_posts()') f`)).f, null)
  })
})
