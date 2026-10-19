-- Espace partenaire (F-59, lot 2, ADR 0139) : un lien privé par partenaire (jeton de 48
-- caractères), lu sans compte. Il donne ses chiffres, ses montants et ses liens, jamais de
-- donnée personnelle. L'admin crée ou renouvelle le lien (l'ancien ne répond plus).

alter table public.partners
  add column dashboard_token text unique check (dashboard_token ~ '^[0-9a-f]{48}$');

create function public.admin_renew_partner_dashboard(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  perform app.require_admin();
  update public.partners set dashboard_token = v_token where id = p_id returning id into v_id;
  if v_id is null then
    raise exception 'Partenaire introuvable.' using errcode = '22023';
  end if;
  perform app.audit('partenaire.lien_espace', 'partenaire', v_id, '{}'::jsonb);
  return v_token;
end;
$$;
revoke execute on function public.admin_renew_partner_dashboard(uuid) from public, anon;
grant execute on function public.admin_renew_partner_dashboard(uuid) to authenticated;

-- Lecture sans compte par le jeton : chiffres et montants du partenaire. Lien inconnu : null.
create function public.partner_dashboard(p_token text)
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
    'delai_validation_jours', v_settings.delai_validation_jours
  );
end;
$$;
revoke execute on function public.partner_dashboard(text) from public;
grant execute on function public.partner_dashboard(text) to anon, authenticated;
