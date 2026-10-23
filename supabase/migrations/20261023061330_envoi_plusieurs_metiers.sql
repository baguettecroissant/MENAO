-- Un seul envoi pour plusieurs métiers d'un chantier (ADR 0170, suite des ADR 0167 à 0169) : le
-- particulier choisit des artisans dans plusieurs lots et envoie une seule fois son message, son
-- téléphone et sa préférence de rappel. Chaque lot garde ses règles (`send_project_requests` :
-- 3 artisans au plus par métier, artisans toujours disponibles, limite des projets ouverts).
-- Tout ou rien : si un métier est refusé, aucune demande ne part.

create function public.send_chantier_requests(
  p_project_id uuid,
  p_selections jsonb,
  p_message text,
  p_phone text,
  p_callback_mode public.callback_mode,
  p_callback_from time,
  p_callback_to time
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  s jsonb;
  v_project uuid;
  v_label text;
  v_seen uuid[] := '{}';
  v_total int := 0;
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id and user_id = auth.uid() and parent_project_id is null
  ) then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if jsonb_typeof(p_selections) is distinct from 'array' or jsonb_array_length(p_selections) = 0 then
    raise exception 'Sélectionnez au moins un artisan' using errcode = '22023';
  end if;
  if jsonb_array_length(p_selections) > 5 then
    raise exception 'Quatre autres métiers au plus pour un même chantier' using errcode = '22023';
  end if;

  for s in select value from jsonb_array_elements(p_selections) loop
    v_project := (s ->> 'project_id')::uuid;
    -- Le chantier lui-même ou un de ses lots, une seule fois chacun.
    select t.label into v_label
    from public.projects p
    left join public.trades t on t.code = p.trade_code
    where p.id = v_project and p.user_id = auth.uid()
      and (p.id = p_project_id or p.parent_project_id = p_project_id);
    if not found or v_project = any (v_seen) then
      raise exception 'Projet introuvable' using errcode = '42501';
    end if;
    v_seen := v_seen || v_project;
    begin
      v_total := v_total + public.send_project_requests(v_project,
        array(select jsonb_array_elements_text(coalesce(s -> 'artisan_ids', '[]')))::uuid[],
        p_message, p_phone, p_callback_mode, p_callback_from, p_callback_to);
    exception when sqlstate '22023' then
      -- Le message dit quel métier bloque ; l'exception annule tout l'envoi.
      raise exception '%', format('%s : %s', coalesce(v_label, 'Métier'), sqlerrm) using errcode = '22023';
    end;
  end loop;
  return v_total;
end;
$$;
revoke execute on function public.send_chantier_requests(uuid, jsonb, text, text, public.callback_mode, time, time) from public, anon;
grant execute on function public.send_chantier_requests(uuid, jsonb, text, text, public.callback_mode, time, time) to authenticated;
