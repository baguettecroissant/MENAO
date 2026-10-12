-- F-08 — « Mon compte » (ADR 0039) : date du choix sur les communications marketing (preuve du
-- consentement et de son retrait) et demande de suppression du compte, traitée par l'équipe.

-- ---------------------------------------------------------------------------
-- Consentement marketing : date du dernier choix, posée par la base (jamais par le client).
-- ---------------------------------------------------------------------------
alter table public.profiles add column marketing_updated_at timestamptz;

update public.profiles set marketing_updated_at = created_at where marketing_opt_in;

create function app.profiles_marketing_choice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.marketing_updated_at := case when new.marketing_opt_in then now() end;
  elsif new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_updated_at := now();
  else
    new.marketing_updated_at := old.marketing_updated_at;
  end if;
  return new;
end;
$$;

create trigger profiles_marketing_choice
  before insert or update on public.profiles
  for each row execute function app.profiles_marketing_choice();

-- ---------------------------------------------------------------------------
-- Demande de suppression du compte : un ticket pour l'équipe, une seule demande ouverte à la fois,
-- réponse sous un mois (RGPD, art. 12). L'effacement lui-même est traité par l'équipe.
-- TODO(legal) : durées de conservation et anonymisation (devis, factures et PV restent chez
-- l'artisan au titre de ses obligations comptables) à faire valider par l'avocat.
-- ---------------------------------------------------------------------------
create unique index tickets_une_suppression_ouverte_par_compte
  on public.tickets (user_id) where type = 'suppression_compte' and status <> 'resolu';

create function public.request_account_deletion(p_message text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_created timestamptz;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.tickets (type, user_id, contact_email, subject, message, due_at)
  values ('suppression_compte', v_uid, v_email, 'Suppression du compte',
    nullif(btrim(left(p_message, 1000)), ''), now() + interval '1 month')
  on conflict (user_id) where type = 'suppression_compte' and status <> 'resolu' do nothing
  returning created_at into v_created;
  -- Demande déjà en cours : sa date.
  if v_created is null then
    select created_at into v_created from public.tickets
    where user_id = v_uid and type = 'suppression_compte' and status <> 'resolu';
  end if;
  return v_created;
end;
$$;
revoke execute on function public.request_account_deletion(text) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;
