-- Rangement du back-office, lot 4 (F-135, ADR 0286) : rôle « Vérification » pour les salariés qui
-- valident les dossiers d'artisans et suivent la conformité. Ajouté seul : une nouvelle valeur
-- d'enum ne peut pas servir dans la transaction qui la crée (droits dans la migration suivante).
-- Jamais obtenu par l'inscription : posé par un admin (staff-invite, admin_set_staff_role).
alter type public.app_role add value 'verification';
