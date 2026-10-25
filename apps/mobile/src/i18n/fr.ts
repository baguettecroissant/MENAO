/** Textes de l'application native, en français et centralisés (comme ceux du site). */
export const fr = {
  brand: "MENAO",
  nav: {
    back: "Retour",
    currentStep: "étape en cours",
    doneStep: "étape terminée",
    loading: "Chargement",
    refreshing: "Actualisation",
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
    signUpText: "Vous êtes artisan ?",
    proSignUpLink: "Créer mon profil professionnel",
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
  /** Connexion avec Google ou Apple, pour les clients (ADR 0108) : mêmes textes que le site. */
  oauth: {
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    orEmail: "ou avec votre adresse e-mail",
    error:
      "La connexion avec Google ou Apple n'a pas abouti. Réessayez, ou utilisez votre adresse e-mail.",
  },
  completeSignup: {
    title: "Finaliser mon compte",
    intro: (provider: string, email: string | null) =>
      `Vous êtes connecté avec ${provider}${email ? ` (${email})` : ""}. Vérifiez vos informations et acceptez les conditions d'utilisation pour accéder à votre espace.`,
    submit: "Accéder à mon espace",
    notYou: "Ce n'est pas vous ? Se déconnecter",
  },
  /** Inscription artisan dans l'application (ADR 0113) : mêmes textes que le site (ADR 0110). */
  proSignup: {
    title: "Créer mon profil professionnel",
    progressLabel: "Créer mon profil",
    progress: (step: number, total: number) => `Étape ${step} sur ${total}`,
    continue: "Continuer",
    intro: {
      eyebrow: "Espace pro",
      title: "Recevez des demandes de chantier près de chez vous",
      lead: "Aucune commission sur vos chantiers, sans engagement. Rien à payer avant que votre entreprise soit vérifiée.",
      phases: [
        {
          title: "Créez votre profil",
          text: "2 minutes : vos métiers, votre entreprise, votre zone",
        },
        {
          title: "Faites vérifier votre entreprise",
          text: "Vos documents, en photo depuis votre téléphone",
        },
        { title: "Recevez vos premières demandes", text: "Dès que votre entreprise est vérifiée" },
      ],
      trust:
        "Les clients ne voient que des artisans vérifiés : assurés, déclarés et à jour de leurs documents.",
      start: "Commencer",
      resume: "Reprendre mon inscription",
    },
    trades: {
      title: "Quels sont vos métiers ?",
      lead: "Choisissez-en un ou plusieurs. Vous préciserez vos spécialités plus tard.",
      search: "Rechercher un métier",
      none: (query: string) => `Aucun métier ne correspond à « ${query} ».`,
      continue: (count: number) => `Continuer · ${count} métier${count > 1 ? "s" : ""}`,
    },
    company: {
      title: "Trouvons votre entreprise",
      lead: "Tapez son nom ou son SIRET : nous remplissons le reste grâce à l'Annuaire des entreprises de l'État.",
      search: "Nom de l'entreprise ou SIRET",
      searchHint: "3 caractères minimum.",
      searching: "Recherche en cours…",
      noResult:
        "Aucune entreprise trouvée. Vérifiez l'orthographe, ou tapez votre numéro SIRET (14 chiffres).",
      unavailable: "La recherche ne répond pas pour le moment : saisissez votre SIRET.",
      closed: "Fermée",
      notListed: "Mon entreprise n'apparaît pas",
      manualLabel: "Numéro SIRET",
      manualHint: "14 chiffres, sur votre Kbis ou votre avis de situation INSEE.",
      manualSubmit: "Utiliser ce SIRET",
      backToSearch: "Revenir à la recherche",
      manualName: "Entreprise à vérifier auprès de l'INSEE",
      active: "Active",
      createdIn: (year: string) => `Créée en ${year}`,
      siret: "SIRET",
      seat: "Siège",
      activity: "Activité",
      manager: "Dirigeant",
      change: "Changer d'entreprise",
      wrongCompany: "Ce n'est pas la bonne entreprise ?",
      isManager: (name: string) => `Êtes-vous ${name} ?`,
      isManagerGeneric: "Êtes-vous le dirigeant de l'entreprise ?",
      yesMe: "Oui, c'est moi",
      yes: "Oui",
      no: "Non",
      notManagerNote:
        "Pas de souci : vous continuez l'inscription, et le dirigeant signera l'engagement à la fin.",
      vatQuestion: "Votre entreprise facture-t-elle la TVA ?",
      vatHint: "Répondez « Non » si vous êtes en franchise de TVA (micro-entreprise, par exemple).",
      // Entreprise déjà inscrite (ADR 0175), comme sur le site.
      taken: {
        title: "Cette entreprise a déjà un compte MENAO",
        text: "Si c'est la vôtre, connectez-vous avec l'adresse e-mail utilisée lors de l'inscription. Sinon, écrivez-nous : nous vérifierons avec vous.",
        signIn: "Me connecter",
        contact: "Nous écrire",
        error:
          "Cette entreprise a déjà un compte MENAO : connectez-vous avec l'adresse e-mail utilisée lors de l'inscription, ou écrivez-nous.",
      },
    },
    zone: {
      title: "Où intervenez-vous ?",
      lead: "Vous recevrez les demandes des clients situés dans cette zone.",
      from: (place: string) => `Depuis ${place}`,
      fromHint: "L'adresse de votre siège",
      change: "Modifier",
      address: "Adresse de départ",
      addressHint: "Votre atelier, ou l'adresse d'où vous partez.",
      noBase: "Indiquez l'adresse d'où vous partez.",
      radius: "Jusqu'à quelle distance ?",
      km: (km: number) => `${km} km`,
      summary: (km: number, place: string) => `Jusqu'à ${km} km autour de ${place}.`,
      communesLater: "Vous préférez une liste de communes ? Vous pourrez la choisir plus tard.",
    },
    account: {
      title: "Créez votre compte",
      lead: "C'est la dernière étape pour créer votre profil.",
      email: "E-mail professionnel",
      phone: "Téléphone portable",
      phoneHint: "Pour que MENAO et vos clients puissent vous joindre.",
      acceptCgv: "J'accepte les conditions générales de vente artisans",
      readCgv: "Lire les conditions de vente artisans",
      submit: "Créer mon compte",
      oauthTitle: "Finalisez votre compte",
      oauthLead: "Vous êtes connecté. Complétez vos informations pour créer votre profil.",
      oauthSubmit: "Créer mon profil",
      referralToggle: "J'ai un code de parrainage",
      referralLabel: "Code de parrainage (facultatif)",
      referralHint:
        "Le code d'un artisan MENAO qui vous a recommandé. Un cadeau de bienvenue vous attend à la validation de votre dossier.",
      notYou: "Ce n'est pas vous ? Se déconnecter",
      clientAccount:
        "Ce compte est déjà un compte client MENAO. Pour votre activité, créez un compte pro avec une autre adresse e-mail.",
    },
    code: {
      title: "Vérifiez votre e-mail",
      lead: (email: string) => `Entrez le code à 6 chiffres envoyé à ${email}.`,
      label: "Code reçu par e-mail",
      submit: "Valider",
      resend: "Renvoyer le code",
      resent: "Nous venons de vous envoyer un nouveau code.",
      changeEmail: "Modifier l'adresse",
      invalid: "Ce code est incorrect ou a expiré. Vérifiez-le, ou demandez un nouveau code.",
    },
    welcome: {
      title: "Votre profil est créé",
      lead: "Voici l'aperçu de votre fiche. Les clients la verront dès que votre entreprise sera vérifiée.",
      toVerify: "Vérification à faire",
      zone: (place: string, km: number) => `${km} km autour de ${place}`,
      nextTitle: "Dernière étape : faites vérifier votre entreprise",
      items: [
        "La charte qualité MENAO, à signer",
        "Kbis ou extrait INSEE/RNE de moins de 3 mois",
        "Attestation d'assurance décennale",
        "Attestation de responsabilité civile professionnelle",
        "Pièce d'identité du dirigeant",
        "Attestation de vigilance URSSAF",
        "Votre photo et votre présentation",
      ],
      duration: "Environ 5 minutes, en photo depuis votre téléphone",
      cta: "Faire vérifier mon entreprise",
      later: "Pas le temps maintenant ? Nous vous enverrons un rappel par e-mail.",
      companyFallback: "Votre entreprise",
      sirene: {
        siret_missing:
          "Ce SIRET est déjà utilisé sur MENAO : indiquez le vôtre dans votre dossier.",
        unavailable:
          "La vérification de votre SIRET auprès de l'INSEE n'a pas pu se faire : nous la relancerons.",
        inactive:
          "D'après l'INSEE, votre entreprise n'est pas en activité : vérifiez votre SIRET dans votre dossier.",
      },
    },
  },
  /** « Faire vérifier mon entreprise » dans l'application (ADR 0113) : mêmes textes que le site. */
  proDossier: {
    // Demande de la zone (ADR 0182), comme sur le site.
    zoneDemand: {
      title: "Des particuliers cherchent déjà",
      body: (n: number, days: number) =>
        `${n} recherche${n > 1 ? "s" : ""} dans vos métiers et votre zone ces ${days} derniers jours.`,
      next: "Terminez votre dossier pour recevoir les prochaines demandes.",
      trade: (label: string, n: number) => `${label} : ${n}`,
    },
    title: "Faire vérifier mon entreprise",
    lead: "Ajoutez chaque élément, dans l'ordre que vous voulez. Tout est enregistré au fur et à mesure.",
    progressLabel: "Éléments terminés",
    progress: (done: number, total: number) => `${done} sur ${total}`,
    left: (n: number) =>
      n === 1 ? "Encore 1 élément avant l'envoi." : `Encore ${n} éléments avant l'envoi.`,
    ready: "Tout est prêt : envoyez votre dossier à l'équipe MENAO.",
    submit: "Envoyer mon dossier en vérification",
    submitError: "Votre dossier est incomplet. Vérifiez chaque élément puis réessayez.",
    sent: "Votre dossier est en cours de vérification. Nous vous prévenons par e-mail dès qu'il est validé.",
    refused: (motif: string | null) =>
      motif
        ? `Votre dossier n'a pas été validé. Motif : ${motif}`
        : "Votre dossier n'a pas été validé. Corrigez-le et renvoyez-le.",
    complement: (motif: string) => `L'équipe MENAO demande un complément : ${motif}`,
    profileTitle: "Votre entreprise, vos métiers, votre zone",
    profileTodo: "À compléter",
    charterTitle: "Charte qualité MENAO",
    charterHint: (rules: number) =>
      `${rules} règles à cocher et votre engagement à certifier, puis une signature`,
    profilTitle: "Votre photo et votre présentation",
    profilHint: "Ce que les clients verront sur votre fiche",
    documents: {
      kbis: "Kbis ou extrait INSEE/RNE de moins de 3 mois",
      decennale: "Attestation d'assurance décennale",
      rc_pro: "Attestation de responsabilité civile professionnelle",
      identite: "Pièce d'identité du dirigeant",
      urssaf: "Attestation de vigilance URSSAF",
    },
    documentHints: {
      kbis: "De moins de 3 mois",
      decennale: "En cours de validité",
      rc_pro: "En cours de validité",
      identite: "Carte d'identité ou passeport",
      urssaf: "De moins de 6 mois",
    },
    states: {
      missing: "À ajouter",
      en_attente: "Déposé",
      valide: "Vérifié",
      refuse: "Refusé",
      a_refaire: "À refaire",
      todo: "À faire",
      done: "Fait",
      signed: "Signée",
      exempt: "Non soumis",
    },
    exemptHint: "Vous avez déclaré vos métiers non soumis : l'équipe MENAO le vérifie.",
    refusedBecause: (motif: string) => `Motif du refus : ${motif}`,
    privacy: "Vos documents restent privés : seule l'équipe MENAO les consulte.",
    after: "Une fois votre entreprise vérifiée, MENAO vous écrit pour la suite.",
  },
  /** Entreprise et logo (ADR 0125), comme l'étape « Entreprise » du site. */
  proCompany: {
    title: "Mon entreprise",
    lead: "Vos informations d'entreprise, vos métiers et votre zone d'intervention.",
    siret: "Numéro SIRET",
    siretHint: "14 chiffres, sur votre Kbis ou votre avis de situation INSEE.",
    siretSave: "Enregistrer le SIRET",
    siretLocked: "Le SIRET ne peut plus être modifié après l'envoi en vérification.",
    siretTaken: "Ce SIRET est déjà utilisé par un autre compte artisan.",
    verify: "Vérifier mon SIRET auprès de l'INSEE",
    reverify: "Vérifier à nouveau",
    notVerified: "Votre SIRET n'a pas encore été vérifié.",
    verifiedOn: (date: string) => `Vérifié auprès de l'INSEE le ${date}.`,
    status: {
      ok: "Entreprise trouvée et active.",
      inactive: "Cette entreprise est fermée selon l'INSEE. Vérifiez votre numéro SIRET.",
      not_found: "Aucun établissement ne correspond à ce SIRET. Vérifiez votre saisie.",
      siret_missing: "Saisissez d'abord un numéro SIRET valide.",
      rate_limited: "Trop de vérifications en peu de temps. Réessayez dans une heure.",
      unavailable: "Le service de l'INSEE ne répond pas. Réessayez dans quelques minutes.",
      forbidden: "Cette vérification est réservée aux comptes professionnels.",
    },
    raisonSociale: "Raison sociale",
    partialDiffusion:
      "Vos informations ne sont pas diffusées publiquement par l'INSEE : saisissez votre raison sociale telle qu'elle figure sur votre Kbis.",
    address: "Adresse",
    apeWarning:
      "Ce code d'activité ne relève pas du bâtiment : l'équipe MENAO vérifiera votre activité lors de la validation.",
    nomCommercial: "Nom commercial (optionnel)",
    nomCommercialHint:
      "Le nom sous lequel vos clients vous connaissent, s'il diffère de la raison sociale.",
    tva: "Êtes-vous assujetti à la TVA ?",
    tvaYes: "Oui",
    tvaNo: "Non (franchise en base)",
    tvaNumber: (number: string) => `Numéro de TVA intracommunautaire : ${number}`,
    save: "Enregistrer",
    saved: "Modifications enregistrées.",
    verifyFirst: "Vérifiez d'abord votre SIRET pour modifier ces informations.",
    logoTitle: "Logo sur vos documents (facultatif)",
    logoIntro:
      "Il apparaît en haut de vos devis, factures et procès-verbaux de réception. Les documents déjà envoyés gardent le logo qu'ils avaient.",
    logoSend: "Ajouter mon logo",
    logoChange: "Remplacer mon logo",
    logoRemove: "Retirer le logo",
    logoDone: "Logo enregistré.",
    logoRemoved: "Logo retiré.",
    logoAlt: "Votre logo actuel",
    trades: "Métiers, spécialités et certifications",
    tradesHint: "Ce que vous faites, et vos qualifications.",
    zone: "Zone d'intervention",
    zoneHint: "Où vous recevez les demandes des particuliers.",
    loadError: "Les informations de votre entreprise n'ont pas pu être chargées. Réessayez.",
  },
  /** Métiers, spécialités, certifications et RGE (ADR 0125), comme l'étape « Métiers » du site. */
  proTrades: {
    title: "Métiers et certifications",
    legend: "Vos métiers",
    hint: "Cochez vos métiers puis, si vous le souhaitez, vos spécialités.",
    specialties: (trade: string) => `Spécialités : ${trade}`,
    experience: "Années d'expérience",
    diploma: "Votre diplôme du métier (le plus élevé)",
    diplomaNone: "Aucun",
    diplomaHint: "Facultatif : il compte dans votre Score MENAO et s'affiche sur votre fiche.",
    // Budget minimum des demandes (ADR 0164).
    budgetMinimum: "Budget minimum des chantiers",
    budgetMinimumHint:
      "Facultatif : vous ne recevez pas les demandes dont le budget annoncé est inférieur. Celles sans budget vous restent proposées.",
    budgetMinimumAll: "Tous les budgets",
    budgetMinimumOptions: {
      "1000_5000": "À partir de 1\u00a0000\u00a0€",
      "5000_15000": "À partir de 5\u00a0000\u00a0€",
      "15000_50000": "À partir de 15\u00a0000\u00a0€",
      plus_50000: "À partir de 50\u00a0000\u00a0€",
    },
    save: "Enregistrer mes métiers",
    saved: "Métiers enregistrés.",
    certifications: "Certifications et qualifications",
    certificationsHint:
      "Qualibat, Qualifelec, QualiPAC… L'équipe MENAO les vérifie avant de les afficher sur votre fiche.",
    noCertification: "Aucune certification ajoutée.",
    certValidUntil: (date: string) => `valable jusqu'au ${date}`,
    certType: "Type",
    certNumber: "Numéro",
    certEnd: "Date de fin de validité",
    certAdd: "Ajouter la certification",
    certDelete: (label: string) => `Supprimer la certification ${label}`,
    certTypes: {
      rge: "RGE",
      qualifelec: "Qualifelec",
      qualibat: "Qualibat",
      qualipac: "QualiPAC",
      qualipv: "QualiPV",
      qualisol: "Qualisol",
      qualibois: "Qualibois",
      autre: "Autre",
    },
    rgeTitle: "RGE : vérifié automatiquement avec votre SIRET",
    rgeFound: "Domaines RGE trouvés dans l'annuaire officiel, affichés sur votre fiche :",
    rgeNone:
      "Aucune qualification RGE en cours pour votre SIRET dans l'annuaire officiel. Si vous venez de l'obtenir, elle apparaîtra dès sa publication.",
    rgeCheckedOn: (date: string) => `Annuaire consulté le ${date}.`,
    rgeRefresh: "Actualiser",
    rgeStatus: {
      ok: "Annuaire RGE consulté : votre fiche est à jour.",
      rate_limited: "Trop de demandes : réessayez dans une heure.",
      siret_missing: "Renseignez d'abord votre SIRET dans « Mon entreprise ».",
      unavailable: "L'annuaire RGE ne répond pas pour l'instant. Réessayez plus tard.",
    },
    loadError: "Vos métiers n'ont pas pu être chargés. Réessayez.",
  },
  /** Zone d'intervention (ADR 0125), comme l'étape « Zone » du site. */
  /** Aperçu de la zone d'intervention sur le Plan IGN (ADR 0126, 0127). */
  zoneMap: {
    // Source du Plan IGN, exigée par la Licence Ouverte.
    credit: "© IGN",
  },
  proZone: {
    title: "Zone d'intervention",
    lead: "Vous recevrez les demandes des clients situés dans cette zone.",
    mode: "Comment définir votre zone ?",
    modeRadius: "Un rayon",
    modeCommunes: "Des communes",
    current: (place: string) => `Adresse de départ : ${place}`,
    address: "Nouvelle adresse de départ",
    addressHint: "Votre atelier, ou l'adresse d'où vous partez.",
    addressRequired: "Choisissez une adresse dans la liste.",
    change: "Changer d'adresse",
    radius: "Jusqu'à quelle distance ?",
    km: (km: number) => `${km} km`,
    communes: "Ajouter une commune",
    communesHint: "Tapez le nom d'une commune, puis choisissez-la dans la liste.",
    communesEmpty: "Aucune commune pour le moment.",
    communeRemove: (nom: string) => `Retirer ${nom}`,
    save: "Enregistrer ma zone",
    saved: "Zone enregistrée.",
    loadError: "Votre zone n'a pas pu être chargée. Réessayez.",
  },
  /** Compte de paiement Stripe (ADR 0124), comme l'étape « Paiements » du site. */
  proPayments: {
    title: "Paiements",
    intro:
      "Vos clients vous paient directement sur votre compte, via Stripe (prestataire de paiement agréé). MENAO ne touche jamais l'argent de vos chantiers et ne prélève aucune commission.",
    fees: "Les frais de paiement Stripe sont déduits de chaque encaissement ; vous gérez vos paiements, remboursements et virements depuis votre propre tableau de bord Stripe.",
    notValidated:
      "La configuration des paiements sera disponible dès que l'équipe MENAO aura validé votre dossier.",
    start: "Configurer mes paiements avec Stripe",
    resume: "Reprendre la configuration Stripe",
    complete: "Compléter mes informations sur Stripe",
    active:
      "Votre compte de paiement est actif : vous pouvez recevoir les paiements de vos clients.",
    payoutsPending:
      "Les virements vers votre compte bancaire seront activés dès que Stripe aura terminé ses vérifications.",
    dashboard: "Ouvrir mon tableau de bord Stripe",
    linkExpired: "Le lien Stripe a expiré : reprenez la configuration.",
    dueTitle: "Stripe attend encore quelques informations pour activer vos paiements :",
    duePayoutsTitle: "Pour activer les virements vers votre banque, Stripe attend encore :",
    deadline: (date: string) => `À fournir avant le ${date}.`,
    verifying:
      "Stripe vérifie les informations transmises. Rien à faire de votre côté pour l'instant : revenez un peu plus tard pour voir où en est votre compte.",
    verifyingItems: "En cours de vérification :",
    check: "Actualiser l'état de mon compte",
    refused:
      "Stripe a refusé l'ouverture de ce compte de paiement. Contactez l'équipe MENAO pour trouver une solution.",
    // Aperçu du compte Stripe, en lecture seule (ADR 0152), comme sur le site.
    overview: {
      title: "Votre argent",
      available: "Disponible",
      availableHint: "Prêt à être viré sur votre compte bancaire",
      pending: "En cours",
      pendingHint: "Paiements reçus, bientôt disponibles",
      nextPayout: "Prochain virement",
      nextPayoutOn: (date: string) => `Arrive le ${date}`,
      noPayout: "Aucun virement prévu",
      fees: "Frais Stripe ce mois-ci",
      collectedMonth: "Encaissé via MENAO ce mois-ci",
      collectedYear: (amount: string) => `${amount} depuis le 1er janvier`,
      bank: (name: string | null, last4: string) =>
        `Virements vers ${name ?? "votre compte bancaire"} •••• ${last4}`,
      schedule: {
        daily: "Virement automatique chaque jour ouvré",
        weekly: (day: string) => `Virement automatique chaque semaine, le ${day}`,
        monthly: (day: number) => `Virement automatique chaque mois, le ${day === 1 ? "1er" : day}`,
        manual: "Virements manuels, depuis votre tableau de bord Stripe",
      },
      delay: (days: number) =>
        `Un paiement devient disponible ${days} jour${days > 1 ? "s" : ""} après son encaissement.`,
      weekdays: {
        monday: "lundi",
        tuesday: "mardi",
        wednesday: "mercredi",
        thursday: "jeudi",
        friday: "vendredi",
        saturday: "samedi",
        sunday: "dimanche",
      } as Record<string, string>,
      recent: "Derniers virements",
      status: {
        pending: "Prévu",
        in_transit: "En route",
        paid: "Versé",
        failed: "Échoué",
        canceled: "Annulé",
      },
      readOnly:
        "Chiffres lus chez Stripe. Virements, remboursements et coordonnées bancaires se gèrent dans votre tableau de bord Stripe.",
      unavailable:
        "Les chiffres de Stripe sont momentanément indisponibles. Vous les retrouvez dans votre tableau de bord Stripe.",
    },
    groups: {
      banque: "Coordonnées bancaires (IBAN) pour recevoir vos paiements",
      identite: "Pièce d'identité du représentant légal",
      representant: "Informations sur le représentant légal (nom, date de naissance, coordonnées)",
      adresse: "Adresse de l'entreprise ou du représentant",
      entreprise: "Informations sur l'entreprise (raison sociale, SIREN, téléphone)",
      justificatif_entreprise:
        "Justificatif d'entreprise (par exemple un extrait Kbis ou un avis de situation INSEE)",
      personnes: "Dirigeants et bénéficiaires effectifs",
      activite: "Description de votre activité",
      conditions: "Acceptation des conditions d'utilisation de Stripe",
      autre: "Autres informations demandées par Stripe",
    },
    errors: {
      not_validated: "Votre dossier doit d'abord être validé par l'équipe MENAO.",
      no_account: "Aucun compte de paiement pour le moment.",
      rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
      unavailable: "Stripe est momentanément indisponible. Réessayez dans quelques minutes.",
      forbidden: "Cette action est réservée aux comptes professionnels.",
    } as Record<string, string>,
    loadError: "L'état de votre compte de paiement n'a pas pu être chargé. Réessayez.",
  },
  /** « Mes documents » (ADR 0123), comme la page des documents du site. */
  proDocuments: {
    title: "Mes documents",
    lead: "Vos documents obligatoires. Renouvelez-les avant leur échéance pour rester visible des particuliers.",
    validUntil: (date: string) => `Valable jusqu'au ${date}`,
    expiresIn: (n: number) =>
      n <= 0 ? "Expire aujourd'hui" : n === 1 ? "Expire demain" : `Expire dans ${n} jours`,
    expired: "Expiré : déposez un nouveau document",
    pending: "Nouveau document envoyé, en cours de vérification",
    refused: (motif: string | null) => (motif ? `Refusé : ${motif}` : "Refusé"),
    kbisDone: "Le Kbis n'est plus demandé une fois le dossier validé.",
    states: {
      valide: "Vérifié",
      bientot: "À renouveler",
      urgent: "Urgent",
      expire: "Expiré",
      en_attente: "Envoyé",
      refuse: "Refusé",
      missing: "À ajouter",
      exempt: "Non soumis",
    },
    error: "Vos documents n'ont pas pu être chargés. Réessayez.",
  },
  /** Un document du dossier, en photo (ADR 0113) : mêmes champs et contrôles que le site. */
  proDocument: {
    photoHint:
      "Une photo nette, à plat et bien éclairée, ou le fichier PDF reçu de votre assureur.",
    take: "Prendre en photo",
    choose: "Choisir dans mes photos",
    chooseFile: "Choisir un fichier (PDF)",
    fileReady: (name: string) => `Fichier prêt à envoyer : ${name}`,
    kbisDone: "Le Kbis n'est plus demandé une fois le dossier validé : rien à envoyer.",
    radiated: "Votre compte est radié : les documents ne peuvent plus être changés.",
    replace: "Reprendre la photo",
    added: "Photo prête à envoyer",
    dateEmission: "Date de l'extrait",
    dateEmissionUrssaf: "Date d'émission",
    securityCode: "Code de sécurité",
    securityCodeHint:
      "Le code inscrit sur l'attestation : l'équipe MENAO le vérifie sur le site de l'URSSAF.",
    dateFin: "Valable jusqu'au",
    dateFinIdentite: "Date d'expiration (facultatif)",
    datePlaceholder: "JJ/MM/AAAA",
    dateInvalid: "Date invalide (JJ/MM/AAAA).",
    assureur: "Assureur",
    numero: "Numéro de contrat",
    couverture: "Couverture géographique",
    couverturePlaceholder: "France métropolitaine",
    coverageLegend: "Votre attestation couvre-t-elle ces métiers ?",
    coverageHint: "Un métier non couvert passe en vérification manuelle par l'équipe MENAO.",
    exemptTitle: "Métiers non soumis à la décennale ?",
    exemptText:
      "Pour les rares métiers sans travaux sur le bâti (nettoyage, petit dépannage sans travaux…), la décennale n'est pas obligatoire. L'équipe MENAO vérifie votre déclaration.",
    exemptDeclare: "Mes métiers ne sont pas soumis à la décennale",
    exemptDeclared:
      "Vous avez déclaré vos métiers non soumis à la décennale : l'équipe MENAO vérifiera votre déclaration avec votre dossier.",
    exemptCancel: "Annuler : je dépose mon attestation décennale",
    send: "Envoyer le document",
    sent: "Document envoyé : l'équipe MENAO le vérifie.",
    photoRequired: "Ajoutez une photo ou un fichier PDF du document.",
    locked:
      "Votre dossier est en cours de vérification : les documents ne peuvent plus être changés.",
    current: (state: string) => `État : ${state}`,
    /** Lecture automatique du document (ADR 0176), comme sur le site. */
    reading: {
      reading: "Lecture du document…",
      done: "Document lu automatiquement : vérifiez les informations ci-dessous avant de l'envoyer.",
      empty:
        "Nous n'avons pas trouvé ces informations sur le document : complétez les champs ci-dessous.",
      failed: "Le document n'a pas pu être lu automatiquement : complétez les champs ci-dessous.",
      otherDocument: (expected: string) =>
        `Ce document ne semble pas être le bon (attendu : ${expected}). Vérifiez le fichier avant de l'envoyer.`,
      warnings: {
        illisible:
          "Le document est difficile à lire : reprenez la photo à plat, bien éclairée et sans reflet. Un document illisible est refusé.",
        siren_different:
          "Le numéro SIREN inscrit sur ce document n'est pas celui de votre entreprise. Vérifiez que le document est bien à son nom.",
      },
    },
  },
  /** Photo et présentation de la fiche de l'artisan (ADR 0113), comme sur le site. */
  proPublicProfile: {
    title: "Votre photo et votre présentation",
    photoTitle: "Photo de profil",
    photoHint: "Votre visage ou le logo de votre entreprise, bien cadré.",
    addPhoto: "Ajouter une photo",
    changePhoto: "Changer la photo",
    photoDone: "Photo enregistrée.",
    presentation: "Présentation",
    presentationHint: (min: number, length: number) =>
      `${min} caractères au moins (${length} pour l'instant) : votre expérience, vos spécialités, votre façon de travailler.`,
    save: "Enregistrer la présentation",
    saved: "Présentation enregistrée.",
    // Photos de réalisations (ADR 0124), comme sur le site.
    portfolioTitle: "Photos de réalisations",
    portfolioHint: (max: number) =>
      `Jusqu'à ${max} photos de chantiers terminés (sans personne ni adresse visible).`,
    portfolioEmpty: "Aucune photo pour le moment.",
    portfolioAdd: "Ajouter des photos",
    portfolioFull: (max: number) => `${max} photos au plus : retirez-en une pour en ajouter.`,
    portfolioSending: (done: number, total: number) => `Envoi de la photo ${done} sur ${total}…`,
    portfolioDone: (n: number) => (n > 1 ? `${n} photos ajoutées.` : "Photo ajoutée."),
    portfolioPhoto: (n: number) => `Réalisation ${n}`,
    portfolioDelete: (n: number) => `Retirer la réalisation ${n}`,
    portfolioDeleteError: "La photo n'a pas pu être retirée. Réessayez.",
    // Fiche dans Google (ADR 0144, 0171), comme sur le site, sans lien vers la fiche (règle 10).
    google: "Afficher ma fiche dans Google",
    googleHint:
      "Recommandé : les particuliers qui cherchent un artisan près de chez eux vous trouvent plus facilement. Votre fiche ne montre jamais votre téléphone, votre e-mail ni votre adresse.",
    googleOff:
      "Votre fiche reste accessible par son adresse, mais Google ne la propose plus. Le retrait peut prendre quelques semaines.",
    googleSaved: "Choix enregistré.",
  },
  // Barres d'onglets des maquettes (ADR 0084) : client « Accueil · Chantiers · (Recherche) ·
  // Documents · Messages », artisan « Accueil · Demandes · (+) · Chantiers · Argent » (ADR 0188).
  tabs: {
    home: "Accueil",
    requests: "Demandes",
    requestsBadge: (n: number) => (n === 1 ? "1 demande à traiter" : `${n} demandes à traiter`),
    chantiers: "Chantiers",
    documents: "Documents",
    quotes: "Devis",
    messages: "Messages",
    search: "Nouvelle recherche",
    quickActions: "Actions rapides",
    // Onglet « Argent » de l'artisan (ADR 0188) : devis, factures et dépenses.
    money: "Argent",
    invoices: "Factures",
    expenses: "Dépenses",
  },
  // Textes repris du site (accueil, « Comment ça marche », garanties) : aucun chiffre inventé.
  home: {
    greeting: "Bonjour !",
    subtitle: "Besoin d'un artisan du bâtiment ?",
    searchPlaceholder: "Décrivez votre projet…",
    tags: ["Artisans vérifiés", "Décennale contrôlée", "Réponse sous 72\u00a0h"],
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
        text: "L'artisan accepte sous 72\u00a0h, vient voir votre chantier, puis vous envoie son devis.",
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
    // Accueil du client connect\u00e9 (ADR 0082) : tableau de bord.
    dashboard: {
      hello: (firstName: string | null) => (firstName ? `Bonjour ${firstName} !` : "Bonjour !"),
      summary: {
        actions: (n: number) =>
          n <= 1 ? "Une action vous attend." : `${n} actions vous attendent.`,
        a_jour: "Rien \u00e0 faire de votre c\u00f4t\u00e9 : vos chantiers suivent leur cours.",
        demandes: (n: number) =>
          n <= 1
            ? "Votre demande attend la r\u00e9ponse de l'artisan."
            : `Vos ${n} demandes attendent la r\u00e9ponse des artisans.`,
      },
      counts: {
        requests: (n: number) => (n <= 1 ? `${n} demande en attente` : `${n} demandes en attente`),
      },
      todoTitle: "\u00c0 faire",
      todo: {
        signer_devis: "Signer le devis",
        payer_acompte: "Payer l'acompte",
        valider_reception: "R\u00e9ceptionner les travaux",
        confirmer_levee: "Confirmer la lev\u00e9e des r\u00e9serves",
        payer_solde: "Payer le solde",
        donner_avis: (artisan: string) => `Noter ${artisan}`,
      },
      detail: (title: string, artisan: string) => `${title} \u00b7 ${artisan}`,
      appointmentsTitle: "Prochains rendez-vous",
      appointmentKinds: {
        visite: "Rendez-vous avec l'artisan",
        demarrage: "D\u00e9marrage des travaux",
      },
      when: (day: string, time: string) => `${day} \u00e0 ${time}`,
      chantiersTitle: "Mes chantiers en cours",
      allChantiers: "Tous mes chantiers",
      draftTitle: "Recherche non envoy\u00e9e",
      newProjectTitle: "Un nouveau projet ?",
      newProjectText:
        "Choisissez un m\u00e9tier ou d\u00e9crivez vos travaux : MENAO vous pr\u00e9sente des artisans v\u00e9rifi\u00e9s.",
      error:
        "Impossible d'afficher votre tableau de bord pour le moment. Tirez vers le bas pour r\u00e9essayer.",
    },
  },
  // Recherche (F-05 à F-07) : textes repris de la recherche du site.
  /** Raccourcis métiers des maquettes (domaine et emoji), comme sur le site. */
  tradeDomains: {
    electricien: { label: "Électricité", emoji: "⚡" },
    plombier: { label: "Plomberie", emoji: "💧" },
    chauffagiste: { label: "Chauffage", emoji: "🔥" },
    climaticien: { label: "Climatisation", emoji: "❄️" },
    macon: { label: "Maçonnerie", emoji: "🧱" },
    peintre: { label: "Peinture", emoji: "🎨" },
    plaquiste: { label: "Plâtrerie", emoji: "📐" },
    carreleur: { label: "Carrelage", emoji: "🔲" },
    menuisier: { label: "Menuiserie", emoji: "🪚" },
    charpentier: { label: "Charpente", emoji: "🪵" },
    couvreur: { label: "Couverture", emoji: "🏠" },
    facadier: { label: "Façade", emoji: "🏢" },
    serrurier: { label: "Serrurerie", emoji: "🔑" },
    terrassier: { label: "Terrassement", emoji: "🚜" },
    paysagiste: { label: "Paysagisme", emoji: "🌳" },
  } as Record<string, { label: string; emoji: string }>,
  search: {
    /** Maquette « Recherche » et site : titre, accroche, aide progressive, avantages. */
    titleStart: "Trouvez l'artisan du BTP dont",
    titleAccent: "vous avez besoin",
    tagline: "Recherche rapide et intelligente",
    rehire: (name: string) =>
      `Nouvelle demande pour ${name} : décrivez vos travaux, ${name} vous sera proposé en premier s'il intervient pour ce besoin.`,
    label: "Décrivez votre projet",
    placeholder:
      "Décrivez en détail votre besoin (ex : « Je cherche un plombier pour la rénovation complète de ma salle de bain de 8 m² à Nice »)",
    // Photo → description (ADR 0180), comme sur le site.
    photoDescription: {
      reading: "Lecture de votre photo…",
      filled: "Description rédigée d'après votre photo : vérifiez-la et complétez-la.",
      failed: "Cette photo n'a pas pu être décrite : décrivez votre besoin avec vos mots.",
      fromPhoto: "D'après votre photo :",
      add: "Ajouter",
    },
    // Compréhension en direct (ADR 0179), comme sur le site.
    understanding: { title: "Compris :" },
    // Propositions instantanées (ADR 0178), comme sur le site.
    proposals: { label: "Demandes proposées" },
    // Suggestions pendant la saisie (ADR 0177), comme sur le site.
    suggestions: {
      accept: "Compléter",
      acceptAria: (suite: string) => `Compléter avec : ${suite}`,
      ideas: "Précisez :",
      ideasAria: "Idées pour préciser votre demande",
      addIdea: (label: string) => `Ajouter : ${label}`,
    },
    attach: "Joindre des photos",
    helpEmpty: "Décrivez vos travaux avec vos mots, ou dictez-les.",
    helpShort:
      "Afin d'obtenir de meilleurs résultats, donnez un maximum de détails sur votre besoin ou votre projet.",
    helpEnough: "Avec ces informations, nous avons de quoi trouver votre artisan idéal !",
    moreTrades: "Afficher plus de métiers",
    lessTrades: "Afficher moins de métiers",
    features: [
      {
        title: "Accompagnement par IA",
        body: "Trouvez les meilleurs artisans pour votre projet grâce à une recherche intelligente.",
      },
      {
        title: "Réponse sous 72\u00a0h",
        body: "Les artisans que vous choisissez ont 72 heures pour accepter votre demande.",
      },
      {
        title: "Artisans vérifiés",
        body: "Entreprise, identité et assurances contrôlées par MENAO avant toute mise en relation.",
      },
      {
        title: "100\u00a0% gratuit",
        body: "Trouvez votre artisan et suivez vos demandes en toute sérénité. MENAO est gratuit pour vous.",
      },
    ],
    privacy:
      "Votre description est analysée par une intelligence artificielle pour pré-remplir votre recherche. Ne saisissez ni nom, ni téléphone, ni e-mail : ils sont de toute façon retirés avant l'analyse.",
    tradeLabel: "Vous savez déjà quel artisan il vous faut ?",
    submit: "Trouver mon artisan du BTP idéal",
    analyzing: "Analyse de votre projet en cours",
    uploadingPhotos: "Envoi de vos photos…",
    analysis: {
      steps: [
        "Lecture de votre description",
        "Identification du métier et des travaux",
        "Repérage du lieu et des pièces",
        "Préparation de vos critères",
      ],
      photosStep: "Envoi de vos photos",
      factsTitle: "Le saviez-vous ?",
      facts: [
        "Chaque artisan MENAO est vérifié : SIRET, assurance décennale, responsabilité civile professionnelle et pièce d'identité.",
        "Vous payez l'artisan directement, par paiement sécurisé : MENAO ne prend aucune commission sur vos travaux.",
        "Devis, signature, paiement et suivi du chantier : tout se passe au même endroit.",
        "Votre demande part à 3 artisans au plus, qui ont 72\u00a0heures pour vous répondre.",
      ],
    },
    errors: {
      rate_limited:
        "Vous avez lancé beaucoup d'analyses en peu de temps. Réessayez dans une heure.",
      invalid: "Décrivez votre projet en 5\u00a0000 caractères au plus.",
      unavailable: "L'analyse est momentanément indisponible. Réessayez dans quelques instants.",
      session:
        "Impossible de démarrer votre recherche. Vérifiez votre connexion et réessayez dans quelques instants.",
      photos:
        "Certaines photos n'ont pas pu être ajoutées. Vous pourrez les ajouter à l'étape suivante.",
    },
    /** Dictée (F-05), comme sur le site : capture du micro, transcription par l'IA. */
    dictation: {
      start: "Dicter mon projet",
      stop: "Arrêter la dictée",
      listening: (seconds: number) => `Écoute… ${seconds}\u00a0s`,
      transcribing: "Transcription en cours…",
      denied:
        "Le micro n'est pas autorisé. Autorisez-le dans les réglages du téléphone pour dicter votre projet.",
      failed: "La transcription a échoué. Réessayez ou saisissez votre projet au clavier.",
      rate_limited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
      limit: "Dictée limitée à 2 minutes.",
      quiet: "On ne vous entend pas…",
      silent: "Aucun son capté : vérifiez que le micro n'est pas coupé, puis réessayez.",
    },
    photos: {
      add: "Ajouter des photos",
      hint: "10 photos au plus, pour aider l'analyse et les artisans.",
      count: (n: number) => (n <= 1 ? `${n} photo jointe` : `${n} photos jointes`),
      remove: (index: number) => `Retirer la photo ${index}`,
      alt: (index: number) => `Photo ${index} de votre projet`,
    },
    /** Statuts de process-upload (photos du projet), comme sur le site. */
    upload: {
      unreadable: "Une photo n'a pas pu être lue. Essayez-en une autre.",
      invalid: "Photo invalide.",
      invalid_type: "Format non pris en charge (JPEG ou PNG).",
      too_large: "Photo trop lourde (10 Mo maximum).",
      not_found: "Photo introuvable, réessayez.",
      locked: "Ce projet n'est plus modifiable.",
      limit: "Vous avez atteint la limite de 10 photos.",
      forbidden: "Action non autorisée.",
      rate_limited: "Trop d'envois en peu de temps. Réessayez plus tard.",
      unavailable: "Service momentanément indisponible. Réessayez plus tard.",
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
    /** Cartes à résumé et crayon (maquette « Vérifiez vos critères », comme sur le site). */
    editLabel: (section: string) => `Modifier : ${section}`,
    cancel: "Annuler",
    save: "Enregistrer",
    notSet: "Non renseigné",
    editing: "Enregistrez ou annulez la modification en cours pour lancer la recherche.",
    trade: "Artisan recherché",
    tradeHelp: "Quel type d'artisan conviendrait le mieux à votre besoin ?",
    // Chantier à plusieurs métiers (ADR 0167), comme sur le site.
    lots: {
      title: "Autres métiers du chantier",
      suggested:
        "Votre chantier fait souvent aussi appel à ces métiers. Touchez ceux dont vous avez besoin : vous pourrez contacter des artisans pour chacun.",
      none: "Votre chantier demande plusieurs métiers ? Ajoutez-les : vous pourrez contacter des artisans pour chacun.",
      add: "Ajouter un métier",
      hide: "Masquer les autres métiers",
      limit: "4 autres métiers au plus.",
      independent: "Chaque artisan intervient pour son métier et établit son propre devis.",
    },
    works: "Travaux attendus",
    worksNeedTrade: "Choisissez d'abord le métier recherché.",
    site: "Informations sur le chantier",
    siteHelp:
      "Assurez-vous des informations du chantier afin de trouver l'artisan qu'il vous faut.",
    lieu: "Où seront réalisés les travaux ?",
    rooms: "Pièce des travaux",
    surface: "Surface estimée des travaux",
    // Budget approximatif (ADR 0163), facultatif.
    budget: "Budget approximatif (facultatif)",
    address: "Adresse",
    addressHelp: "Préciser votre adresse permet de trouver un artisan proche de chez vous.",
    city: "Votre ville",
    cityPlaceholder: "Commencez à saisir une ville",
    street: "Adresse exacte (facultatif)",
    streetHint:
      "Elle affine la recherche et ne sera communiquée qu'aux artisans qui acceptent votre demande.",
    streetPlaceholder: "Ex : 1 rue de France",
    change: "Modifier",
    date: "Date de début souhaitée",
    dateHelp: "Quand souhaitez-vous que le chantier démarre ?",
    dateModes: {
      des_que_possible: "Dès que possible",
      date: "Préciser une date de début",
      inconnue: "Date de début inconnue",
    },
    pickDate: "Choisir la date",
    startsOn: (date: string) => `Début le ${date}`,
    noMatch: "Aucun résultat.",
    photos: {
      title: "Photos supplémentaires",
      description: "Ajouter des photos permet une analyse plus précise de votre besoin.",
      add: "Ajouter une photo",
      addHelp: "Vous pouvez ajouter jusqu'à 10 photos.",
      none: "Aucune photo.",
      alt: (index: number) => `Photo ${index} du chantier`,
      delete: (index: number) => `Supprimer la photo ${index}`,
      limit: "Vous avez atteint la limite de 10 photos.",
      // Description encore vague (ADR 0163) : un conseil, jamais une obligation.
      advice:
        "Votre demande est encore peu détaillée : ajoutez quelques photos, les artisans comprendront mieux vos travaux et vous répondront plus vite.",
    },
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
    // Chantier à plusieurs métiers (ADR 0167), comme sur le site.
    lots: {
      title: "Les autres métiers de votre chantier",
      found: (n: number) =>
        n === 0
          ? "Aucun artisan disponible pour l'instant"
          : n === 1
            ? "1 artisan vérifié trouvé"
            : `${n} artisans vérifiés trouvés`,
      see: "Voir les artisans",
      lotOf: (trade: string) => `${trade} : un des métiers de votre chantier`,
      back: "Retour au chantier",
      workOrder: (trades: string) => `Ordre habituel des travaux : ${trades}.`,
      sent: "Demande envoyée",
      // Date propre au métier (ADR 0169), comme sur le site.
      start: {
        label: (when: string) => `Début souhaité : ${when}`,
        same: "comme le reste du chantier",
        edit: "Modifier",
        legend: (trade: string) => `Date de début souhaitée : ${trade}`,
        asap: "dès que possible",
        unknown: "date inconnue",
        options: {
          chantier: "Comme le reste du chantier",
          des_que_possible: "Dès que possible",
          date: "Préciser une date de début",
          inconnue: "Date de début inconnue",
        },
        pick: "Date de début",
        save: "Enregistrer",
        cancel: "Annuler",
      },
    },
    // Partenaire recommandé par un artisan du chantier (ADR 0174), comme sur le site.
    recommended: {
      title: "Recommandés par vos artisans",
      lead: "Un artisan que vous avez contacté vous recommande un de ses partenaires MENAO. Il ne voit rien de votre demande tant que vous ne le contactez pas, et chacun établit son propre devis.",
      by: (name: string) => `Recommandé par ${name}, son partenaire`,
      someone: "un de vos artisans",
    },
    // Zone élargie (ADR 0165), comme sur le site.
    wider: {
      emptyTitle: "Aucun artisan dans votre secteur pour l'instant",
      emptyLead:
        "Ces artisans vérifiés interviennent habituellement un peu plus loin : ils peuvent accepter votre demande ou la décliner.",
      lead: "Les artisans de votre secteur ont déjà reçu votre demande. D'autres artisans vérifiés interviennent un peu plus loin : ils peuvent accepter votre demande ou la décliner.",
      badge: "Un peu hors de sa zone",
    },
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
    verified: "Assuré et vérifié",
    score: (n: number) => `Score MENAO ${n}/100`,
    availableNow: "Dispo immédiate",
    availableFrom: (date: string) => `Disponible à partir du ${date}`,
    more: (n: number) => `+${n}`,
    error: "Impossible d'afficher les artisans pour le moment. Réessayez dans quelques instants.",
    // Carte d'un artisan du carrousel (maquette « Résultat de recherche - in app »).
    since: (trade: string, years: number | null) =>
      years === null ? trade : `${trade} depuis ${years} an${years > 1 ? "s" : ""}`,
    // Dernière carte du carrousel : mêmes textes que le site (aucune promesse de délai de mise en relation).
    help: {
      title: "Vous ne trouvez pas votre artisan idéal ?",
      text: "Envoyez votre dossier à l'équipe MENAO : nous vous répondons sous 7 jours.",
      cta: "Envoyer mon dossier à MENAO",
    },
  },
  /** « Résumé de mon besoin » en haut des résultats et de l'envoi (maquettes). */
  needSummary: {
    title: "Résumé de mon besoin",
    edit: "Modifier mon besoin",
    asap: "Dès que possible",
    unknownDate: "Date à définir",
    photos: (n: number) => (n <= 1 ? `${n} photo` : `${n} photos`),
  },
  /** « Envoyer mon dossier à MENAO » (F-09, F-56) : mêmes textes que le site. */
  dossier: {
    title: "Vous ne trouvez pas votre artisan idéal ?",
    intro: "Envoyez votre dossier à l'équipe MENAO : nous vous répondons sous 7 jours.",
    message: "Votre message (facultatif)",
    email: "Votre adresse e-mail",
    emailHint: "Pour que l'équipe MENAO puisse vous répondre.",
    emailInvalid:
      "Indiquez une adresse e-mail valide pour que l'équipe MENAO puisse vous répondre.",
    submit: "Envoyer mon dossier à MENAO",
    sent: "Votre dossier est transmis à l'équipe MENAO. Nous vous répondons sous 7 jours.",
    back: "Revenir aux artisans",
  },
  selection: {
    select: "Sélectionner",
    selected: "Sélectionné",
    alreadySent: "Demande envoyée",
    hint: "Sélectionnez jusqu'à 3 artisans : ils recevront votre demande en même temps.",
    submit: (n: number) => (n <= 1 ? "Envoyer ma demande" : `Envoyer ma demande aux ${n} artisans`),
    limit: "Vous pouvez contacter 3 artisans au plus pour ce projet.",
    // Chantier à plusieurs métiers (ADR 0170), comme sur le site.
    hintLots:
      "Sélectionnez jusqu'à 3 artisans par métier : ils recevront tous votre demande en un seul envoi.",
    limitLots: "Vous pouvez contacter 3 artisans au plus par métier.",
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
    unavailable: "Indisponible pour le moment",
    // Cartes d'informations de la fiche (maquette « Fiche artisan ») : valeur courte. Badge
    // « Répond en moyenne en moins de 2 h » (ADR 0160), absent au-delà.
    responseLabel: "Répond en moyenne",
    fastResponse: "En moins de 2\u00a0h",
    // Réseau du parrainage (ADR 0161).
    recommendedBy: (name: string) => `Recommandé par ${name}`,
    partners: "Artisans partenaires",
    partnersHint: (name: string) =>
      `Des artisans recommandés par ${name}, souvent d'autres métiers.`,
    verified: "Avis vérifié",
    seeMore: "Voir plus",
    seeLess: "Voir moins",
    about: (name: string) => `À propos de ${name}`,
    expertise: "Expertises",
    guarantees: "Garanties & assurances",
    verifiedBadge: "Assuré et vérifié",
    verifiedTitle: "Assuré et vérifié par MENAO",
    verifiedDetail: (exempt: boolean) =>
      exempt
        ? "Responsabilité civile professionnelle, entreprise en activité (INSEE) et attestation URSSAF à jour, vérifiées par l'équipe MENAO."
        : "Décennale, responsabilité civile professionnelle, entreprise en activité (INSEE) et attestation URSSAF à jour, vérifiées par l'équipe MENAO.",
    decennaleTitle: "Assurance décennale vérifiée",
    decennaleUntil: (date: string, insurer: string | null) =>
      `Valable jusqu'au ${date}${insurer ? ` · ${insurer}` : ""}`,
    decennaleExemptTitle: "Activité non soumise à la décennale",
    decennaleExemptDetail: "Déclaration vérifiée par l'équipe MENAO",
    rcProTitle: "Responsabilité civile professionnelle vérifiée",
    certificationTitle: (label: string) => `Certifié ${label}`,
    certificationDetail: (numero: string, date: string) =>
      `N° ${numero} · valable jusqu'au ${date}`,
    rgeTitle: "Reconnu Garant de l'Environnement (RGE)",
    rgeDetail: (domains: string) =>
      `Vérifié dans l'annuaire officiel des entreprises RGE : ${domains}`,
    score: "Score MENAO",
    scoreOutOf: "/ 100",
    scoreParts: {
      verifie: "Assuré et vérifié",
      experience: "Expérience",
      diplomes: "Diplômes et qualifications",
      profil: "Profil complet",
      reactivite: "Réactivité",
      avis: "Avis des clients",
    },
    scorePoints: (points: string, max: number) => `${points} / ${max}`,
    scoreTotal: (score: number) => `Score MENAO : ${score} sur 100`,
    clientReviews: "Avis des clients",
    scoreEmpty:
      "Pas encore d'avis MENAO : cet artisan vient de rejoindre la plateforme. Ses clients pourront le noter après la réception de leur chantier.",
    google: (rating: string, count: number) => `Note Google : ${rating}/5 (${count} avis)`,
    googleLink: "Voir la fiche Google",
    diplomaTitle: (label: string) => `Diplôme : ${label}`,
    diplomaDetail: "Déclaré par l'artisan",
    scoreRows: {
      quality: "Qualité des prestations",
      delays: "Respect des délais",
      communication: "Communication",
      value_for_money: "Rapport qualité/prix",
    },
    scoreGlobal: "Note globale",
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
      "Créez votre espace MENAO pour envoyer votre demande. Vous pourrez ensuite suivre l'intégralité de vos travaux depuis votre tableau de bord : réponses des artisans, devis, planning et échanges.",
    personalTitle: "Informations personnelles",
    personalIntro:
      "MENAO a besoin d'en savoir un peu plus sur vous avant de vous mettre en relation avec un artisan.",
    phoneHint: "Recommandé pour être rappelé rapidement par l'artisan.",
    spaceTitle: "Créer mon espace client MENAO",
    spaceIntro:
      "Votre espace client MENAO vous permettra de rechercher des artisans, d'échanger avec eux, de suivre vos chantiers et de recevoir vos devis.",
    signUpSubmit: "Créer mon espace et continuer",
    haveAccountTitle: "Vous avez déjà un espace MENAO ?",
    haveAccountText: "Connectez-vous et accédez à vos demandes et à vos chantiers.",
    haveAccountButton: "Me connecter à mon espace",
    signInTitle: "Me connecter à mon espace",
    signInSubmit: "Me connecter et continuer",
    noAccountTitle: "Pas encore d'espace MENAO ?",
    backToSignUp: "Créer un espace client",
    free: "La création de votre espace MENAO et la mise en relation avec un artisan sont 100\u00a0% gratuites.",
    checkEmail:
      "Nous venons de vous envoyer un e-mail de confirmation. Ouvrez le lien qu'il contient, puis connectez-vous ici pour envoyer votre demande.",
    selected: "Artisans sélectionnés",
    selectedOne: "Artisan sélectionné",
    changeSelection: "Modifier la sélection",
    messageCount: (n: number) => `${n.toLocaleString("fr-FR")} / 10 000`,
    messageCardTitle: "Ajouter un message personnalisé",
    messageLabel: "Votre message (facultatif)",
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
    deadline: "Chaque artisan a 72 heures pour vous répondre.",
    transferError:
      "Nous n'avons pas pu rattacher votre projet à votre compte. Recommencez votre recherche depuis l'accueil.",
    notParticulier: "Connectez-vous avec un compte particulier pour envoyer une demande.",
    nothingToSend: "Ces artisans ont déjà reçu votre demande, ou ne sont plus disponibles.",
  },
  sent: {
    title: (names: string) => `Votre demande est envoyée à ${names}\u00a0!`,
    text: (names: string, many: boolean) =>
      many
        ? `${names} ont bien reçu votre demande. Chaque artisan a 72 heures pour l'accepter.`
        : `${names} a bien reçu votre demande et a 72 heures pour l'accepter.`,
    reminder: "Rappel",
    callbackAsap: "Vous avez demandé à être rappelé dès que possible.",
    callbackRange: (from: string, to: string) =>
      `Vous avez indiqué être joignable par téléphone entre ${from} et ${to}.`,
    next: "Vous recevrez les coordonnées de chaque artisan dès qu'il accepte votre demande.",
    follow: "Suivre ma demande",
    home: "Revenir à l'accueil",
    // Chantier à plusieurs métiers (ADR 0168) : les métiers qui restent à contacter.
    otherLots: {
      title: "Les autres métiers de votre chantier",
      lead: "Choisissez maintenant les artisans des autres métiers :",
      choose: (trade: string) => `Choisir un artisan : ${trade}`,
    },
    workOrder: (trades: string) => `Ordre habituel des travaux : ${trades}.`,
  },
  // Suivi des demandes et des chantiers (F-11, F-12) : textes repris de l'espace client du site.
  myChantiers: {
    // Chantier à plusieurs métiers (ADR 0168).
    lotOf: (chantier: string) => `Un des métiers de votre chantier : ${chantier}`,
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
      a_verifier: "En cours de vérification",
    },
    verificationHint:
      "L'équipe MENAO vérifie votre demande avant de la transmettre à l'artisan : vous serez prévenu de sa réponse.",
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
    yourClient: "Votre client",
    depositReceived: "Acompte reçu",
    verified: "Artisan vérifié par MENAO",
    call: "Appeler",
    tabs: {
      label: "Partie du chantier",
      suivi: "Suivi du chantier",
      dossier: "Dossier du chantier",
    },
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
      artisanIntro: (client: string) =>
        `Ajoutez des photos et des messages pour que ${client} puisse suivre son chantier.`,
      artisanLocked:
        "Vous pourrez ajouter des photos et des messages sur ce chantier une fois celui-ci en cours.",
      photosTitle: "Photos du chantier",
      messageLeft: (ago: string) => `Message laissé ${ago}`,
    },
    next: {
      title: "Prochaine intervention",
      appointmentOn: (day: string, time: string) => `Rendez-vous le ${day} à ${time}`,
      startOn: (day: string, time: string) => `Démarrage le ${day} à ${time}`,
      // « Ajouter à mon calendrier » (maquette) : mêmes choix que le site.
      addToCalendar: "Ajouter à mon calendrier",
      google: "Ajouter à Google Agenda",
      outlook: "Ajouter à Outlook",
      phone: "Calendrier du téléphone (fichier .ics)",
      close: "Fermer",
      failed: "Le fichier n'a pas pu être préparé. Réessayez dans un instant.",
      // Événement ajouté à l'agenda : mêmes textes que le site.
      summary: (title: string) => `Rendez-vous MENAO : ${title}`,
      startSummary: (title: string) => `Démarrage des travaux : ${title}`,
      description: (artisan: string | null) =>
        [artisan && `Artisan : ${artisan}`, "Suivi sur MENAO"].filter(Boolean).join("\n"),
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
      totalLine: (amount: string) => `Total du chantier : ${amount}`,
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
      dueNow: "À payer maintenant",
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
    reviewInvite: {
      title: (artisan: string) => `Noter ${artisan} pour son chantier`,
      text: (artisan: string) =>
        `Vous avez fait confiance à ${artisan} pour votre chantier. D'autres personnes pourraient faire appel à ses services : prenez un court instant pour noter son intervention et aider la communauté MENAO à choisir les meilleurs artisans.`,
      cta: (artisan: string) => `Noter ${artisan}`,
    },
    rehire: (name: string) => `Redemander un devis à ${name}`,
    notFound: "Ce chantier est introuvable.",
  },
  /** Avis du client (F-28) : mêmes textes que le site. */
  clientReview: {
    title: (artisan: string) => `Comment s'est passée votre expérience avec ${artisan} ?`,
    intro:
      "Partagez votre expérience pour aider la communauté MENAO à faire le bon choix pour leurs chantiers.",
    steps: { avis: "Votre avis" },
    criteria: {
      quality: "Qualité des prestations",
      delays: "Respect des délais",
      communication: "Communication",
      cleanliness: "Propreté du chantier",
    },
    unset: "--\u00a0%",
    percent: (value: number) => `${value}\u00a0%`,
    dragToRate: "Faites glisser pour noter",
    bands: {
      quality: ["Inacceptable", "Décevant", "Correct", "Très soigné", "Irréprochable"],
      delays: ["Inacceptable", "Retard important", "Quelques retards", "Léger retard", "À l'heure"],
      communication: [
        "Inacceptable",
        "Peu réactif",
        "Échanges corrects",
        "Très réactif",
        "Irréprochable",
      ],
      cleanliness: ["Inacceptable", "Peu soigné", "Correct", "Propre", "Impeccable"],
    },
    valueTitle: "Rapport qualité/prix",
    values: {
      excellent: "Excellent rapport qualité/prix",
      convenable: "Prix convenable",
      trop_cher: "Trop cher pour la qualité fournie",
    },
    commentTitle: "Votre avis fait la qualité MENAO",
    commentHelp:
      "Votre retour est essentiel pour nous aider à proposer les meilleurs artisans à la communauté.",
    commentLabel: "Votre commentaire",
    commentPlaceholder: (artisan: string) =>
      `Qu'avez-vous particulièrement apprécié ? Le soin de ${artisan}, ses conseils techniques, sa ponctualité ? Dites-nous tout…`,
    commentCount: (n: number) => `${n}/50 caractères minimum`,
    submit: "Publier mon avis",
    visibility: (artisan: string) =>
      `Votre avis sera visible par la communauté MENAO et aidera ${artisan} à améliorer ses services.`,
    thanksTitle: "Merci d'avoir fait confiance à MENAO",
    thanksText:
      "MENAO vous remercie : votre retour aide la communauté à maintenir le meilleur niveau de qualité.",
    back: "Retour au chantier",
    seeProfile: (artisan: string) => `Voir la fiche de ${artisan}`,
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
    addPhoto: "Ajouter une photo",
    photoAdded: "Photo ajoutée au signalement.",
    photoErrors: {
      too_large: "Photo trop lourde : 10 Mo au plus.",
      invalid_type: "Format non pris en charge : photo JPEG ou PNG.",
      locked: "Ce signalement est clos.",
      limit: "20 photos au plus par signalement.",
      failed: "La photo n'a pas pu être ajoutée. Réessayez.",
    },
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
    depositAdvice: (percent: number) =>
      `Conseil MENAO : l'acompte demandé est de ${percent} %. Nous vous conseillons de ne pas verser plus de 30 % du montant avant le début des travaux. N'hésitez pas à en parler avec l'artisan.`,
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
    subtitlePro: "Vos échanges avec vos clients, chantier par chantier.",
    empty:
      "Aucun message pour le moment. Écrivez à votre artisan depuis la page de votre chantier (bouton « Message »).",
    emptyPro:
      "Aucun message pour le moment. Écrivez à votre client depuis la fiche du chantier (bouton « Écrire au client »).",
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
    /** Carte « Messagerie avec … » du suivi côté artisan (maquette « Vue d'un chantier »). */
    card: {
      title: (name: string) => `Messagerie avec ${name}`,
      last: (ago: string) => `Dernier message ${ago}`,
      none: "Aucun message pour l'instant",
      unread: (n: number) => (n <= 1 ? "1 non lu" : `${n} non lus`),
      open: (name: string) => `Ouvrir la conversation avec ${name}`,
      placeholder: "Envoyer un message…",
      sent: "Message envoyé.",
    },
    send: "Envoyer",
    closed: "Conversation fermée : le chantier a été annulé ou le devis refusé.",
    report: "Signaler ce message",
    reportLabel: "Motif du signalement",
    reportHint:
      "Propos injurieux, demande de paiement hors MENAO, spam… L'équipe MENAO examinera le message.",
    reportSubmit: "Envoyer le signalement",
    reportCancel: "Annuler",
    reportSent: "Signalement envoyé à l'équipe MENAO. Merci.",
    attach: "Joindre une photo",
    uploading: "Envoi de la pièce jointe…",
    attachErrors: {
      too_large: "Fichier trop lourd : 10 Mo au plus.",
      invalid_type: "Format non pris en charge : photo JPEG ou PNG.",
      locked: "Cette conversation est fermée.",
      limit: "Nombre maximal de pièces jointes atteint pour ce chantier.",
      rate_limited: "Trop d'envois : réessayez dans un moment.",
      failed: "La pièce jointe n'a pas pu être envoyée. Réessayez.",
    },
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
    rappels:
      "Rappels : rendez-vous de la veille, acompte à régler, avis à laisser, levée des réserves à confirmer, planning à mettre à jour",
    save: "Enregistrer mes préférences",
    saved: "Préférences enregistrées.",
  },
  /** Tableau de bord de l'artisan (F-16) : mêmes textes que l'espace pro du site. */
  /** Exemples de l'espace pro (ADR 0184), comme sur le site : données fictives, lecture seule. */
  proExamples: {
    badge: "Exemple",
    banner: {
      title: "Données d'exemple",
      text: "Les demandes, chantiers et clients de cet espace sont fictifs : rien n'est envoyé et les boutons sont désactivés.",
      quit: "Quitter",
      more: "En savoir plus",
    },
    locked: "Exemple : les boutons sont désactivés.",
    inSpace: {
      text: "Voici des exemples pour découvrir votre espace. Ils disparaissent dès votre première demande.",
      hide: "Masquer les exemples",
      hideError: "Les exemples n'ont pas pu être masqués. Réessayez.",
    },
    dashboardCard: {
      title: "Découvrez votre espace avec des exemples",
      text: "Des demandes, un rendez-vous, un devis et un chantier en cours, pour voir comment tout fonctionne.",
      open: "Voir les exemples",
    },
    dossierCard: {
      title: "Découvrez votre futur espace",
      text: "Parcourez votre espace avec des demandes et des chantiers d'exemple, en attendant de recevoir les vôtres.",
      open: "Découvrir mon espace",
    },
  },
  proDashboard: {
    title: "Tableau de bord",
    /** Activité de l'artisan (ADR 0185), comme sur le site. */
    activity: {
      shortcuts: {
        quote: "Préparer un devis",
        block: "Bloquer un créneau",
        share: "Partager ma fiche",
        invite: "Inviter un artisan",
      },
      revenue: {
        title: "Chiffre d'affaires",
        previousYear: "Année précédente",
        nextYear: "Année suivante",
        year: (year: number) => `Encaissé en ${year}`,
        upcoming: "À venir",
        upcomingHint: "Reste à payer sur vos devis signés",
        toCollect: "À recevoir",
        toCollectHint: "Soldes des chantiers réceptionnés",
        bar: (month: string, amount: string) => `${month} : ${amount}`,
        empty: (year: number) => `Aucun paiement reçu en ${year}.`,
        note: "Acomptes et soldes payés par vos clients, versés directement sur votre compte.",
      },
      quotes: {
        title: "Devis en attente",
        summary: (count: number, total: string) =>
          count === 1 ? `1 devis · ${total}` : `${count} devis · ${total}`,
        sentOn: (day: string) => `Envoyé le ${day}`,
        empty: "Aucun devis en attente de réponse.",
        signRate: "Taux de signature (6 mois)",
        average: "Devis signé moyen",
        all: "Voir tous mes devis",
      },
      inProgress: {
        title: "Chantiers en cours",
        paid: (paid: string, total: string) => `${paid} payés sur ${total}`,
        empty: "Aucun chantier en cours.",
      },
      receivables: {
        title: "Soldes à recevoir",
        hint: "Chantiers réceptionnés dont le solde n'est pas encore payé.",
        empty: "Aucun solde en attente.",
      },
    },
    /** Artisan sans photo de profil : invitation à en ajouter une (aucun chiffre avancé). */
    photo: {
      title: "Une photo rassure vos futurs clients",
      text: "Ajoutez votre photo de profil : vos clients sauront qui viendra chez eux.",
      add: "Ajouter ma photo",
      sending: "Envoi de la photo…",
      choose: "Votre photo de profil",
    },
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName} !` : "Bonjour !"),
    // Accueil « À faire maintenant » (ADR 0130).
    todoTitle: "À faire maintenant",
    todoCount: (n: number) => (n === 1 ? "1 chose à faire" : `${n} choses à faire`),
    allDone: "Tout est à jour",
    allDoneHint: "Aucune action en attente. Les nouvelles demandes apparaîtront ici.",
    todo: {
      demande: "Nouvelle demande",
      hoursLeft: (h: number) => (h < 1 ? "< 1 h" : `${h} h`),
      hoursLeftLabel: (h: number) =>
        h < 1 ? "moins d'une heure pour répondre" : `${h} heures pour répondre`,
      visite: (time: string) => `Visite à ${time}`,
      demarrage: (time: string) => `Démarrage à ${time}`,
      devis: "Devis à envoyer",
      devisAction: "Préparer",
      documents: "À renouveler",
      urssaf: "Attestation URSSAF",
      urssafHint: "Désormais demandée à tous les artisans MENAO.",
      paiements: "Activez vos paiements",
      paiementsHint: "Pour recevoir l'argent de vos chantiers.",
      avis: (n: number) => (n === 1 ? "1 avis à répondre" : `${n} avis à répondre`),
      avisHint: "Une réponse rassure vos futurs clients.",
      respond: "Répondre",
      cadeau: "Votre cadeau de bienvenue",
      cadeauHint: "Offert grâce à votre parrain : t-shirt ou casquette MENAO.",
      choose: "Choisir",
      add: "Ajouter",
      activate: "Activer",
      renew: "Renouveler",
      today: "Aujourd'hui",
    },
    agenda: "Agenda",
    account: "Mon compte",
    error: "Votre tableau de bord n'a pas pu être chargé. Tirez vers le bas pour réessayer.",
    suspended: "Votre compte est suspendu. Contactez l'équipe MENAO.",
    urssafMissing:
      "Ajoutez votre attestation de vigilance URSSAF : elle est désormais demandée à tous les artisans MENAO.",
    urssafAdd: "Ajouter mon attestation URSSAF",
    // Documents à renouveler (F-51), comme le tableau de bord du site (ADR 0123).
    toRenew: (documents: string) => `Pensez à renouveler : ${documents}.`,
    renew: "Renouveler",
    radiated: (motif: string | null) =>
      `Votre compte a été radié du réseau MENAO${motif ? ` : ${motif}` : ""}. Votre profil n'apparaît plus. Vous gardez l'accès à vos chantiers en cours et à vos factures.`,
    awaitingQuote: "En attente de devis",
    clients: (n: number) => (n <= 1 ? `${n} client` : `${n} clients`),
    revenue: "Encaissé ce mois",
    trend: {
      hausse: (percent: number, month: string) =>
        `+${percent}\u00a0% par rapport à la même période en ${month}`,
      baisse: (percent: number, month: string) =>
        `−${percent}\u00a0% par rapport à la même période en ${month}`,
      stable: (month: string) => `Stable par rapport à la même période en ${month}`,
      nouveau: (amount: string, month: string) =>
        `+${amount} par rapport à la même période en ${month}`,
    },
    responseTime: "Temps de réponse",
    responseDetail: (n: number) =>
      n === 1 ? "Sur 1 demande, 6 derniers mois" : `Moyenne sur ${n} demandes, 6 derniers mois`,
    noResponse: "Pas encore de réponse sur 6 mois",
    upcoming: "Prochains rendez-vous",
    noUpcoming: "Aucune visite ni aucun démarrage de chantier à venir.",
    openAgenda: "Voir l'agenda",
    kinds: { visite: "Visite", demarrage: "Démarrage du chantier" },
    appointment: (kind: string, day: string, time: string, title: string) =>
      `${kind}, ${day} à ${time} : ${title}`,
    latestRequests: "Dernières demandes de devis",
    noRequests: "Aucune nouvelle demande pour le moment.",
    allRequests: "Toutes mes demandes",
    seeAll: "Tout voir",
    shortcuts: "Raccourcis",
    myDocuments: "Mes documents",
    myProfile: "Ma photo et ma présentation",
    myPayments: "Paiements",
    myCompany: "Mon entreprise",
    // Visibilité (ADR 0124) : sans parler d'abonnement ni de prix (règles d'Apple, règle 10).
    visible: "Votre profil est visible des particuliers : vous recevez leurs demandes.",
    hiddenTitle: "Votre profil n'est pas encore visible des particuliers",
    hiddenPayments: "Activez vos paiements pour recevoir l'argent de vos chantiers.",
    hiddenSignup:
      "Votre inscription n'est pas encore finalisée : l'équipe MENAO vous a envoyé la marche à suivre par e-mail.",
    activatePayments: "Activer mes paiements",
    toAnswer: (n: number) => `${n} à répondre`,
  },
  /** Demandes reçues par l'artisan (F-16, F-17) : mêmes textes que l'espace pro du site. */
  proRequests: {
    title: "Mes demandes",
    subtitle: "Les particuliers qui vous ont choisi : répondez sous 72 heures.",
    // Onglet « Demandes » (ADR 0130).
    openTitle: (n: number) => `À traiter (${n})`,
    doneTitle: "Déjà traitées",
    empty:
      "Vous n'avez pas encore reçu de demande. Elles apparaîtront ici dès qu'un particulier vous contactera.",
    error: "Vos demandes n'ont pas pu être chargées. Tirez vers le bas pour réessayer.",
    startWish: (date: string) => `Début souhaité le ${date}`,
    startAsap: "Début dès que possible",
    startUnknown: "Date de début inconnue",
    received: (date: string) => `Reçue le ${date}`,
    urgent: "Urgent",
    timeLeft: (h: number, m: number) => `${h} h ${String(m).padStart(2, "0")} pour répondre`,
    status: {
      envoyee: "À traiter",
      acceptee: "Acceptée",
      refusee: "Refusée",
      expiree: "Expirée",
      annulee: "Annulée",
      a_verifier: "En vérification",
    },
    client: "Client",
    contactAfter:
      "Ses coordonnées et l'adresse exacte s'affichent dès que vous fixez le rendez-vous.",
    call: (name: string | null) => (name ? `Appeler ${name}` : "Appeler"),
    callbackAsap: "À contacter dès que possible",
    callbackRange: (from: string, to: string) => `À contacter de préférence entre ${from} et ${to}`,
    address: "Adresse",
    openMap: "Ouvrir la carte",
    // Zone élargie (ADR 0165).
    outsideZone:
      "Un peu hors de votre zone habituelle : le client n'avait plus d'artisan disponible plus près. Vous pouvez décliner sans pénalité (motif « Hors zone »).",
    description: "Description du chantier",
    // Demande reformulée par l'IA et budget approximatif (ADR 0163).
    brief: "La demande en bref",
    briefNote:
      "Résumé rédigé par l'IA de MENAO à partir de la demande du client : vérifiez les détails avec lui.",
    budget: (label: string) => `Budget : ${label}`,
    // Chantier à plusieurs métiers (ADR 0167).
    otherTrades: (labels: string) =>
      `Ce chantier prévoit aussi : ${labels}. Chaque artisan établit son propre devis.`,
    message: "Message personnalisé",
    date: "Date de début souhaitée",
    dateAsap: "Dès que possible",
    dateUnknown: "Date inconnue",
    photo: (i: number) => `Photo ${i} du chantier : l'ouvrir`,
    fixAppointment: "Fixer un rendez-vous",
    refuse: "Refuser le chantier",
    refusalLegend: "Pour quelle raison souhaitez-vous refuser ce chantier ?",
    refusalDetail: "Précisez la raison",
    confirmRefuse: "Refuser le chantier",
    reasons: {
      planning_complet: "Planning complet",
      hors_expertise: "Hors de mon domaine d'expertise",
      hors_zone: "Hors de ma zone d'intervention",
      autre: "Autre",
    },
    notFound: "Cette demande est introuvable.",
  },
  /** Rendez-vous fixé par l'artisan (F-17) : mêmes textes et mêmes contrôles que le site. */
  proAppointment: {
    title: (name: string | null) =>
      name ? `Fixer un rendez-vous avec ${name}` : "Fixer un rendez-vous",
    date: "Date du rendez-vous",
    time: "Heure d'arrivée estimée",
    pickDate: "Choisir la date",
    pickTime: "Choisir l'heure",
    dateWeb: "Date (AAAA-MM-JJ)",
    timeWeb: "Heure (HH:MM)",
    summary: (day: string, time: string) => `Le ${day} à ${time}`,
    submit: "Envoyer le rendez-vous",
    hint: "Le client voit la date dans son espace et vos coordonnées lui sont communiquées.",
    /** Agenda (F-44) : créneaux libres proposés et avertissements, comme sur le site. */
    suggestions: "Créneaux libres",
    suggestionsHint: "D'après vos horaires et votre agenda.",
    suggestion: (day: string, time: string) =>
      `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${time}`,
    warnings: {
      absence: "Vous êtes absent ce jour-là.",
      hors_horaires: "En dehors de vos horaires de travail.",
      conflit: (what: string) => `Déjà prévu à ce moment : ${what}.`,
    },
    errors: {
      passe: "Choisissez une date et une heure à venir.",
      trop_loin: "Le rendez-vous doit avoir lieu dans les 6 prochains mois.",
    },
    reschedule: "Modifier",
    rescheduleTitle: "Modifier le rendez-vous",
    rescheduleSubmit: "Enregistrer la nouvelle date",
    notes: "Notes privées",
    addNotes: "Ajouter des notes",
    editNotes: "Modifier mes notes",
    notesHint: "Visibles par vous seul : code d'accès, matériel à prévoir…",
    saveNotes: "Enregistrer les notes",
    cancel: "Annuler le chantier",
    cancelTitle: "Annuler le chantier",
    cancelIntro:
      "Le client sera informé de l'annulation et pourra contacter un autre artisan. Cette action est définitive.",
    // Motif de l'annulation (ADR 0145) : pour l'équipe, jamais montré au client.
    cancelCauseLegend: "Pourquoi annulez-vous ?",
    cancelCauses: {
      client_injoignable: "Je n'arrive pas à joindre le client",
      client_absent: "Le client n'était pas là au rendez-vous",
      fausse_demande: "La demande n'est pas sérieuse",
      autre: "Autre raison",
    } as Record<"client_injoignable" | "client_absent" | "fausse_demande" | "autre", string>,
    cancelCauseHint: "Votre réponse reste entre vous et l'équipe MENAO : le client ne la voit pas.",
    cancelReason: "Message pour le client (facultatif)",
    cancelConfirm: "Annuler le chantier",
    cancelled: (date: string) => `Chantier annulé le ${date}.`,
    writeClient: "Écrire au client",
    // Bandeau de la vue d'un rendez-vous planifié (maquette « Vue d'un rendez-vous »).
    bandTitle: "Informations du rendez-vous",
    place: "Lieu du rendez-vous",
    reminder: "Rappel du chantier",
  },
  /** Préparation et envoi du devis par l'artisan (F-19 à F-21) : mêmes textes que le site. */
  proQuote: {
    title: "Envoyer un devis",
    create: "Créer un devis",
    resume: "Reprendre le devis",
    edit: "Modifier le devis",
    statusDraft: "Brouillon",
    statusDirty: "Modifications apportées",
    statusSaved: "Enregistré et à jour",
    save: "Enregistrer",
    generate: "Générer le devis",
    lines: "Lignes du devis",
    lineCount: (n: number) => (n <= 1 ? `${n} ligne` : `${n} lignes`),
    addManual: "Ajouter manuellement",
    addLine: "Ajout d'une ligne",
    editLine: "Modification de la ligne",
    lineType: "Type de ligne",
    types: { materiel: "Matériel", main_oeuvre: "Main d'œuvre", autre: "Autre" },
    designation: "Désignation",
    search: "Rechercher l'article",
    closeSearch: "Fermer la recherche",
    searchLabel: "Article déjà utilisé dans vos devis",
    noResult: "Aucun article de vos devis ne correspond.",
    description: "Description (optionnel)",
    quantity: "Quantité",
    unit: "Unité",
    units: {
      u: "Unités (u)",
      h: "Heures (h)",
      jour: "Jours",
      m: "Mètres (m)",
      ml: "Mètres linéaires (ml)",
      m2: "Mètres carrés (m²)",
      m3: "Mètres cubes (m³)",
      kg: "Kilogrammes (kg)",
      l: "Litres (l)",
      forfait: "Forfait",
    },
    unitPrice: "Prix unitaire HT (€)",
    hourlyRate: "Taux horaire HT (€)",
    price: "Prix HT (€)",
    totalHt: "Total HT",
    vat: "TVA",
    totalTtc: "Total TTC",
    none: "-- €",
    vatExempt: "TVA non applicable, art. 293 B du CGI",
    vatHint:
      "Taux réduits (5,5 % et 10 %) : travaux dans un logement achevé depuis plus de 2 ans, sous conditions.",
    validate: "Valider la ligne",
    cancelLine: "Annuler la ligne",
    editAction: (designation: string) => `Modifier « ${designation} »`,
    remove: (designation: string) => `Supprimer « ${designation} »`,
    toReview: "À vérifier",
    leaveTitle: "Quitter sans enregistrer ?",
    leaveText: "Vos dernières modifications du devis ne sont pas enregistrées.",
    stay: "Rester",
    leave: "Quitter",
    steps: {
      label: "Étapes de l'envoi du devis",
      preview: "Aperçu du devis",
      send: "Envoi du devis",
    },
    next: "Suivant",
    preview: {
      ready: "Votre devis est prêt !",
      check: (firstName: string | null) =>
        firstName
          ? `Vérifiez une dernière fois votre devis avant de l'envoyer à ${firstName}.`
          : "Vérifiez une dernière fois votre devis avant de l'envoyer.",
      pdf: "Télécharger le PDF",
    },
    dictation: {
      open: "Dictée intelligente",
      title: "Dictez votre devis",
      example:
        "Dites par exemple : « 4 prises de courant Legrand Céliane à 22,50 euros et 3 heures de pose à 55 euros de l'heure ».",
      transcriptLabel: "Texte de la dictée",
      placeholder: "Ce que vous dicterez s'affichera ici…",
      /** Enregistreur de la maquette « Dictez votre devis », comme sur le site. */
      record: "Dicter",
      resume: "Reprendre la dictée",
      pause: "Mettre en pause",
      discard: "Effacer la dictée",
      timer: (seconds: number, max: number) =>
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} / ${Math.floor(max / 60)}:${String(max % 60).padStart(2, "0")}`,
      recording: "Enregistrement…",
      transcribing: "Transcription…",
      quiet: "On ne vous entend pas : rapprochez-vous du micro ou vérifiez qu'il n'est pas coupé.",
      save: "Sauvegarder cet enregistrement",
      saveHint:
        "Vous pourrez générer les lignes plus tard à partir d'un enregistrement sauvegardé.",
      saved: "Enregistrement sauvegardé.",
      generating: "Génération des lignes…",
      errors: {
        denied:
          "Le micro n'est pas autorisé. Autorisez-le dans les réglages du téléphone pour dicter.",
        limit: "Dictée limitée à 2 minutes.",
        silent: "Aucun son capté : vérifiez que le micro n'est pas coupé, puis réessayez.",
        session: "La transcription a échoué. Réessayez ou écrivez le texte.",
        failed: "La transcription a échoué. Réessayez ou écrivez le texte.",
        rate_limited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
      },
      generate: "Générer les lignes",
      generated: (n: number) =>
        n <= 1 ? "1 ligne ajoutée : vérifiez-la." : `${n} lignes ajoutées : vérifiez-les.`,
      close: "Fermer la dictée",
      rateLimited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
      empty:
        "Aucune ligne n'a pu être tirée de la dictée. Citez les fournitures, les quantités et les prix.",
      unavailable: "La génération des lignes a échoué. Réessayez dans un instant.",
    },
    send: {
      title: "Envoi du devis",
      scheduleTitle: "Échéancier de paiement à appliquer",
      defaultSchedule: "Mon échéancier par défaut",
      customSchedule: "Échéancier personnalisé",
      customHint: "Configurez un échéancier sur-mesure",
      deposit: "Acompte à la signature (%)",
      tranche: (percent: number, trigger: "signature" | "reception", amount: string) =>
        `${percent} % ${trigger === "signature" ? "à la signature du devis" : "à la réception du chantier"}, soit ${amount}`,
      saveDefault: "En faire mon échéancier par défaut",
      chooseSchedule: "Choisissez l'échéancier à appliquer.",
      datesTitle: "Dates des travaux",
      startDate: "Date de début prévisionnelle",
      duration: "Durée estimée (en jours)",
      datesHint:
        "Indiquées sur le devis. Vous confirmerez la date de démarrage après le paiement de l'acompte.",
      validity: (days: number) => `Le devis sera valable ${days} jours à compter de son envoi.`,
      attachTitle: "Ce devis sera rattaché au chantier suivant",
      client: "Client",
      clientNotice:
        "Le client recevra une notification et pourra consulter le devis dans son espace personnel.",
      chantier: "Rappel du chantier",
      insuranceMissing:
        "Votre assurance décennale est incomplète ou expirée : elle doit figurer sur le devis.",
      submit: "Envoyer le devis",
      sent: "Devis envoyé : le client peut le consulter dans son espace.",
    },
  },
  /** Suivi du chantier par l'artisan après l'acompte (F-22, F-26) : mêmes textes que le site. */
  proFollowUp: {
    confirm: "Confirmer la date de démarrage",
    edit: "Modifier",
    editTitle: "Modifier la date de démarrage",
    editSubmit: "Enregistrer la nouvelle date",
    startDate: "Date de démarrage",
    startTime: "Heure de démarrage",
    quoteStart: (day: string) => `Date de début prévue au devis : ${day}.`,
    dashboard: "Retourner à mon tableau de bord",
    confirmedTitle: "Date de démarrage des travaux confirmée",
    confirmed: (day: string, time: string, client: string) =>
      `Vous avez confirmé le début des travaux le ${day} à ${time}. Une notification a bien été envoyée à ${client}.`,
    errors: {
      passe: "Choisissez une date et une heure à venir.",
      trop_loin: "Le démarrage doit avoir lieu dans les 12 prochains mois.",
    },
    addMessage: "Ajouter un message",
    messageLabel: "Message pour votre client",
    messageSubmit: "Publier le message",
    messageCancel: "Annuler",
    messageSent: "Message publié.",
    finish: "Déclarer le chantier terminé",
    finishTitle: "Ce chantier est-il terminé ?",
    finishIntro: (client: string) =>
      `En déclarant ce chantier comme terminé, ${client} recevra une notification l'invitant à réceptionner les travaux.`,
    finishImportant: "Information importante :",
    finishReminder:
      "Avant de déclarer le chantier comme terminé, assurez-vous d'avoir ajouté des photos du chantier une fois terminé.",
    back: "Retour",
    awaitingReception: (client: string) =>
      `En attente de la réception des travaux par ${client} (signature du procès-verbal).`,
    reservesTitle: (client: string) => `Réserves émises par ${client}`,
    reservesNext:
      "Intervenez pour lever ces réserves : votre client confirmera ensuite leur levée, puis réglera le solde.",
    received: (client: string, date: string, balance: string) =>
      `Réception validée par ${client} le ${date}. Prochaine étape : le paiement du solde (${balance}).`,
    signalLift: "Signaler la levée des réserves",
    liftTitle: "Les réserves sont-elles levées ?",
    liftText: (client: string) =>
      `${client} sera invité à vérifier les reprises, puis à confirmer la levée des réserves. Pensez à ajouter des photos des reprises dans le suivi du chantier.`,
    liftMessage: "Message pour votre client (facultatif)",
    liftSubmit: "Signaler la levée",
    liftSignaled: (client: string, date: string) =>
      `Levée signalée le ${date} : en attente de la confirmation de ${client}.`,
    closed: (date: string, amount: string) =>
      `Chantier clôturé le ${date} : solde de ${amount} reçu, facture de solde émise.`,
    reviewPending: (client: string) =>
      `${client} a été invité à donner son avis sur votre intervention. Il sera publié sur votre fiche MENAO.`,
    reviewTitle: (client: string) => `Avis de ${client}`,
    reviewHidden: (reason: string) => `Avis masqué par l'équipe MENAO : ${reason}`,
    replyLabel: "Votre réponse publique",
    replyHint: "Une seule réponse possible, visible sur votre fiche MENAO sous l'avis.",
    replySubmit: "Publier ma réponse",
    replySent: "Réponse publiée sur votre fiche.",
    yourReply: "Votre réponse",
    yourClientFallback: "votre client",
    addPhoto: "Ajouter une photo",
    addPhotos: "Ajouter des photos",
    photosHint: "10 photos à la fois au plus.",
    uploading: (done: number, total: number) => `Envoi des photos : ${done} sur ${total}…`,
    photosAdded: (n: number) =>
      n <= 1 ? "Photo ajoutée au suivi du chantier." : `${n} photos ajoutées au suivi du chantier.`,
    photoErrors: {
      failed: (n: number) =>
        n <= 1
          ? "Une photo n'a pas pu être ajoutée. Réessayez."
          : `${n} photos n'ont pas pu être ajoutées. Réessayez.`,
      limit: "Ce chantier a atteint 100 photos.",
      rate_limited: "Trop de photos envoyées en peu de temps : réessayez dans un moment.",
    },
  },
  /** Notation du client par l'artisan (F-23, ADR 0106) : mêmes textes que le site. */
  proClientRating: {
    title: (name: string) => `Comment s'est passé ce chantier avec ${name} ?`,
    intro:
      "Notez votre client : comme la charte qualité vous y engage, votre avis protège les autres artisans du réseau.",
    privacy: "Votre note n'est jamais montrée au client ni publiée.",
    privacyNetwork:
      "Les artisans MENAO qui reçoivent une demande de ce client voient la moyenne des notes, jamais votre commentaire.",
    privacyTeam: "Seule l'équipe MENAO peut la consulter pour l'instant.",
    criteria: {
      welcome: "Accueil et accès au chantier",
      clarity: "Clarté du besoin",
      payment: "Délai des paiements",
    },
    bands: {
      welcome: ["Très difficile", "Difficile", "Correct", "Bon accueil", "Excellent accueil"],
      clarity: ["Très confus", "Confus", "Correct", "Clair", "Parfaitement clair"],
      payment: ["Très en retard", "En retard", "Correct", "Rapide", "Immédiat"],
    },
    commentTitle: "Votre commentaire",
    commentHelp: "Décrivez en quelques mots le déroulement du chantier avec ce client.",
    commentPlaceholder:
      "Ex. Client accueillant, accès facile, échanges clairs, solde réglé rapidement.",
    submit: "Enregistrer ma note",
    done: (date: string, welcome: number, clarity: number, payment: number) =>
      `Vous avez noté ce client le ${date} : accueil ${welcome}\u00a0%, clarté ${clarity}\u00a0%, paiements ${payment}\u00a0%.`,
    reputationTitle: "Ce client sur MENAO",
    reputation: (n: number) =>
      n === 1
        ? "Noté par 1 artisan après un chantier."
        : `Noté par ${n} artisans après leurs chantiers.`,
  },
  /**
   * Charte qualité demandée à un artisan déjà inscrit (ADR 0109) : mêmes textes que le site, en
   * tutoiement comme la charte.
   */
  proCharter: {
    intro:
      "Nouveau : la charte qualité MENAO. Prends quelques minutes pour la lire et la signer, ton espace pro s'ouvre juste après.",
    ruleLabel: (code: string, title: string) => `Règle ${code} : ${title}`,
    progress: (n: number, total: number) => `${n} / ${total} règles validées`,
    name: "Nom et prénom",
    company: "Entreprise",
    siret: "N° SIRET",
    signature: "Signature",
    padLabel: "Zone de signature : signe avec le doigt",
    padHint: "Signe ici avec le doigt",
    clear: "Effacer",
    missingPrefix: "Pour signer : ",
    missing: {
      rules: (n: number) => `coche les ${n} règle(s) restante(s)`,
      name: "indique ton nom",
      company: "indique ton entreprise",
      siret: "saisis un SIRET à 14 chiffres",
      signature: "signe dans le cadre",
      engagement: "certifie ton engagement d'artisan",
      agree: "coche l'acceptation de la charte",
    },
    submit: "Signer et rejoindre MENAO",
    outdated: "Cette version de la charte n'est plus en vigueur : relance l'application.",
    recap: {
      company: "Entreprise",
      siret: "SIRET",
      signedAt: "Signée le",
      rules: "Règles acceptées",
      rulesValue: (total: number, first: string, last: string) =>
        `${total} / ${total} (${first} à ${last})`,
      engagement: "Engagement de l'artisan",
      engagementValue: (version: string) => `Certifié (version ${version})`,
      level: "Niveau de départ",
    },
    signedOn: (date: string, time: string) => `${date} à ${time}`,
    continue: "Accéder à mon espace pro",
    error: "La charte n'a pas pu être chargée.",
  },
  /** Score MENAO de l'artisan (ADR 0155), avec les points à gagner : mêmes textes que le site. */
  proScore: {
    title: "Votre score MENAO",
    outOf: "/ 100",
    intro:
      "Affiché sur votre fiche, il détermine aussi votre place quand un client cherche un artisan.",
    tipsTitle: "Pour gagner des points",
    tips: {
      verifie: "Faites valider votre décennale, votre RC Pro et votre attestation URSSAF",
      diplome: "Indiquez votre diplôme du métier",
      qualification: "Ajoutez une qualification (Qualibat, Qualifelec…)",
      profil: "Complétez votre fiche : photo, réalisations, présentation, spécialités",
    },
    tipPoints: (n: number) => `+${n} point${n > 1 ? "s" : ""}`,
    progressHint:
      "Vos avis et votre réactivité feront progresser votre score au fil de vos chantiers.",
    planningUpdated: (date: string) => `Planning confirmé le ${date}.`,
    planningNever: "Planning jamais confirmé.",
    planningHint: "Confirmez-le chaque semaine, même sans changement.",
    confirm: "Mon planning est à jour",
    confirmed: "Merci, votre planning est confirmé.",
    error: "Votre score n'a pas pu être chargé.",
  },
  /** Gamification artisan (F-24) : maquettes « Mon grade Menao », badges et récompense. */
  grade: {
    title: "Mon grade MENAO",
    subtitle: "Vos objectifs, vos badges et vos récompenses.",
    xp: (xp: number, next: number | null) =>
      next === null ? `${xp}\u00a0XP` : `${xp} / ${next}\u00a0XP`,
    level: (n: number) => `Niv. ${n}`,
    maxLevel: "Niveau maximal atteint",
    nextReward: "Prochaine récompense de niveau :",
    outfitAlt: "Illustration de l'ensemble de chantier MENAO : veste et pantalon bleus, logo brodé",
    /** La tenue n'existe pas encore : le dessin est indicatif (aucune promesse sur son aspect). */
    illustrationNote: "Illustration : la tenue définitive peut différer.",
    rewardReady: "Votre récompense vous attend\u00a0!",
    claim: "Réclamer ma récompense",
    claimed: "Récompense demandée : l'équipe MENAO prépare son envoi.",
    tabs: { label: "Mon grade", objectives: "Mes objectifs", badges: "Mes badges MENAO" },
    objectivesTitle: "Mes objectifs",
    noObjective: "Tous vos objectifs sont atteints. Bravo\u00a0!",
    achievedTitle: "Objectifs atteints",
    achievedOn: (date: string) => `Objectif atteint le ${date}`,
    xpGain: (xp: number) => `+${xp}\u00a0XP`,
    progress: (done: number, target: number) => `${done}/${target}`,
    badgesToEarn: "Badges MENAO à obtenir",
    badgesEarned: "Badges MENAO obtenus",
    noBadge: "Aucun badge pour l'instant : vos chantiers vous en feront gagner.",
    inProgress: "En cours d'acquisition",
    earnedOn: (date: string) => `Obtenu le ${date}`,
    progression: "Progression",
    remaining: (n: number) => `Plus que ${n} pour obtenir ce badge\u00a0!`,
    continue: "Continuer mes quêtes",
    close: "Fermer",
    error: "Votre grade n'a pas pu être chargé. Réessayez dans un instant.",
    card: (level: number) => `Niveau ${level}`,
    newBadge: {
      title: "Nouveau badge MENAO débloqué\u00a0!",
      congrats: "MENAO vous félicite\u00a0!",
      continue: "Continuer sur MENAO",
      collection: "Voir ma collection de badges",
      close: "Fermer",
    },
    reward: {
      title: (name: string | null) =>
        name ? `Félicitations, ${name}\u00a0!` : "Félicitations\u00a0!",
      intro: (level: number) =>
        `Vous avez atteint le niveau ${level} sur MENAO. Votre excellence est désormais reconnue par toute la communauté.`,
      waiting: "Votre récompense vous attend\u00a0!",
      sizesTitle: "Sélectionnez votre taille pour l'envoi",
      jacket: "Veste",
      pants: "Pantalon",
      delivery: "Adresse de livraison",
      checkAddress: "Vérifier mon adresse de livraison",
      address: "Adresse",
      city: "Ville",
      country: "Pays",
      countryDefault: "France",
      phone: "Numéro de téléphone",
      submit: "Recevoir ma récompense",
      note: "Envoi organisé par l'équipe MENAO, qui vous recontacte si besoin.",
      done: "Demande envoyée : l'équipe MENAO prépare votre récompense.",
      back: "Retour à mon grade",
      unavailable: "Aucune récompense à réclamer pour le moment.",
    },
  },
  /** Devis de l'artisan : mêmes textes que l'espace pro du site. */
  proQuotes: {
    title: "Devis",
    subtitle: "Suivez vos devis MENAO.",
    open: "Mes devis",
    toSend: "Devis à envoyer",
    sent: "Devis envoyés",
    emptyToSend: "Vous n'avez aucun devis à envoyer.",
    emptySent: "Vous n'avez encore envoyé aucun devis.",
    visit: (day: string, time: string) => `Visite le ${day} à ${time}`,
    updated: (date: string) => `Modifié le ${date}`,
    sentOn: (day: string, time: string) => `Envoyé le ${day} à ${time}`,
    version: (n: number) => `Version ${n}`,
    draft: "Brouillon",
    lineCount: (n: number) => (n <= 1 ? `${n} ligne` : `${n} lignes`),
    statuses: {
      brouillon: "Brouillon",
      envoye: "Envoyé",
      signe: "Signé",
      refuse: "Refusé",
      revision_demandee: "Modification demandée",
      remplace: "Remplacé par une nouvelle version",
    },
    error: "Impossible d'afficher vos devis pour le moment. Réessayez dans quelques instants.",
  },
  /** Factures de l'artisan (F-35) : mêmes textes que l'espace pro du site. */
  proInvoices: {
    title: "Factures",
    subtitle: "Factures émises en votre nom à chaque paiement reçu, numérotées sans interruption.",
    open: "Mes factures",
    empty: "Aucune facture pour le moment : elles sont émises à chaque paiement reçu.",
    export: "Exporter pour le comptable (CSV)",
    exportFailed: "L'export n'a pas pu être préparé. Réessayez dans un instant.",
    kinds: { acompte: "Acompte", solde: "Solde" },
    line: (kind: string, date: string, client: string | null) =>
      [kind, date, client].filter(Boolean).join(" · "),
    view: (numero: string) => `Partager la facture ${numero} (PDF)`,
    error: "Impossible d'afficher vos factures pour le moment. Réessayez dans quelques instants.",
    csv: {
      filename: "factures-menao.csv",
      headers: [
        "Numéro",
        "Date",
        "Type",
        "Client",
        "Chantier",
        "Devis",
        "Total HT",
        "TVA",
        "Total TTC",
      ],
    },
  },
  // Envoi au comptable (F-63, ADR 0187), comme sur le site.
  proAccountant: {
    title: "Envoi au comptable",
    subtitle:
      "Chaque mois ou chaque trimestre, vos factures et vos dépenses de la période écoulée partent chez votre comptable : tableaux et pièces, par un lien de téléchargement valable 30 jours.",
    enabled: "Envoyer automatiquement à mon comptable",
    email: "E-mail du comptable",
    period: "Rythme",
    periods: {
      mensuel: { label: "Chaque mois", detail: "Le 1er du mois, pour le mois précédent" },
      trimestriel: {
        label: "Chaque trimestre",
        detail: "Le 1er du trimestre, pour le trimestre précédent",
      },
    },
    parts: "À envoyer",
    invoices: "Mes factures (tableau et PDF)",
    expenses: "Mes dépenses (tableau et pièces)",
    save: "Enregistrer",
    saved: "Réglages enregistrés.",
    saveError: "Les réglages n'ont pas pu être enregistrés. Réessayez.",
    next: (date: string) => `Prochain envoi automatique : ${date}.`,
    off: "Envoi automatique désactivé : vous pouvez toujours envoyer à la main.",
    sendTitle: "Envoyer maintenant",
    sendLead: (period: string, email: string) =>
      `Envoie tout de suite l'export de ${period} à ${email}.`,
    saveFirst: "Enregistrez l'e-mail de votre comptable pour pouvoir lui envoyer un export.",
    send: (period: string) => `Envoyer ${period}`,
    sent: (period: string) => `Export de ${period} envoyé à votre comptable.`,
    sendErrors: {
      echec: "L'envoi n'a pas abouti. Réessayez dans un instant.",
      no_settings: "Enregistrez d'abord l'e-mail de votre comptable.",
      rate_limited: "Trop d'envois en peu de temps : réessayez dans une heure.",
      unavailable: "L'envoi est momentanément indisponible. Réessayez plus tard.",
    },
    historyTitle: "Derniers envois",
    historyEmpty: "Aucun envoi pour le moment.",
    kinds: { automatique: "Automatique", manuel: "À la main" },
    statuses: { envoye: "Envoyé", echec: "Échec" },
    historyLine: (date: string, recipient: string) => `${date} · ${recipient}`,
    counts: (invoices: number | null, expenses: number | null) =>
      [
        invoices === null ? null : `${invoices} facture${invoices > 1 ? "s" : ""}`,
        expenses === null ? null : `${expenses} dépense${expenses > 1 ? "s" : ""}`,
      ]
        .filter(Boolean)
        .join(" · "),
    error: "Impossible d'afficher l'envoi au comptable pour le moment. Réessayez plus tard.",
  },
  // Dépenses de l'artisan (F-62, ADR 0186), comme sur le site.
  proExpenses: {
    title: "Dépenses",
    subtitle:
      "Vos achats et leurs factures, rattachés à vos chantiers. MENAO ne paie rien : vous suivez ce qu'il reste à payer.",
    add: "Ajouter une dépense",
    export: "Exporter (CSV)",
    exportFailed: "L'export n'a pas pu être préparé. Réessayez dans un instant.",
    empty:
      "Aucune dépense pour le moment. Photographiez une facture ou un ticket : MENAO lit les montants pour vous.",
    noResults: "Aucune dépense ne correspond.",
    error: "Impossible d'afficher vos dépenses pour le moment. Réessayez dans quelques instants.",
    filters: { toutes: "Toutes", a_payer: "À payer", en_retard: "En retard", paye: "Payées" },
    searchPlaceholder: "Titre, fournisseur ou numéro",
    toPay: (amount: string) => `À payer : ${amount}`,
    overdue: (amount: string) => `dont ${amount} en retard`,
    nothingToPay: "Tout est payé.",
    statuses: { a_payer: "À payer", en_retard: "En retard", paye: "Payée" },
    kinds: { facture: "Facture", ticket: "Ticket" },
    categories: {
      materiaux: "Matériaux",
      outillage: "Outillage",
      location: "Location",
      sous_traitance: "Sous-traitance",
      carburant: "Carburant et déplacements",
      autre: "Autre",
    },
    toClassify: "À classer",
    ht: (amount: string) => `${amount} HT`,
    open: (title: string) => `Ouvrir la dépense ${title}`,
    // Bouton prévu pour la réception par la plateforme agréée (décision D13), pas encore active.
    einvoice: {
      button: "Factures électroniques",
      soon: "Bientôt",
      text: "Réception automatique des factures électroniques de vos fournisseurs : bientôt disponible.",
    },
    form: {
      newTitle: "Nouvelle dépense",
      editTitle: "Modifier la dépense",
      document: {
        title: "Pièce",
        lead: "Photographiez la facture ou le ticket, ou choisissez un fichier : MENAO lit les montants pour vous.",
        camera: "Prendre en photo",
        library: "Choisir une photo",
        file: "Choisir un fichier (PDF)",
        chosen: "Pièce choisie",
        chosenPdf: (name: string) => `PDF choisi : ${name}`,
        current: "Une pièce est enregistrée. Choisissez-en une autre pour la remplacer.",
        remove: "Retirer la pièce choisie",
        failed: "La pièce n'a pas pu être envoyée. Réessayez.",
        tooLarge: "Fichier trop lourd : 10 Mo au plus.",
      },
      reading: {
        progress: "Lecture de la pièce…",
        done: "Champs remplis d'après la pièce : vérifiez-les avant d'enregistrer.",
        failed: "La pièce n'a pas pu être lue : remplissez les champs.",
        warnings: {
          illisible: "La pièce est difficile à lire : rien n'a été rempli.",
          autre_document:
            "Ce document ne ressemble ni à une facture ni à un ticket : rien n'a été rempli.",
          totaux_incoherents:
            "Les totaux lus ne tombent pas juste (HT + TVA ≠ TTC) : vérifiez les montants.",
          montants_incomplets: "Les montants n'ont pas pu être lus en entier : complétez-les.",
        },
      },
      fields: {
        title: "Titre",
        titleHint: "Quelques mots sur l'achat, par exemple « Tableau électrique et disjoncteurs ».",
        supplier: "Fournisseur",
        reference: "Numéro de la pièce",
        kind: "Type de pièce",
        category: "Catégorie",
        issuedOn: "Date de la pièce",
        dueOn: "Échéance de paiement",
        dueOnAdd: "Ajouter une échéance",
        dueOnRemove: "Retirer l'échéance",
        totalHt: "Montant HT (€)",
        totalTva: "Montant de la TVA (€)",
        totalTtc: "Total TTC",
        chantier: "Chantier",
        chantierNone: "À classer",
        paid: "Déjà payée",
        paidOn: "Date du paiement",
        notes: "Note (visible de vous seul)",
      },
      lines: {
        title: "Lignes lues sur la pièce",
        remove: (designation: string) => `Retirer la ligne ${designation}`,
      },
      save: "Enregistrer la dépense",
      error: "La dépense n'a pas pu être enregistrée. Réessayez.",
      documentFailed:
        "La dépense est enregistrée, mais la pièce n'a pas pu être rangée : ajoutez-la de nouveau depuis « Modifier ».",
    },
    detail: {
      edit: "Modifier",
      markPaid: "Marquer comme payée",
      markUnpaid: "Marquer comme non payée",
      paidOn: (date: string) => `Payée le ${date}`,
      dueOn: (date: string) => `Échéance le ${date}`,
      overdueSince: (date: string) => `En retard depuis le ${date}`,
      delete: "Supprimer la dépense",
      deleteTitle: "Supprimer cette dépense ?",
      deleteText: "La dépense et sa pièce seront supprimées. C'est définitif.",
      deleteConfirm: "Supprimer",
      deleteCancel: "Annuler",
      document: "Pièce",
      noDocument: "Aucune pièce : ajoutez-la depuis « Modifier ».",
      openDocument: "Ouvrir la pièce",
      documentAlt: (title: string) => `Pièce de la dépense ${title}`,
      info: "Informations",
      rows: {
        supplier: "Fournisseur",
        reference: "Numéro",
        chantier: "Chantier",
        issuedOn: "Date",
        dueOn: "Échéance",
        kind: "Type",
        category: "Catégorie",
        notes: "Note",
      },
      totals: { ht: "Total HT", tva: "TVA", ttc: "Total TTC" },
      lines: "Lignes lues sur la pièce",
      lineQuantity: (quantity: string, unit: string | null) =>
        unit ? `${quantity} ${unit}` : quantity,
      actionFailed: "L'action n'a pas abouti. Réessayez.",
      notFound: "Cette dépense n'existe pas ou n'est plus disponible.",
    },
    csv: {
      filename: "depenses-menao.csv",
      headers: [
        "Date",
        "Fournisseur",
        "Numéro",
        "Titre",
        "Type",
        "Catégorie",
        "Chantier",
        "Total HT",
        "TVA",
        "Total TTC",
        "Échéance",
        "Payée le",
      ],
    },
  },
  /** « Ce chantier a besoin d'une expertise » (F-17, F-18) : mêmes textes que le site. */
  // « Recommander un partenaire » (ADR 0174), comme sur le site.
  proPartners: {
    title: "Recommander un partenaire",
    lead: "Vos partenaires MENAO (votre parrain et vos filleuls) qui interviennent chez ce client. Il choisit de les contacter : ils ne voient rien de sa demande avant, et chacun établit son propre devis.",
    instead: "À votre place",
    otherTrades: "Pour un autre métier du chantier",
    recommend: "Recommander",
    recommendLabel: (name: string) => `Recommander ${name}`,
    recommended: "Recommandé",
    sent: (client: string) => `Recommandation envoyée à ${client}.`,
    client: "votre client",
    afterRefusal:
      "Après votre refus, vous pourrez recommander un de vos partenaires à votre place.",
  },
  proExpertise: {
    open: "Ce chantier a besoin d'une expertise",
    title: "Ce chantier a besoin d'une expertise",
    intro:
      "Indiquez le corps de métier nécessaire : l'équipe MENAO proposera un artisan adapté au client.",
    trade: "Corps de métier nécessaire",
    message: "Précisions (facultatif)",
    submit: "Envoyer à l'équipe MENAO",
    sent: "Merci ! L'équipe MENAO a bien reçu votre signalement.",
    back: "Retour",
  },
  /** « Je pense que ce n'est pas un vrai particulier » (ADR 0157) : mêmes textes que le site. */
  // « Invitez votre artisan de confiance » (ADR 0162), comme sur le site.
  inviteArtisan: {
    title: "Invitez votre artisan de confiance",
    intro:
      "Un artisan vous a donné satisfaction et n'est pas encore sur MENAO ? Donnez-nous ses coordonnées : l'équipe MENAO le contacte de votre part pour lui présenter MENAO.",
    company: "Nom de l'artisan ou de son entreprise",
    contactName: "Personne à contacter (facultatif)",
    phone: "Téléphone",
    email: "E-mail",
    contactHint: "Le téléphone ou l'e-mail, au moins l'un des deux.",
    city: "Ville (facultatif)",
    message: "Ce que vous avez apprécié (facultatif)",
    submit: "Envoyer l'invitation",
    sent: "Merci ! L'équipe MENAO va contacter cet artisan de votre part.",
    another: "Inviter un autre artisan",
    back: "Retour",
    privacy:
      "Ces coordonnées servent seulement à contacter cet artisan ; elles sont effacées sous 12 mois s'il ne rejoint pas MENAO.",
    listTitle: "Vos invitations",
    status: { envoyee: "Transmise à l'équipe MENAO", inscrit: "Inscrit sur MENAO" },
    cardText: "Un artisan vous a donné satisfaction et n'est pas encore sur MENAO ?",
    cardAction: "Inviter un artisan",
  },
  proFakeClient: {
    open: "Je pense que ce n'est pas un vrai particulier",
    title: "Signaler un faux particulier",
    intro:
      "Un professionnel qui se fait passer pour un particulier pour connaître vos prix ? Dites-le-nous : l'équipe MENAO vérifie la demande, en toute discrétion.",
    detail: "Ce qui vous fait penser cela (facultatif)",
    submit: "Envoyer le signalement",
    sent: "Merci : l'équipe MENAO va vérifier cette demande.",
    back: "Retour",
  },
  /** Agenda de l'artisan (F-44) : mêmes textes que l'espace pro du site. */
  proAgenda: {
    title: "Agenda",
    subtitle:
      "Vos visites, démarrages de chantier, créneaux bloqués et absences, semaine par semaine.",
    weekdays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
    week: (from: string, to: string) => `Du ${from} au ${to}`,
    previousWeek: "Semaine précédente",
    nextWeek: "Semaine suivante",
    thisWeek: "Aujourd'hui",
    closed: "Fermé",
    kinds: {
      visite: "Visite",
      demarrage: "Démarrage",
      creneau: "Occupé",
      absence: "Absent",
    },
    legendLabel: "Légende",
    legend: {
      visite: "Visite chez le client",
      demarrage: "Démarrage de chantier",
      creneau: "Créneau bloqué",
      absence: "Absence",
    },
    emptyDay: "Rien de prévu",
    emptyWeek: "Rien de prévu cette semaine.",
    hoursMissing: "Renseignez vos horaires de travail pour les voir dans l'agenda.",
    setHours: "Renseigner mes horaires",
    manage: "Gérer mes disponibilités",
    openChantier: (title: string) => `Ouvrir le chantier « ${title} »`,
    range: (from: string, to: string) => `${from} – ${to}`,
    error: "Impossible d'afficher votre agenda pour le moment. Réessayez dans quelques instants.",
    availability: {
      disponible: "Disponible",
      pause: "En pause",
      conges: (until: string) => `En congés jusqu'au ${until}`,
      aPartirDu: (date: string) => `Nouveaux chantiers à partir du ${date}`,
    },
    block: {
      open: "Bloquer un créneau",
      title: "Bloquer un créneau",
      intro:
        "Rendez-vous personnel, chantier hors MENAO… Le créneau s'affiche dans votre agenda et n'est plus proposé pour vos rendez-vous.",
      date: "Date",
      start: "De",
      end: "À",
      label: "Motif (facultatif, visible par vous seul)",
      labelPlaceholder: "Ex. : chantier hors MENAO",
      submit: "Bloquer ce créneau",
      added: "Créneau bloqué.",
      remove: (what: string) => `Libérer le créneau ${what}`,
      removed: "Créneau libéré.",
      errors: {
        invalide: "Choisissez la date et les heures du créneau.",
        ordre: "L'heure de fin doit suivre l'heure de début.",
        passe: "Ce créneau est déjà passé.",
        trop_loin: "Un créneau se bloque au plus un an à l'avance.",
      },
    },
  },
  /** « Mes disponibilités » de l'artisan (F-44) : mêmes textes que l'espace pro du site. */
  proAvailability: {
    title: "Mes disponibilités",
    intro:
      "Choisissez quand vous recevez de nouvelles demandes, vos horaires de travail, vos absences, et retrouvez votre agenda MENAO dans celui de votre téléphone.",
    error:
      "Impossible d'afficher vos disponibilités pour le moment. Réessayez dans quelques instants.",
    status: {
      title: "Votre statut",
      disponible: {
        title: "Vous recevez de nouvelles demandes",
        text: "Vous apparaissez dans les recherches des particuliers de votre zone.",
      },
      pause: {
        title: "En pause",
        text: "Vous n'apparaissez plus dans les recherches. Vos chantiers en cours et vos rendez-vous ne changent pas.",
      },
      conges: {
        title: (until: string) => `En congés jusqu'au ${until}`,
        text: "Vous n'apparaissez plus dans les recherches pendant votre absence, et vous y réapparaissez de vous-même le lendemain.",
      },
      aPartirDu: {
        title: (date: string) => `Nouveaux chantiers à partir du ${date}`,
        text: "Vous apparaissez dans les recherches avec la mention « Disponible à partir du » et cette date.",
      },
      pauseAction: "Me mettre en pause",
      resumeAction: "Reprendre les demandes",
      paused: "Vous êtes en pause : vous n'apparaissez plus dans les recherches.",
      resumed: "Vous recevez de nouveau des demandes.",
    },
    from: {
      title: "Nouveaux chantiers à partir du",
      text: "Carnet bien rempli ? Indiquez quand vous pouvez commencer un nouveau chantier : vous restez visible, avec cette date sur votre profil.",
      choices: {
        maintenant: "Dès maintenant",
        semaine: "Dans 1\u00a0semaine",
        deux_semaines: "Dans 2\u00a0semaines",
        mois: "Dans 1\u00a0mois",
      },
      choiceLabel: (label: string, date: string) => `${label} (${date})`,
      other: "Autre date",
      otherLabel: "Date de disponibilité",
      save: "Enregistrer la date",
      saved: "Date enregistrée.",
      current: (date: string) => `Enregistré : à partir du ${date}`,
      now: "Enregistré : dès maintenant",
      errors: {
        invalide: "Choisissez une date valide.",
        tropLoin: "Choisissez une date dans l'année à venir.",
      },
    },
    hours: {
      title: "Horaires de travail",
      text: "Ils servent à vous proposer des créneaux de rendez-vous libres et s'affichent dans votre agenda. Ils ne sont pas publiés sur votre profil.",
      open: (day: string) => `Ouvert le ${day}`,
      openShort: "Ouvert",
      closed: "Fermé",
      addRange: "Ajouter une plage",
      addRangeTo: (day: string) => `Ajouter une plage le ${day}`,
      removeRange: (day: string, n: number) => `Retirer la plage ${n} du ${day}`,
      from: (day: string, n: number) => `Début de la plage ${n} du ${day}`,
      to: (day: string, n: number) => `Fin de la plage ${n} du ${day}`,
      presetsLabel: "Modèles d'horaires",
      presets: {
        semaine: "Lun – ven, 8\u00a0h – 17\u00a0h\u00a030",
        samedi: "Lun – sam matin",
        continue: "Journée continue",
        vide: "Tout effacer",
      },
      copyMonday: "Appliquer les horaires du lundi au mardi, mercredi, jeudi et vendredi",
      copyMondayShort: "Copier le lundi sur la semaine",
      save: "Enregistrer mes horaires",
      saved: "Horaires enregistrés.",
      unsaved: "Modifications non enregistrées",
      none: "Aucun horaire enregistré : les créneaux proposés suivent les horaires courants, du lundi au vendredi, 8\u00a0h – 12\u00a0h et 13\u00a0h\u00a030 – 17\u00a0h\u00a030.",
      total: (h: number, m: number) =>
        m
          ? `${h}\u00a0h\u00a0${String(m).padStart(2, "0")} par semaine`
          : `${h}\u00a0h par semaine`,
      errors: {
        format: "Vérifiez les heures saisies.",
        ordre: "Chaque plage doit commencer avant de finir.",
        chevauchement: "Les plages d'une même journée ne doivent pas se chevaucher.",
        trop_de_plages: "Trois plages par jour au plus.",
      },
    },
    absences: {
      title: "Congés et absences",
      text: "Pendant une absence, vous n'apparaissez plus dans les recherches et votre profil indique que vous êtes indisponible. Vos chantiers en cours et vos rendez-vous ne changent pas.",
      empty: "Aucune absence prévue.",
      from: "Premier jour",
      to: "Dernier jour",
      label: "Motif (facultatif, visible par vous seul)",
      suggestionsLabel: "Motifs fréquents",
      suggestions: ["Congés", "Formation", "Fermeture annuelle", "Salon professionnel"],
      add: "Ajouter l'absence",
      added: "Absence ajoutée.",
      remove: (period: string) => `Supprimer l'absence ${period}`,
      removed: "Absence supprimée.",
      period: (from: string, to: string) => (from === to ? `le ${from}` : `du ${from} au ${to}`),
      days: (n: number) => (n === 1 ? "1\u00a0jour" : `${n}\u00a0jours`),
      ongoing: "En cours",
      errors: {
        invalide: "Choisissez le premier et le dernier jour.",
        ordre: "Le dernier jour doit suivre le premier.",
        passee: "Cette absence est déjà terminée.",
        trop_longue: "Une absence dure un an au plus.",
        trop_loin: "Une absence se déclare au plus un an à l'avance.",
      },
    },
    sync: {
      title: "Synchroniser avec votre agenda",
      text: "Retrouvez vos visites, démarrages, créneaux bloqués et absences MENAO dans Google Agenda, Apple Calendrier ou Outlook, mis à jour automatiquement.",
      create: "Créer mon lien d'abonnement",
      created: "Lien créé : ajoutez-le à votre agenda.",
      link: "Lien d'abonnement",
      share: "Partager ou copier le lien",
      google: "Google Agenda",
      apple: "Apple Calendrier",
      outlook: "Outlook",
      addTo: "Ajouter à :",
      feedName: "MENAO",
      privacy:
        "Ce lien est personnel : il donne accès à votre agenda (titres des chantiers et communes, sans adresse ni nom de client). Ne le partagez pas.",
      delay:
        "Les applications d'agenda relisent l'abonnement d'elles-mêmes, en général toutes les quelques heures.",
      lastRead: (ago: string) => `Dernière lecture par votre agenda : ${ago}.`,
      neverRead: "Pas encore lu par une application d'agenda.",
      renew: "Renouveler le lien",
      renewHint: "L'ancien lien cessera aussitôt de fonctionner.",
      renewed: "Nouveau lien créé : remplacez l'ancien dans votre agenda.",
      disable: "Désactiver l'abonnement",
      disabled: "Abonnement désactivé.",
      openFailed:
        "Cette application d'agenda n'a pas pu être ouverte. Partagez le lien à la place.",
    },
  },
  /** « Mes avis » de l'artisan (F-28) : mêmes textes que l'espace pro du site. */
  proReviews: {
    title: "Mes avis",
    subtitle: "Les avis de vos clients après la réception de leur chantier, et leur note moyenne.",
    open: "Voir mes avis",
    scoreTitle: "La note de vos clients",
    scoreEmpty: "Votre note apparaîtra avec votre premier avis publié.",
    toAnswer: (n: number) =>
      n === 0
        ? "Vous avez répondu à tous vos avis."
        : n === 1
          ? "1\u00a0avis attend votre réponse."
          : `${n}\u00a0avis attendent votre réponse.`,
    howTitle: "Comment ça marche",
    how: [
      "Votre client est invité à donner son avis une fois le chantier clôturé, puis relancé une seule fois 3\u00a0jours plus tard.",
      "Chaque avis porte sur un vrai chantier réceptionné sur MENAO : il est marqué «\u00a0Avis vérifié\u00a0».",
      "Vous pouvez répondre publiquement à chaque avis, une seule fois.",
      "Un avis contraire aux règles peut être signalé à l'équipe MENAO. Un avis n'est jamais masqué au seul motif qu'il est négatif.",
    ],
    empty:
      "Aucun avis pour le moment. Vos clients pourront vous noter après la réception de leur chantier.",
    publishedOn: (date: string) => `Publié le ${date}`,
    chantier: (title: string) => `Chantier « ${title} »`,
    noReply: "Sans réponse",
    hidden: "Masqué",
    error: "Impossible d'afficher vos avis pour le moment. Réessayez dans quelques instants.",
    /** Signalement d'un avis à l'équipe MENAO, comme sur le site. */
    report: "Signaler cet avis",
    reportTitle: "Signaler cet avis à l'équipe MENAO",
    reportLabel: "Motif du signalement",
    reportHint:
      "Propos injurieux, données personnelles, faux avis… L'équipe MENAO examinera l'avis.",
    reportSubmit: "Envoyer le signalement",
    reportCancel: "Annuler",
    reportSent: "Signalement envoyé à l'équipe MENAO. Merci.",
  },
  /** Chantiers de l'artisan (F-18) : mêmes textes que l'espace pro du site. */
  /** « Mes documents » du client (onglet Documents) : mêmes textes que le site. */
  clientDocuments: {
    title: "Mes documents",
    subtitle: "Devis signés, factures et procès-verbaux de vos chantiers.",
    empty: "Vos documents (devis signés, factures, PV de réception) apparaîtront ici.",
    error: "Vos documents n'ont pas pu être chargés. Tirez vers le bas pour réessayer.",
  },
  /** Bouton (+) de l'artisan (ADR 0084) : actions rapides et choix du chantier. */
  proQuickActions: {
    title: "Actions rapides",
    quote: "Créer un devis",
    quoteDetail: "Pour un chantier qui attend votre devis",
    block: "Bloquer un créneau",
    blockDetail: "Une indisponibilité dans votre agenda",
    photo: "Ajouter une photo au suivi",
    photoDetail: "Sur un chantier en cours, visible de votre client",
    expense: "Ajouter une dépense",
    expenseDetail: "Une facture ou un ticket en photo, lu pour vous",
    availability: "Mes disponibilités",
    availabilityDetail: "Absence, congés ou pause des nouvelles demandes",
    agenda: "Mon agenda",
    agendaDetail: "Visites et démarrages à venir",
    close: "Fermer",
    chooseQuoteTitle: "Pour quel chantier ?",
    chooseQuoteIntro: "Les chantiers dont le client attend votre devis.",
    choosePhotoTitle: "Sur quel chantier ?",
    choosePhotoIntro:
      "Vos chantiers en cours : les photos s'ajoutent au suivi que voit votre client.",
    emptyQuote: "Aucun chantier n'attend de devis pour le moment.",
    emptyPhoto: "Aucun chantier en cours pour le moment.",
  },
  proChantiers: {
    title: "Mes chantiers",
    subtitle: "Vos rendez-vous et vos chantiers en cours.",
    all: "Tous mes chantiers",
    empty:
      "Aucun chantier pour le moment. Fixez un rendez-vous depuis une demande pour créer votre premier chantier.",
    error: "Vos chantiers n'ont pas pu être chargés. Tirez vers le bas pour réessayer.",
    appointmentOn: (day: string, time: string) => `Rendez-vous le ${day} à ${time}`,
    startOn: (day: string, time: string) => `Démarrage le ${day} à ${time}`,
    status: {
      demande_envoyee: "Demande reçue",
      rdv_planifie: "Rendez-vous planifié",
      devis_envoye: "Devis envoyé",
      devis_en_revision: "Modification demandée",
      devis_refuse: "Devis refusé",
      devis_signe: "Devis signé",
      acompte_paye: "Acompte payé",
      planifie: "Chantier planifié",
      en_cours: "Travaux en cours",
      travaux_termines: "Travaux terminés",
      reserves_a_lever: "Réserves à lever",
      receptionne: "Chantier réceptionné",
      cloture: "Chantier clôturé",
      en_litige: "Litige en cours",
      annule: "Chantier annulé",
    },
    notFound: "Ce chantier est introuvable.",
  },
  /** Dernier devis envoyé, vu par l'artisan (F-21, F-31) : mêmes textes que le site. */
  proQuoteSent: {
    title: "Devis envoyé",
    summary: (numero: string, amount: string) => `N° ${numero} · ${amount} TTC`,
    sentOn: (day: string, until: string) => `Envoyé le ${day}, valable jusqu'au ${until}`,
    waiting: "En attente de la réponse du client.",
    revision: "Le client demande une modification :",
    refused: (reason: string) => `Le client a refusé le devis : ${reason}.`,
    signed: (date: string) => `Le client a signé le devis le ${date}.`,
    depositPaid: (amount: string, date: string) => `Acompte de ${amount} payé le ${date}.`,
    depositInvoice: (numero: string) => `Télécharger la facture d'acompte ${numero}`,
    depositInProgress: "Paiement de l'acompte en cours (virement ou prélèvement en attente).",
    depositWaiting: "En attente du paiement de l'acompte par le client.",
    viewSigned: "Télécharger le devis signé",
    viewPdf: "Télécharger le PDF",
    refusalReasons: {
      trop_cher: "prix trop élevé",
      autre_artisan: "un autre artisan a été choisi",
      projet_reporte: "projet reporté",
      autre: "autre raison",
    },
  },
  /** Notifications push (F-41) : invitation à les activer sur l'accueil. */
  push: {
    title: "Ne manquez rien de vos chantiers",
    text: "Recevez une notification pour vos rendez-vous, devis, paiements et messages, même application fermée.",
    enable: "Activer les notifications",
    later: "Plus tard",
  },
  /** Photos du téléphone (journal, messagerie, signalement) : appareil photo ou photothèque. */
  photos: {
    camera: "Prendre une photo",
    library: "Choisir dans mes photos",
    cancel: "Annuler",
    cameraDenied:
      "MENAO n'a pas accès à l'appareil photo. Autorisez-le dans les réglages du téléphone.",
    failed: "Les photos n'ont pas pu être ouvertes. Réessayez.",
  },
  /** Documents PDF (devis, factures, PV), proposés au partage du téléphone. */
  pdf: {
    failed: "Le document n'a pas pu être téléchargé. Réessayez dans un instant.",
  },
  /** Aperçu d'un document du chantier (devis, facture, PV), comme le PDF ouvert sur le site. */
  documentPreview: {
    pdf: "Télécharger le PDF",
    signedPdf: "Télécharger le devis signé",
    open: (title: string, meta: string) => `${title}, ${meta} : ouvrir l'aperçu`,
    notFound: "Ce document est introuvable.",
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
  // Budget approximatif, en euros TTC (ADR 0163).
  budgets: {
    moins_1000: "Moins de 1\u00a0000\u00a0€",
    "1000_5000": "1\u00a0000 à 5\u00a0000\u00a0€",
    "5000_15000": "5\u00a0000 à 15\u00a0000\u00a0€",
    "15000_50000": "15\u00a0000 à 50\u00a0000\u00a0€",
    plus_50000: "Plus de 50\u00a0000\u00a0€",
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
    documents: {
      title: "Retrouvez vos documents",
      text: "Avec un compte, vos devis signés, vos factures et vos PV de réception sont rangés ici.",
    },
    notifications: {
      title: "Restez informé",
      text: "Avec un compte, vous êtes prévenu des réponses des artisans, des devis et des paiements.",
    },
    artisanTitle: "Vous êtes artisan ?",
    // Règle 10 : l'inscription pro se fait dans l'application, jamais l'abonnement (ADR 0113).
    artisanText:
      "Recevez des demandes de chantier près de chez vous. Créez votre profil en 2 minutes.",
    artisanCta: "Créer mon profil professionnel",
    helpTitle: "Besoin d'aide ?",
    faq: "Questions fréquentes",
    contact: "Nous contacter",
  },
  /** Photos ouvertes en grand (journal, messages, demandes, signalements, fiche de l'artisan). */
  photoViewer: {
    open: (i: number, n: number) => `Agrandir la photo ${i} sur ${n}`,
    alt: (i: number, n: number) => `Photo ${i} sur ${n}`,
    counter: (i: number, n: number) => `${i} / ${n}`,
    close: "Fermer",
    previous: "Photo précédente",
    next: "Photo suivante",
  },
  /**
   * « Mon profil » de l'artisan (ADR 0129), ouvert par la photo de l'en-tête : la fiche,
   * l'entreprise, la conformité, l'argent et le compte, avec l'état de chaque rubrique. Jamais
   * d'abonnement ni de lien vers le site (règle 10).
   */
  proHub: {
    /**
     * Parrainage (F-60, ADR 0137) : le code seulement. Ni lien vers le site ni mention de
     * l'abonnement (CLAUDE.md règle 10).
     */
    referral: {
      title: "Parrainez un confrère",
      lead: "Un confrère artisan saisit votre code en créant son compte MENAO.",
      codeLabel: "Votre code de parrainage",
      share: "Partager mon code",
      shareMessage: (code: string) =>
        `Je t'invite sur MENAO, l'outil des artisans du bâtiment. Mon code de parrainage : ${code}, à saisir en créant ton compte.`,
      joined: (n: number) =>
        n === 0
          ? "Aucun confrère inscrit pour l'instant"
          : `${n} confrère${n > 1 ? "s" : ""} inscrit${n > 1 ? "s" : ""}`,
      // Suivi des filleuls et score de fidélité (ADR 0161), sans parler de l'abonnement (règle 10).
      loyalty: (n: number) => `Score de fidélité : ${n}`,
      loyaltyHint: "Un point par parrainage validé.",
      listTitle: "Vos filleuls",
      steps: {
        inscription: "Inscription en cours",
        valide: "Dossier validé",
        abonne: "Parrainage validé",
        annule: "Non retenu",
      },
    },
    /** Cadeau de bienvenue du filleul (F-60, ADR 0154), carte et écran « Votre cadeau ». */
    welcomeGift: {
      title: "Votre cadeau de bienvenue",
      lead: (referrer: string) =>
        `${referrer} vous a recommandé MENAO. Choisissez votre cadeau : nous vous l'envoyons.`,
      choose: "Choisir mon cadeau",
      itemLegend: "Votre cadeau",
      items: { tshirt: "T-shirt MENAO", casquette: "Casquette MENAO" } as Record<
        "tshirt" | "casquette",
        string
      >,
      sizeLegend: "Taille du t-shirt",
      delivery: "Adresse de livraison",
      checkAddress: "Modifier l'adresse",
      recipient: "Destinataire",
      address: "Adresse",
      postalCode: "Code postal",
      city: "Commune",
      submit: "Recevoir mon cadeau",
      note: "Envoi organisé par l'équipe MENAO, qui vous recontacte si besoin.",
      done: "C'est noté : l'équipe MENAO prépare votre cadeau.",
      summary: (item: string, size: string | null) => (size ? `${item}, taille ${size}` : item),
      pending: "En préparation par l'équipe MENAO.",
      sent: (date: string) => `Envoyé le ${date}.`,
      unavailable: "Aucun cadeau de bienvenue à choisir pour le moment.",
      back: "Retour",
    },
    title: "Mon profil",
    seeProfile: "Voir ma fiche",
    changePhoto: "Changer ma photo de profil",
    photoTitle: "Photo de profil",
    photoDone: "Photo de profil mise à jour.",
    strength: (percent: number) => `Fiche complète à ${percent} %`,
    complete: "Votre fiche est complète",
    completeHint: "Elle donne aux particuliers toutes les raisons de vous choisir.",
    tips: {
      assure_verifie: "Faites valider votre décennale et votre RC Pro",
      photo_profil: "Ajoutez une photo de profil",
      realisations: "Ajoutez des photos de vos réalisations",
      presentation: "Développez votre présentation",
      specialites: "Précisez vos spécialités",
      certifications: "Ajoutez une certification",
    },
    verified: "Assuré et vérifié",
    score: (percent: number, count: number) =>
      `Score ${percent}\u00a0% · ${count === 1 ? "1 avis" : `${count} avis`}`,
    status: {
      brouillon: "Dossier à compléter",
      en_verification: "Dossier en vérification",
      refuse: "Dossier à corriger",
      suspendu: "Profil suspendu",
      radie: "Entreprise radiée",
    },
    dossier: "Faire vérifier mon entreprise",
    dossierLeft: (n: number) => (n === 1 ? "1 étape restante" : `${n} étapes restantes`),
    dossierSent: "Dossier envoyé : l'équipe MENAO le vérifie.",
    sections: {
      profile: "Ma fiche",
      company: "Mon entreprise",
      compliance: "Conformité",
      money: "Argent",
      account: "Mon compte",
    },
    rows: {
      photo: "Photo et présentation",
      portfolio: "Réalisations",
      reviews: "Avis clients",
      grade: "Mon grade",
      company: "Entreprise et SIRET",
      trades: "Métiers et certifications",
      zone: "Zone d'intervention",
      availability: "Disponibilités",
      documents: "Documents",
      charter: "Charte qualité",
      payments: "Paiements",
      invoices: "Factures",
      expenses: "Dépenses",
      accountant: "Envoi au comptable",
      identity: "Identité et connexion",
      notifications: "Notifications",
      help: "Aide et contact",
    },
    values: {
      upToDate: "À jour",
      toComplete: "À compléter",
      photos: (n: number) => (n === 0 ? "Aucune photo" : n === 1 ? "1 photo" : `${n} photos`),
      toAnswer: (n: number) => `${n} à répondre`,
      reviews: (n: number) => (n === 0 ? "Aucun avis" : n === 1 ? "1 avis" : `${n} avis`),
      level: (n: number) => `Niveau ${n}`,
      verifiedCompany: "Vérifiée",
      toVerify: "À vérifier",
      trades: (n: number, rge: boolean) =>
        `${n === 1 ? "1 métier" : `${n} métiers`}${rge ? " · RGE" : ""}`,
      radius: (km: number) => `${km} km`,
      communes: (n: number) => (n === 1 ? "1 commune" : `${n} communes`),
      toDefine: "À définir",
      paused: "En pause",
      from: (date: string) => `Dès le ${date}`,
      available: "Disponible",
      toRenew: (n: number) => (n === 1 ? "1 à renouveler" : `${n} à renouveler`),
      refused: (n: number) => (n === 1 ? "1 refusé" : `${n} refusés`),
      inReview: "En vérification",
      signed: "Signée",
      toSign: "À signer",
      active: "Activés",
      toActivate: "À activer",
    },
    signOut: "Se déconnecter",
    loadError: "Votre profil n'a pas pu être chargé. Tirez vers le bas pour réessayer.",
  },
  /** « Voir ma fiche » : la fiche telle que la voient les particuliers (ADR 0129). */
  proMyPage: {
    title: "Ma fiche",
    preview: "Aperçu : votre fiche telle que la voient les particuliers.",
    edit: "Modifier ma fiche",
    unavailable: "Votre fiche n'a pas pu être chargée. Réessayez.",
  },
  /**
   * Aide de l'artisan dans l'application (ADR 0129) : questions fréquentes et contact par
   * e-mail, sans lien vers le site (règle 10).
   */
  help: {
    title: "Aide et contact",
    lead: "Les réponses aux questions les plus courantes. Une autre question ? Écrivez-nous.",
    faq: [
      {
        q: "Comment recevoir plus de demandes ?",
        a: "Complétez votre fiche (photo, réalisations, présentation), gardez vos documents à jour et répondez vite : les particuliers voient votre délai de réponse.",
      },
      {
        q: "Pourquoi mon profil n'est-il pas visible ?",
        a: "Votre profil devient visible une fois votre dossier vérifié par l'équipe MENAO. L'accueil vous indique ce qui manque encore.",
      },
      {
        q: "Comment suis-je payé ?",
        a: "Vos clients vous paient directement sur votre compte, via Stripe (prestataire de paiement agréé). MENAO ne touche jamais l'argent de vos chantiers et ne prélève aucune commission.",
      },
      {
        q: "Un document arrive à échéance : que faire ?",
        a: "Prenez le nouveau document en photo depuis « Mon profil », rubrique Documents. Nous vous prévenons 30, 15 puis 7 jours avant l'échéance.",
      },
      {
        q: "Comment changer ma zone ou mes métiers ?",
        a: "Depuis « Mon profil » : Zone d'intervention, ou Métiers et certifications.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Depuis « Mon profil » : Identité et connexion, puis Supprimer mon compte.",
      },
    ],
    contactTitle: "Écrire à l'équipe MENAO",
    contactText: "Nous vous répondons par e-mail.",
    email: "contact@menao.fr",
    write: "Écrire un e-mail",
    subject: "Question depuis l'application MENAO",
    noMail: "Aucune application d'e-mail n'est configurée. Écrivez-nous à contact@menao.fr.",
  },
  account: {
    title: "Mon compte",
    // Organisation en sections (refonte, comme « Mon profil », ADR 0132).
    sections: {
      account: "Mon compte",
      help: "Aide",
      data: "Données et sécurité",
    },
    rows: {
      profile: "Mes informations",
      email: "Adresse e-mail",
      emailPending: "Changement en attente",
      password: "Mot de passe",
      notifications: "Notifications",
      marketing: "Actualités et conseils MENAO par e-mail",
      export: "Télécharger mes données",
      signOutAll: "Déconnecter tous mes appareils",
      deletion: "Supprimer mon compte",
      deletionPending: (date: string) => `Demandée le ${date}`,
    },
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
    /** Gestion du compte (F-08, ADR 0039 et 0083) : mêmes textes que le site. */
    settings: "Paramètres du compte",
    profile: {
      title: "Mes informations",
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Téléphone",
      phoneOptional: "Téléphone (facultatif)",
      phoneHintClient:
        "Utilisé pour le code de signature envoyé par SMS et pour que l'artisan puisse vous rappeler.",
      phoneHintPro: "Visible de vos clients une fois leur demande acceptée.",
      save: "Enregistrer mes informations",
      saved: "Vos informations sont enregistrées.",
    },
    email: {
      title: "Adresse e-mail",
      current: "Adresse actuelle",
      label: "Nouvelle adresse e-mail",
      hint: "Un lien de confirmation est envoyé à vos deux adresses : le changement prend effet une fois les deux liens ouverts.",
      submit: "Changer d'adresse e-mail",
      sent: (email: string) =>
        `C'est presque fini : ouvrez les liens envoyés à votre adresse actuelle et à ${email} pour confirmer le changement.`,
      pending: (email: string) =>
        `Changement en attente vers ${email} : ouvrez les liens reçus par e-mail pour le confirmer.`,
      same: "C'est déjà l'adresse de votre compte.",
      taken: "Cette adresse est déjà utilisée par un autre compte.",
    },
    password: {
      title: "Mot de passe",
      current: "Mot de passe actuel",
      new: "Nouveau mot de passe",
      submit: "Changer mon mot de passe",
      wrong: "Mot de passe actuel incorrect.",
      changed: "Mot de passe modifié. Vos autres appareils devront se reconnecter.",
      weak: "Ce mot de passe est trop facile à deviner : choisissez-en un autre.",
      forgot: "Mot de passe oublié ?",
    },
    communications: {
      title: "Communications",
      marketing: "Recevoir par e-mail les actualités et conseils de MENAO",
      marketingHint:
        "Vous pouvez changer d'avis à tout moment. Les e-mails liés à vos demandes et à vos chantiers ne dépendent pas de ce choix.",
      subscribed: "C'est noté : vous recevrez les actualités de MENAO.",
      unsubscribed: "C'est noté : vous ne recevrez plus les actualités de MENAO.",
      notifications: "Choisir les e-mails de suivi",
    },
    data: {
      title: "Mes données",
      intro:
        "Téléchargez une copie de vos données personnelles, dans un fichier lisible par ordinateur (JSON) : compte, demandes, chantiers, devis, paiements, messages et avis.",
      download: "Télécharger mes données",
      error: "Impossible de préparer le fichier pour le moment. Réessayez dans quelques minutes.",
    },
    security: {
      title: "Sécurité",
      signOutAll: "Me déconnecter de tous mes appareils",
      signOutAllHint:
        "Utile si vous vous êtes connecté sur un appareil qui n'est pas le vôtre : il faudra vous reconnecter partout, y compris ici.",
    },
    errors: {
      unavailable: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
      rateLimited: "Trop de tentatives en peu de temps. Réessayez dans quelques minutes.",
    },
    /** Suppression du compte (Apple 5.1.1 v) : mêmes textes que le site. */
    deletion: {
      title: "Supprimer mon compte",
      intro:
        "L'équipe MENAO traite votre demande sous un mois et vous écrit à l'adresse de votre compte. Certains documents liés à vos chantiers, comme les factures, doivent être conservés pendant une durée fixée par la loi.",
      open: "Demander la suppression de mon compte",
      message: "Une remarque ? (facultatif)",
      confirm: "Je demande la suppression de mon compte MENAO.",
      submit: "Envoyer ma demande",
      sent: "Votre demande est enregistrée : l'équipe MENAO vous répond sous un mois.",
      pending: (date: string) =>
        `Demande de suppression envoyée le ${date}. L'équipe MENAO vous répond sous un mois à l'adresse de votre compte.`,
      error: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
      back: "Retour",
    },
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
  /** Diplômes du métier (ADR 0155), comme sur le site. */
  diplomesMetier: {
    cap: "CAP",
    bep: "BEP",
    bac_pro: "Bac pro",
    bp: "Brevet professionnel (BP)",
    bts: "BTS",
    brevet_maitrise: "Brevet de maîtrise",
    titre_pro: "Titre professionnel",
    autre: "Autre diplôme du bâtiment",
  },
} as const;
