# ADR 0269 — Fiche publique d'un artisan réordonnée (lot 23)

- Statut : accepté
- Date : 9 novembre 2026
- Suite des ADR 0144 (fiches publiques), 0198 (demande directe) et du rapport « Site vitrine wahou et SEO » (priorité 2 : contrôles datés). Lot 23 maquetté et validé le 9 novembre.

## Décision
- **Ordre de décision du particulier** (mise en page « public » de `ProfileBody`) : en-tête (qui c'est et ses repères), à propos, chantiers récents, **avis en un seul bloc** (Score MENAO, note des clients, avis, note Google, règle des avis et lien « Comment nous contrôlons les avis »), garanties et assurances, expertises, partenaires, puis le maillage vers les pages métier × ville.
- **Carte fixe de demande** à droite sur ordinateur (« Demandez un devis à … », texte actuel sur la demande envoyée à lui seul, « Lui demander un devis », gratuit, 72 h, coordonnées protégées) ; **barre fixe** en bas sur téléphone.
- **Date du dernier contrôle** : `artisan_public_page` renvoie `verified_on` (dernière date `verified_at` des documents validés), affichée « Dernier contrôle le … » dans « Assuré et vérifié par MENAO ». Migration `20261109170000_fiche_date_controle.sql`, test pgTAP. Les dates de validité de la décennale et de la RC Pro étaient déjà affichées.
- La fiche vue depuis une recherche (espace particulier) garde sa mise en page.

## Conséquences
- Après fusion : appliquer la migration sur staging.
- TODO(legal) : faire relire « Coordonnées protégées » et la phrase sur la date du contrôle.
