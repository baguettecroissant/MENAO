-- Notification « mois offert » (ADR 0166) : l'artisan qui reçoit son mois offert de démarrage
-- (aucun devis signé pendant ses 2 premiers mois payants, ADR 0160) en est prévenu par e-mail et
-- dans son espace web, jamais en push ni dans l'application (CLAUDE.md règle 10 : l'abonnement ne
-- s'évoque pas dans l'app ; WEB_ONLY_NOTIFICATIONS côté application).

-- Paiement et avantages de l'abonnement : jamais en push.
create or replace function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and new.type not in ('abonnement_impaye', 'mois_offert')
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;

-- Mois offert de démarrage accordé : l'artisan est prévenu (une seule fois, un seul mois par artisan).
create function app.notify_starter_month()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  select a.user_id into v_user from public.artisans a where a.id = new.artisan_id;
  if v_user is not null then
    perform app.notify(v_user, 'mois_offert', jsonb_build_object('raison', 'demarrage'));
  end if;
  return null;
end;
$$;
revoke execute on function app.notify_starter_month() from public, anon, authenticated;
create trigger artisan_free_months_notify_starter after insert on public.artisan_free_months
  for each row when (new.reason = 'demarrage')
  execute function app.notify_starter_month();
