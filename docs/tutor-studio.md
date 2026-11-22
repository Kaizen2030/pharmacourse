# Tutor studio

Tutors build and manage their own courses at **/tutor**. They never see the admin pages.

## Turn it on (once)
Supabase project `nnjiutikutsjvggakvvv` > SQL Editor > run `supabase/security/2026-12-02_phase12_tutor_studio.sql`
(Phases 1, 2, 3 and 9 first). Undo: `2026-12-02_phase12_tutor_studio_rollback.sql`.

## Add a tutor
1. The tutor creates a normal Pharmacourse account (Register).
2. Admin > Tutors & WhatsApp > Tutors: create or edit their tutor profile and choose their account under
   **Linked account**. Do not make them an admin.
3. They now see **Tutor studio** in their account menu.

## What each person sees

| | Tutor | Admin |
|---|---|---|
| Admin pages (/admin) | No (sent back to My Learning) | Yes |
| Their own courses | See, create, edit | All courses |
| Other tutors' courses | No | Yes |
| Lessons, quizzes, attachments | Own courses only | All |
| Publish / unpublish | No: "Submit for review" | Approve and publish |
| Price | Proposes it on drafts; locked once live | Sets it |
| Delete lessons of a live course | No | Yes |
| Students | Names and progress of their own courses | Everything, incl. contact and payments |
| Payments, coupons, analytics, users | No | Yes |
| WhatsApp tips for their courses | Yes (/tutor/whatsapp) | Yes |

The database enforces every row of this table, so it also holds if someone calls the API directly.

## Review flow
Tutor: **New course** > Details > Lessons & quizzes > Review & publish > **Submit for review**.
Admin: Learning > **Course reviews** > Preview > **Approve and publish**, or write a note and **Request changes**.
The tutor sees the note on their course and can submit again. Every review is in the audit log.
