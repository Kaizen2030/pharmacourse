# What your gateway needs (I could not see its code, so this is the contract)

The front end now calls three things on the gateway, and the invite worker calls one more.

1. `POST /instances/:id/groups/resolve`  body `{ inviteUrl }`  ->  `{ jid, subject }`
   - Take the code after `chat.whatsapp.com/`, look up the group, return its JID (`...@g.us`) and name.
   - Baileys: `const info = await sock.groupGetInviteInfo(code)`  -> `{ jid: info.id, subject: info.subject }`
   - Only allow the instance owner (same Supabase-JWT check you use for `/send`).
   - The tutor's number must already be in the group.

2. `POST /instances/:id/groups/post`  body `{ courseId, text, tipId }`  ->  `{ ok: true }`
   - Read `course_whatsapp_groups.group_jid` for `courseId` (service role), confirm the caller is that course's tutor, then send ONE message to that JID.
   - Baileys: `await sock.sendMessage(jid, { text })`

3. `POST /internal/instances/:id/send`  body `{ courseId, to, text }`  (header `x-worker-secret`)
   - Same as your existing `/send`, but authenticated by the shared secret `GATEWAY_WORKER_SECRET`
     instead of a user JWT, because the worker runs with no logged-in user. Keep it off the public internet
     (bind to localhost or block `/internal` in your tunnel).

Run `node invite-worker.js` beside the gateway. It sends at most one invite every 4 to 10 seconds, retries 3 times, and never sends twice (unique row per learner per course).

Why a DM with the link instead of adding students to the group directly: adding people who have not saved your number is one of the quickest ways to get a number banned. The invite link is safe and the learner taps once.
