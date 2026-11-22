# Social posting setup

Admin → **Blog & site → Social** lets you write a post once (caption, link, poster or video) and send it to your
channels. Everything is done in Admin. You never edit code or type commands.

## Step 1: database (once)
In the Supabase SQL editor (project `nnjiutikutsjvggakvvv`), run these two files in order:
1. `supabase/security/2026-11-30_phase11_social.sql` (posts, channels, share buttons)
2. `supabase/security/2026-12-04_phase11b_social_keys_vault.sql` (secure key storage, plus scheduled posts switched on automatically)

Run the main files, not the ones ending in `_rollback` (those undo a step). Running a file twice is harmless.

You can now add your channel links under **Channels** (they show as icons in the site footer). Every post also has
**Share** buttons, **Copy caption** and **Download media** for posting by hand.

## Step 2: automatic posting: paste your key in Admin
Admin → Blog & site → Social → **Auto-posting**:

**Ayrshare (easiest, paid)**
1. Create an account at ayrshare.com and link your Facebook Page, Instagram, LinkedIn, TikTok, X and YouTube there.
2. Copy your **API Key** from the Ayrshare dashboard.
3. Paste it in Auto-posting, then click **Save securely**. The box turns green and shows how many networks are linked.

**Make.com or Zapier (free)**
1. In Make.com, create a scenario whose first module is **Webhooks › Custom webhook**, then copy its address.
2. Paste that link in Auto-posting (choose "Make.com / Zapier"), then click **Save securely**.
3. In Make, add a "Create a post" module for each network. Use the `text` and `media_url` fields, then turn the scenario on.
   The webhook receives `title, caption, link, text, media_url, media_type, networks`.

**Scheduled posts** go out by themselves. Step 1 set up a check every 10 minutes.

**One-time server setup** (skip this if you already did it for payments): supabase.com › Account › Access tokens ›
Generate new token. Then GitHub › pharmacourse repo › Settings › Secrets and variables › Actions › New repository secret
named `SUPABASE_ACCESS_TOKEN`. Then GitHub › Actions › "Deploy Supabase functions" › Run workflow.

## Where the key goes
- It is encrypted in Supabase Vault. Admin only ever shows "Saved ••••abcd".
- Only a super admin can save or disconnect it. Visitors, learners, tutors and other admins cannot read it.
- Only the posting server can use it. It is never in the website code or in GitHub.
- Every save and every disconnect is written to the audit log.

## Network rules
Instagram needs a poster or video. TikTok and YouTube need a video. X allows 280 characters. The composer warns you before posting.

## Paid ads
Paid campaigns are created in Meta Ads Manager, TikTok Ads or LinkedIn Campaign Manager. Publish the post here,
then use "Boost post" in Meta Business Suite.
