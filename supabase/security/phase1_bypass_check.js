// PHASE 1 BYPASS CHECK. Run AFTER applying 2026-11-24_phase1_quizzes_completion.sql.
// 1. Sign in on https://www.pharmacourse.co.ke with a STUDENT test account that is enrolled in a course it has
//    NOT finished (not your admin account).
// 2. Open the browser console (F12 > Console), paste this whole file, press Enter.
// 3. Every line must say PASS. If any says FAIL, the SQL was not applied; the script undoes what it changed.
(async () => {
  const PROJECT = 'nnjiutikutsjvggakvvv'
  const ANON_KEY = 'PASTE_THE_PHARMACOURSE_ANON_KEY_HERE' // Supabase > Project Settings > API > anon public key
  const base = `https://${PROJECT}.supabase.co/rest/v1`
  const session = JSON.parse(localStorage.getItem(`sb-${PROJECT}-auth-token`) || 'null')
  if (!session?.access_token) return console.error('Sign in on the website first (student test account).')
  if (ANON_KEY.startsWith('PASTE')) return console.error('Paste the anon key into ANON_KEY first.')
  const uid = session.user.id
  const auth = { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
  const anon = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  const call = (path, method = 'GET', body, headers = auth) => fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
  const report = (name, blocked, detail) => console.log(`${blocked ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)

  const profile = await call(`/user_profiles?id=eq.${uid}&select=role`)
  if (profile.body?.[0]?.role === 'admin') return console.error('This account is an admin. Use a student test account.')
  const enrolment = await call(`/course_enrollments?user_id=eq.${uid}&select=course_id&limit=1`)
  const courseId = enrolment.body?.[0]?.course_id
  if (!courseId) return console.error('Enrol this test account in a course first.')
  const modules = await call(`/course_modules?course_id=eq.${courseId}&select=id&order=order_index`)
  const moduleId = modules.body?.[0]?.id

  const keyAnon = await call('/quiz_questions?select=correct_answer,options&limit=5', 'GET', null, anon)
  report('Signed-out visitors cannot read quiz answers', !keyAnon.ok || (keyAnon.body || []).length === 0, `HTTP ${keyAnon.status}`)
  const keyStudent = await call('/quiz_questions?select=correct_answer,options&limit=5')
  report('Students cannot read quiz answers', !keyStudent.ok || (keyStudent.body || []).length === 0, `${(keyStudent.body || []).length} rows`)

  const attempt = await call('/user_quiz_attempts', 'POST', { user_id: uid, quiz_id: null, score: 100, passed: true })
  report('Students cannot write a quiz attempt', !attempt.ok, attempt.body?.message)
  if (attempt.ok && attempt.body?.[0]?.id) await call(`/user_quiz_attempts?id=eq.${attempt.body[0].id}`, 'DELETE')

  if (moduleId) {
    const before = await call(`/course_progress?user_id=eq.${uid}&module_id=eq.${moduleId}&select=id,completed`)
    const wasCompleted = !!before.body?.[0]?.completed
    if (!wasCompleted) {
      const forged = before.body?.[0]?.id
        ? await call(`/course_progress?id=eq.${before.body[0].id}`, 'PATCH', { completed: true, completed_at: new Date().toISOString() })
        : await call('/course_progress', 'POST', { user_id: uid, course_id: courseId, module_id: moduleId, completed: true })
      const nowCompleted = forged.ok && forged.body?.[0]?.completed === true
      report('Students cannot mark a module complete directly', !nowCompleted, forged.body?.message)
      if (nowCompleted) await call(`/course_progress?user_id=eq.${uid}&module_id=eq.${moduleId}`, 'PATCH', { completed: false, completed_at: null })
    } else {
      console.log('SKIP  first module is already completed; pick a course with an unfinished first module to test this')
    }
    const complete = await call('/rpc/complete_module', 'POST', { p_course: courseId, p_module: moduleId })
    report('complete_module refuses without watch time / quiz (or the module was already earned)', !complete.ok || wasCompleted, complete.body?.message)
  }

  const cert = await call('/certificates', 'POST', { user_id: uid, course_id: courseId, score: 100 })
  report('Students cannot issue a certificate for an unfinished course', !cert.ok, cert.body?.message)
  if (cert.ok && cert.body?.[0]?.id) console.warn('A certificate was created: delete it in the dashboard (certificates table).')
})()
