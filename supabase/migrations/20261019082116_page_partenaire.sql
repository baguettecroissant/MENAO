-- Pages co-marquées (F-59, lot 3, ADR 0142) : « <Partenaire> vous recommande MENAO », avec le
-- message du partenaire et le formulaire de demande de travaux. Activée par un admin, partenaire
-- par partenaire ; lue sans compte (nom, code, message) ; jamais pour un partenaire suspendu.

alter table public.partners
  add column page_publique boolean not null default false,
  add column page_message text check (char_length(page_message) <= 400);

create function public.partner_page(p_code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object('nom', p.nom, 'code', p.code, 'message', p.page_message)
  from public.partners p
  where p.code = lower(btrim(p_code)) and p.status = 'actif' and p.page_publique
$$;
revoke execute on function public.partner_page(text) from public;
grant execute on function public.partner_page(text) to anon, authenticated;

create function public.admin_save_partner_page(p_id uuid, p_publique boolean, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_id uuid;
begin
  perform app.require_admin();
  if char_length(v_message) > 400 then
    raise exception 'Message de recommandation : 400 caractères au plus.' using errcode = '22023';
  end if;
  update public.partners set page_publique = coalesce(p_publique, false), page_message = v_message
  where id = p_id
  returning id into v_id;
  if v_id is null then
    raise exception 'Partenaire introuvable.' using errcode = '22023';
  end if;
  perform app.audit('partenaire.page', 'partenaire', v_id,
    jsonb_build_object('publique', coalesce(p_publique, false)));
end;
$$;
revoke execute on function public.admin_save_partner_page(uuid, boolean, text) from public, anon;
grant execute on function public.admin_save_partner_page(uuid, boolean, text) to authenticated;

-- Espace partenaire : indique si sa page de recommandation est en ligne.
create or replace function public.partner_dashboard(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_settings public.partner_settings;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return null;
  end if;
  select * into v_partner from public.partners where dashboard_token = p_token;
  if v_partner.id is null then
    return null;
  end if;
  select * into v_settings from public.partner_settings;
  return json_build_object(
    'nom', v_partner.nom,
    'code', v_partner.code,
    'status', v_partner.status,
    'projects', (select count(*) from public.partner_attributions a
                 where a.partner_id = v_partner.id and a.project_id is not null),
    'qualified', (select count(*) from public.partner_commissions c
                  where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'),
    'artisans', (select count(*) from public.partner_attributions a
                 where a.partner_id = v_partner.id and a.artisan_id is not null),
    'paying', (select count(*) from public.partner_commissions c
               where c.partner_id = v_partner.id and c.kind = 'abonne_payant' and c.status <> 'annulee'),
    'pending_cents', (select coalesce(sum(c.amount_cents), 0) from public.partner_commissions c
                      where c.partner_id = v_partner.id and c.status = 'en_attente'),
    'validated_cents', (select coalesce(sum(c.amount_cents), 0) from public.partner_commissions c
                        where c.partner_id = v_partner.id and c.status = 'validee'),
    'paid_cents', (select coalesce(sum(c.amount_cents), 0) from public.partner_commissions c
                   where c.partner_id = v_partner.id and c.status = 'payee'),
    'montant_demande_centimes', coalesce(v_partner.montant_demande_centimes, v_settings.montant_demande_centimes),
    'montant_abonne_centimes', coalesce(v_partner.montant_abonne_centimes, v_settings.montant_abonne_centimes),
    'delai_validation_jours', v_settings.delai_validation_jours,
    'page_publique', v_partner.page_publique
  );
end;
$$;
