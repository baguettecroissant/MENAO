-- Photo de profil du particulier (F-169, ADR 0360) : facultative, déposée depuis « Mon compte »
-- (process-upload, usage « avatar », déjà ouvert à tout compte). L'artisan la voit dans la
-- messagerie (conversation_list, depuis la migration 20261010152143) et, ici, sur la fiche d'une
-- demande acceptée et de son chantier (artisan_chantier_detail reprend artisan_request_detail).
-- Comme le nom de famille, le téléphone et l'e-mail : jamais avant l'acceptation.
--
-- La fonction en place est reprise telle quelle et complétée d'une seule ligne : elle porte déjà
-- les droits de l'équipe (patron, chef, ouvrier sur ses chantiers, budget masqué ; migration
-- 20261107150000), qu'une réécriture à partir d'une ancienne version aurait effacés.
do $do$
declare
  v_def text := pg_catalog.pg_get_functiondef('public.artisan_request_detail(uuid)'::regprocedure);
  v_email constant text := $a$'email', case when r.status = 'acceptee' then u.email::text end$a$;
begin
  if pg_catalog.strpos(v_def, 'cp.avatar_path') > 0 then
    return;
  end if;
  if pg_catalog.strpos(v_def, v_email) = 0 then
    raise exception 'artisan_request_detail : ligne « email » du client introuvable';
  end if;
  v_def := pg_catalog.replace(v_def, v_email,
    v_email || $a$, 'avatar_path', case when r.status = 'acceptee' then cp.avatar_path end$a$);
  execute v_def;
end;
$do$;
