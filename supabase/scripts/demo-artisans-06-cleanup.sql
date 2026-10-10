-- Suppression des artisans de DÉMONSTRATION créés par demo-artisans-06.sql (staging uniquement).
-- La suppression des comptes entraîne celle des profils, fiches, documents, métiers, zones,
-- certifications et abonnements (clés étrangères en cascade).
delete from auth.users where id::text like 'e0600000-0000-4000-8000-%' and email like '%@menao-demo.test';
