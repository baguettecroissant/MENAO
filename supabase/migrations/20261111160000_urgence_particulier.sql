-- Urgence réglée par le particulier (F-128, ADR 0279).
--
-- `projects.urgence` existait déjà, écrite par l'analyse IA seulement : le particulier ne pouvait
-- ni la voir ni la changer. Il peut maintenant l'activer ou la retirer (bouton « Urgent » à la
-- saisie, choix du délai sur l'écran des critères). Son choix est gardé à part, pour qu'une
-- nouvelle analyse de la description ne l'écrase pas.

-- null : jamais réglée par le particulier (l'analyse décide) ; sinon son choix, qui prime.
alter table public.projects add column urgence_manuelle boolean;

-- Urgent : la demande est signalée comme telle aux artisans, et le début souhaité devient « dès
-- que possible ». Retirée : le délai choisi reste tel quel.
create function public.set_project_urgency(p_project_id uuid, p_urgent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_urgent is null then
    raise exception 'Indiquez si la demande est urgente' using errcode = '22023';
  end if;
  update public.projects set
    urgence = p_urgent,
    urgence_manuelle = p_urgent,
    date_mode = case when p_urgent then 'des_que_possible' else date_mode end,
    date_souhaitee = case when p_urgent then null else date_souhaitee end
  where id = p_project_id and user_id = auth.uid() and status in ('brouillon', 'criteres_valides');
  if not found then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.set_project_urgency(uuid, boolean) from public, anon;
grant execute on function public.set_project_urgency(uuid, boolean) to authenticated;
