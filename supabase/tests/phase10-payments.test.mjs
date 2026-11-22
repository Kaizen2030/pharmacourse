// Phase 10 (payments, coupons, receipts): supabase/security/2026-11-29_phase10_payments.sql
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const LEARNER = '00000000-0000-0000-0000-00000000000a'
const OTHER = '00000000-0000-0000-0000-00000000000b'
const ADMIN = '00000000-0000-0000-0000-0000000000f0'
const PAID = 'c0000000-0000-0000-0000-000000000002'
const one = async (db, sql, p) => (await db.query(sql, p)).rows[0]
const asUser = (db, id) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id || ''}', false);
  select set_config('request.jwt.claim.role', '${id ? 'authenticated' : 'anon'}', false); set role ${id ? 'authenticated' : 'anon'};`)
const asServer = (db) => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', 'service_role', false);`)
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
    create table if not exists public.testimonials (id uuid primary key default gen_random_uuid(), is_published boolean default false);
    insert into auth.users values ('${LEARNER}', 'l@x.ke'), ('${OTHER}', 'o@x.ke'), ('${ADMIN}', 'admin@x.ke');
    insert into user_profiles (id, email, full_name, role, admin_role) values ('${LEARNER}', 'l@x.ke', 'Learner', 'student', null),
      ('${OTHER}', 'o@x.ke', 'Other', 'student', null), ('${ADMIN}', 'admin@x.ke', 'Admin', 'admin', 'super');
    insert into courses (id, title, is_published, is_free, price) values ('${PAID}', 'Pharmacovigilance', true, false, 2000);`)
  await db.exec(read('../security/2026-11-23_phase2_roles.sql'))
  await db.exec(read('../security/2026-11-24_phase1_quizzes_completion.sql'))
  await db.exec(read('../security/2026-11-28_phase9_enrolments.sql'))
  const sql = read('../security/2026-11-29_phase10_payments.sql')
  await db.exec(sql); await db.exec(sql) // re-runnable
  const details = read('../security/2026-12-01_phase10b_payment_details.sql')
  await db.exec(details); await db.exec(details)
  await asSqlEditor(db)
  await db.exec(`update payment_providers set enabled = true;
    insert into coupons (code, kind, value) values ('HALF', 'percent', 50), ('FREE100', 'percent', 100);
    insert into coupons (code, kind, value, max_uses) values ('ONCE', 'fixed', 500, 1);`)
  return db
}

describe('Phase 10 payments', () => {
  let db
  before(async () => { db = await freshDb() })

  it('learners cannot read coupons or other people\'s payments, and cannot write payments directly', async () => {
    await asUser(db, LEARNER)
    assert.equal((await db.query(`select * from coupons`)).rows.length, 0)
    await refused(db.query(`insert into payments (user_id, course_id, provider, list_price_kes, amount_kes, status) values ($1, $2, 'mpesa_stk', 2000, 1, 'paid')`, [LEARNER, PAID]))
    await refused(db.query(`select raw from payments`), /permission denied/)
  })

  it('the price comes from the database, with a valid coupon', async () => {
    await asUser(db, LEARNER)
    const q = (await one(db, `select quote_price($1, 'half') q`, [PAID])).q
    assert.deepEqual([Number(q.price), Number(q.discount), Number(q.total), q.coupon_valid], [2000, 1000, 1000, true])
    const bad = (await one(db, `select quote_price($1, 'NOPE') q`, [PAID])).q
    assert.equal(bad.coupon_valid, false)
  })

  it('a learner cannot confirm their own payment; no access until the server confirms', async () => {
    await asUser(db, LEARNER)
    const r = (await one(db, `select start_payment($1, 'mpesa_stk', null, '0712345678') r`, [PAID])).r
    assert.equal(Number(r.amount), 2000)
    await refused(db.query(`select confirm_payment($1)`, [r.payment_id]), /payment server or an admin/)
    await refused(db.query(`select settle_payment($1, 'X', 2000, null)`, [r.payment_id]), /permission denied/)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
  })

  it('the server confirms once; a duplicate callback does not enrol twice or count twice', async () => {
    await asSqlEditor(db)
    const id = (await one(db, `select id from payments where user_id = $1 and status = 'pending'`, [LEARNER])).id
    await asServer(db)
    const a = (await one(db, `select confirm_payment($1, 'QWE123ABC', 2000, '{"ok":true}') r`, [id])).r
    const b = (await one(db, `select confirm_payment($1, 'QWE123ABC', 2000, '{"ok":true}') r`, [id])).r
    assert.equal(a.status, 'paid'); assert.equal(b.already, true); assert.equal(a.receipt_no, b.receipt_no)
    await asSqlEditor(db)
    assert.equal((await one(db, `select count(*)::int n from course_enrollments where user_id = $1 and course_id = $2`, [LEARNER, PAID])).n, 1)
    await asUser(db, LEARNER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, true)
    assert.match((await one(db, `select receipt_no from payments where id = $1`, [id])).receipt_no, /^PC-\d{4}-\d{6}$/)
  })

  it('an underpayment is marked failed and gives no access', async () => {
    await asUser(db, OTHER)
    const r = (await one(db, `select start_payment($1, 'paystack') r`, [PAID])).r
    await asServer(db)
    assert.equal((await one(db, `select confirm_payment($1, 'PSK1', 10, null) r`, [r.payment_id])).r.status, 'failed')
    await asUser(db, OTHER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
  })

  it('manual reference: awaiting until an admin confirms; the same code cannot be reused', async () => {
    await asUser(db, OTHER)
    const r = (await one(db, `select start_payment($1, 'mpesa_manual') r`, [PAID])).r
    await db.query(`select submit_payment_reference($1, 'sgh7 kl22 pq')`, [r.payment_id])
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
    await asUser(db, ADMIN)
    const listed = (await db.query(`select * from admin_list_payments(null, 'to_confirm')`)).rows
    assert.equal(listed.length, 1)
    await db.query(`select admin_payment_action($1, 'confirm')`, [r.payment_id])
    await asUser(db, OTHER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, true)
    await asUser(db, LEARNER)
    await refused(db.query(`select start_payment($1, 'mpesa_manual')`, [PAID]), /already have access/)
  })

  it('a 100% coupon enrols straight away; a single-use coupon cannot be used twice', async () => {
    await asSqlEditor(db)
    await db.query(`delete from course_enrollments where user_id = $1`, [LEARNER])
    await asUser(db, LEARNER)
    const r = (await one(db, `select start_payment($1, 'whatsapp', 'free100') r`, [PAID])).r
    assert.equal(r.status, 'paid')
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, true)
    await asSqlEditor(db)
    await db.query(`delete from course_enrollments where user_id = $1`, [LEARNER])
    await db.query(`update coupons set used_count = 1 where code = 'ONCE'`)
    await asUser(db, LEARNER)
    await refused(db.query(`select start_payment($1, 'whatsapp', 'ONCE')`, [PAID]), /fully used/)
  })

  it('admin refund revokes access; summary counts revenue once', async () => {
    await asUser(db, ADMIN)
    const paid = (await db.query(`select * from admin_list_payments(null, 'paid')`)).rows
    const s = (await one(db, `select admin_payments_summary(30) s`)).s
    assert.equal(Number(s.revenue), paid.reduce((t, p) => t + Number(p.amount_kes), 0))
    const other = paid.find((p) => p.email === 'o@x.ke')
    await db.query(`select admin_payment_action($1, 'refund', 'Asked within 7 days')`, [other.payment_id])
    await asUser(db, OTHER)
    assert.equal((await one(db, `select can_study_course($1) ok`, [PAID])).ok, false)
  })

  it('learners see only enabled payment methods', async () => {
    await asSqlEditor(db)
    await db.query(`update payment_providers set enabled = false where key = 'paystack'`)
    await asUser(db, LEARNER)
    const keys = (await db.query(`select key from payment_providers order by display_order`)).rows.map((r) => r.key)
    assert.ok(!keys.includes('paystack'))
    await refused(db.query(`select start_payment($1, 'paystack')`, [PAID]), /not available/)
  })

  it('payment details: learners read them for enabled methods but cannot change them', async () => {
    await asSqlEditor(db)
    await db.query(`update payment_providers set enabled = true, details = '{"kind":"paybill","business_number":"247247"}' where key = 'mpesa_manual'`)
    await asUser(db, LEARNER)
    assert.equal((await one(db, `select details->>'business_number' n from payment_providers where key = 'mpesa_manual'`)).n, '247247')
    await db.query(`update payment_providers set details = '{"business_number":"999"}' where key = 'mpesa_manual'`)
    await asSqlEditor(db)
    assert.equal((await one(db, `select details->>'business_number' n from payment_providers where key = 'mpesa_manual'`)).n, '247247')
    await refused(db.query(`update payment_providers set details = '[1,2]' where key = 'mpesa_manual'`), /check/)
  })

  it('rollback removes the functions and keeps the money records', async () => {
    await asSqlEditor(db)
    await db.exec(read('../security/rollback-emergency-only/2026-11-29_phase10_payments_rollback.sql'))
    assert.equal((await one(db, `select to_regprocedure('public.start_payment(uuid,text,text,text)') f`)).f, null)
    assert.ok((await one(db, `select count(*)::int n from payments`)).n > 0)
  })
})
