// Phase 4 (analytics privacy): supabase/security/2026-11-26_phase4_analytics_privacy.sql
// and the clean-up script 2026-11-26_phase4_scrub_existing_events.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
// A signed-out visitor's request, coming from a given network address.
const asVisitor = (db, ip = '41.90.1.2') => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);
  select set_config('request.jwt.claim.role', 'anon', false);
  select set_config('request.headers', '{"x-forwarded-for": "${ip}, 10.0.0.1"}', false); set role anon;`)
const asSqlEditor = (db) => db.exec(`reset role; select set_config('request.jwt.claim.role', '', false); select set_config('request.headers', '', false);`)

const TOKEN_URL = 'https://www.pharmacourse.co.ke/reset-password#access_token=eyJSECRET&refresh_token=REFRESH&type=recovery'
const leakyMetadata = {
  url: TOKEN_URL, hash: '#access_token=eyJSECRET', search: '?code=abc',
  route_group: 'courses',
  geo: { ip: '41.90.1.2', city: 'Nairobi', latitude: -1.28, longitude: 36.82, country: 'Kenya', country_code: 'KE', time_zone: 'Africa/Nairobi', locale: 'en-KE', language: 'en' },
}
const record = (db, { event = 'page_view', path = '/courses', referrer = 'https://www.google.com/search?q=pharmacy+course', session = 'sess-1', metadata = leakyMetadata } = {}) =>
  one(db, `select record_website_event($1, $2, 'Courses', $3, $4, 'mobile', 390, 844, $5) id`, [event, path, referrer, session, JSON.stringify(metadata)])

async function freshDb({ withFix }) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('./live-fixture.sql'))
  if (withFix) {
    const sql = read('../security/2026-11-26_phase4_analytics_privacy.sql')
    await db.exec(sql); await db.exec(sql) // re-runnable
  }
  return db
}

describe('Phase 4: the leak exists today', () => {
  it('a reset link\'s sign-in tokens and the visitor\'s IP and location are stored', async () => {
    const db = await freshDb({ withFix: false })
    await asVisitor(db)
    await record(db, { path: '/reset-password' })
    await asSqlEditor(db)
    const row = await one(db, `select path, metadata from website_events`)
    assert.equal(row.path, '/reset-password')
    assert.match(row.metadata.url, /access_token=eyJSECRET/)
    assert.equal(row.metadata.geo.ip, '41.90.1.2')
  })
})

describe('Phase 4: after the fix', () => {
  let db
  before(async () => { db = await freshDb({ withFix: true }) })

  it('private pages are never recorded, whatever the browser sends', async () => {
    await asVisitor(db)
    for (const path of ['/reset-password', '/activate/remedacarepos', '/patient/track', '/pos', '/admin', '/dashboard', '/learn/c1/m1', '/certificate/c1', '/verify/123']) {
      assert.equal((await record(db, { path, session: `s-${path}` })).id, null, path)
    }
    await asSqlEditor(db)
    assert.equal((await one(db, `select count(*)::int n from website_events`)).n, 0)
  })

  it('stores a public page view without address, tokens, IP or precise location', async () => {
    await asVisitor(db)
    const { id } = await record(db, { path: '/courses?q=antibiotics#top' })
    assert.ok(id)
    await asSqlEditor(db)
    const row = await one(db, `select path, referrer, metadata from website_events where id = $1`, [id])
    assert.equal(row.path, '/courses')
    assert.equal(row.referrer, 'https://www.google.com', 'only the referring site, not its search query')
    assert.deepEqual(row.metadata, {
      route_group: 'courses',
      geo: { country: 'Kenya', country_code: 'KE', time_zone: 'Africa/Nairobi', locale: 'en-KE', language: 'en', source: 'browser' },
    })
    const text = JSON.stringify(row)
    for (const secret of ['eyJSECRET', 'REFRESH', '41.90.1.2', '"city"', '"latitude"', '-1.28', 'code=abc']) assert.ok(!text.includes(secret), secret)
  })

  it('accepts only page_view and session_start events and refuses odd paths', async () => {
    await asVisitor(db)
    assert.equal((await record(db, { event: 'purchase', session: 'x1' })).id, null)
    assert.equal((await record(db, { path: 'javascript:alert(1)', session: 'x2' })).id, null)
    assert.equal((await record(db, { path: '/' + 'a'.repeat(300), session: 'x3' })).id, null)
    assert.equal((await record(db, { session: '' })).id, null, 'needs a session id')
    assert.ok((await record(db, { event: 'session_start', path: '/', session: 'x4' })).id)
  })

  it('limits each browser session to 60 events per 10 minutes', async () => {
    await asVisitor(db, '102.0.0.9')
    let stored = 0
    for (let i = 0; i < 70; i += 1) if ((await record(db, { session: 'flood-session' })).id) stored += 1
    assert.equal(stored, 60)
  })

  it('limits each network address to 150 events per 10 minutes, even with fresh session ids', async () => {
    await asVisitor(db, '197.248.0.5')
    let stored = 0
    for (let i = 0; i < 160; i += 1) if ((await record(db, { session: `rotating-${i}` })).id) stored += 1
    assert.equal(stored, 150)
    await asSqlEditor(db)
    const buckets = (await db.query(`select bucket from website_event_throttle where bucket like 'a:%'`)).rows.map((r) => r.bucket)
    assert.ok(buckets.every((b) => /^a:[0-9a-f]{64}$/.test(b)), 'addresses are kept only as a one-way hash')
    assert.ok(!buckets.some((b) => b.includes('197.248')))
  })

  it('visitors cannot read or write the events or the counters directly', async () => {
    await asVisitor(db)
    let msg = null
    try { await db.query(`select * from website_events`) } catch (e) { msg = e.message }
    assert.match(msg || '', /permission denied/)
    msg = null
    try { await db.query(`select * from website_event_throttle`) } catch (e) { msg = e.message }
    assert.match(msg || '', /permission denied/)
  })

  it('the clean-up script removes private data from events stored before the fix', async () => {
    await asSqlEditor(db)
    await db.query(`insert into website_events (event_name, path, referrer, session_id, metadata) values
      ('page_view', '/reset-password', null, 'old1', $1), ('page_view', '/blog/hello?utm=x', 'https://facebook.com/some/post?id=9', 'old2', $1)`, [JSON.stringify(leakyMetadata)])
    const script = read('../security/2026-11-26_phase4_scrub_existing_events.sql').replace(/\n-- If the numbers look right:[\s\S]*$/, '\ncommit;')
    await db.exec(script)
    assert.equal((await one(db, `select count(*)::int n from website_events where path = '/reset-password'`)).n, 0)
    const blog = await one(db, `select path, referrer, metadata from website_events where session_id = 'old2'`)
    assert.equal(blog.path, '/blog/hello')
    assert.equal(blog.referrer, 'https://facebook.com')
    assert.ok(!JSON.stringify(blog.metadata).match(/eyJSECRET|41\.90|latitude|"url"/))
    assert.equal(blog.metadata.geo.country_code, 'KE')
  })

  it('the rollback script restores the old function', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/rollback-emergency-only/2026-11-26_phase4_analytics_privacy_rollback.sql'))
    await asVisitor(db, '1.1.1.1')
    assert.ok((await record(db, { path: '/reset-password', session: 'after-rollback' })).id)
  })
})
