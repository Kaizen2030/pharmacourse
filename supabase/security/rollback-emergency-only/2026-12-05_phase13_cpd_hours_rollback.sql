-- ROLLBACK for 2026-12-05_phase13_cpd_hours.sql. Safe to run even if phase 13 was never applied.
-- Removes the range check and the clean-up marker. CPD hours you set are kept (cleared courses stay empty).
begin;
do $$ begin
  if to_regclass('public.courses') is not null then
    alter table public.courses drop constraint if exists courses_cpd_hours_range;
  end if;
  if to_regclass('public.schema_markers') is not null then
    delete from public.schema_markers where name = 'phase13_cpd_default_cleared';
  end if;
end $$;
commit;
