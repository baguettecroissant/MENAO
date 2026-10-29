-- Espace commercial (F-65, ADR 0205) : rôle des commerciaux de terrain. Ajouté seul : une nouvelle
-- valeur d'enum ne peut pas servir dans la transaction qui la crée.
-- Jamais obtenu par l'inscription (app.before_auth_user_insert n'accepte que « artisan ») : le
-- compte est créé par un admin depuis le back-office (Edge Function commercial-invite).
alter type public.app_role add value 'commercial';
