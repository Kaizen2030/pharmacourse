// PHASE 2 BYPASS CHECK. Run AFTER applying 2026-11-23_phase2_roles.sql.
// 1. Sign in to https://www.pharmacourse.co.ke with a normal STUDENT test account (not your admin account).
// 2. Open the browser console (F12 > Console), paste this whole file, press Enter.
// 3. Every line must say PASS. If any says FAIL, the SQL was not applied; the script undoes what it changed.
(async () => {
  const PROJECT = 'nnjiutikutsjvggakvvv'
  const ANON_KEY = 'PASTE_THE_PHARMACOURSE_ANON_KEY_HERE' // Supabase > Project Settings > API > anon public key
  const base = `https://${PROJECT}.supabase.co/rest/v1`
  const session = JSON.parse(localStorage.getItem(`sb-${PROJECT}-auth-token`) || 'null')
  if (!session?.access_token) return console.error('Sign in on the website first (as a student test account).')
  if (ANON_KEY.startsWith('PASTE')) return console.error('Paste the anon key into ANON_KEY first.')
  const uid = session.user.id
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
  const call = (path, method, body) => fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
  const report = (name, blocked, detail) => console.log(`${blocked ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)

  const me = await call(`/user_profiles?id=eq.${uid}&select=role,admin_role`, 'GET')
  const original = me.body?.[0] || { role: 'student', admin_role: null }
  if (original.role === 'admin') return console.error('This account is an admin. Use a normal student test account.')

  const promote = await call(`/user_profiles?id=eq.${uid}`, 'PATCH', { role: 'admin', admin_role: 'super' })
  const escalated = promote.ok && promote.body?.[0]?.role === 'admin'
  report('Student cannot make themselves admin', !escalated, promote.body?.message)
  if (escalated) await call(`/user_profiles?id=eq.${uid}`, 'PATCH', original) // undo immediately

  const rpc = await call('/rpc/admin_set_role', 'POST', { p_user_id: uid, p_level: 'super' })
  report('Student cannot call admin_set_role', !rpc.ok, rpc.body?.message)

  const instructor = await call('/instructors', 'POST', { id: uid, name: 'Bypass test' })
  report('Student cannot create an instructor profile', !instructor.ok, instructor.body?.message)
  if (instructor.ok) await call(`/instructors?id=eq.${uid}`, 'DELETE')

  const course = await call('/courses', 'POST', { title: 'Bypass test course', instructor_id: uid, is_published: false })
  report('Student cannot create a course', !course.ok, course.body?.message)
  if (course.ok && course.body?.[0]?.id) await call(`/courses?id=eq.${course.body[0].id}`, 'DELETE')

  const email = await call(`/user_profiles?id=eq.${uid}`, 'PATCH', { email: 'someone-else@example.com' })
  report('Student cannot change their profile email', !email.ok, email.body?.message)

  const name = await call(`/user_profiles?id=eq.${uid}`, 'PATCH', { full_name: session.user.user_metadata?.full_name || 'Test Student' })
  report('Student CAN still edit their own name (should work)', name.ok, name.body?.message)
})()
