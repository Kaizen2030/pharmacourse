# Admin two-step verification

Admin pages on Pharmacourse need two things: the admin's password and a 6-digit code from an authenticator app.

## Setting it up (each admin, once)
1. Install an authenticator app on your phone: Google Authenticator, Microsoft Authenticator, Authy or 1Password.
2. Sign in to Pharmacourse and open **Admin**. You will see a QR code.
3. Scan it with the app (or type the key shown under it), then enter the 6-digit code the app shows.

From then on, each new sign-in on a device asks for the current code before admin pages open.

## Turning on the database check
The website asks for the code from the moment it is deployed. The database check (which also blocks direct API use of a
stolen admin password) is switched on separately:

1. In Supabase (project `nnjiutikutsjvggakvvv`) > SQL Editor, run **step 1** of
   `supabase/security/2026-11-27_phase5_admin_mfa.sql`. Every admin should show `has_authenticator = true`.
2. Then run the whole file. Admin powers now need a verified session.

To undo, run `rollback-emergency-only/2026-11-27_phase5_admin_mfa_rollback.sql`.

## Lost phone or new phone
In Supabase > SQL Editor (always allowed, no code needed):

```sql
delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'admin@example.com');
```

The admin signs in again and sets up the app on the new phone.

## Tips
- Store the setup key (shown under the QR code) somewhere safe, such as a password manager, to restore the app later.
- Keep at least two super admins with working authenticators so one can help the other.
