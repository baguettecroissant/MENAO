-- F-09, F-11, F-12 — nouvelles demandes depuis l'espace client (ADR 0040) : artisan préféré d'une
-- recherche (« Redemander un devis »), annulation d'une demande en attente ou d'un chantier avant
-- l'acompte, par le client, avec un motif ; l'artisan est prévenu.

-- ---------------------------------------------------------------------------
-- « Redemander un devis » : artisan d'un chantier précédent, mis en avant dans les résultats.
-- Écrit par analyze-need (clé serveur), après vérification du chantier commun.
-- ---------------------------------------------------------------------------
alter table public.projects
  add column preferred_artisan_id uuid references public.artisans (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Annulation par le client
-- ---------------------------------------------------------------------------
create type public.client_cancel_reason as enum (
  'plus_besoin', 'autre_artisan', 'delai', 'budget', 'autre'
);

alter table public.requests
  add column cancelled_at timestamptz,
  add column cancellation_reason public.client_cancel_reason,
  add column cancellation_comment text check (char_length(cancellation_comment) <= 500);

-- Demande encore sans réponse : annulée, l'artisan est prévenu (elle libère une place sur le projet).
create function public.particulier_cancel_request(
  p_request_id uuid,
  p_reason public.client_cancel_reason,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.requests;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select * into r from public.requests
  where id = p_request_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if r.status <> 'envoyee' then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  if p_reason is null then
    raise exception 'Choisissez un motif' using errcode = '22023';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'Commentaire trop long (500 caractères au plus)' using errcode = '22023';
  end if;

  update public.requests
  set status = 'annulee', cancelled_at = now(), cancellation_reason = p_reason,
    cancellation_comment = v_comment
  where id = r.id;
  perform app.notify(a.user_id, 'demande_annulee'::public.notification_type, jsonb_build_object(
    'client', cp.first_name,
    'metier', t.label,
    'ville', p.ville_nom,
    'raison', p_reason,
    'message', v_comment
  ))
  from public.artisans a
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  where a.id = r.artisan_id;
end;
$$;
revoke execute on function public.particulier_cancel_request(uuid, public.client_cancel_reason, text) from public, anon;
grant execute on function public.particulier_cancel_request(uuid, public.client_cancel_reason, text) to authenticated;

-- Chantier avant l'acompte (rendez-vous fixé, devis envoyé ou en révision) : annulé par le client,
-- rendez-vous annulé, l'artisan est prévenu. Mêmes états que l'annulation par l'artisan.
create function public.particulier_cancel_chantier(
  p_chantier_id uuid,
  p_reason public.client_cancel_reason,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chantiers;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select * into v from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v.status not in ('rdv_planifie', 'devis_envoye', 'devis_en_revision') then
    raise exception 'Ce chantier ne peut plus être annulé' using errcode = '22023';
  end if;
  if p_reason is null then
    raise exception 'Choisissez un motif' using errcode = '22023';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'Commentaire trop long (500 caractères au plus)' using errcode = '22023';
  end if;

  perform public.transition_chantier(p_chantier_id, 'annulation', jsonb_strip_nulls(jsonb_build_object(
    'par', 'particulier',
    'raison', p_reason,
    'motif', v_comment
  )));
  update public.appointments set status = 'annule' where chantier_id = p_chantier_id and status = 'planifie';
  update public.requests
  set status = 'annulee', cancelled_at = now(), cancellation_reason = p_reason,
    cancellation_comment = v_comment
  where id = v.request_id;
  perform app.notify(a.user_id, 'chantier_annule'::public.notification_type, jsonb_build_object(
    'destinataire', 'artisan',
    'chantier_id', v.id,
    'titre', v.title,
    'client', cp.first_name,
    'raison', p_reason,
    'message', v_comment
  ))
  from public.artisans a
  left join public.profiles cp on cp.user_id = v.particulier_id
  where a.id = v.artisan_id;
end;
$$;
revoke execute on function public.particulier_cancel_chantier(uuid, public.client_cancel_reason, text) from public, anon;
grant execute on function public.particulier_cancel_chantier(uuid, public.client_cancel_reason, text) to authenticated;
