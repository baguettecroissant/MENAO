-- Garde-fou : la RLS doit être activée sur 100 % des tables du schéma public (spec §18, CLAUDE.md règle 2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select is_empty(
  $$
    select format('%I.%I', n.nspname, c.relname)
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'RLS activée sur toutes les tables du schéma public'
);

select * from finish();
rollback;
