# Self-hosted WhatsApp gateway

This Node service uses a linked WhatsApp Web session through Baileys. It does not call Meta Cloud API or FlareSend. It is separate from the general website help popup and from the course's WhatsApp channel/group links.

## Setup

1. Run `supabase/whatsapp_tutor_setup.sql`, then `supabase/whatsapp_gateway_setup.sql` in the Supabase SQL editor.
2. In the admin instructor editor, link each tutor profile to that tutor's Supabase login. Set their WhatsApp account number in tutor settings.
3. In PowerShell, go to this `whatsapp-gateway` directory, copy `.env.example` to `.env`, and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_ORIGINS`. Include your public Vercel domains and `http://localhost:5173`. Never put the service-role key in a `VITE_` variable, the root `.env`, or browser code.
4. Install Node.js 20 or newer. Run `npm install`, then `npm start` from this directory. Keep that PowerShell window open. The linked-device credentials are stored under `data/whatsapp-auth`; do not delete or publish this folder.
5. For local-only testing, copy the project-root `.env.example` to `.env`, fill in the Vite Supabase URL and anon key, and keep `VITE_WA_GATEWAY_URL=http://localhost:8787`. Start the website with `npm run dev`.
6. To reach the laptop gateway from the public Vercel site, install ngrok, claim a static HTTPS domain, configure its auth token locally, and run `ngrok http --url=YOUR_STATIC_DOMAIN 8787` in a second PowerShell window. Set Vercel's `VITE_WA_GATEWAY_URL` to that HTTPS URL and redeploy. Add the Vercel domains to the gateway's `APP_ORIGINS` and restart the gateway.
7. Keep the laptop powered, awake, online, and keep both the gateway and ngrok windows running. If it restarts, run both commands again; the WhatsApp session is retained in `data/whatsapp-auth`.
8. Each tutor signs in, visits `/tutor/whatsapp`, saves their own number, and links their device by QR. The number scanned must match their instructor profile.

The gateway limits broadcasts to 200 recipients per request, spaces sends apart, checks that recipients opted in and are enrolled in the tutor's course, appends STOP instructions, processes STOP/unsubscribe replies, restores linked sessions after restarts, and records a summary in `whatsapp_broadcast_log`. Use this only for wanted course updates. Baileys is an unofficial WhatsApp Web integration; WhatsApp may restrict accounts that automate messaging.

The general website help widget uses local FAQs. Its WhatsApp handoff is hidden unless a separate `VITE_SUPPORT_WA_NUMBER` is configured. Tutor tips and course contact links do not use that setting.