-- Ouverture des trois formules (F-15, ADR 0200, décision de l'utilisateur du 27 octobre 2026) :
-- Premium et Entreprise deviennent disponibles comme Base (essai de 2 mois, au mois ou à l'année),
-- et Premium est mise en avant (« Recommandé ») sur la page Espace Pro et dans « Ma formule ».
-- La formule recommandée est un paramètre de la base, comme le reste du contenu des formules.
alter table public.plans add column recommandee boolean not null default false;

update public.plans set ouverte = true where code in ('premium', 'entreprise');
update public.plans set recommandee = (code = 'premium');

-- Une seule formule recommandée à la fois.
create unique index plans_un_recommandee on public.plans (recommandee) where recommandee;
