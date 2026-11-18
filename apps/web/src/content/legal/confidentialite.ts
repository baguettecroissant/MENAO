import { COMPANY, COMPANY_LINE, LEGAL_UPDATED_AT } from "./company";
import type { LegalDocument } from "./types";

// TODO(legal) : texte à faire valider par l'avocat avant l'ouverture. À vérifier avant
// publication définitive : contrat de sous-traitance et lieu de traitement de chaque prestataire,
// durées de conservation (seules « 3 ans d'inactivité » et « 10 ans pour la comptabilité » viennent
// du cahier des charges, §RGPD), base légale de la note du client par l'artisan, information des
// professionnels contactés à partir des registres publics, délégué à la protection des données.
// Le tableau des prestataires suit le code : le tenir à jour à chaque ajout ou retrait.
export const confidentialite: LegalDocument = {
  title: "Politique de confidentialité",
  updatedAt: LEGAL_UPDATED_AT,
  blocks: [
    { type: "h2", id: "responsable", text: "Qui traite vos données" },
    {
      type: "p",
      text: `Le responsable du traitement est ${COMPANY_LINE}. Pour toute question sur vos données : ${COMPANY.email}.`,
    },
    {
      type: "p",
      text: "Pour les données de ses propres clients qu'un artisan enregistre dans les outils de MENAO (devis, factures, suivi de chantier), l'artisan est responsable du traitement et MENAO agit pour son compte.",
    },
    {
      type: "p",
      text: "MENAO n'utilise vos données que pour faire fonctionner le service, respecter la loi et vous informer. MENAO ne vend aucune donnée et n'affiche aucune publicité de tiers.",
    },

    { type: "h2", id: "donnees", text: "Les données que nous traitons" },
    { type: "h3", text: "Si vous êtes un particulier" },
    {
      type: "table",
      caption: "Données des particuliers et leur origine",
      head: ["Données", "D'où elles viennent"],
      rows: [
        [
          "Nom, prénom, e-mail, téléphone, mot de passe chiffré",
          "Vous, à la création du compte ; Google ou Apple si vous vous connectez par leur intermédiaire",
        ],
        [
          "Projet de travaux : description, photos, lieu du chantier, urgence",
          "Vous, par écrit, à la voix ou au téléphone",
        ],
        [
          "Votre voix, le temps de la transcrire ; texte de l'échange avec l'assistante téléphonique",
          "Vous, si vous dictez ou appelez",
        ],
        ["Messages échangés avec les artisans, rendez-vous", "Vous et l'artisan"],
        [
          "Devis reçus et signés, état et montant des paiements, suivi et réception du chantier",
          "Vous, l'artisan et les prestataires de signature et de paiement",
        ],
        ["Avis que vous déposez", "Vous"],
        [
          "Note laissée par l'artisan après un chantier (accueil, clarté du besoin, délai des paiements)",
          "L'artisan ; jamais publiée, moyenne visible des seuls artisans qui reçoivent une demande de votre part",
        ],
      ],
    },
    {
      type: "p",
      text: "MENAO ne reçoit ni ne conserve le numéro de votre carte bancaire : il est saisi chez Stripe.",
    },
    { type: "h3", text: "Si vous êtes un artisan" },
    {
      type: "table",
      caption: "Données des artisans et leur origine",
      head: ["Données", "D'où elles viennent"],
      rows: [
        ["Nom, prénom, e-mail, téléphone du dirigeant et des membres de l'équipe", "Vous"],
        [
          "Entreprise : dénomination, numéro SIREN, adresse, forme, date de création, dirigeants",
          "Vous et les registres publics (annuaire des entreprises de l'État, Insee)",
        ],
        [
          "Pièces du dossier : pièce d'identité, extrait d'immatriculation, attestations d'assurance, attestation Urssaf, diplômes et qualifications",
          "Vous",
        ],
        [
          "Fiche publique : métiers, zone, présentation, photos, logo, disponibilité, Score MENAO, avis reçus",
          "Vous, vos clients et MENAO",
        ],
        [
          "Activité : demandes reçues, délais de réponse, devis, factures, dépenses et justificatifs, agenda, messages",
          "Vous et vos clients",
        ],
        ["Abonnement : formule, factures, état des prélèvements", "Vous et Stripe"],
        [
          "Compte de paiement : identité, date de naissance, coordonnées bancaires",
          "Vous, directement auprès de Stripe ; MENAO n'en garde que l'état du compte",
        ],
        ["Charte qualité signée, conditions acceptées", "Vous"],
      ],
    },
    { type: "h3", text: "Si vous êtes un professionnel contacté par MENAO" },
    {
      type: "p",
      text: `MENAO peut vous contacter pour vous présenter le service à partir de données professionnelles publiques : nom de l'entreprise, métier, adresse, téléphone, issus des registres publics. Vous pouvez vous y opposer à tout moment, d'un mot à ${COMPANY.email}.`,
    },
    { type: "h3", text: "Données techniques" },
    {
      type: "p",
      text: "Date et heure de connexion, type d'appareil et de navigateur, adresse IP dans les journaux techniques, identifiant de notification de l'application. Le suivi des pannes est réglé pour ne transmettre ni identité, ni cookie, ni contenu saisi.",
    },
    {
      type: "p",
      text: "L'application ne demande l'accès à l'appareil photo, aux photos, au micro, au calendrier et aux notifications qu'au moment où vous utilisez la fonction concernée. Vous pouvez le retirer dans les réglages du téléphone.",
    },

    { type: "h2", id: "finalites", text: "Pourquoi, sur quelle base et combien de temps" },
    {
      type: "table",
      caption: "Finalités, bases légales et durées de conservation",
      head: ["Pourquoi", "Base légale", "Durée de conservation"],
      rows: [
        [
          "Créer et gérer votre compte",
          "Contrat (conditions d'utilisation)",
          "Durée du compte ; un compte inactif est supprimé après 3 ans",
        ],
        [
          "Transmettre votre demande de travaux aux artisans et organiser les rendez-vous",
          "Contrat",
          "Durée du compte",
        ],
        [
          "Comprendre la demande avec des outils automatiques (métier, urgence, questions)",
          "Contrat",
          "Le temps du traitement",
        ],
        [
          "Vérifier le dossier des artisans",
          "Contrat et intérêt légitime (sécurité des particuliers)",
          "Durée de l'abonnement, puis jusqu'à 5 ans à titre de preuve",
        ],
        [
          "Classer les artisans et calculer le Score MENAO",
          "Intérêt légitime (qualité du service)",
          "Durée de l'abonnement",
        ],
        [
          "Devis, signature en ligne, suivi et réception du chantier",
          "Contrat",
          "10 ans après la réception du chantier",
        ],
        [
          "Paiements des chantiers et de l'abonnement, factures",
          "Contrat et obligation légale (comptabilité, lutte contre la fraude)",
          "10 ans pour les documents comptables",
        ],
        ["Messagerie entre particulier et artisan", "Contrat", "Durée du compte"],
        [
          "Avis sur les artisans",
          "Intérêt légitime (information des particuliers)",
          "Tant que la fiche de l'artisan existe ; retiré à votre demande",
        ],
        [
          "Note de l'artisan sur son client",
          "Intérêt légitime (protection des artisans)",
          "Durée du compte du particulier",
        ],
        [
          "Litiges et signalements",
          "Intérêt légitime et obligation légale",
          "5 ans après la clôture",
        ],
        [
          "E-mails et SMS de service (confirmation, rappel, relance de dossier)",
          "Contrat",
          "Durée du compte",
        ],
        [
          "Lettres d'information et offres",
          "Consentement pour les particuliers ; intérêt légitime pour les professionnels, avec opposition à tout moment",
          "Jusqu'au retrait, au plus 3 ans après le dernier contact",
        ],
        [
          "Présenter MENAO à des artisans non inscrits",
          "Intérêt légitime",
          "3 ans après le dernier contact ; suppression immédiate sur opposition",
        ],
        [
          "Sécurité, journaux techniques, suivi des pannes",
          "Intérêt légitime (sécurité)",
          "12 mois au plus",
        ],
      ],
    },
    {
      type: "p",
      text: "Le classement des artisans est calculé automatiquement, selon les critères publiés sur la page [Critères de classement](/criteres-de-classement). La validation ou le refus d'un dossier d'artisan est toujours décidé par une personne de l'équipe MENAO.",
    },

    { type: "h2", id: "destinataires", text: "Qui reçoit vos données" },
    {
      type: "p",
      text: "Vos données sont vues par l'équipe MENAO dans la limite de ses missions, par les artisans ou les particuliers avec qui vous êtes en relation, et par les prestataires ci-dessous, qui agissent sur instruction de MENAO.",
    },
    {
      type: "table",
      caption: "Prestataires de MENAO, leur rôle et les données concernées",
      head: ["Prestataire", "Rôle", "Données concernées", "Pays"],
      rows: [
        [
          "Supabase",
          "Base de données, comptes, stockage des documents et des photos",
          "Toutes",
          "Union européenne (Irlande)",
        ],
        [
          "Vercel",
          "Hébergement du site",
          "Pages et requêtes",
          "États-Unis ; exécution dans l'Union européenne",
        ],
        [
          "Stripe",
          "Paiement des chantiers, compte de paiement des artisans, abonnement",
          "Identité, coordonnées bancaires, paiements",
          "Irlande et États-Unis",
        ],
        [
          "DocuSeal",
          "Signature en ligne des devis",
          "Devis, nom, e-mail, signature",
          "Union européenne",
        ],
        ["Resend", "Envoi des e-mails de service", "E-mail, contenu du message", "États-Unis"],
        ["Brevo", "Envoi des SMS, lettres d'information", "Téléphone, e-mail", "France"],
        [
          "Anthropic",
          "Outils automatiques : compréhension des demandes, lecture des justificatifs et des plans, assistants",
          "Textes, photos et documents soumis",
          "États-Unis",
        ],
        ["OpenRouter", "Solution de secours pour les mêmes outils", "Les mêmes", "États-Unis"],
        [
          "Mistral AI",
          "Transcription de la voix en texte",
          "Enregistrement vocal, le temps de la transcription",
          "France",
        ],
        [
          "Vapi et Daily",
          "Assistante téléphonique et transport du son",
          "Voix, texte de l'échange, numéro de téléphone",
          "États-Unis",
        ],
        [
          "Expo",
          "Notifications de l'application",
          "Identifiant de notification, texte de la notification",
          "États-Unis",
        ],
        ["Sentry", "Suivi des pannes", "Données techniques, sans identité", "États-Unis"],
        [
          "Google et Apple",
          "Connexion avec un compte Google ou Apple, si vous la choisissez ; messagerie de l'équipe MENAO",
          "E-mail, nom, messages que vous nous écrivez",
          "États-Unis",
        ],
        ["Cloudflare", "Noms de domaine", "Données techniques", "États-Unis"],
        ["Géoplateforme de l'IGN", "Fonds de carte", "Adresse IP de votre navigateur", "France"],
      ],
    },
    {
      type: "p",
      text: "Les registres publics de l'État (annuaire des entreprises, Insee) sont interrogés avec le nom ou le numéro SIREN de l'entreprise pour vérifier les artisans.",
    },
    {
      type: "p",
      text: "Vos données peuvent aussi être transmises à une autorité qui le demande légalement.",
    },
    { type: "h3", text: "Transferts hors de l'Union européenne" },
    {
      type: "p",
      text: `Certains prestataires sont établis aux États-Unis. Ces transferts sont encadrés par les garanties prévues par le règlement européen sur la protection des données, selon le prestataire : clauses contractuelles types de la Commission européenne ou cadre de protection des données entre l'Union européenne et les États-Unis. Vous pouvez en demander le détail à ${COMPANY.email}.`,
    },
    { type: "h3", text: "Intelligence artificielle" },
    {
      type: "p",
      text: "MENAO utilise des outils d'intelligence artificielle pour comprendre une demande, lire un justificatif, relever un plan, préparer un devis dicté et répondre aux questions. Les contenus sont envoyés au prestataire pour ce seul traitement. MENAO ne garde de ces traitements que des mesures sans lien avec une personne.",
    },
    {
      type: "p",
      text: "Ce que ces outils proposent est toujours relu : par vous avant l'envoi d'une demande, par l'artisan avant l'envoi d'un devis, par l'équipe MENAO avant la validation d'un dossier.",
    },

    { type: "h2", id: "droits", text: "Vos droits" },
    { type: "p", text: "Vous pouvez à tout moment :" },
    {
      type: "list",
      items: [
        "accéder à vos données et en recevoir une copie ;",
        "les faire corriger ou supprimer ;",
        "vous opposer à un traitement fondé sur l'intérêt légitime, et toujours à la prospection ;",
        "demander la limitation d'un traitement ;",
        "recevoir les données que vous avez fournies dans un format courant, pour les transmettre ailleurs ;",
        "retirer un consentement donné ;",
        "décider du sort de vos données après votre décès.",
      ],
    },
    {
      type: "p",
      text: `Pour exercer ces droits : depuis votre espace, ou par e-mail à ${COMPANY.email}. MENAO répond dans un délai d'un mois et peut vous demander de justifier de votre identité en cas de doute.`,
    },
    {
      type: "p",
      text: "Certaines données ne peuvent pas être supprimées tout de suite : les devis signés et les factures, que la loi impose de conserver, et les éléments d'un litige en cours.",
    },
    {
      type: "p",
      text: "Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la Commission nationale de l'informatique et des libertés (CNIL), 3 place de Fontenoy, 75007 Paris, [cnil.fr](https://www.cnil.fr).",
    },

    { type: "h2", id: "securite", text: "Sécurité" },
    {
      type: "list",
      items: [
        "Chaque utilisateur n'accède qu'à ses propres données : la règle est appliquée par la base de données elle-même, pour chaque table.",
        "Les documents et les photos sont stockés dans des espaces privés et ne s'ouvrent qu'avec un lien temporaire.",
        "Les échanges sont chiffrés entre votre appareil et nos serveurs.",
        "Les mots de passe ne sont jamais conservés en clair.",
        "L'accès de l'équipe MENAO est limité par rôle, et la lecture d'une conversation est enregistrée.",
        "Aucune donnée personnelle n'est écrite dans les journaux techniques ni dans le suivi des pannes.",
      ],
    },
    {
      type: "p",
      text: "En cas de violation de données présentant un risque pour vous, MENAO prévient la CNIL dans les 72 heures et vous en informe.",
    },

    { type: "h2", id: "mineurs", text: "Mineurs" },
    {
      type: "p",
      text: "Le service s'adresse aux personnes majeures. MENAO ne collecte pas sciemment de données de mineurs.",
    },

    { type: "h2", id: "mise-a-jour", text: "Mise à jour" },
    {
      type: "p",
      text: "Cette politique peut évoluer, par exemple si un prestataire change. La date de la version figure en tête de page, et un changement important vous est signalé par e-mail ou dans votre espace.",
    },
  ],
};
