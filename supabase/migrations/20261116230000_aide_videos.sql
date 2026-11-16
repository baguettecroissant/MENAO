-- Vidéos de l'aide à l'inscription (F-161, ADR 0349) : compartiment public, lu par le site et
-- l'application sans connexion. Rien de personnel : vrais écrans avec des données fictives.
-- Aucune politique d'écriture : seuls les outils de l'équipe (clé serveur) déposent les fichiers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aide-videos', 'aide-videos', true, 15728640, array['video/mp4', 'image/jpeg'])
on conflict (id) do nothing;
