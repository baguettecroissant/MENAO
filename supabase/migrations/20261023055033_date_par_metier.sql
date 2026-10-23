-- Date souhaitée par métier (ADR 0169, suite des ADR 0167 et 0168) : dans un chantier à plusieurs
-- métiers, le particulier peut indiquer pour chaque lot une date de début qui lui est propre (le
-- carreleur après le plombier), sinon celle du chantier. Indicatif : chaque artisan fixe ses dates
-- avec le client, MENAO ne coordonne pas.

-- Dates propres aux lots, sur le projet principal : { "<métier>": { date_mode, date_souhaitee } }.
alter table public.projects
  add column lot_dates jsonb not null default '{}' check (jsonb_typeof(lot_dates) = 'object');

-- Date d'un lot, choisie par le particulier sur le chantier : mode null pour reprendre celle du
-- chantier. Le lot déjà créé et pas encore envoyé suit aussitôt ; un lot envoyé ne change plus.
create function public.set_lot_start(
  p_project_id uuid,
  p_trade_code text,
  p_date_mode public.project_date_mode,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.projects;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_mode public.project_date_mode;
  v_date date;
begin
  select * into r from public.projects
  where id = p_project_id and user_id = auth.uid() and parent_project_id is null;
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if p_trade_code is null or not (p_trade_code = any (r.lot_trades)) then
    raise exception 'Ce métier ne fait pas partie du chantier' using errcode = '22023';
  end if;
  if p_date_mode = 'date' and (p_date is null or p_date < v_today) then
    raise exception 'La date de début ne peut pas être passée' using errcode = '22023';
  end if;
  if p_date_mode is null then
    update public.projects set lot_dates = lot_dates - p_trade_code where id = p_project_id;
    v_mode := r.date_mode;
    v_date := r.date_souhaitee;
  else
    v_mode := p_date_mode;
    v_date := case when p_date_mode = 'date' then p_date end;
    update public.projects
    set lot_dates = lot_dates || jsonb_build_object(p_trade_code,
      jsonb_build_object('date_mode', v_mode, 'date_souhaitee', v_date))
    where id = p_project_id;
  end if;
  update public.projects l
  set date_mode = v_mode, date_souhaitee = case when v_mode = 'date' then v_date end
  where l.parent_project_id = p_project_id and l.trade_code = p_trade_code
    and not exists (select 1 from public.requests q where q.project_id = l.id);
end;
$$;
revoke execute on function public.set_lot_start(uuid, text, public.project_date_mode, date) from public, anon;
grant execute on function public.set_lot_start(uuid, text, public.project_date_mode, date) to authenticated;

-- Lots au lancement de la recherche : date propre au métier.
create or replace function app.sync_project_lots(p_root uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.projects;
  t text;
  v_lot uuid;
  v_works text[];
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_mode public.project_date_mode;
  v_date date;
begin
  select * into r from public.projects where id = p_root;
  if not found or r.parent_project_id is not null then
    return;
  end if;
  delete from public.projects l
  where l.parent_project_id = p_root
    and (l.trade_code is null or l.trade_code = r.trade_code or not (l.trade_code = any (r.lot_trades)))
    and not exists (select 1 from public.requests q where q.project_id = l.id);

  foreach t in array r.lot_trades loop
    continue when t = r.trade_code or r.trade_code is null;
    v_works := array(
      select distinct w.code
      from jsonb_array_elements(r.suggested_lots) s
      cross join lateral jsonb_array_elements_text(coalesce(s -> 'work_type_codes', '[]')) c(code)
      join public.work_types w on w.code = c.code and w.trade_code = t and w.active
      where s ->> 'trade_code' = t
    );
    -- Date propre au métier (ADR 0169), sinon celle du chantier ; une date passée ne vaut plus.
    v_mode := coalesce((r.lot_dates -> t ->> 'date_mode')::public.project_date_mode, r.date_mode);
    v_date := case when r.lot_dates ? t then (r.lot_dates -> t ->> 'date_souhaitee')::date else r.date_souhaitee end;
    if v_mode = 'date' and (v_date is null or v_date < v_today) then
      v_mode := r.date_mode;
      v_date := r.date_souhaitee;
    end if;
    if v_mode <> 'date' then
      v_date := null;
    end if;
    select id into v_lot from public.projects where parent_project_id = p_root and trade_code = t;
    if v_lot is null then
      insert into public.projects (user_id, parent_project_id, status, description, summary, artisan_brief,
        trade_code, lieu_type, room_codes, work_type_codes, surface, budget, ville_code_insee, ville_nom,
        code_postal, ville_location, adresse, location, date_mode, date_souhaitee, urgence, criteria_validated_at)
      values (r.user_id, p_root, 'criteres_valides', r.description, r.summary, r.artisan_brief,
        t, r.lieu_type, r.room_codes, v_works, r.surface, r.budget, r.ville_code_insee, r.ville_nom,
        r.code_postal, r.ville_location, r.adresse, r.location, v_mode, v_date, r.urgence, now())
      returning id into v_lot;
    elsif exists (select 1 from public.requests q where q.project_id = v_lot) then
      continue;
    else
      update public.projects set
        status = 'criteres_valides', criteria_validated_at = now(),
        description = r.description, summary = r.summary, artisan_brief = r.artisan_brief,
        lieu_type = r.lieu_type, room_codes = r.room_codes, work_type_codes = v_works,
        surface = r.surface, budget = r.budget, ville_code_insee = r.ville_code_insee,
        ville_nom = r.ville_nom, code_postal = r.code_postal, ville_location = r.ville_location,
        adresse = r.adresse, location = r.location, date_mode = v_mode,
        date_souhaitee = v_date, urgence = r.urgence
      where id = v_lot;
    end if;
    delete from public.project_photos where project_id = v_lot;
    insert into public.project_photos (project_id, storage_path, sort_order)
    select v_lot, ph.storage_path, ph.sort_order from public.project_photos ph where ph.project_id = p_root;
  end loop;
end;
$$;
