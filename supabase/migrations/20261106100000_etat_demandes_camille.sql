-- « Où en est ma demande ? » (F-79, ADR 0229) : Camille côté particuliers envoie l'état des
-- demandes de travaux par e-mail, à l'adresse du compte, sans rien en dire au téléphone
-- (l'appelant n'est pas identifié). Même principe que l'état du dossier d'un artisan (ADR 0225).
--
-- Contenu : les 5 derniers projets envoyés depuis 120 jours, avec la réponse de chaque artisan, et
-- les demandes préparées au téléphone qui attendent encore la vérification du particulier (lien de
-- l'e-mail encore valable, ADR 0227), même sans compte. Rien si l'adresse n'a ni compte particulier
-- ni demande préparée en attente.

create function public.voice_requests_for_email(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
  v_first_name text;
  v_voice_name text;
  v_pending int;
  v_projects jsonb := '[]'::jsonb;
begin
  if v_email = '' then
    return null;
  end if;

  select u.id, nullif(btrim(pf.first_name), '') into v_user, v_first_name
  from auth.users u
  left join public.profiles pf on pf.user_id = u.id
  where lower(u.email) = v_email
    and not u.is_anonymous
    and coalesce(u.raw_app_meta_data ->> 'role', '') = 'particulier'
  limit 1;

  select count(*)::int, max(v.first_name) into v_pending, v_voice_name
  from public.voice_work_requests v
  join public.project_transfers t on t.id = v.transfer_id
  where v.email = v_email and t.used_at is null and t.expires_at > now();
  -- Le prénom du compte l'emporte sur celui dicté au téléphone.
  v_first_name := coalesce(v_first_name, v_voice_name);

  if v_user is null and v_pending = 0 then
    return null;
  end if;

  if v_user is not null then
    select coalesce(jsonb_agg(x.projet order by x.envoye_le desc), '[]'::jsonb) into v_projects
    from (
      select
        min(r.created_at) as envoye_le,
        jsonb_build_object(
          'resume', coalesce(p.summary, t.label),
          'metier', t.label,
          'commune', p.ville_nom,
          'envoye_le', min(r.created_at),
          'artisans', jsonb_agg(
            jsonb_build_object(
              'nom', coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
              'statut', r.status
            )
            order by r.created_at
          )
        ) as projet
      from public.requests r
      join public.projects p on p.id = r.project_id
      join public.artisans a on a.id = r.artisan_id
      left join public.trades t on t.code = p.trade_code
      left join public.profiles pr on pr.user_id = a.user_id
      where r.particulier_id = v_user and r.created_at > now() - interval '120 days'
      group by p.id, p.summary, t.label, p.ville_nom
      order by min(r.created_at) desc
      limit 5
    ) x;
  end if;

  return jsonb_build_object(
    'prenom', v_first_name,
    'compte', v_user is not null,
    'demandes_a_verifier', v_pending,
    'projets', v_projects
  );
end;
$$;
revoke execute on function public.voice_requests_for_email(text) from public, anon, authenticated;
grant execute on function public.voice_requests_for_email(text) to service_role;
