# Patient portal and POS communication

The patient portal is part of the Pharmacourse web app. It uses the PharmacyOS Supabase project configured by `src/lib/pharmacyPosSupabase.js`. The RemedacarePOS desktop app uses the same project in `src/supabase.js` (`https://npybtjtilzjsgcxgesxy.supabase.co`).

The refreshed `src.zip` is the frontend source archive. It contains the patient portal and room UI. The database SQL and Edge Function are kept separately under `supabase/` because they are deployed to Supabase rather than copied into the browser bundle.

## Shared workflow

1. A signed-in patient books an appointment from `/patient/appointment`.
2. The row is inserted into `public.appointments` with the selected `pharmacy_id`.
3. POS loads the same table and filters by its active branch `pharmacy_id` in `src/screens/Consultations.jsx`.
4. A pharmacist starts a video room from the POS Consultations screen.
5. The `consult` Edge Function validates the staff JWT and appointment, writes `public.consult_sessions`, and marks the appointment `in_progress`.
6. The patient route `/patient/consult/:appointmentId` polls the same function until the room is live.
7. Both browsers use a private Supabase Realtime broadcast topic for signaling, then WebRTC carries audio, video, screen share, and unsaved in-call chat.

There is no direct website-to-desktop HTTP connection. Both clients communicate through Supabase Auth, PostgREST, and Realtime in the shared project. The POS keeps its normal offline inventory/sales cache separate; patient appointments and consultation sessions are shared online records.

No browser receives the service-role key, TURN API token, or database session secret. The only persisted consult data is room metadata and timing; chat messages and recordings are not stored.

## What must be deployed

- Run `supabase/video_consults_setup.sql` in the same Supabase project used by POS.
- Deploy `supabase/functions/consult` to that project.
- Configure the Edge Function `APP_ORIGIN` and TURN secrets there; never put those secrets in Vite or the desktop bundle.
- The POS and website builds already contain the client-side room UI. Until the SQL and Edge Function are deployed, the normal appointment screens still work but secure rooms cannot start.
