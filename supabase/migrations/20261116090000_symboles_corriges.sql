-- Symboles corrigés par l'artisan (F-159, lot 7, PR B, ADR 0337).
-- Sur l'écran de vérification, l'artisan ajoute, retire ou change de type un symbole d'une page
-- de plan, et tranche un groupe « à vérifier ». Les symboles de cette page sont remplacés ; ceux
-- des autres pages restent. La vérification des quantités du DPGF est à refaire.

create function public.artisan_save_plan_symbols(
  p_tender_id uuid,
  p_file integer,
  p_page integer,
  p_symbols jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_page jsonb;
  v_others jsonb;
begin
  if p_file is null or p_file not between 1 and 10 or p_page is null or p_page not between 1 and 999 then
    raise exception 'Page de plan invalide.' using errcode = '22023';
  end if;
  if p_symbols is null or jsonb_typeof(p_symbols) <> 'array'
    or jsonb_array_length(p_symbols) > 600 then
    raise exception 'Symboles invalides (600 au plus par page).' using errcode = '22023';
  end if;
  -- Les symboles envoyés sont ceux de cette page, quelle que soit la page qu'ils annoncent.
  select app.plan_symbols(coalesce(jsonb_agg(
      s || jsonb_build_object('file', p_file, 'page', p_page)
    ), '[]'::jsonb))
  into v_page
  from jsonb_array_elements(p_symbols) s;
  select coalesce(jsonb_agg(s), '[]'::jsonb) into v_others
  from jsonb_array_elements(t.plan_symbols) s
  where not ((s ->> 'file')::integer = p_file and (s ->> 'page')::integer = p_page);
  if jsonb_array_length(v_others) + jsonb_array_length(v_page) > 3000 then
    raise exception 'Trop de symboles sur cet appel d''offres.' using errcode = '22023';
  end if;
  update public.tenders
  set plan_symbols = v_others || v_page,
    quantities_checked_at = null
  where id = t.id;
  return jsonb_array_length(v_page);
end;
$$;

revoke execute on function public.artisan_save_plan_symbols(uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.artisan_save_plan_symbols(uuid, integer, integer, jsonb) to authenticated;
