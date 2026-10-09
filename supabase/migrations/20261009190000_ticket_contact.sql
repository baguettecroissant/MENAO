-- F-03 : message envoyé depuis la page Contact (valeur ajoutée seule : utilisable après validation
-- de la transaction).
alter type public.ticket_type add value if not exists 'contact';
