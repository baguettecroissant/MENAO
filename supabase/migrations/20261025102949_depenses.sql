-- Dépenses de l'artisan (F-62, ADR 0186) : achats de fournitures, d'outillage, locations… avec leur
-- pièce (facture ou ticket), rattachés à un chantier ou « à classer ». MENAO ne paie rien : c'est un
-- suivi, le statut de paiement est indiqué par l'artisan. Les dépenses ne sont lisibles que par
-- l'artisan lui-même (ni le client, ni l'équipe MENAO). Montants en centimes, TTC calculé.
create type public.expense_kind as enum ('facture', 'ticket');
create type public.expense_category as enum (
  'materiaux', 'outillage', 'location', 'sous_traitance', 'carburant', 'autre'
);
-- Saisie dans MENAO (photo, PDF ou à la main) ; « facture_electronique » : reçue par la plateforme
-- agréée, quand elle sera choisie (décision D13).
create type public.expense_origin as enum ('manuelle', 'facture_electronique');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  chantier_id uuid references public.chantiers (id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  supplier_name text check (char_length(supplier_name) between 1 and 120),
  reference text check (char_length(reference) between 1 and 60),
  kind public.expense_kind not null default 'facture',
  category public.expense_category,
  origin public.expense_origin not null default 'manuelle',
  issued_on date not null,
  due_on date,
  paid_on date,
  total_ht_cents bigint not null check (total_ht_cents between 0 and 1000000000),
  total_tva_cents bigint not null check (total_tva_cents between 0 and 1000000000),
  -- Toujours calculé (CLAUDE.md règle 5).
  total_ttc_cents bigint generated always as (total_ht_cents + total_tva_cents) stored,
  notes text check (char_length(notes) <= 1000),
  -- Pièce rangée par process-upload dans « expense-documents/<artisan_id>/<expense_id>/… ».
  document_path text,
  document_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_artisan_date_idx on public.expenses (artisan_id, issued_on desc);
create index expenses_chantier_idx on public.expenses (chantier_id) where chantier_id is not null;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function app.set_updated_at();

alter table public.expenses enable row level security;
revoke all on public.expenses from anon, authenticated;
grant select on public.expenses to authenticated;
create policy "expenses : lecture par l'artisan"
  on public.expenses for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- Lignes lues sur la pièce (quantités en millièmes, prix en centimes, comme les devis) : elles
-- serviront aux prix d'achat de la bibliothèque d'ouvrages.
create table public.expense_lines (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  designation text not null check (char_length(designation) between 1 and 200),
  reference text check (char_length(reference) between 1 and 60),
  quantity_milli integer check (quantity_milli between 1 and 100000000),
  unit public.quote_unit,
  unit_price_ht_cents integer check (unit_price_ht_cents between 0 and 1000000000),
  total_ht_cents bigint check (total_ht_cents between 0 and 1000000000),
  unique (expense_id, position)
);

alter table public.expense_lines enable row level security;
revoke all on public.expense_lines from anon, authenticated;
grant select on public.expense_lines to authenticated;
create policy "expense_lines : lecture par l'artisan"
  on public.expense_lines for select to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.artisan_id = (select app.my_artisan_id())
    )
  );

-- Pièces des dépenses (CLAUDE.md règle 8) : espace privé, lu par l'artisan avec des URL signées.
-- Dépôt par process-upload seulement ; l'artisan peut retirer ses pièces (suppression de la dépense).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('expense-documents', 'expense-documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "expense-documents : lecture par l'artisan"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'expense-documents'
    and (storage.foldername(name))[1] = (select app.my_artisan_id())::text
  );
create policy "expense-documents : suppression par l'artisan"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'expense-documents'
    and (storage.foldername(name))[1] = (select app.my_artisan_id())::text
  );

-- Artisan de l'espace pro (validé, ou suspendu et radié qui gardent l'accès à leurs comptes).
create function app.my_pro_artisan_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.artisans
  where user_id = (select auth.uid()) and status in ('valide', 'suspendu', 'radie')
$$;

