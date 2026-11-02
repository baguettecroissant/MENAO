-- Entreprise vérifiée au registre, à la place du Kbis déposé (ADR 0217) : l'Edge Function
-- sirene-check lit l'annuaire public des entreprises ; si l'entreprise est active et que l'inscrit
-- figure parmi ses dirigeants, une fiche de vérification datée est rangée comme Kbis validé.

-- Origine d'un document : déposé par l'artisan, ou fiche de vérification au registre de MENAO.
alter table public.artisan_documents
  add column source text not null default 'depot' check (source in ('depot', 'registre'));

-- Dernier contrôle au registre et son résultat (raison affichée si le Kbis reste demandé).
alter table public.artisans
  add column registre_statut text check (
    registre_statut in ('verifie', 'inactive', 'introuvable', 'masque', 'dirigeant_absent')
  ),
  add column registre_verifie_le timestamptz;

-- Enregistre le contrôle. Entreprise vérifiée pendant l'inscription (brouillon ou refus) : la fiche
-- (déjà dans le stockage) devient le Kbis validé, et remplace une ancienne fiche ou un Kbis refusé ;
-- un Kbis déposé par l'artisan, en attente ou validé, est conservé.
-- Renvoie { "resultat": "document" | "conserve" | "enregistre", "retires": [chemins à effacer] }.
create function public.record_registry_check(p_artisan_id uuid, p_outcome text, p_document jsonb default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.artisan_status;
  v_removed text[];
begin
  update public.artisans
  set registre_statut = p_outcome, registre_verifie_le = now()
  where id = p_artisan_id
  returning status into v_status;
  if not found then
    raise exception 'Artisan inconnu.' using errcode = 'P0002';
  end if;
  if p_outcome <> 'verifie' or p_document is null or v_status not in ('brouillon', 'refuse') then
    return jsonb_build_object('resultat', 'enregistre', 'retires', '[]'::jsonb);
  end if;
  if exists (
    select 1 from public.artisan_documents d
    where d.artisan_id = p_artisan_id and d.type = 'kbis' and d.source = 'depot'
      and d.status in ('en_attente', 'valide')
  ) then
    return jsonb_build_object('resultat', 'conserve', 'retires', '[]'::jsonb);
  end if;
  with removed as (
    delete from public.artisan_documents d
    where d.artisan_id = p_artisan_id and d.type = 'kbis'
    returning d.storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from removed;
  insert into public.artisan_documents (
    artisan_id, type, source, storage_path, mime_type, size_bytes, date_emission, status, verified_at
  ) values (
    p_artisan_id, 'kbis', 'registre', p_document ->> 'storage_path', 'application/pdf',
    (p_document ->> 'size_bytes')::int, current_date, 'valide', now()
  );
  return jsonb_build_object('resultat', 'document', 'retires', to_jsonb(v_removed));
end;
$$;
revoke execute on function public.record_registry_check(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_registry_check(uuid, text, jsonb) to service_role;
