-- F-13 : signature électronique du devis par le client, chez le prestataire DocuSeal (décision D8 :
-- signature simple, hébergement UE). Cases cochées par le client avant de signer, procédure chez
-- le prestataire, devis signé et fichier de preuve conservés dans un bucket privé. ADR 0022.
-- TODO(legal) : valeur probante de la signature simple avec code à usage unique.

-- ---------------------------------------------------------------------------
-- Devis signé
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column signed_at timestamptz,
  add column signed_pdf_path text check (char_length(signed_pdf_path) <= 300),
  add column signature_proof_path text check (char_length(signature_proof_path) <= 300),
  add constraint quotes_signature_complete check (
    status <> 'signe' or (signed_at is not null and signed_pdf_path is not null)
  );

-- ---------------------------------------------------------------------------
-- Procédures de signature : une seule en cours par devis ; « abandonnee » quand le client
-- décline chez le prestataire ou que le devis n'est plus signable.
-- ---------------------------------------------------------------------------
create type public.signature_request_status as enum ('en_attente', 'signee', 'abandonnee');

create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  provider text not null default 'docuseal' check (provider in ('docuseal')),
  status public.signature_request_status not null default 'en_attente',
  -- Cases cochées (F-13), horodatées, avec les versions des conditions acceptées et l'échéancier.
  consents jsonb not null check (jsonb_typeof(consents) = 'object'),
  external_submission_id text check (char_length(external_submission_id) <= 100),
  external_submitter_id text check (char_length(external_submitter_id) <= 100),
  signing_url text check (signing_url ~ '^https?://' and char_length(signing_url) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index signature_requests_quote_idx on public.signature_requests (quote_id);
create unique index signature_requests_un_en_attente on public.signature_requests (quote_id)
  where status = 'en_attente';
create unique index signature_requests_submitter_idx on public.signature_requests (external_submitter_id)
  where external_submitter_id is not null;
create trigger signature_requests_set_updated_at before update on public.signature_requests
  for each row execute function app.set_updated_at();
alter table public.signature_requests enable row level security;
-- Écriture par les fonctions ci-dessous et par les Edge Functions (service_role) uniquement.
revoke all on public.signature_requests from anon, authenticated;
grant select on public.signature_requests to authenticated;

create policy "signature_requests : lecture par les parties du devis ou l'équipe"
  on public.signature_requests for select to authenticated
  using (
    (select app.is_staff())
    or exists (
      select 1 from public.quotes q
      join public.chantiers c on c.id = q.chantier_id
      where q.id = quote_id
        and (c.particulier_id = (select auth.uid()) or q.artisan_id = (select app.my_artisan_id()))
    )
  );

-- Devis signé et fichier de preuve (F-13, F-43) : servis après contrôle d'accès, jamais en direct.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('quote-signatures', 'quote-signatures', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Données du devis : un devis envoyé expose aussi sa signature (statut courant).
-- ---------------------------------------------------------------------------
create or replace function public.quote_document(p_quote_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when q.status = 'brouillon' then app.quote_live_document(q.id)
    else q.document || jsonb_build_object('quote', (q.document -> 'quote') || jsonb_build_object(
      'status', q.status,
      'signed_at', q.signed_at,
      'signed_pdf_path', q.signed_pdf_path
    ))
  end
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  where q.id = p_quote_id
    and (
      q.artisan_id = app.my_artisan_id()
      or (q.status <> 'brouillon' and (c.particulier_id = auth.uid() or app.is_staff()))
    )
$$;

-- ---------------------------------------------------------------------------
-- « Signer le devis » (F-13) : contrôles, cases cochées, procédure ouverte (ou reprise). La
-- fonction signature-create crée ensuite la demande chez le prestataire.
-- ---------------------------------------------------------------------------
create function public.particulier_start_signature(p_quote_id uuid, p_consents jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes;
  c public.chantiers;
  r public.signature_requests;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_consent text;
begin
  select q2.* into q from public.quotes q2
  join public.chantiers c2 on c2.id = q2.chantier_id
  where q2.id = p_quote_id and c2.particulier_id = auth.uid()
  for update of q2;
  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  select * into c from public.chantiers where id = q.chantier_id;
  if q.status <> 'envoye' or c.status <> 'devis_envoye' then
    raise exception 'Ce devis ne peut plus être signé' using errcode = '22023';
  end if;
  if q.valid_until < v_today then
    raise exception 'Ce devis n''est plus valable : demandez une nouvelle version à l''artisan'
      using errcode = '22023';
  end if;
  foreach v_consent in array array['document', 'cgu_prestataire', 'cgu_menao', 'echeancier'] loop
    if jsonb_typeof(p_consents -> v_consent) is distinct from 'boolean'
       or not (p_consents ->> v_consent)::boolean then
      raise exception 'Cochez toutes les cases pour signer le devis' using errcode = '22023';
    end if;
  end loop;

  select * into r from public.signature_requests where quote_id = q.id and status = 'en_attente';
  if not found then
    insert into public.signature_requests (quote_id, consents)
    values (q.id, jsonb_build_object(
      'acceptees_le', now(),
      'cases', jsonb_build_array('document', 'cgu_prestataire', 'cgu_menao', 'echeancier'),
      'versions', coalesce(p_consents -> 'versions', '{}'::jsonb),
      'echeancier', q.payment_schedule
    ))
    returning * into r;
  end if;

  return jsonb_build_object(
    'request_id', r.id,
    'signing_url', r.signing_url,
    'valid_until', q.valid_until,
    'signer', (
      select jsonb_build_object(
        'name', nullif(concat_ws(' ', p.first_name, p.last_name), ''),
        'email', u.email,
        'phone', coalesce(rq.contact_phone, p.phone)
      )
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join public.requests rq on rq.id = c.request_id
      where u.id = auth.uid()
    )
  );
end;
$$;
revoke execute on function public.particulier_start_signature(uuid, jsonb) from public, anon;
grant execute on function public.particulier_start_signature(uuid, jsonb) to authenticated;

-- Signature terminée chez le prestataire (webhook, service_role) : devis signé, chantier
-- « devis_signe » ; la notification à l'artisan part du journal. Idempotente.
create function public.record_quote_signature(
  p_request_id uuid,
  p_signed_at timestamptz,
  p_signed_pdf_path text,
  p_proof_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.signature_requests;
  q public.quotes;
begin
  select * into r from public.signature_requests where id = p_request_id for update;
  if not found then
    raise exception 'Procédure de signature introuvable' using errcode = '22023';
  end if;
  if r.status = 'signee' then
    return 'deja_signe';
  end if;
  select * into q from public.quotes where id = r.quote_id for update;
  if q.status <> 'envoye'
     or (select status from public.chantiers where id = q.chantier_id) <> 'devis_envoye' then
    update public.signature_requests set status = 'abandonnee' where id = r.id;
    return 'non_signable';
  end if;

  update public.signature_requests set status = 'signee', completed_at = p_signed_at where id = r.id;
  update public.quotes set status = 'signe', signed_at = p_signed_at,
    signed_pdf_path = p_signed_pdf_path, signature_proof_path = p_proof_path
  where id = q.id;
  perform public.transition_chantier(q.chantier_id, 'devis_signe', jsonb_build_object(
    'quote_id', q.id, 'numero', q.numero, 'montant_ttc', q.total_ttc_cents));
  return 'signe';
end;
$$;
revoke execute on function public.record_quote_signature(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.record_quote_signature(uuid, timestamptz, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : devis signé, à l'artisan.
-- ---------------------------------------------------------------------------
create or replace function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if new.event in ('rdv_fixe', 'devis_envoye')
     or (new.event = 'annulation' and new.details ->> 'par' = 'artisan') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'rdv_fixe' then 'rdv_fixe'::public.notification_type
        when 'devis_envoye' then 'devis_recu'::public.notification_type
        else 'chantier_annule'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'rendez_vous', new.details ->> 'rendez_vous',
        'motif', new.details ->> 'motif',
        'quote_id', new.details ->> 'quote_id',
        'numero', new.details ->> 'numero',
        'montant_ttc', new.details -> 'montant_ttc'
      ));
  elsif new.event in ('devis_refuse', 'revision_demandee', 'devis_signe') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'devis_refuse' then 'devis_refuse'::public.notification_type
        when 'devis_signe' then 'devis_signe'::public.notification_type
        else 'devis_modification'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'motif', new.details ->> 'motif',
        'message', new.details ->> 'message',
        'montant_ttc', new.details -> 'montant_ttc'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  end if;
  return new;
end;
$$;