-- Création (p_expense_id null) ou modification d'une dépense. `p_lines` : lignes lues sur la pièce,
-- qui remplacent les précédentes ; null les garde telles quelles.
create function public.artisan_save_expense(p_expense_id uuid, p_expense jsonb, p_lines jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_pro_artisan_id();
  v_chantier uuid := nullif(p_expense ->> 'chantier_id', '')::uuid;
  v_id uuid;
  v_line jsonb;
  v_position smallint := 0;
begin
  if v_artisan is null then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if v_chantier is not null and not exists (
    select 1 from public.chantiers c where c.id = v_chantier and c.artisan_id = v_artisan
  ) then
    raise exception 'chantier_inconnu' using errcode = '22023';
  end if;
  if p_lines is not null
    and (jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 100) then
    raise exception 'lignes_invalides' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses (
      artisan_id, chantier_id, title, supplier_name, reference, kind, category, issued_on, due_on,
      paid_on, total_ht_cents, total_tva_cents, notes
    ) values (
      v_artisan,
      v_chantier,
      p_expense ->> 'title',
      nullif(p_expense ->> 'supplier_name', ''),
      nullif(p_expense ->> 'reference', ''),
      coalesce((p_expense ->> 'kind')::public.expense_kind, 'facture'),
      nullif(p_expense ->> 'category', '')::public.expense_category,
      (p_expense ->> 'issued_on')::date,
      nullif(p_expense ->> 'due_on', '')::date,
      nullif(p_expense ->> 'paid_on', '')::date,
      (p_expense ->> 'total_ht_cents')::bigint,
      (p_expense ->> 'total_tva_cents')::bigint,
      nullif(p_expense ->> 'notes', '')
    )
    returning id into v_id;
  else
    update public.expenses set
      chantier_id = v_chantier,
      title = p_expense ->> 'title',
      supplier_name = nullif(p_expense ->> 'supplier_name', ''),
      reference = nullif(p_expense ->> 'reference', ''),
      kind = coalesce((p_expense ->> 'kind')::public.expense_kind, 'facture'),
      category = nullif(p_expense ->> 'category', '')::public.expense_category,
      issued_on = (p_expense ->> 'issued_on')::date,
      due_on = nullif(p_expense ->> 'due_on', '')::date,
      paid_on = nullif(p_expense ->> 'paid_on', '')::date,
      total_ht_cents = (p_expense ->> 'total_ht_cents')::bigint,
      total_tva_cents = (p_expense ->> 'total_tva_cents')::bigint,
      notes = nullif(p_expense ->> 'notes', '')
    where id = p_expense_id and artisan_id = v_artisan
    returning id into v_id;
    if v_id is null then
      raise exception 'depense_inconnue' using errcode = 'P0002';
    end if;
  end if;

  if p_lines is not null then
    delete from public.expense_lines where expense_id = v_id;
    for v_line in select value from jsonb_array_elements(p_lines) loop
      v_position := v_position + 1;
      insert into public.expense_lines (
        expense_id, position, designation, reference, quantity_milli, unit, unit_price_ht_cents,
        total_ht_cents
      ) values (
        v_id,
        v_position,
        v_line ->> 'designation',
        nullif(v_line ->> 'reference', ''),
        (v_line ->> 'quantity_milli')::integer,
        nullif(v_line ->> 'unit', '')::public.quote_unit,
        (v_line ->> 'unit_price_ht_cents')::integer,
        (v_line ->> 'total_ht_cents')::bigint
      );
    end loop;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.artisan_save_expense(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.artisan_save_expense(uuid, jsonb, jsonb) to authenticated;

-- « Marquer comme payée » (date du paiement) ou « Marquer comme non payée » (null).
create function public.artisan_set_expense_paid(p_expense_id uuid, p_paid_on date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_pro_artisan_id();
begin
  if v_artisan is null then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  update public.expenses set paid_on = p_paid_on
  where id = p_expense_id and artisan_id = v_artisan;
  return found;
end;
$$;
revoke execute on function public.artisan_set_expense_paid(uuid, date) from public, anon;
grant execute on function public.artisan_set_expense_paid(uuid, date) to authenticated;

-- Suppression : renvoie le chemin de la pièce (chaîne vide sans pièce), que l'appelant retire de
-- l'espace de stockage.
create function public.artisan_delete_expense(p_expense_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_pro_artisan_id();
  v_path text;
begin
  if v_artisan is null then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  delete from public.expenses
  where id = p_expense_id and artisan_id = v_artisan
  returning coalesce(document_path, '') into v_path;
  if v_path is null then
    raise exception 'depense_inconnue' using errcode = 'P0002';
  end if;
  return v_path;
end;
$$;
revoke execute on function public.artisan_delete_expense(uuid) from public, anon;
grant execute on function public.artisan_delete_expense(uuid) to authenticated;

-- Journal des appels à l'IA : métriques de la lecture des pièces (jamais la pièce ni ses montants).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense'
  ));
