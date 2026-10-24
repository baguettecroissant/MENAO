-- Notifications manquantes (F-41, ADR 0183) : nouvelles valeurs seules, utilisées par la migration
-- suivante (une valeur d'énumération ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'demande_envoyee';
alter type public.notification_type add value 'dossier_envoye';
alter type public.notification_type add value 'devis_relance';
alter type public.notification_type add value 'devis_expire';
alter type public.notification_type add value 'avis_reponse';
alter type public.notification_type add value 'demarrage_rappel';
alter type public.notification_type add value 'filleul_valide';
