-- F-11 : projet dont la demande est envoyée aux artisans (critères figés). Valeur ajoutée dans sa
-- propre migration : une valeur d'enum ne peut pas être utilisée dans la transaction qui la crée.
alter type public.project_status add value if not exists 'demande_envoyee';
