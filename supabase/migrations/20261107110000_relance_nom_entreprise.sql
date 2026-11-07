-- Relance des impayés (ADR 0238) : le rappel part au nom de l'entreprise de l'artisan (nom
-- commercial, sinon raison sociale), et non de son prénom comme les autres notifications.
create or replace function app.remind_payment(
  p_artisan_id uuid,
  p_chantier_id uuid,
  p_kind public.payment_kind,
  p_mode text,
  p_step smallint,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_client uuid;
  v_title text;
  v_company text;
begin
  select x into v_item
  from jsonb_array_elements(app.money_open_items(p_artisan_id)) x
  where x ->> 'chantier_id' = p_chantier_id::text and x ->> 'tranche' = p_kind::text;
  if v_item is null then
    return false;
  end if;
  select c.particulier_id, c.title into v_client, v_title from public.chantiers c where c.id = p_chantier_id;
  select coalesce(a.nom_commercial, a.raison_sociale, app.artisan_display_name(a.id)) into v_company
  from public.artisans a where a.id = p_artisan_id;
  perform app.notify(v_client, 'paiement_relance', jsonb_build_object(
    'chantier_id', p_chantier_id,
    'titre', v_title,
    'artisan', v_company,
    'tranche', p_kind,
    'montant', (v_item ->> 'montant_cents')::bigint
  ));
  insert into public.payment_reminders (artisan_id, chantier_id, kind, mode, step, sent_at)
  values (p_artisan_id, p_chantier_id, p_kind, p_mode, p_step, p_now);
  return true;
end;
$$;
revoke execute on function app.remind_payment(uuid, uuid, public.payment_kind, text, smallint, timestamptz)
  from public, anon, authenticated;
