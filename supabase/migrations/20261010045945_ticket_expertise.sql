-- F-17, F-18 : « Ce chantier a besoin d'une expertise » (valeur ajoutée seule : utilisable après
-- validation de la transaction).
alter type public.ticket_type add value if not exists 'expertise';
