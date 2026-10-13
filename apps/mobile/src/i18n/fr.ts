/** Textes de l'application native, en français et centralisés (comme ceux du site). */
export const fr = {
  brand: "MENAO",
  nav: {
    back: "Retour",
    currentStep: "étape en cours",
    doneStep: "étape terminée",
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
    account: "Compte",
  },
  // Textes repris du site (accueil, « Comment ça marche », garanties) : aucun chiffre inventé.
  home: {
    greeting: "Bonjour !",
    subtitle: "Besoin d'un artisan du bâtiment ?",
    searchPlaceholder: "Décrivez votre projet…",
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
    error: "Impossible d'afficher les artisans pour le moment. Réessayez dans quelques instants.",
  },
  selection: {
    select: "Sélectionner",
    selected: "Sélectionné",
    alreadySent: "Demande envoyée",
    hint: "Sélectionnez jusqu'à 3 artisans : ils recevront votre demande en même temps.",
    submit: (n: number) => (n <= 1 ? "Envoyer ma demande" : `Envoyer ma demande aux ${n} artisans`),
    limit: "Vous pouvez contacter 3 artisans au plus pour ce projet.",
    noSlot: "Vous avez déjà contacté 3 artisans pour ce projet.",
    sentBanner: (names: string) => `Votre demande est déjà envoyée à ${names}.`,
    viewProfile: "Voir le profil",
  },
  profile: {
    request: "Envoyer une demande",
    company: "Entreprise",
    experience: "Expérience",
    experienceValue: (years: number) => (years <= 1 ? `${years} an` : `${years} ans`),
    zone: "Zone d'intervention",
    responseTime: {
      "1h": "Répond en moins d'1\u00a0h",
      "3h": "Répond en moins de 3\u00a0h",
      "24h": "Répond dans la journée",
      "48h": "Répond sous 48\u00a0h",
    },
    unavailable: "Indisponible pour le moment",
    about: (name: string) => `À propos de ${name}`,
    expertise: "Expertises",
    guarantees: "Garanties & assurances",
    decennaleTitle: "Assurance décennale vérifiée",
    decennaleUntil: (date: string, insurer: string | null) =>
      `Valable jusqu'au ${date}${insurer ? ` · ${insurer}` : ""}`,
    certificationTitle: (label: string) => `Certifié ${label}`,
    certificationDetail: (numero: string, date: string) =>
      `N° ${numero} · valable jusqu'au ${date}`,
    score: "Score MENAO",
    scoreEmpty:
      "Pas encore de score : cet artisan vient de rejoindre MENAO. Le score sera calculé à partir des avis vérifiés de ses clients.",
    scoreRows: {
      quality: "Qualité des prestations",
      delays: "Respect des délais",
      communication: "Communication",
      value_for_money: "Rapport qualité/prix",
    },
    scoreGlobal: "Score global",
    scoreBasis: (n: number) =>
      n <= 1 ? "Calculé sur 1 avis vérifié" : `Calculé sur ${n} avis vérifiés`,
    recent: "Chantiers récents",
    reviews: "Derniers avis clients",
    reviewsEmpty: "Pas encore d'avis vérifié.",
    receivedOn: (date: string) => `Chantier réceptionné le ${date}`,
    replyFrom: (name: string) => `Réponse de ${name}`,
    notFound: "Cet artisan n'est plus disponible.",
    percent: (value: number) => `${value}\u00a0%`,
    stars: (score: number, stars: number) => `Note : ${score}\u00a0% (${stars} sur 5)`,
  },
  request: {
    title: (names: string) => `Envoyez votre demande à ${names}`,
    intro: "Ajoutez un message personnalisé si vous le souhaitez, puis vérifiez vos coordonnées.",
    accountTitle: "Dernière étape avant d'envoyer votre demande",
    accountIntro:
      "Créez votre espace MENAO pour envoyer votre demande : vous suivrez ensuite les réponses des artisans, les devis et vos chantiers.",
    signUpTab: "Créer mon espace",
    signInTab: "J'ai déjà un compte",
    signUpSubmit: "Créer mon espace et continuer",
    signInSubmit: "Me connecter et continuer",
    free: "La création de votre espace MENAO et la mise en relation sont 100\u00a0% gratuites.",
    checkEmail:
      "Nous venons de vous envoyer un e-mail de confirmation. Ouvrez le lien qu'il contient, puis connectez-vous ici pour envoyer votre demande.",
    selected: "Artisans sélectionnés",
    messageTitle: "Message personnalisé (facultatif)",
    messageHint: (names: string) =>
      `Il peut aider ${names} à préparer votre rendez-vous et le devis.`,
    contactTitle: "Vos coordonnées",
    contactIntro: "Elles ne sont transmises qu'aux artisans qui acceptent votre demande.",
    email: "E-mail",
    phone: "Téléphone",
    callbackTitle: "Quand souhaitez-vous être recontacté ?",
    callbackAsap: "Dès que possible",
    callbackRange: "Indiquer une plage horaire",
    from: "À partir de",
    to: "Jusqu'à",
    timePlaceholder: "09:00",
    submit: (n: number) => (n <= 1 ? "Envoyer ma demande" : `Envoyer ma demande aux ${n} artisans`),
    deadline: "Chaque artisan a 48 heures pour vous répondre.",
    transferError:
      "Nous n'avons pas pu rattacher votre projet à votre compte. Recommencez votre recherche depuis l'accueil.",
    notParticulier: "Connectez-vous avec un compte particulier pour envoyer une demande.",
    nothingToSend: "Ces artisans ont déjà reçu votre demande, ou ne sont plus disponibles.",
  },
  sent: {
    title: (names: string) => `Votre demande est envoyée à ${names}\u00a0!`,
    text: (names: string, many: boolean) =>
      many
        ? `${names} ont bien reçu votre demande. Chaque artisan a 48 heures pour l'accepter.`
        : `${names} a bien reçu votre demande et a 48 heures pour l'accepter.`,
    reminder: "Rappel",
    callbackAsap: "Vous avez demandé à être rappelé dès que possible.",
    callbackRange: (from: string, to: string) =>
      `Vous avez indiqué être joignable par téléphone entre ${from} et ${to}.`,
    next: "Vous recevrez les coordonnées de chaque artisan dès qu'il accepte votre demande.",
    follow: "Suivre ma demande",
    home: "Revenir à l'accueil",
  },
  // Suivi des demandes et des chantiers (F-11, F-12) : textes repris de l'espace client du site.
  myChantiers: {
    title: "Mes chantiers",
    subtitle: "Suivez vos chantiers MENAO, en toute simplicité",
    start: "Démarrer un chantier",
    countActive: (n: number) => (n <= 1 ? `${n} chantier en cours` : `${n} chantiers en cours`),
    countToSign: (n: number) => `${n} devis à signer`,
    tabs: { inProgress: "En cours", finished: "Terminés" },
    inProgress: "Mes chantiers en cours",
    pending: "Mes demandes en attente",
    finished: "Mes chantiers terminés",
    noActive: "Aucun chantier en cours pour le moment.",
    noFinished: "Aucun chantier terminé pour le moment.",
    empty: "Vous n'avez pas encore envoyé de demande.",
    emptyHint:
      "Décrivez votre projet : nous vous proposons des artisans vérifiés près de chez vous.",
    drafts: {
      title: "Recherches non envoyées",
      intro:
        "Vous avez commencé ces recherches sans envoyer de demande : reprenez-les quand vous voulez.",
      started: (date: string) => `Commencée le ${date}`,
      untitled: "Recherche sans titre",
      resume: "Reprendre",
    },
    error: "Impossible d'afficher vos chantiers pour le moment. Tirez vers le bas pour réessayer.",
  },
  myRequests: {
    status: {
      envoyee: "En attente de réponse",
      acceptee: "Acceptée",
      refusee: "Refusée",
      expiree: "Sans réponse",
      annulee: "Annulée",
    },
    timeLeft: (h: number, m: number) =>
      `Réponse attendue sous ${h} h ${String(m).padStart(2, "0")}`,
    yourArtisans: "Vos artisans",
    chooseAnother: "Choisir un autre artisan",
    cancelledByArtisan: "L'artisan a annulé le rendez-vous.",
    cancelledByYou: "Vous avez annulé cette demande.",
    seeChantier: "Voir le chantier",
  },
  clientCancel: {
    reasonsLegend: "Pourquoi annulez-vous ?",
    reasons: {
      plus_besoin: "Je n'ai plus besoin de ces travaux",
      autre_artisan: "J'ai choisi un autre artisan",
      delai: "Le délai ne me convient pas",
      budget: "Le budget ne me convient pas",
      autre: "Autre raison",
    },
    comment: "Un mot pour l'artisan ? (facultatif)",
    open: "Annuler ma demande",
    title: "Annuler votre demande ?",
    intro: (artisan: string) =>
      `${artisan} recevra un message et n'aura plus à vous répondre. Vous pourrez solliciter un autre artisan.`,
    submit: "Annuler ma demande",
    done: "Votre demande est annulée.",
    chantier: {
      open: "Annuler le chantier",
      title: "Annuler ce chantier ?",
      intro: (artisan: string) =>
        `Le rendez-vous avec ${artisan} sera annulé et il en sera prévenu. Cette annulation est définitive.`,
      submit: "Annuler le chantier",
    },
  },
  chantier: {
    steps: {
      signature: "Signature",
      paiement: "Paiement",
      planification: "Planification",
      travaux: "Travaux",
      reception: "Réception",
    },
    stepsLabel: "Avancement du chantier",
    yourArtisan: "Votre artisan",
    verified: "Artisan vérifié par MENAO",
    call: "Appeler",
    tabs: { suivi: "Suivi", dossier: "Dossier" },
    startPlanned: (date: string) => `Démarrage prévu le ${date}`,
    inProgress: "Chantier en cours",
    clientStatus: {
      demande_envoyee: "Demande envoyée",
      rdv_planifie: "Rendez-vous planifié",
      devis_envoye: "Devis à signer",
      devis_en_revision: "Modification du devis demandée",
      devis_refuse: "Devis refusé",
      devis_signe: "Acompte à payer",
      acompte_paye: "Date de démarrage à confirmer",
      planifie: "Chantier planifié",
      en_cours: "Chantier en cours",
      travaux_termines: "Travaux terminés",
      reserves_a_lever: "Réserves à lever",
      receptionne: "Chantier réceptionné",
      cloture: "Chantier terminé",
      en_litige: "Litige en cours",
      annule: "Chantier annulé",
    },
    finishedOn: (date: string) => `Travaux terminés le ${date}`,
    receivedOn: (date: string) => `Réceptionné le ${date}`,
    closedOn: (date: string) => `Terminé le ${date}`,
    cancelledOn: (date: string) => `Annulé le ${date}`,
    quoteRefused: "Devis refusé",
    journal: {
      title: "Suivi du chantier",
      lastUpdate: (ago: string) => `Dernière mise à jour : ${ago}`,
      clientWaiting: (artisan: string) =>
        `Le suivi de chantier débutera dès que ${artisan} commencera les travaux.`,
      clientEmpty: (artisan: string) =>
        `Les photos et messages du chantier laissés par ${artisan} seront affichés ici.`,
      photosTitle: "Photos du chantier",
      messageLeft: (ago: string) => `Message laissé ${ago}`,
    },
    next: {
      title: "Prochaine intervention",
      appointmentOn: (day: string, time: string) => `Rendez-vous le ${day} à ${time}`,
      startOn: (day: string, time: string) => `Démarrage le ${day} à ${time}`,
    },
    dossier: {
      documents: "Documents liés",
      quote: "Devis",
      signedQuote: "Devis signé",
      invoice: { acompte: "Facture d'acompte", solde: "Facture de solde" },
      meta: (numero: string, date: string) => `${numero} · ${date}`,
      noDocuments: "Les documents du chantier (devis, factures) apparaîtront ici.",
      schedule: "Échéancier de paiement",
      total: "Total du chantier",
      paid: "Déjà payé",
      remaining: "Restant à payer",
      noSchedule: "L'échéancier de paiement apparaîtra avec le devis signé.",
    },
    action: {
      signTitle: "Votre devis est prêt",
      signText: "Consultez le devis et signez-le pour lancer votre chantier.",
      sign: "Voir et signer le devis",
      payTitle: "Vous avez un paiement à effectuer",
      payText: "Effectuez le paiement pour démarrer le chantier",
      payBalanceText: "Réglez le solde pour clôturer votre chantier",
      pay: "Payer maintenant",
    },
    reception: {
      title: "Les travaux sont terminés",
      text: (artisan: string) =>
        `${artisan} a terminé les travaux. Vérifiez-les, puis validez la réception ou ajoutez des réserves.`,
      validate: "Valider la réception du chantier",
      addReserves: "Ajouter des réserves sur ce chantier",
      processing:
        "Signature reçue : son enregistrement est en cours. Elle apparaîtra ici dans quelques instants.",
      yourReserves: "Vos réserves",
      reservesNext: "Le paiement du solde vous sera demandé une fois les réserves levées.",
      received: (date: string) =>
        `Réception validée le ${date}. Prochaine étape : le paiement du solde.`,
      pvDocument: "PV de réception",
      liftSignaled: (artisan: string, date: string) =>
        `${artisan} a signalé la levée des réserves le ${date} : vérifiez les reprises, puis confirmez.`,
      confirmLift: "Confirmer la levée des réserves",
      perfectTitle: "Le chantier est-il parfait ?",
      perfectText: (balance: string) =>
        `En confirmant la levée des réserves, vous validez la fin définitive de vos travaux. Le solde de ${balance} vous sera ensuite demandé.`,
      cancel: "Retour",
      balanceProcessing:
        "Paiement reçu : sa confirmation est en cours. Il apparaîtra ici dans quelques instants.",
      closed: (date: string) => `Vous avez finalisé le paiement de ce chantier le ${date}`,
    },
    report: "Signaler un problème lié au chantier",
    notFound: "Ce chantier est introuvable.",
  },
  /** Garanties légales après la réception (ADR 0041) : mêmes textes que le site. */
  warranties: {
    title: "Vos garanties après la réception",
    intro: (date: string) =>
      `Selon la nature des travaux, la loi prévoit ces garanties à compter de la réception du ${date} :`,
    kinds: {
      parfaitAchevement: {
        label: "Garantie de parfait achèvement",
        what: "L'artisan répare les défauts signalés dans l'année qui suit la réception, y compris les réserves du procès-verbal.",
      },
      bonFonctionnement: {
        label: "Garantie de bon fonctionnement",
        what: "Équipements installés qui peuvent être retirés sans abîmer l'ouvrage (robinetterie, radiateurs, volets…).",
      },
      decennale: {
        label: "Garantie décennale",
        what: "Dommages qui compromettent la solidité de l'ouvrage ou le rendent impropre à son usage.",
      },
    },
    until: (date: string) => `jusqu'au ${date}`,
    ended: (date: string) => `terminée le ${date}`,
    insurer: (insurer: string, policy: string | null) =>
      `Assurance décennale de l'artisan : ${insurer}${policy ? `, contrat n° ${policy}` : ""}.`,
    advice:
      "En cas de problème, prévenez d'abord l'artisan par la messagerie, puis signalez-le à l'équipe MENAO depuis cette page.",
  },
  /** Signalement d'un problème (F-42) et son suivi : mêmes textes que le site. */
  dispute: {
    reportTitle: "Signaler un problème",
    intro:
      "Décrivez le problème rencontré sur ce chantier. L'équipe MENAO l'examine et vous répond dans votre espace.",
    suspends:
      "Le chantier passera en litige : ses étapes (paiements, démarrage, réception) sont suspendues jusqu'à la décision de l'équipe MENAO, qui peut faire reprendre le chantier ou l'annuler.",
    noSuspension:
      "Le chantier n'étant plus en cours, votre signalement est transmis à l'équipe MENAO.",
    categoryLegend: "Nature du problème",
    categories: {
      retard: "Retard",
      malfacon: "Malfaçon",
      comportement: "Comportement",
      paiement: "Paiement",
      autre: "Autre",
    },
    descriptionLabel: "Description du problème",
    descriptionHint: "20 caractères au moins.",
    submit: "Envoyer le signalement",
    ticketTitle: "Votre signalement",
    ticketMeta: (category: string, date: string) => `${category} · signalé le ${date}`,
    chantierLink: (title: string) => `Chantier : ${title}`,
    statuses: { ouvert: "Envoyé à l'équipe", en_cours: "En cours de traitement", resolu: "Clos" },
    description: "Votre description",
    thread: "Échanges avec l'équipe MENAO",
    you: "Vous",
    support: "Équipe MENAO",
    noMessages: "L'équipe MENAO vous répondra ici.",
    photo: "Photo du signalement : l'ouvrir",
    messageLabel: "Votre message à l'équipe MENAO",
    messageSubmit: "Envoyer",
    closed: "Ce signalement est clos.",
    ongoing:
      "Litige en cours : l'équipe MENAO examine la situation. Les étapes du chantier sont suspendues.",
    follow: "Suivre mon signalement",
    pending: "Votre signalement est en cours de traitement par l'équipe MENAO.",
    notFound: "Ce signalement est introuvable.",
  },
  /** Réception des travaux (F-25, F-26) : réserves, PV signé chez DocuSeal. */
  reception: {
    title: "Réception des travaux",
    steps: {
      reserves: "Ajout des réserves",
      pv: "Signature du PV",
      solde: "Paiement du solde",
    },
    conformTitle: "Tout est conforme ?",
    conformText: (artisan: string) =>
      `En validant la réception, vous confirmez que les travaux de ${artisan} sont terminés et ne présentent aucune malfaçon visible.`,
    important: "Information importante :",
    conformNext: (balance: string) =>
      `vous allez signer le procès-verbal de réception. Le solde de ${balance} vous sera demandé ensuite.`,
    reservesTitle: "Ajouter des réserves",
    reservesQuestion: "Un détail vous semble incomplet ou une finition nécessite une retouche ?",
    reservesHelp: (artisan: string) =>
      `Décrivez ici les points que ${artisan} doit corriger pour finaliser votre projet. Ces réserves seront inscrites sur votre PV de réception et ${artisan} en sera immédiatement informé.`,
    reservesLabel: "Vos réserves",
    reservesPlaceholder:
      "Ex. : peinture à retoucher sur la plinthe, prise de courant mal fixée, nettoyage de fin de chantier à compléter…",
    continue: "Continuer",
    editReserves: "Modifier mes réserves",
    pvTitle: "Signature du PV de réception",
    pvIntro:
      "Relisez attentivement le procès-verbal de réception pour vous assurer que tout est conforme, puis cochez les cases : vous signerez chez notre prestataire de signature électronique, DocuSeal.",
    pvLabel: "Aperçu du procès-verbal de réception",
    numberPending: "Numéro attribué à la signature",
    consents: {
      document: "J'ai lu et j'accepte le procès-verbal de réception.",
      cgu_prestataire:
        "J'accepte les conditions d'utilisation de DocuSeal, prestataire de signature électronique.",
      cgu_menao:
        "J'accepte les conditions générales d'utilisation et la politique de confidentialité de MENAO.",
      echeancier: (balance: string) =>
        `Je prends note que le solde restant à payer s'élève à ${balance}, selon l'échéancier du devis signé.`,
    },
    otp: "Un code à usage unique vous sera demandé pour confirmer votre identité.",
    submit: "Signer le PV de réception",
    unavailable:
      "La signature électronique est momentanément indisponible. Réessayez dans un instant.",
    balanceNext: "Le paiement du solde vous sera proposé après la signature.",
  },
  /** Paiement du solde (F-32), directement à l'entreprise de l'artisan. */
  balance: {
    title: "Paiement du solde",
    intro:
      "Réglez le solde de votre chantier. Le paiement est fait directement à l'entreprise de l'artisan, par Stripe.",
    paid: "Montant déjà payé",
    today: "Montant à payer aujourd'hui",
    total: "Total du chantier",
    beneficiary: (name: string) => `Bénéficiaire : ${name}`,
    direct: "Le solde est versé directement à l'entreprise, dès la réception de votre paiement.",
    submit: (amount: string) => `Payer ${amount}`,
    unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
    inProgress: "Votre paiement du solde est en cours de confirmation.",
  },
  /** Devis reçu (F-21), signature (F-13) et acompte (F-31) : mêmes textes que le site. */
  quote: {
    title: (artisan: string) => `Devis de ${artisan}`,
    titleFallback: "Votre devis",
    statuses: {
      brouillon: "Brouillon",
      envoye: "À consulter",
      signe: "Signé",
      refuse: "Refusé",
      revision_demandee: "Modification demandée",
      remplace: "Remplacé",
    },
    validUntil: (date: string) => `Valable jusqu'au ${date}`,
    document: "Contenu du devis",
    pdf: "Télécharger le PDF",
    signedPdf: "Télécharger le devis signé",
    revisionNotice:
      "Vous avez demandé une modification. L'artisan va vous envoyer une nouvelle version :",
    refusedNotice: "Vous avez refusé ce devis.",
    replacedNotice: "Ce devis a été remplacé par une nouvelle version.",
    seeNewVersion: "Voir la nouvelle version",
    requestChange: "Demander une modification",
    refuse: "Refuser le devis",
    sign: "Signer le devis",
    signedNotice: (date: string) => `Vous avez signé ce devis le ${date}.`,
    payDeposit: (amount: string) => `Payer l'acompte (${amount})`,
    depositPaid: (amount: string, date: string) => `Acompte de ${amount} payé le ${date}.`,
    depositInvoice: (numero: string) => `Télécharger la facture d'acompte ${numero}`,
    depositInProgress:
      "Votre paiement de l'acompte est en cours de confirmation par Stripe (virement ou prélèvement en attente).",
    signatureReturned:
      "Merci\u00a0! Votre signature est en cours d'enregistrement : elle apparaîtra ici dans quelques instants.",
    paymentReturned:
      "Merci\u00a0! Votre paiement est en cours de confirmation : il apparaîtra ici dans quelques instants.",
    steps: {
      label: "Étapes de la signature",
      sign: "Signature du devis",
      deposit: "Paiement de l'acompte",
    },
    signature: {
      title: "Signature du devis",
      intro:
        "Vérifiez le devis et cochez les cases ci-dessous : vous signerez ensuite chez notre prestataire de signature électronique, DocuSeal.",
      summary: (numero: string, amount: string) => `Devis n° ${numero} · ${amount} TTC`,
      consents: {
        document: "J'ai lu et j'accepte le devis.",
        cgu_prestataire:
          "J'accepte les conditions d'utilisation de DocuSeal, prestataire de signature électronique.",
        cgu_menao:
          "J'accepte les conditions générales d'utilisation et la politique de confidentialité de MENAO.",
        echeancier: (deposit: string, balance: string) =>
          `J'accepte l'échéancier : acompte de ${deposit} à la signature, solde de ${balance} à la réception des travaux.`,
      },
      links: {
        provider: "Conditions DocuSeal",
        terms: "CGU",
        privacy: "Confidentialité",
      },
      otp: "Un code à usage unique vous sera demandé pour confirmer votre identité.",
      submit: "Signer le devis",
      unavailable:
        "La signature électronique est momentanément indisponible. Réessayez dans un instant.",
      depositNext: "Le paiement de l'acompte vous sera proposé après la signature.",
    },
    deposit: {
      title: "Paiement de l'acompte",
      intro:
        "L'acompte est versé directement à l'artisan, sur son compte Stripe. MENAO ne perçoit aucune commission.",
      start: (date: string) => `Démarrage prévu le ${date}`,
      today: "À payer aujourd'hui",
      later: "À la réception des travaux",
      beneficiary: (name: string) => `Bénéficiaire : ${name}`,
      methods: "Carte bancaire, Apple Pay ou Google Pay, selon les moyens acceptés par l'artisan.",
      secure: "Paiement sécurisé par Stripe",
      submit: (amount: string) => `Payer ${amount}`,
      unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
    },
    revision: {
      title: "Demander une modification",
      intro:
        "Expliquez à l'artisan ce que vous souhaitez changer : il vous enverra une nouvelle version du devis.",
      label: "Modification souhaitée",
      submit: "Envoyer la demande",
    },
    refusal: {
      title: "Refuser le devis",
      intro: "L'artisan sera prévenu. Ce choix est définitif.",
      reason: "Raison du refus",
      reasons: {
        trop_cher: "Le prix est trop élevé",
        autre_artisan: "J'ai choisi un autre artisan",
        projet_reporte: "Je reporte mon projet",
        autre: "Autre raison",
      },
      comment: "Message pour l'artisan (facultatif)",
      submit: "Refuser le devis",
    },
    notFound: "Ce devis est introuvable.",
  },
  /** Messagerie par chantier (F-40) : mêmes textes que le site. */
  messages: {
    title: "Messages",
    subtitle: "Vos échanges avec vos artisans, chantier par chantier.",
    empty:
      "Aucun message pour le moment. Écrivez à votre artisan depuis la page de votre chantier (bouton « Message »).",
    error: "Vos messages n'ont pas pu être chargés. Tirez vers le bas pour réessayer.",
    unread: (n: number) => (n <= 1 ? "1 message non lu" : `${n} messages non lus`),
    you: "Vous : ",
    photo: "Photo",
    file: "Document PDF",
    hiddenPreview: "Message masqué",
    closedTag: "Conversation fermée",
    seeChantier: "Voir le chantier",
    conversation: (name: string) => `Conversation avec ${name}`,
    noMessages: (name: string) =>
      `Aucun message pour l'instant : écrivez à ${name} pour préparer votre chantier.`,
    read: "Lu",
    hidden: "Message masqué par l'équipe MENAO.",
    openPhoto: "Photo envoyée : l'ouvrir",
    openFile: "Document PDF : l'ouvrir",
    composerLabel: "Votre message",
    composerPlaceholder: "Écrivez votre message…",
    send: "Envoyer",
    closed: "Conversation fermée : le chantier a été annulé ou le devis refusé.",
    report: "Signaler ce message",
    reportLabel: "Motif du signalement",
    reportHint:
      "Propos injurieux, demande de paiement hors MENAO, spam… L'équipe MENAO examinera le message.",
    reportSubmit: "Envoyer le signalement",
    reportCancel: "Annuler",
    reportSent: "Signalement envoyé à l'équipe MENAO. Merci.",
    button: "Message",
    notFound: "Cette conversation est introuvable.",
  },
  /** Centre de notifications (F-41) : mêmes textes que les e-mails et que le site. */
  notificationCenter: {
    title: "Notifications",
    subtitle: "Les dernières nouvelles de vos demandes et de vos chantiers.",
    empty: "Aucune notification pour le moment.",
    error: "Vos notifications n'ont pas pu être chargées. Tirez vers le bas pour réessayer.",
    bell: (n: number) =>
      n === 0 ? "Notifications" : `Notifications : ${n} non lue${n > 1 ? "s" : ""}`,
    unread: "Non lue",
    prefsTitle: "Préférences d'e-mails",
    prefsIntro:
      "Les e-mails importants (devis, paiements, réception, litiges, avis reçus) sont toujours envoyés. Les autres peuvent être désactivés ; ils restent visibles ici.",
    activite: "Activité du chantier : nouvelles photos et nouveaux messages",
    rappels: "Rappels : rendez-vous de la veille, avis à laisser, levée des réserves à confirmer",
    save: "Enregistrer mes préférences",
    saved: "Préférences enregistrées.",
  },
  /** Documents PDF (devis, factures, PV), proposés au partage du téléphone. */
  pdf: {
    failed: "Le document n'a pas pu être téléchargé. Réessayez dans un instant.",
  },
  ago: {
    now: "à l'instant",
    minutes: (n: number) => `il y a ${n} min`,
    hours: (n: number) => `il y a ${n} h`,
    days: (n: number) => (n <= 1 ? "hier" : `il y a ${n} jours`),
    today: "Aujourd'hui",
    yesterday: "Hier",
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
    dashboard: "Votre activité arrive ici : nouvelles demandes, rendez-vous et devis à envoyer.",
    requests: "Les demandes des particuliers de votre zone arriveront ici.",
    agenda: "Vos rendez-vous et vos chantiers arriveront ici.",
    artisanMessages: "Vos échanges avec vos clients arriveront ici.",
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
