-- Motifs de refus en liste (ADR 0120), demandés par le cahier des charges « Inscription et
-- vérification des artisans » : l'équipe choisit un motif (DOCUMENT_REFUSAL_CODES,
-- packages/validation), gardé en base pour les statistiques ; l'artisan reçoit le message composé
-- par le back-office (libellé du motif et précision), dans refusal_reason comme avant.

alter table public.artisan_documents
  add column refusal_code text check (refusal_code in (
    'illisible', 'incomplet', 'expire', 'mauvais_document', 'nom_different', 'siret_different',
    'dates_differentes', 'couverture_insuffisante', 'code_securite_invalide', 'autre'
  ));
comment on column public.artisan_documents.refusal_code is
  'Motif de refus choisi par l''équipe (liste fermée) ; le message à l''artisan est dans refusal_reason.';

-- Décision sur un document (même fonction qu'avant), avec le motif de la liste pour un refus.
drop function public.admin_review_document(uuid, public.document_status, text);
create function public.admin_review_document(
  p_document_id uuid,
  p_status public.document_status,
  p_reason text default null,
  p_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.artisan_documents;
begin
  perform app.require_admin();
  if p_status not in ('valide', 'refuse') then
    raise exception 'Décision attendue : valide ou refuse.' using errcode = '22023';
  end if;
  if p_status = 'refuse' and (p_code is null or nullif(btrim(coalesce(p_reason, '')), '') is null) then
    raise exception 'Motif de refus obligatoire.' using errcode = '22023';
  end if;

  select * into d from public.artisan_documents where id = p_document_id for update;
  if not found or d.status = 'remplace' then
    raise exception 'Document introuvable.' using errcode = '22023';
  end if;

  if p_status = 'valide' then
    update public.artisan_documents set status = 'remplace'
    where artisan_id = d.artisan_id and type = d.type and status = 'valide' and id <> d.id;
  end if;

  update public.artisan_documents set
    status = p_status,
    refusal_reason = case when p_status = 'refuse' then left(btrim(p_reason), 500) end,
    refusal_code = case when p_status = 'refuse' then p_code end,
    verified_at = now(),
    verified_by = (select auth.uid())
  where id = d.id;

  perform app.audit('document.' || p_status::text, 'artisan_document', d.id,
    jsonb_build_object('artisan_id', d.artisan_id, 'type', d.type, 'motif', p_reason, 'code', p_code));

  if p_status = 'valide' then
    perform app.reactivate_if_compliant(d.artisan_id);
  end if;
end;
$$;
revoke execute on function public.admin_review_document(uuid, public.document_status, text, text) from public, anon;
grant execute on function public.admin_review_document(uuid, public.document_status, text, text) to authenticated;
