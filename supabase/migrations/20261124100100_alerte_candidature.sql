-- F-188 (ADR 0389) : nouvelle candidature « Devenir commercial MENAO » → e-mail et cloche pour
-- chaque administrateur (même circuit que les autres alertes de l'équipe, ADR 0050).
create function app.commercial_candidates_notify_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify(p.user_id, 'equipe_nouvelle_candidature', jsonb_build_object(
    'candidate_id', new.id, 'prenom', new.first_name, 'nom', new.last_name,
    'secteur', new.sector, 'cv', new.cv_path is not null
  ))
  from public.profiles p
  where p.role = 'admin';
  return null;
end;
$$;
revoke execute on function app.commercial_candidates_notify_team() from public;
create trigger commercial_candidates_notify_team after insert on public.commercial_candidates
  for each row execute function app.commercial_candidates_notify_team();
