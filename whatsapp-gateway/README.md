# Self-hosted WhatsApp gateway

This Node service uses a linked WhatsApp Web session through Baileys. It does not call Meta Cloud API or FlareSend. It is separate from the general website help popup and from the course's WhatsApp channel/group links.

## Setup

1. Run `supabase/whatsapp_tutor_setup.sql`, then `supabase/whatsapp_gateway_setup.sql` in the Supabase SQL editor.
2. In the admin instructor editor, link each tutor profile to that tutor's Supabase login. Set their WhatsApp account number in tutor settings.
3. Copy `.env.example` to `.env`. Set `SUPABASE_URL`, the server-only `SUPABASE_SERVICE_ROLE_KEY`, and `APP_ORIGINS`. Never place the service-role key in a `VITE_` variable or browser code.
4. On a persistent Node.js 20+ host, run `npm install` and `npm start` from this directory. Keep the `WHATSAPP_AUTH_DIR` volume persistent and private; it contains linked-device credentials.
5. Configure the website build with `VITE_WA_GATEWAY_URL=https://your-gateway-host` and redeploy the course app.
6. Each tutor signs in, visits `/tutor/whatsapp`, saves their own number, and links their WhatsApp device from the QR prompt. The number scanned must match their instructor profile.

The gateway limits broadcasts to 200 recipients per request, spaces sends apart, checks that recipients opted in and are enrolled in the tutor's course, and records a summary in `whatsapp_broadcast_log`. Use this only for wanted course updates. Baileys is an unofficial WhatsApp Web integration; WhatsApp may restrict accounts that automate messaging.

The general website help widget uses local FAQs. Its WhatsApp handoff is hidden unless a separate `VITE_SUPPORT_WA_NUMBER` is configured. Tutor tips and course contact links do not use that setting.