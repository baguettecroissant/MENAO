// Assistant de l'espace artisan (F-86, ADR 0236) : guide d'utilisation de l'espace artisan, seule
// source de l'assistant avec le résumé du compte et les contenus publiés du site. À tenir à jour
// quand un écran change de place. Noms des rubriques identiques au site et à l'application.
export const ARTISAN_GUIDE = `GUIDE DE L'ESPACE ARTISAN MENAO

L'ESPACE ET SES RUBRIQUES
- Sur le site, le menu de gauche : Accueil, Demandes, Chantiers, Agenda, Messages, Argent (onglets Devis, Factures, Dépenses), Ma vitrine (Ma fiche, Avis, Mon grade), puis « Mon profil » en bas, avec « Aide et support ».
- Dans l'application : la barre du bas (Accueil, Demandes, le bouton +, Chantiers, Argent), les Messages par l'icône en haut, « Mon profil » en touchant sa photo en haut. L'aide est dans « Mon profil », « Aide et contact ».
- L'Accueil montre « À faire maintenant » : ce qui attend une action, du plus urgent au moins urgent (demandes à traiter, rendez-vous du jour, devis à envoyer, documents, paiements à activer, avis à répondre). Chaque élément mène à l'écran qui le règle.

INSCRIPTION ET DOSSIER
- Après l'inscription, l'équipe MENAO vérifie le dossier (entreprise, registre, assurance décennale, attestation URSSAF, métiers, zone). Le profil n'est proposé aux particuliers qu'une fois le dossier vérifié. L'Accueil indique ce qui manque.
- Documents : dans « Mon profil », rubrique Documents. Un document refusé ou bientôt expiré se remplace par une nouvelle photo ou un PDF. MENAO prévient 30, 15 puis 7 jours avant l'échéance.
- Métiers et certifications, zone d'intervention (rayon autour d'une adresse, liste de communes, départements, régions ou toute la France), informations de l'entreprise : dans « Mon profil ».

LES DEMANDES
- Rubrique Demandes : chaque demande d'un particulier, avec la description, les photos et le délai pour répondre. Répondre vite compte : les particuliers voient le délai de réponse de l'artisan.
- L'artisan accepte (puis propose des créneaux de rendez-vous au client) ou refuse en indiquant un motif. Une demande sans réponse dans le délai expire.
- Pour faire une pause (vacances, trop de travail) : Agenda, « Mes disponibilités » : horaires de travail, congés et absences, et « Me mettre en pause » pour ne plus recevoir de nouvelles demandes. « Reprendre les demandes » pour revenir.

LES CHANTIERS
- Rubrique Chantiers : chaque client accepté devient un chantier, qui avance par étapes : rendez-vous, devis, signature, acompte, travaux, réception, clôture, puis avis du client.
- Dans la fiche d'un chantier : les informations du client, le rendez-vous, le devis, les paiements, les messages, et « Signaler un problème » en cas de litige.

LES DEVIS
- On crée le devis depuis la fiche du chantier (« Envoyer un devis ») une fois le rendez-vous passé. Les devis se retrouvent aussi dans Argent, onglet Devis.
- Lignes : saisie à la main (type main d'œuvre, matériel ou autre, quantité, unité, prix hors taxes, TVA), « Rechercher l'article » pour reprendre une ligne d'un ancien devis, « Dictée intelligente » pour dicter le devis (incluse dans toutes les formules), et « Dicter avec Manon » pour le préparer en conversation (Premium et Entreprise, compté dans les minutes de voix). Les lignes proposées par l'IA sont marquées « À vérifier ».
- « Enregistrer » garde le brouillon. « Générer le devis » montre l'aperçu, puis l'envoi : échéancier, date de début et durée estimée. Le client signe en ligne.
- Échéancier de paiement : acompte à la signature (30 % par défaut, 0 % possible : devis sans acompte), paiement facultatif au démarrage des travaux, et solde calculé à la réception (exemple : 30 / 40 / 30). L'échéancier par défaut se règle dans Argent, bouton « Mes paiements » ; il reste modifiable devis par devis à l'envoi (« Échéancier personnalisé »). Sans acompte, la date des travaux se fixe dès la signature. Le paiement au démarrage est demandé au client le jour où le chantier commence ; il a sa facture d'acompte et se relance depuis « À encaisser ».
- Le client peut demander une modification : le devis passe « à modifier », l'artisan le corrige et le renvoie.
- En franchise en base de TVA, les devis portent la mention prévue et aucune TVA.

PAIEMENTS ET ARGENT
- Les clients paient directement sur le compte de l'artisan, par Stripe, prestataire de paiement agréé. MENAO ne touche jamais l'argent des chantiers et ne prend aucune commission.
- Pour recevoir les paiements en ligne : activer les paiements dans « Mon profil », rubrique Paiements (formulaire Stripe : identité, compte bancaire). Tant que ce n'est pas fait, les clients ne peuvent pas payer l'acompte en ligne.
- Argent, onglet Factures : les factures des chantiers. Onglet Dépenses : prendre un ticket ou une facture fournisseur en photo, l'IA le lit et le range. « Mon comptable » prépare l'export des factures et des dépenses pour l'expert-comptable.

AGENDA
- Rubrique Agenda : rendez-vous de chantier, créneaux bloqués (« Bloquer un créneau »), absences. Un créneau sans chantier s'ouvre d'un toucher pour voir son détail ou le libérer.
- Synchroniser avec son agenda (Google, Apple, Outlook) : Agenda, « Mes disponibilités », « Synchroniser avec votre agenda », lien d'abonnement à ajouter dans l'agenda du téléphone. Dans l'application, l'agenda du téléphone peut aussi être relié directement.

MESSAGES
- Rubrique Messages : une conversation par chantier avec le client. Les coordonnées du client sont dans la fiche du chantier.

MA VITRINE
- Ma fiche : la page publique de l'artisan vue par les particuliers (photo, présentation, réalisations, métiers, zone). Une fiche complète inspire confiance.
- Avis : les avis des clients après les chantiers ; l'artisan peut y répondre.
- Mon grade : le niveau de l'artisan selon son activité et ses avis.

FORMULE ET AGENTS IA
- Trois formules : Base, Premium, Entreprise. La formule se choisit et se gère sur le site, dans « Mon profil », « Ma formule » (jamais dans l'application).
- « Ma formule » montre aussi « Vos agents IA » : ce que la formule comprend et les minutes de voix du mois. Les agents écrits (dictée du devis, lecture des dépenses, cet assistant) sont inclus partout.
- Premium et Entreprise : secrétaire dédiée (elle répond aux clients au nom de l'entreprise, prend un rendez-vous dans l'agenda ou un message ; à essayer et régler dans « Ma formule », rubrique « Votre secrétaire »), devis en conversation avec Manon, minutes de voix incluses chaque mois. Des recharges de minutes s'achètent sur le site, dans « Ma formule ».

ÉQUIPE (COMPTES DES SALARIÉS)
- Premium et Entreprise comprennent des comptes pour les salariés : 3 en Premium, 10 en Entreprise, patron compris. Le patron les invite par e-mail dans « Mon profil », « Mon équipe », avec un rôle : chef d'équipe ou ouvrier. Chacun a son propre accès, sur le site et dans l'application.
- Le chef d'équipe s'occupe des demandes, de tous les chantiers, des devis, factures, paiements, dépenses, de l'agenda et de la secrétaire ; pas de la formule, des paiements en ligne, de la vitrine, du dossier, de l'envoi au comptable ni de l'équipe.
- L'ouvrier ne voit que les chantiers qui lui sont attribués (journal, photos, messages avec le client, rendez-vous), sans aucun montant ni demande. Le patron ou le chef d'équipe choisit qui travaille sur un chantier dans la fiche du chantier, « Équipe sur ce chantier ».
- Formule réduite ou impayé prolongé : les derniers invités sont suspendus, jamais supprimés, et reviennent quand une place se libère. Le patron peut aussi suspendre, réactiver, changer le rôle ou retirer un membre dans « Mon équipe ».

COMPTE
- « Mon profil » : informations, adresse e-mail, mot de passe, notifications, téléchargement de ses données, déconnexion de tous les appareils, suppression du compte (rubrique Identité et connexion).
- Une question sans réponse ici : écrire à l'équipe MENAO, contact@menao.fr, depuis « Aide et support » (site) ou « Aide et contact » (application).`;
