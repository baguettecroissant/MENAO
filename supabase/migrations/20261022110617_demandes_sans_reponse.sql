-- Aucune demande sans réponse (lot 1 du plan V1.1, ADR 0156 ; délai de 72 h, ADR 0153) :
-- - l'artisan qui n'a pas encore répondu est relancé 24 h puis 48 h après la demande
--   (notification, e-mail et push), tant qu'elle attend sa réponse ;
-- - quand plus aucune demande d'un projet n'attend de réponse sans qu'aucune ait été acceptée
--   (toutes expirées ou refusées), le client est prévenu, avec un lien pour choisir d'autres
--   artisans vérifiés, et un ticket « Demande sans réponse » arrive au SAV (l'équipe est alertée
--   par le ticket, comme pour tout nouveau ticket).

-- p_now : instant de référence (tests). Tâche pg_cron toutes les 15 minutes. 1re relance dès
-- 24 h, 2e dès 48 h et au moins 12 h après la première : jamais plus de deux par demande.
create function app.remind_pending_requests(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select q.id, q.created_at, q.expires_at, a.user_id, p.ville_nom, cp.first_name as client,
      coalesce(nullif(btrim(app.scrub_contacts(p.summary)), ''), t.label) as titre,
      count(n.id)::int as sent, max(n.created_at) as last_sent
    from public.requests q
    join public.artisans a on a.id = q.artisan_id
    join public.projects p on p.id = q.project_id
    left join public.trades t on t.code = p.trade_code
    left join public.profiles cp on cp.user_id = q.particulier_id
    left join public.notifications n on n.user_id = a.user_id and n.type = 'demande_relance'
      and n.data ->> 'request_id' = q.id::text
    where q.status = 'envoyee'
      and q.expires_at > p_now
      and q.created_at <= p_now - interval '24 hours'
    group by q.id, a.user_id, p.ville_nom, cp.first_name, p.summary, t.label
  loop
    continue when r.sent >= 2;
    continue when r.sent = 1 and (
      r.created_at > p_now - interval '48 hours' or r.last_sent > p_now - interval '12 hours'
    );
    perform app.notify(r.user_id, 'demande_relance', jsonb_build_object(
      'request_id', r.id,
      'etape', r.sent + 1,
      'titre', r.titre,
      'ville', r.ville_nom,
      'client', r.client,
      'expire_le', r.expires_at
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_pending_requests(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relance-demandes', '*/15 * * * *', 'select app.remind_pending_requests()');

-- Fin d'une série de demandes sans réponse : les projets dont une demande vient d'expirer ou d'être
-- refusée, sans plus aucune demande en attente ni acceptée. Déclencheur par instruction : plusieurs
-- demandes d'un même projet qui expirent ensemble ne donnent qu'un avis et qu'un ticket.
create function app.requests_without_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select p.id as project_id, p.user_id, p.ville_nom, t.label as metier, u.email,
      coalesce(nullif(btrim(app.scrub_contacts(p.summary)), ''), t.label) as titre,
      (select count(*) from public.requests q where q.project_id = p.id)::int as contactes,
      (select count(*) from public.requests q where q.project_id = p.id and q.status = 'refusee')::int as refus
    from public.projects p
    left join public.trades t on t.code = p.trade_code
    left join auth.users u on u.id = p.user_id
    where p.id in (
      select n.project_id from new_rows n
      join old_rows o on o.id = n.id
      where o.status = 'envoyee' and n.status in ('expiree', 'refusee')
    )
    and not exists (
      select 1 from public.requests q where q.project_id = p.id and q.status in ('envoyee', 'acceptee')
    )
  loop
    perform app.notify(r.user_id, 'demande_sans_reponse', jsonb_build_object(
      'project_id', r.project_id,
      'titre', r.titre,
      'ville', r.ville_nom,
      'artisans', r.contactes,
      'tous_refus', r.refus = r.contactes
    ));
    if r.email is not null then
      -- Échéance d'un jour : le client attend.
      insert into public.tickets (type, user_id, project_id, contact_email, subject, message, due_at)
      values ('demande_sans_reponse', r.user_id, r.project_id, lower(r.email),
        left(format('Demande sans réponse : %s%s', coalesce(r.metier, 'projet'),
          coalesce(' à ' || r.ville_nom, '')), 150),
        left(format('%s artisan%s contacté%s : %s. Proposer d''autres artisans au client, ou élargir la zone.',
          r.contactes, case when r.contactes > 1 then 's' else '' end,
          case when r.contactes > 1 then 's' else '' end,
          case when r.refus = r.contactes then 'tous ont refusé la demande'
            else 'aucune réponse dans les 72 h' end), 2000),
        now() + interval '1 day');
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function app.requests_without_answer() from public, anon, authenticated;
create trigger requests_without_answer after update on public.requests
  referencing old table as old_rows new table as new_rows
  for each statement execute function app.requests_without_answer();
