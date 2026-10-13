/** Textes de l'application native, en français et centralisés (comme ceux du site). */
export const fr = {
  brand: "MENAO",
  nav: {
    back: "Retour",
  },
  errors: {
    generic: "Une erreur est survenue. Réessayez dans quelques instants.",
    invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
    emailNotConfirmed: "Confirmez d'abord votre adresse e-mail grâce au lien reçu par e-mail.",
    weakPassword: "Ce mot de passe est trop faible. Choisissez-en un plus long ou moins courant.",
    rateLimited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
    config: "L'application n'est pas configurée : adresse du serveur manquante.",
  },
  auth: {
    signInTitle: "Connexion à votre espace",
    signInText: "Retrouvez vos demandes, vos devis et l'avancement de vos chantiers.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    signIn: "Me connecter",
    forgotPassword: "Mot de passe oublié ?",
    noAccount: "Pas encore de compte ?",
    createAccount: "Créer mon compte",
    signUpTitle: "Créer mon compte particulier",
    signUpText: "Vous êtes artisan ? Créez votre compte pro sur le site MENAO.",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone (facultatif)",
    passwordHint: (min: number) => `${min} caractères au moins.`,
    acceptTerms:
      "J'accepte les conditions générales d'utilisation et la politique de confidentialité",
    readTerms: "Lire les conditions d'utilisation",
    readPrivacy: "Lire la politique de confidentialité",
    marketing: "Je souhaite recevoir les actualités de MENAO (facultatif)",
    signUp: "Créer mon compte",
    haveAccount: "Déjà un compte ?",
    checkEmailTitle: "Vérifiez vos e-mails",
    checkEmailText: (email: string) =>
      `Nous avons envoyé un lien de confirmation à ${email}. Ouvrez-le pour activer votre compte, puis connectez-vous.`,
    backToSignIn: "Revenir à la connexion",
    continueBrowsing: "Continuer la visite",
    resetTitle: "Mot de passe oublié",
    resetText:
      "Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.",
    resetSubmit: "Recevoir le lien",
    resetSent: "Si un compte existe pour cette adresse, un e-mail vient de vous être envoyé.",
  },
  tabs: {
    home: "Accueil",
    chantiers: "Mes chantiers",
    dashboard: "Tableau de bord",
    requests: "Demandes",
    agenda: "Agenda",
    messages: "Messages",
    notifications: "Notifications",
    account: "Compte",
  },
  // Textes repris du site (accueil, « Comment ça marche », garanties) : aucun chiffre inventé.
  home: {
    greeting: "Bonjour !",
    subtitle: "Besoin d'un artisan du bâtiment ?",
    searchPlaceholder: "Décrivez votre projet…",
    notifications: "Notifications",
    tags: ["Artisans vérifiés", "Décennale contrôlée", "Réponse sous 48\u00a0h"],
    tradesTitle: "Trouvez votre artisan",
    tradesText: "Des artisans vérifiés pour chaque corps de métier, dans les Alpes-Maritimes.",
    allTrades: "Tous les métiers",
    stepsTitle: "Comment ça marche",
    steps: [
      {
        title: "Décrivez votre projet",
        text: "Notre assistant IA en déduit le métier, les travaux et les délais.",
      },
      {
        title: "Choisissez vos artisans",
        text: "MENAO vous présente jusqu'à 5 artisans vérifiés de votre secteur.",
      },
      {
        title: "Signez votre devis en ligne",
        text: "L'artisan accepte sous 48\u00a0h, vient voir votre chantier, puis vous envoie son devis.",
      },
      {
        title: "Suivez jusqu'à la réception",
        text: "Acompte, photos de l'avancement, réception et solde : tout se passe dans votre espace.",
      },
    ],
    trustTitle: "La confiance, ça se vérifie",
    trust: [
      {
        title: "Artisans vérifiés",
        text: "Entreprise active, Kbis récent, assurance décennale, RC Pro et identité du dirigeant contrôlés.",
      },
      {
        title: "Paiement direct à l'artisan",
        text: "Par carte, via Stripe : MENAO ne prélève rien sur votre chantier.",
      },
      {
        title: "Avis vérifiés",
        text: "Seuls les clients ayant réalisé un chantier via MENAO peuvent noter un artisan.",
      },
      {
        title: "Un recours en cas de problème",
        text: "Signalez un souci depuis votre espace : l'équipe MENAO l'examine et vous répond.",
      },
    ],
    free: "MENAO est 100\u00a0% gratuit.",
  },
  // Recherche (F-05 à F-07) : textes repris de la recherche du site.
  search: {
    title: "Votre projet",
    intro: "Décrivez vos travaux : MENAO trouve les artisans vérifiés de votre secteur.",
    label: "Décrivez votre besoin",
    placeholder: "Par exemple : fuite sous l'évier de la cuisine, à Nice…",
    privacy:
      "Votre description est analysée par une intelligence artificielle pour pré-remplir votre recherche. Ne saisissez ni nom, ni téléphone, ni e-mail : ils sont de toute façon retirés avant l'analyse.",
    examplesTitle: "Besoin d'inspiration ?",
    examples: [
      "Fuite sous l'évier de la cuisine, à Nice",
      "Repeindre un salon de 20 m² à Antibes",
      "Remplacer le chauffe-eau de mon appartement",
      "Refaire la salle de bain avec une douche à l'italienne",
    ],
    tradeLabel: "Vous savez déjà quel artisan il vous faut ?",
    submit: "Trouver mon artisan",
    analyzing: "Analyse de votre projet en cours",
    analysis: {
      steps: [
        "Lecture de votre description",
        "Identification du métier et des travaux",
        "Repérage du lieu et des pièces",
        "Préparation de vos critères",
      ],
      factsTitle: "Le saviez-vous ?",
      facts: [
        "Chaque artisan MENAO est vérifié : SIRET, assurance décennale, responsabilité civile professionnelle et pièce d'identité.",
        "Vous payez l'artisan directement, par paiement sécurisé : MENAO ne prend aucune commission sur vos travaux.",
        "Devis, signature, paiement et suivi du chantier : tout se passe au même endroit.",
        "Votre demande part à 3 artisans au plus, qui ont 48\u00a0heures pour vous répondre.",
      ],
    },
    errors: {
      rate_limited:
        "Vous avez lancé beaucoup d'analyses en peu de temps. Réessayez dans une heure.",
      invalid: "Décrivez votre projet en 5\u00a0000 caractères au plus.",
      unavailable: "L'analyse est momentanément indisponible. Réessayez dans quelques instants.",
      session:
        "Impossible de démarrer votre recherche. Vérifiez votre connexion et réessayez dans quelques instants.",
    },
  },
  review: {
    title: "Vérifiez vos critères",
    intro:
      "Assurez-vous que ces informations correspondent à votre besoin et complétez-les si nécessaire.",
    noAnalysis:
      "Nous n'avons pas pu analyser votre description automatiquement. Complétez les rubriques ci-dessous.",
    lowConfidence:
      "Vérifiez bien ces critères : votre description laissait plusieurs interprétations possibles.",
    yourText: "Votre description",
    more: "Lire la suite",
    less: "Réduire",
    trade: "Artisan recherché",
    tradeHelp: "Quel type d'artisan conviendrait le mieux à votre besoin ?",
    works: "Travaux attendus",
    worksNeedTrade: "Choisissez d'abord le métier recherché.",
    site: "Le chantier",
    lieu: "Où seront réalisés les travaux ?",
    rooms: "Pièces concernées",
    surface: "Surface estimée des travaux",
    address: "Adresse",
    city: "Votre ville",
    cityPlaceholder: "Commencez à saisir une ville",
    street: "Adresse exacte (facultatif)",
    streetHint:
      "Elle affine la recherche et ne sera communiquée qu'aux artisans qui acceptent votre demande.",
    streetPlaceholder: "Ex : 1 rue de France",
    change: "Modifier",
    date: "Date de début souhaitée",
    dateModes: {
      des_que_possible: "Dès que possible",
      date: "Préciser une date",
      inconnue: "Je ne sais pas encore",
    },
    pickDate: "Choisir la date",
    startsOn: (date: string) => `Début le ${date}`,
    noMatch: "Aucun résultat.",
    submit: "Trouver l'artisan idéal",
    submitHint: "Renseignez au moins le métier et la ville pour lancer la recherche.",
    notFound: "Ce projet est introuvable.",
  },
  results: {
    title: "Sélectionnez votre artisan idéal",
    found: (n: number) =>
      n === 1
        ? "Nous avons trouvé 1 artisan vérifié qui correspond à votre projet."
        : `Nous avons trouvé ${n} artisans vérifiés qui correspondent à votre projet.`,
    noneTitle: "Aucun artisan disponible pour l'instant",
    none: "Aucun artisan vérifié ne couvre encore votre secteur pour ce métier.",
    project: "Votre projet",
    projectSummary: (trade: string, city: string) => `${trade} à ${city}`,
    edit: "Modifier",
    experience: (years: number) =>
      years <= 1 ? `${years} an d'expérience` : `${years} ans d'expérience`,
    zoneRadius: (km: number, city: string | null) =>
      city ? `${km} km autour de ${city}` : `Rayon de ${km} km`,
    zoneCommunes: (communes: string[]) =>
      communes.length > 3
        ? `${communes.slice(0, 3).join(", ")} et ${communes.length - 3} autre${communes.length > 4 ? "s" : ""}`
        : communes.join(", "),
    distance: (km: string) => `à ${km} km`,
    availableNow: "Dispo immédiate",
    availableFrom: (date: string) => `Disponible à partir du ${date}`,
    more: (n: number) => `+${n}`,
    nextStep:
      "Bientôt dans l'application : la fiche de chaque artisan et l'envoi de votre demande à 3 artisans au plus.",
    error: "Impossible d'afficher les artisans pour le moment. Réessayez dans quelques instants.",
  },
  lieux: {
    appartement: "En appartement",
    maison: "En maison",
    jardin: "Dans un jardin",
    entreprise: "En entreprise",
  },
  surfaces: {
    moins_10: "< 10 m²",
    "10_20": "10 à 20 m²",
    "20_50": "20 à 50 m²",
    plus_50: "> 50 m²",
  },
  guest: {
    spaceTitle: "Votre espace MENAO",
    spaceText: "Gratuit, il vous accompagne de la demande jusqu'à la réception du chantier.",
    benefits: [
      "Suivez vos demandes et vos chantiers",
      "Échangez avec vos artisans",
      "Retrouvez vos devis et vos factures",
    ],
    createAccount: "Créer mon compte",
    haveAccount: "Vous avez déjà un compte ?",
    signIn: "Me connecter",
    chantiers: {
      title: "Suivez vos chantiers",
      text: "Créez votre compte pour retrouver vos demandes, vos devis et l'avancement de vos travaux.",
    },
    messages: {
      title: "Échangez avec vos artisans",
      text: "Avec un compte, vous discutez avec vos artisans et retrouvez leurs réponses ici.",
    },
    notifications: {
      title: "Restez informé",
      text: "Avec un compte, vous êtes prévenu des réponses des artisans, des devis et des paiements.",
    },
    artisanTitle: "Vous êtes artisan ?",
    // Règle 10 et règles des stores : aucun lien vers l'inscription pro ni l'abonnement [À VALIDER].
    artisanText: "L'espace pro MENAO se crée depuis le site, sur ordinateur.",
    helpTitle: "Besoin d'aide ?",
    faq: "Questions fréquentes",
    contact: "Nous contacter",
  },
  soon: {
    title: "Bientôt dans l'application",
    chantiers:
      "Vos demandes et vos chantiers arrivent ici : devis, signature, paiements et suivi des travaux.",
    messages: "Vos échanges avec les artisans arriveront ici.",
    notifications: "Vos notifications arriveront ici, avec les alertes sur votre téléphone.",
    dashboard: "Votre activité arrive ici : nouvelles demandes, rendez-vous et devis à envoyer.",
    requests: "Les demandes des particuliers de votre zone arriveront ici.",
    agenda: "Vos rendez-vous et vos chantiers arriveront ici.",
    artisanMessages: "Vos échanges avec vos clients arriveront ici.",
    web: "En attendant, tout est disponible sur le site MENAO.",
  },
  account: {
    title: "Mon compte",
    signedInAs: "Connecté en tant que",
    particulier: "Particulier",
    artisan: "Artisan",
    artisanPending: "Artisan, dossier en cours",
    subscription: "Abonnement",
    // Règle 10 : aucun lien ni bouton d'achat de l'abonnement dans l'application.
    subscriptionText: "Votre abonnement est géré depuis votre espace web.",
    pendingTitle: "Votre dossier est en cours",
    pendingText:
      "Terminez votre inscription et déposez vos documents depuis le site MENAO. Votre espace s'ouvrira une fois le dossier validé.",
    legal: "Informations légales",
    terms: "Conditions générales d'utilisation",
    privacy: "Politique de confidentialité",
    signOut: "Me déconnecter",
    version: (version: string) => `Version ${version}`,
  },
  notFound: {
    title: "Page introuvable",
    text: "Cette page n'existe pas ou a été déplacée.",
    home: "Revenir à l'accueil",
  },
  staff: {
    title: "Back-office MENAO",
    text: "Le back-office de l'équipe MENAO est disponible sur le site, depuis un ordinateur.",
  },
} as const;
