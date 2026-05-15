begin;

-- Adds a second admin tier column on top of role = 'admin'.
-- Use admin_role = 'super' for full platform administrators,
-- admin_role = 'content' for content-only admins,
-- and null for non-admin users.
alter table public.user_profiles
add column if not exists admin_role text default null;

commit;
