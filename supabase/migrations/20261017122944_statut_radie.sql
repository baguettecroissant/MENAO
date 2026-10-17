-- Statut « Radié » (ADR 0114), demandé par le cahier des charges « Inscription et vérification des
-- artisans » et prévu par la charte qualité (« 4. Radiation : retrait définitif du réseau
-- Menao ») : exclusion définitive décidée par l'équipe (fraude, manquement grave à la charte),
-- avec un motif transmis à l'artisan. Le profil n'est plus jamais visible ; l'artisan garde,
-- comme un artisan suspendu, l'accès à son espace (chantiers en cours, factures).
-- TODO(legal) : règlement P2B (UE 2019/1150, art. 4) — préavis de 30 jours sauf manquements
-- graves ou répétés ; motivation, réclamation et mention dans les CGV artisans à faire valider.

alter table public.artisans
  add column radiated_at timestamptz,
  add column radiation_reason text check (char_length(radiation_reason) <= 1000);
comment on column public.artisans.radiation_reason is
  'Motif de la radiation, transmis à l''artisan (ADR 0114).';

-- Une radiation est définitive : aucun passage vers un autre statut (une intervention manuelle
-- en base reste possible avec menao.levee_radiation, tracée par l'équipe).
create function app.artisans_guard_radiation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'radie' and new.status is distinct from 'radie'
     and coalesce(current_setting('menao.levee_radiation', true), '') <> 'on' then
    raise exception 'Un artisan radié ne change plus de statut.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function app.artisans_guard_radiation() from public, anon, authenticated;
create trigger artisans_guard_radiation before update of status on public.artisans
  for each row execute function app.artisans_guard_radiation();

-- Radiation par l'équipe MENAO (admin), quel que soit le statut du dossier.
create function public.admin_radiate_artisan(p_artisan_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_user uuid;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'Indiquez le motif de la radiation (1 000 caractères au plus).' using errcode = '22023';
  end if;
  update public.artisans
  set status = 'radie', radiated_at = now(), radiation_reason = v_reason, suspension_reason = null
  where id = p_artisan_id and status <> 'radie'
  returning user_id into v_user;
  if not found then
    raise exception 'Artisan introuvable ou déjà radié.' using errcode = '22023';
  end if;
  perform app.audit('artisan.radie', 'artisan', p_artisan_id, jsonb_build_object('motif', v_reason));
  perform app.notify(v_user, 'compte_radie', jsonb_build_object('motif', v_reason));
end;
$$;
revoke execute on function public.admin_radiate_artisan(uuid, text) from public, anon;
grant execute on function public.admin_radiate_artisan(uuid, text) to authenticated;
