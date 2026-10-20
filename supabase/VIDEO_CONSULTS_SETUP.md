# Secure video consultations

1. Run `supabase/video_consults_setup.sql` in the Supabase SQL Editor for the **RemedacarePOS / PharmacyOS** project used by the patient portal.
2. Register each pharmacist who can start rooms:

```sql
insert into public.consult_staff (user_id, pharmacy_id)
values ('STAFF_AUTH_USER_UUID', 'PHARMACY_UUID');
```

3. Create a Cloudflare Realtime TURN key, then deploy the `consult` Edge Function from this repository. Set these function secrets:

```text
APP_ORIGIN=https://www.pharmacourse.co.ke
CLOUDFLARE_TURN_KEY_ID=your-cloudflare-turn-key-id
CLOUDFLARE_TURN_API_TOKEN=your-cloudflare-api-token
```

The patient portal and POS use the PharmacyOS project ref `npybtjtilzjsgcxgesxy`, so deploy explicitly to that project:

```bash
npx supabase functions deploy consult --project-ref npybtjtilzjsgcxgesxy
npx supabase secrets set --project-ref npybtjtilzjsgcxgesxy \
  APP_ORIGIN=https://www.pharmacourse.co.ke \
  CLOUDFLARE_TURN_KEY_ID=your-cloudflare-turn-key-id \
  CLOUDFLARE_TURN_API_TOKEN=your-cloudflare-api-token
```

The Edge Function exchanges the Cloudflare key for short-lived browser credentials. Keep both Cloudflare values in Supabase Edge Function secrets, never in Vite or the browser. If Cloudflare secrets are omitted, the function falls back to public STUN servers only; some users behind strict NATs will then be unable to connect. The function also supports a self-hosted or other provider through `TURN_URLS`, `TURN_USERNAME`, and `TURN_CREDENTIAL` if you later replace Cloudflare.

The room is available to signed-in patients at `/patient/consult/:appointmentId`. The pharmacist side should call the same `consult` function with the staff session and render `ConsultRoom` with `role="staff"`.
