-- Points à vérifier, validés un par un (F-159, lot 56, ADR 0343).
-- Pour chaque point validé, la valeur validée : surface en cm² d'une pièce, quantité en millièmes
-- d'un ouvrage, null pour un type de symbole. Un point reste fait tant que la valeur n'a pas
-- changé (packages/core, planVerifyPoints) ; les clés suivent le nom, pas l'identifiant, recréé à
-- chaque enregistrement du relevé.

alter table public.tenders
  add column plan_checks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(plan_checks) = 'object');

-- Valide un point : la valeur corrigée (pièce, ouvrage) devient celle de l'artisan, un type de
-- symbole perd ses groupes douteux ; le point est noté fait. La vérification des quantités du DPGF
-- est à refaire.
create function public.artisan_check_plan_point(
  p_tender_id uuid,
  p_key text,
  p_target uuid default null,
  p_value bigint default null,
  p_height_mm integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_kind text := split_part(coalesce(p_key, ''), ':', 1);
  v_type text := substr(coalesce(p_key, ''), char_length(v_kind) + 2);
  v_value bigint := null;
begin
  if p_key is null or char_length(p_key) > 240 or v_kind not in ('piece', 'ouvrage', 'symbole')
    or v_type = '' then
    raise exception 'Point à vérifier invalide.' using errcode = '22023';
  end if;
  if not t.plan_checks ? p_key
    and (select count(*) from jsonb_object_keys(t.plan_checks)) >= 500 then
    raise exception 'Trop de points vérifiés sur cet appel d''offres.' using errcode = '22023';
  end if;

  if v_kind = 'piece' then
    if p_target is null or p_value is null or p_value not between 1 and 100000000
      or (p_height_mm is not null and p_height_mm not between 1500 and 10000) then
      raise exception 'Surface ou hauteur invalide.' using errcode = '22023';
    end if;
    update public.tender_rooms r
    set area_cm2 = p_value::integer,
      height_mm = coalesce(p_height_mm, r.height_mm),
      source = 'saisi',
      uncertain = false
    where r.id = p_target and r.tender_id = t.id;
    if not found then
      raise exception 'Pièce introuvable.' using errcode = '22023';
    end if;
    v_value := p_value;
  elsif v_kind = 'ouvrage' then
    if p_target is null or p_value is null or p_value not between 1 and 10000000000 then
      raise exception 'Quantité invalide.' using errcode = '22023';
    end if;
    update public.tender_works w
    set quantity_milli = p_value,
      source = 'saisi',
      detail = null,
      uncertain = false
    where w.id = p_target and w.tender_id = t.id
      and (w.kind <> 'nombre' or p_value % 1000 = 0);
    if not found then
      raise exception 'Ouvrage introuvable ou quantité invalide.' using errcode = '22023';
    end if;
    v_value := p_value;
  else
    update public.tenders
    set plan_symbols = (
      select coalesce(jsonb_agg(
          case when s.v ->> 'type' = v_type then s.v || '{"doubt": false}'::jsonb else s.v end
          order by s.ord), '[]'::jsonb)
      from jsonb_array_elements(t.plan_symbols) with ordinality as s (v, ord)
    )
    where id = t.id;
  end if;

  update public.tenders
  set plan_checks = plan_checks || jsonb_build_object(p_key, v_value),
    quantities_checked_at = null
  where id = t.id;
end;
$$;
revoke execute on function public.artisan_check_plan_point(uuid, text, uuid, bigint, integer) from public, anon;
grant execute on function public.artisan_check_plan_point(uuid, text, uuid, bigint, integer) to authenticated;
