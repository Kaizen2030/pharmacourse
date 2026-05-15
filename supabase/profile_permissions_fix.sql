-- Fix profile update permissions for authenticated users.
-- Run this in the Supabase SQL Editor if profile saves show:
-- "permission denied for table user_profiles"

begin;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select on public.user_profiles to anon;

drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;

create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

commit;
