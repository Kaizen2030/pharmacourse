// PHASE 3 BYPASS CHECK. Run AFTER applying 2026-11-25_phase3_content.sql. Read-only: it changes nothing.
// Open any page of https://www.pharmacourse.co.ke (signed out is best), press F12 > Console, paste this, press Enter.
// Every line must say PASS.
(async () => {
  const PROJECT = 'nnjiutikutsjvggakvvv'
  const ANON_KEY = 'PASTE_THE_PHARMACOURSE_ANON_KEY_HERE' // Supabase > Project Settings > API > anon public key
  if (ANON_KEY.startsWith('PASTE')) return console.error('Paste the anon key into ANON_KEY first.')
  const base = `https://${PROJECT}.supabase.co/rest/v1`
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } // a signed-out visitor
  const get = (path) => fetch(`${base}${path}`, { headers }).then(async r => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
  const report = (name, passed, detail) => console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)

  const lessons = await get('/course_modules?select=id,video_url,content&limit=5')
  report('Signed-out visitors cannot read lesson video links or content', !lessons.ok || (lessons.body || []).length === 0, `HTTP ${lessons.status}`)

  const files = await get('/lesson_attachments?select=id,file_url&limit=5')
  report('Signed-out visitors cannot read lesson attachments', !files.ok || (files.body || []).length === 0, `HTTP ${files.status}`)

  const outline = await get('/course_outline?select=id,title,duration_minutes&limit=5')
  report('The public course outline still works (course pages need it)', outline.ok, `${(outline.body || []).length} rows`)

  const leak = await get('/course_outline?select=video_url&limit=1')
  report('The outline has no video links', !leak.ok, `HTTP ${leak.status}`)
})()
