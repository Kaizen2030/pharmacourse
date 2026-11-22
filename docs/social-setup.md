# Social posting setup

Admin → **Blog & site → Social** lets you write a post once (caption, link, poster or video) and send it to your
channels. It works at three levels.

## Level 1: no setup (works after the SQL)
Run `supabase/security/2026-11-30_phase11_social.sql` in the Supabase SQL editor (project `nnjiutikutsjvggakvvv`).
Then:
- Add your channel links under **Channels**. They appear as icons in the site footer.
- Every post gets **Share** buttons (Facebook, LinkedIn, X, WhatsApp), **Copy caption** and **Download media**,
  so you can post by hand in seconds.

## Why a link alone cannot auto-post
Facebook, Instagram, LinkedIn, TikTok, X and YouTube only accept posts from approved apps with a sign-in token for
your account. A publishing service holds those approvals for you; you connect your accounts once and Pharmacourse
posts through it.

## Level 2: automatic posting with Ayrshare (closest to Wix)
1. Create an account at https://www.ayrshare.com (paid plans; pick one that includes the networks you use).
2. In the Ayrshare dashboard, link your Facebook Page, Instagram Business account, LinkedIn page, TikTok, X and YouTube.
3. Copy your API key and set it on the server, then deploy:

```
supabase secrets set --project-ref nnjiutikutsjvggakvvv AYRSHARE_API_KEY=... APP_ORIGIN=https://www.pharmacourse.co.ke
supabase functions deploy social-publish --project-ref nnjiutikutsjvggakvvv --no-verify-jwt
```

The Social page then shows **Auto-posting on**, marks networks that are not linked, and **Publish post** sends
the post straight away. Results (with links to the live posts) appear on each post.

Network rules to know: Instagram needs a poster or video; TikTok and YouTube need a video; X allows 280 characters.
The composer warns you before posting.

## Level 2 (free alternative): Make.com, Zapier or n8n
1. Create a scenario that starts with a **Custom webhook** and continues with "Create a post" steps for each network
   (Facebook Pages, Instagram for Business, LinkedIn, etc.). Route by the `networks` field.
2. The webhook receives JSON: `title, caption, link, text (caption + link), media_url, media_type, networks`.
   It carries `X-Pharmacourse-Signature` (HMAC-SHA256 of the body with your secret) if you want to verify it.
3. Set the secrets and deploy:

```
supabase secrets set --project-ref nnjiutikutsjvggakvvv SOCIAL_WEBHOOK_URL=https://hook.make.com/... SOCIAL_WEBHOOK_SECRET=<random> \
  APP_ORIGIN=https://www.pharmacourse.co.ke
supabase functions deploy social-publish --project-ref nnjiutikutsjvggakvvv --no-verify-jwt
```

## Scheduled posts
Scheduled posts are published when the scheduler calls the function. Set `SOCIAL_CRON_TOKEN=<random>` as a secret,
then in the SQL editor (needs the pg_cron and pg_net extensions, available in Supabase → Database → Extensions):

```
select cron.schedule('social-posts', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://nnjiutikutsjvggakvvv.supabase.co/functions/v1/social-publish',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', '<SOCIAL_CRON_TOKEN>'),
    body := '{"action":"run-scheduled"}'::jsonb
  );
$$);
```

## Paid ads
Paid campaigns (boosting a post, targeting, budgets) are created in Meta Ads Manager, TikTok Ads or LinkedIn Campaign
Manager; they cannot be created by posting. Publish the post here, then use "Boost post" in Meta Business Suite.
A later step can add the Meta Pixel (with the visitor's consent) so ads can measure course sign-ups.

## Security
- Only admins can create, see or publish posts; the database enforces it.
- Uploaded posters and videos are public (they are public posts) and limited to images and videos up to 100 MB.
- The Ayrshare key and webhook secret live only in Edge Function secrets, never in the website code.
