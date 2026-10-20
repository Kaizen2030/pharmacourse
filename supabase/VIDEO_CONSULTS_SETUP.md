# Secure video consultations

1. Run `supabase/video_consults_setup.sql` in the Supabase SQL Editor for the **RemedacarePOS / PharmacyOS** project used by the patient portal.
2. Register each pharmacist who can start rooms:

```sql
insert into public.consult_staff (user_id, pharmacy_id)
values ('STAFF_AUTH_USER_UUID', 'PHARMACY_UUID');
```

3. Deploy the `consult` Edge Function from this repository. Set these function secrets:

```text
APP_ORIGIN=https://www.pharmacourse.co.ke
TURN_URLS=turn:your-turn-host:3478?transport=udp,turns:your-turn-host:5349?transport=tcp
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-credential
```

`TURN_*` values belong in Supabase Edge Function secrets, never in Vite or the browser. If they are omitted, the function returns public STUN servers only; some users behind strict NATs will then be unable to connect. Use a production TURN provider or a maintained coturn deployment for reliable calls.

The room is available to signed-in patients at `/patient/consult/:appointmentId`. The pharmacist side should call the same `consult` function with the staff session and render `ConsultRoom` with `role="staff"`.
