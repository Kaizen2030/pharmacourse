-- READ-ONLY security snapshot of the Pharmacourse database. Changes nothing.
-- Run in Supabase (project nnjiutikutsjvggakvvv) > SQL Editor, then copy the single JSON result.
with tables as (
  select c.oid, c.relname, c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
)
select jsonb_pretty(jsonb_build_object(
  'tables', (
    select jsonb_object_agg(t.relname, jsonb_build_object(
      'rls', t.relrowsecurity,
      'columns', (select jsonb_agg(a.attname order by a.attnum) from pg_attribute a where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped),
      'grants', (select jsonb_agg(distinct g.grantee || ':' || g.privilege_type) from information_schema.role_table_grants g
                  where g.table_schema = 'public' and g.table_name = t.relname and g.grantee in ('anon', 'authenticated')),
      'column_grants', (select jsonb_agg(distinct g.grantee || ':' || g.privilege_type || ':' || g.column_name) from information_schema.column_privileges g
                  where g.table_schema = 'public' and g.table_name = t.relname and g.grantee in ('anon', 'authenticated')
                    and not exists (select 1 from information_schema.role_table_grants r where r.table_schema = 'public' and r.table_name = t.relname
                                    and r.grantee = g.grantee and r.privilege_type = g.privilege_type)),
      'policies', (select jsonb_agg(jsonb_build_object('name', p.policyname, 'cmd', p.cmd, 'roles', p.roles, 'using', p.qual, 'check', p.with_check))
                     from pg_policies p where p.schemaname = 'public' and p.tablename = t.relname),
      'triggers', (select jsonb_agg(tg.tgname || ' -> ' || tg.tgfoid::regproc::text) from pg_trigger tg where tg.tgrelid = t.oid and not tg.tgisinternal)
    ))
    from tables t
  ),
  'functions', (
    select jsonb_object_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', jsonb_build_object(
      'security_definer', p.prosecdef,
      'callable_by', (select jsonb_agg(r) from unnest(array['anon', 'authenticated']) r where has_function_privilege(r, p.oid, 'execute')),
      'source', left(regexp_replace(p.prosrc, '\s+', ' ', 'g'), 1500)))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
  ),
  'auth_triggers', (select jsonb_agg(tg.tgname || ' -> ' || tg.tgfoid::regproc::text) from pg_trigger tg where tg.tgrelid = 'auth.users'::regclass and not tg.tgisinternal),
  'storage_buckets', (select jsonb_agg(jsonb_build_object('id', id, 'public', public)) from storage.buckets),
  'storage_policies', (select jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check))
                         from pg_policies where schemaname = 'storage'),
  'edge_function_hint', 'Also list Edge Functions from the dashboard (names only).'
)) as security_snapshot;
