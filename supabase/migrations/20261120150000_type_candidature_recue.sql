-- Recrutement des commerciaux, lot 79 (F-183, ADR 0382) : e-mail de bonne réception de la
-- candidature, dans sa propre migration (une valeur d'enum ne sert pas dans la transaction qui la
-- crée).
alter type public.notification_type add value 'recrutement_recue';
