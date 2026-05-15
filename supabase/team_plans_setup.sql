begin;

create table if not exists public.team_plan_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organisation text not null,
  email text,
  phone text,
  seats_needed integer,
  plan_tier text not null default 'starter',
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint team_plan_enquiries_status_check check (status in ('new', 'contacted', 'converted', 'closed')),
  constraint team_plan_enquiries_tier_check check (plan_tier in ('starter', 'growth', 'enterprise'))
);

create table if not exists public.team_plan_pricing (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique,
  seats integer,
  price_kes numeric(12, 2),
  description text,
  features text[] not null default '{}',
  is_visible boolean not null default true,
  constraint team_plan_pricing_tier_check check (tier in ('starter', 'growth', 'enterprise')),
  constraint team_plan_pricing_seats_check check (seats is null or seats >= 0),
  constraint team_plan_pricing_price_check check (price_kes is null or price_kes >= 0)
);

insert into public.team_plan_pricing (tier, seats, price_kes, description, features, is_visible)
values
  (
    'starter',
    5,
    null,
    'A practical starting plan for independent pharmacies and smaller care teams.',
    array['CPD tracking dashboard', 'Certificate management', 'WhatsApp support'],
    true
  ),
  (
    'growth',
    20,
    null,
    'Built for busy retail chains, hospital pharmacy units, and expanding operations teams.',
    array['CPD tracking dashboard', 'Certificate management', 'WhatsApp support'],
    true
  ),
  (
    'enterprise',
    null,
    null,
    'For health systems, multi-branch pharmacy groups, and organizations needing full rollout support.',
    array['CPD tracking dashboard', 'Certificate management', 'WhatsApp support'],
    true
  )
on conflict (tier) do nothing;

create index if not exists team_plan_enquiries_created_idx
  on public.team_plan_enquiries (created_at desc);

create index if not exists team_plan_pricing_tier_idx
  on public.team_plan_pricing (tier);

alter table public.team_plan_enquiries enable row level security;
alter table public.team_plan_pricing enable row level security;

grant select, insert, update, delete on public.team_plan_enquiries to authenticated;
grant select on public.team_plan_pricing to anon, authenticated;
grant insert, update, delete on public.team_plan_pricing to authenticated;

drop policy if exists "Admins can manage team plan enquiries" on public.team_plan_enquiries;
create policy "Admins can manage team plan enquiries"
on public.team_plan_enquiries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can view visible team plan pricing" on public.team_plan_pricing;
create policy "Public can view visible team plan pricing"
on public.team_plan_pricing
for select
to public
using (is_visible = true or public.is_admin());

drop policy if exists "Admins can manage team plan pricing" on public.team_plan_pricing;
create policy "Admins can manage team plan pricing"
on public.team_plan_pricing
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.team_plan_enquiries is
'Admin-managed enquiry tracker for team plan leads coming from WhatsApp or manual outreach.';

comment on table public.team_plan_pricing is
'Public pricing configuration for the Team Plans page, editable by super admins.';

commit;
