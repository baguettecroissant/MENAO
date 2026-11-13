import {
  FORMES_JURIDIQUES,
  type DiplomeMetier,
  type LaunchCategory,
  type LaunchChannel,
  type LaunchIndicator,
  type LaunchMemberKind,
  type LaunchPhase,
  type LaunchTaskStatus,
} from "@menao/core";

/** Textes de l'interface, centralisés (CLAUDE.md : pas de chaînes en dur dispersées). */
export const fr = {
  /** Cadrage de la photo de profil avant l'envoi (ADR 0202). */
  avatarFramer: {
    title: "Cadrer votre photo",
    hint: "Faites glisser l'image et zoomez : le rond montre ce qui apparaîtra sur votre fiche et dans les messages.",
    zoom: "Zoom",
    fit: "Image entière",
    fill: "Remplir le rond",
    confirm: "Valider le cadrage",
    cancel: "Annuler",
    reframe: "Recadrer",
    ready: "Photo cadrée, prête à être envoyée.",
    preview: "Aperçu de la photo cadrée",
  },
  meta: {
    name: "MENAO",
    title: "MENAO — Artisans du bâtiment vérifiés",
    description:
      "Trouvez l'artisan du bâtiment qu'il vous faut : devis, signature, paiement sécurisé et suivi de chantier.",
  },
  /**
   * Identité de MENAO dans les données structurées (Google, assistants IA, ADR 0134) : uniquement
   * des faits affichés ailleurs sur le site.
   */
  structuredData: {
    organizationDescription:
      "MENAO met en relation les particuliers avec des artisans du bâtiment vérifiés (entreprise active, assurance décennale et RC Pro contrôlées), et leur fournit un outil pour le devis, la signature, le paiement sécurisé et le suivi du chantier. Aucune commission n'est prise sur les chantiers.",
    area: "Alpes-Maritimes",
    knowsAbout: [
      "Travaux de rénovation",
      "Artisans du bâtiment",
      "Assurance décennale",
      "Devis de travaux",
      "Suivi de chantier",
    ],
  },
  /** llms.txt et llms-full.txt (ADR 0134) : résumé de MENAO pour les assistants IA. */
  /** Rubrique Guides (ADR 0135). */
  guides: {
    metaTitle: "Guides travaux : conseils pratiques et règles à connaître",
    metaDescription:
      "Choisir un artisan, lire un devis, vérifier une assurance décennale, comprendre la TVA des travaux : des guides clairs, avec leurs sources officielles.",
    eyebrow: "Guides",
    title: "Les guides",
    accent: "pour réussir vos travaux",
    subtitle:
      "Des réponses claires aux questions que l'on se pose avant, pendant et après un chantier, avec les sources officielles.",
    breadcrumb: "Guides",
    audiences: {
      particuliers: "Pour les particuliers",
      artisans: "Pour les artisans",
    } as Record<"particuliers" | "artisans", string>,
    audienceTag: {
      particuliers: "Particuliers",
      artisans: "Artisans",
    } as Record<"particuliers" | "artisans", string>,
    read: "Lire le guide",
    draft: "Brouillon en relecture : non publié",
    updated: (date: string) => `Mis à jour le ${date}`,
    minutes: (n: number) => `${n} min de lecture`,
    byline: "Par l'équipe MENAO",
    essentials: "L'essentiel",
    toc: "Sommaire",
    faqTitle: "Questions fréquentes",
    sourcesTitle: "Sources",
    sourcesNote:
      "Ce guide donne une information générale à jour à sa date de mise à jour. Il ne remplace pas un conseil personnalisé (juridique, fiscal ou d'assurance).",
    relatedTitle: "À lire aussi",
    newTab: "(nouvel onglet)",
    proCta: {
      title: "Recevez des chantiers près de chez vous",
      text: "Devis, signature, paiement et suivi de chantier dans une seule app, sans commission.",
      action: "Créer mon compte pro",
    },
  },
  /** Espace des commerciaux de terrain (F-65, ADR 0205) : code, QR code, inscrits et guide. */
  commercialSpace: {
    metaTitle: "Espace commercial — MENAO",
    nav: { home: "Mon code", guide: "Guide terrain", demo: "Démo (exemples)" },
    // Icône de l'écran d'accueil (ADR 0211).
    homeScreen: { name: "MENAO, espace commercial" },
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : "Bonjour"),
    intro: "Chaque artisan inscrit avec votre code est rattaché à votre nom.",
    suspended:
      "Votre accès est suspendu : votre code n'est plus rattaché aux inscriptions. Contactez l'équipe MENAO.",
    missing: "Votre accès n'est pas encore prêt. Contactez l'équipe MENAO.",
    code: {
      title: "Votre code",
      howTo: [
        "Dans l'application MENAO, sur le téléphone de l'artisan : il saisit ce code à l'étape « Compte » de l'inscription.",
        "Avec votre QR code ou votre lien : l'inscription sur le site reprend votre code toute seule.",
      ],
      link: "Votre lien d'inscription",
      copy: "Copier le lien",
      copied: "Lien copié",
      qrAlt: "QR code de votre lien d'inscription MENAO",
      expand: "afficher en grand",
      close: "Fermer",
      fullscreenTitle: "Inscription avec votre code",
      fullscreenHint: "L'artisan scanne ce QR code avec l'appareil photo de son téléphone.",
      whatsapp: "Envoyer par WhatsApp",
      whatsappMessage: (link: string) =>
        `Bonjour, voici le lien pour vous inscrire sur MENAO avec votre conseiller : ${link}`,
      cards: "Cartes à imprimer",
    },
    signups: {
      title: "Vos inscriptions",
      empty:
        "Aucun artisan inscrit avec votre code pour l'instant. Ils apparaîtront ici dès leur inscription.",
      listLabel: "Artisans inscrits avec votre code",
      since: (date: string) => `Inscrit le ${date}`,
      // Étapes manquantes de l'inscrit, pour l'appeler au bon moment (ADR 0219).
      missing: (steps: string) => `Il manque : ${steps}`,
      unnamed: "Entreprise à compléter",
      status: {
        brouillon: "En cours",
        en_verification: "Dossier envoyé",
        valide: "Validé",
        refuse: "Refusé",
        suspendu: "Suspendu",
        radie: "Radié",
      } as Record<string, string>,
    },
    guide: {
      title: "Guide terrain",
      intro:
        "Le parcours de l'artisan, la journée type, la démo, les appels types, les objections et les règles à respecter.",
      listLabel: "Rubriques du guide",
      back: "Guide terrain",
      previous: "Rubrique précédente",
      next: "Rubrique suivante",
      open: "Ouvrir le guide terrain",
    },
    cards: {
      title: "Cartes à imprimer",
      intro:
        "Votre carte, avec votre code et le QR code d'inscription : pour l'artisan qui préfère s'inscrire plus tard.",
      printHint:
        "10 cartes de 85 × 55 mm par feuille A4 : imprimez à 100 %, sans mise à l'échelle.",
      print: "Imprimer la planche",
      back: "Mon code",
      role: "Conseiller MENAO",
      codeLine: (code: string) => `Code : ${code}`,
      scan: "Inscription des artisans",
      unavailable: "Vos cartes seront disponibles quand votre accès sera actif.",
      previewLabel: "Aperçu de votre carte",
      format: "Format carte de visite : 85 × 55 mm.",
    },
  },
  /** Suivi des prospects des commerciaux (F-65, lot 2, ADR 0206). */
  commercialProspects: {
    nav: { day: "Ma journée", prospects: "Prospects" },
    list: {
      title: "Prospects",
      intro:
        "Les entreprises du bâtiment de la zone, issues du registre public des entreprises. Suivez celles que vous démarchez : un prospect suivi par un collègue est signalé, sans plus de détails.",
      searchLabel: "Rechercher une entreprise, une commune ou un code postal",
      searchPlaceholder: "Nom, commune ou code postal",
      search: "Rechercher",
      filtersLabel: "Filtrer les prospects",
      filters: {
        zone: "Ma zone",
        tous: "Tous",
        miens: "Mes prospects",
        relances: "À relancer",
        libres: "Libres",
      } as Record<string, string>,
      views: { liste: "Liste", carte: "Carte" },
      viewsLabel: "Affichage",
      listLabel: "Prospects",
      count: (n: number) =>
        n === 0
          ? "Aucun prospect"
          : n === 1
            ? "1 prospect"
            : `${n.toLocaleString("fr-FR")} prospects`,
      empty: "Aucun prospect ne correspond à votre recherche.",
      emptyZone: "Aucun prospect dans votre zone pour l'instant.",
      emptyBase:
        "La base des entreprises n'est pas encore importée. L'équipe MENAO s'en occupe depuis le back-office.",
      previous: "Page précédente",
      next: "Page suivante",
      pageOf: (page: number, pages: number) => `Page ${page} sur ${pages}`,
      followedByOther: "Suivi par un collègue",
      free: "Libre",
      rge: "RGE",
      nextAction: (date: string) => `Relance : ${date}`,
      mapLabel: "Carte des prospects",
      mapLimit: (shown: number) =>
        `Les ${shown.toLocaleString("fr-FR")} premiers résultats sont sur la carte : affinez la recherche pour voir les autres.`,
      mapEmpty: "Aucun prospect localisé pour cette recherche.",
      mapLegend: { mine: "Mes prospects", free: "Libres", other: "Suivis par un collègue" },
      mapZoomIn: "Zoomer",
      mapZoomOut: "Dézoomer",
      mapRecenter: "Recentrer sur les prospects",
    },
    status: {
      a_contacter: "À contacter",
      rdv_pris: "Rendez-vous pris",
      demo_faite: "Démo faite",
      pas_interesse: "Pas intéressé",
    } as Record<string, string>,
    stage: {
      inscrit: "Inscrit sur MENAO",
      valide: "Validé sur MENAO",
      abonne: "Abonné MENAO",
    } as Record<string, string>,
    detail: {
      back: "Prospects",
      company: "L'entreprise",
      activity: "Activité",
      legalForm: "Forme juridique",
      created: "Création",
      staff: "Effectif",
      address: "Adresse",
      siret: "SIRET",
      directions: "Itinéraire",
      headOffice: "Siège",
      rge: "Qualifié RGE",
      followedByOther:
        "Ce prospect est suivi par un collègue. Pour éviter deux visites, voyez avec l'équipe avant de le démarcher.",
      follow: "Suivre ce prospect",
      followHint: "Il apparaîtra dans « Mes prospects », avec vos relances.",
      followTitle: "Mon suivi",
      statusLabel: "Étape",
      nextActionLabel: "Prochaine action (rendez-vous ou relance)",
      phoneLabel: "Téléphone",
      phoneHint: "Format international, par exemple +33612345678.",
      notesLabel: "Notes",
      notesHint: "Utiles au suivi seulement : jamais d'avis personnel. 2 000 caractères au plus.",
      save: "Enregistrer",
      saved: "Suivi enregistré.",
      release: "Ne plus suivre",
      releaseHint: "Le prospect redevient libre ; vos notes sont effacées.",
      // TODO(legal): information au premier contact et droit d'opposition (question n°2 pour l'avocat).
      firstContact:
        "Au premier contact : présentez-vous, dites que ses coordonnées viennent du registre public des entreprises, et proposez-lui de ne plus être contacté.",
      doNotContact: "Ne plus contacter",
      doNotContactHint:
        "Dès que l'artisan le demande. L'entreprise disparaît de la base pour tous les commerciaux et ne sera plus jamais importée.",
      doNotContactConfirm: "Confirmer : ne plus jamais contacter cette entreprise",
      doNotContactCancel: "Annuler",
      doNotContactDone: "C'est noté : l'entreprise ne sera plus contactée.",
      notFound: "Ce prospect n'existe plus dans la base.",
      // Tranches d'effectif salarié du registre Sirene (INSEE).
      staffBands: {
        NN: "Sans salarié",
        "00": "0 salarié",
        "01": "1 ou 2 salariés",
        "02": "3 à 5 salariés",
        "03": "6 à 9 salariés",
        "11": "10 à 19 salariés",
        "12": "20 à 49 salariés",
        "21": "50 à 99 salariés",
        "22": "100 à 199 salariés",
        "31": "200 à 249 salariés",
        "32": "250 à 499 salariés",
        "41": "500 à 999 salariés",
        "42": "1 000 à 1 999 salariés",
        "51": "2 000 à 4 999 salariés",
        "52": "5 000 à 9 999 salariés",
        "53": "10 000 salariés et plus",
      } as Record<string, string>,
    },
    day: {
      title: "Ma journée",
      intro: (date: string) => `Vos rendez-vous et vos relances du ${date}.`,
      appointments: "Rendez-vous aujourd'hui",
      appointmentsEmpty: "Aucun rendez-vous prévu aujourd'hui.",
      followUps: "Relances à faire",
      followUpsEmpty: "Aucune relance en retard. Bravo.",
      late: (date: string) => `Prévue le ${date}`,
      at: (time: string) => `À ${time}`,
      phoneTitle: "Créneaux téléphone",
      phoneText:
        "12 h à 13 h : prise de rendez-vous. 17 h à 18 h : relances et suivi. Les appels restent en semaine, de 10 h à 13 h et de 14 h à 20 h.",
      call: "Appeler",
      allProspects: "Voir tous mes prospects",
      // Rendez-vous pris par la secrétaire vocale Manon (ADR 0226).
      camille: {
        title: "Rendez-vous pris par Manon",
        intro:
          "Manon, la secrétaire vocale de MENAO, réserve ces rendez-vous dans vos créneaux libres pour les artisans de votre zone qui veulent être accompagnés.",
        kinds: { appel: "Appel", visite: "Visite" } as Record<string, string>,
        email: "Écrire",
        cancel: "Annuler",
        cancelConfirm: "Confirmer l'annulation",
        cancelled: "Rendez-vous annulé : le créneau est de nouveau libre.",
        cancelHint: "Prévenez l'artisan : Manon ne le fait pas.",
      },
    },
    errors: {
      suspended: "Votre accès est suspendu.",
      unavailable: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
      date: "Date ou heure invalide.",
      phone: "Téléphone invalide : format international, par exemple +33612345678.",
    },
  },
  /**
   * Copilote du commercial (F-74, ADR 0223) : fiche de préparation, message (envoyé par le
   * commercial lui-même) et compte rendu dicté, sur la fiche d'un prospect suivi.
   */
  commercialCopilot: {
    title: "Copilote",
    subtitle: "IA · à relire avant usage",
    tabsLabel: "Outils du copilote",
    tabs: { brief: "Préparer ma visite", message: "Préparer un message", report: "Compte rendu" },
    brief: {
      empty:
        "En quelques secondes : qui il est, la demande dans sa zone, les arguments et les objections probables pour ce profil.",
      generate: "Préparer la fiche",
      regenerate: "Régénérer",
      pending: "Préparation de la fiche…",
      preparedOn: (date: string) => `Préparée le ${date}`,
      portrait: "Qui c'est",
      demandTitle: "La demande dans sa zone",
      demand: (count: number, trades: string, km: number, days: number) =>
        `${count} recherches de ${trades} à moins de ${km} km ces ${days} derniers jours.`,
      arguments: "Les arguments pour ce profil",
      objections: "Les objections probables",
      opening: "Pour lancer la conversation",
    },
    message: {
      channelLabel: "Canal",
      channels: {
        sms: "SMS",
        whatsapp: "WhatsApp",
        email: "E-mail",
        appel: "Script d'appel",
      } as Record<string, string>,
      generate: "Rédiger",
      regenerate: "Une autre version",
      pending: "Rédaction…",
      subjectLabel: "Objet",
      bodyLabel: "Message, modifiable",
      scriptLabel: "Script de 30 secondes, modifiable",
      hint: "Le message s'ouvre sur votre téléphone : relisez-le, puis envoyez-le vous-même.",
      openWhatsApp: "Ouvrir WhatsApp",
      openSms: "Ouvrir SMS",
      openEmail: "Ouvrir l'e-mail",
      call: "Appeler",
      copy: "Copier",
      copied: "Copié",
      // TODO(legal): information au premier contact et droit d'opposition (question n°2 pour
      // l'avocat), comme le rappel « firstContact » de la fiche.
      optOut:
        "Vos coordonnées professionnelles viennent du registre public des entreprises. Si vous ne souhaitez plus être contacté, répondez simplement STOP.",
    },
    report: {
      intro:
        "Dictez en sortant : ce qui s'est dit, son intérêt, ses objections et la suite. L'audio n'est jamais gardé.",
      transcriptLabel: "Ce qui s'est dit",
      transcriptPlaceholder:
        "Par exemple : démo faite, il aime le devis à la voix, trouve le prix élevé, rappeler jeudi après 17 h.",
      generate: "Rédiger le compte rendu",
      pending: "Rédaction du compte rendu…",
      tooShort: "Dites-en un peu plus : quelques mots au moins.",
      summaryLabel: "Compte rendu",
      interestLabel: "Intérêt",
      interests: { chaud: "Chaud", tiede: "Tiède", froid: "Froid" } as Record<string, string>,
      objectionsLabel: "Objections entendues",
      objectionsHint: "Une par ligne, 3 au plus.",
      statusLabel: "Étape",
      nextKindLabel: "Prochaine action",
      nextKinds: { appel: "Appel", visite: "Visite", message: "Message" } as Record<string, string>,
      noNext: "Aucune",
      nextAtLabel: "Quand",
      nextLabelLabel: "Quoi",
      followUpLabel: "Message de suivi, modifiable",
      doNotContact:
        "Il a demandé à ne plus être contacté : enregistrez, puis touchez « Ne plus contacter » en bas de la fiche.",
      save: "Enregistrer dans le suivi",
      saved: "Compte rendu enregistré : l'étape et la prochaine action du suivi sont à jour.",
      restart: "Recommencer",
      dictation: {
        start: "Dicter le compte rendu",
        stop: "Arrêter la dictée",
        listening: (seconds: number) => `Écoute… ${seconds} s`,
        transcribing: "Transcription en cours…",
        denied:
          "Le micro n'est pas autorisé. Autorisez-le dans les réglages de votre navigateur pour dicter.",
        unsupported: "La dictée n'est pas disponible sur ce navigateur : écrivez le compte rendu.",
        failed: "La transcription a échoué. Réessayez ou écrivez le compte rendu.",
        rate_limited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
        limit: "Dictée limitée à 2 minutes.",
        quiet: "On ne vous entend pas…",
        silent:
          "Aucun son capté : vérifiez que votre micro n'est pas coupé et qu'il est bien choisi dans votre navigateur, puis réessayez.",
      },
    },
    history: {
      title: "Comptes rendus",
      next: (label: string) => `Suite prévue : ${label}`,
    },
    errors: {
      rejected:
        "Le texte proposé ne respectait pas les règles du guide terrain. Réessayez, ou rédigez-le vous-même.",
      rate_limited: "Limite du jour atteinte pour le copilote. Réessayez demain.",
      not_followed: "Suivez d'abord ce prospect pour utiliser le copilote.",
      unavailable: "Le copilote est momentanément indisponible. Réessayez dans quelques minutes.",
      summary: "Le compte rendu est vide.",
      objections: "3 objections au plus, de 120 caractères chacune.",
      label: "120 caractères au plus.",
    },
  },
  /**
   * Simulateur d'entraînement des commerciaux (F-74, ADR 0224) : un artisan joué par l'IA, puis
   * la note d'un coach. Personnages fictifs.
   */
  commercialTraining: {
    // Rangé dans le guide terrain : aucune nouvelle entrée de menu.
    guideRow: {
      label: "Entraînement",
      title: "S'entraîner face à un artisan",
      detail: "Un artisan joué par l'IA, puis la note d'un coach sur 20 avec 3 conseils.",
    },
    back: "Guide terrain",
    metaTitle: "S'entraîner — MENAO",
    title: "S'entraîner",
    intro:
      "Face à un artisan joué par l'IA, entraînez-vous à l'accroche, aux objections et à la conclusion. Un coach note ensuite l'échange sur 20, avec 3 conseils.",
    choose: "Choisissez votre artisan",
    personas: {
      mefiant: {
        label: "Le méfiant",
        description: "Plombier installé depuis 25 ans, déjà déçu par une plateforme.",
        opener: "Oui ? C'est pour quoi ?",
      },
      presse: {
        label: "Le pressé",
        description: "Électricien sur un chantier, deux minutes devant lui.",
        opener: "Allô ? Oui, je suis sur un chantier, faites vite.",
      },
      autre_plateforme: {
        label: "Déjà sur une plateforme",
        description: "Peintre qui achète déjà des contacts à l'unité.",
        opener: "Bonjour. Vous vendez quoi ?",
      },
      debutant: {
        label: "Le débutant",
        description: "Menuisier micro-entrepreneur installé depuis 4 mois, budget serré.",
        opener: "Bonjour ! Oui, c'est moi le menuisier. Je vous écoute.",
      },
      patron: {
        label: "Le patron",
        description: "Gérant d'une maçonnerie de 10 salariés, carnet plein.",
        opener: "Bonjour. J'ai cinq minutes entre deux rendez-vous, je vous écoute.",
      },
    } as Record<string, { label: string; description: string; opener: string }>,
    artisan: "Artisan",
    you: "Vous",
    turns: (count: number, max: number) => `${count} sur ${max} messages`,
    placeholder: "Votre réponse…",
    inputLabel: "Votre message à l'artisan",
    send: "Envoyer",
    thinking: "L'artisan répond…",
    finish: "Terminer et voir ma note",
    finishHint: (min: number) => `La note est possible après ${min} messages.`,
    ended: {
      accord: "L'artisan est d'accord pour la suite.",
      refus: "L'artisan a mis fin à l'échange.",
    } as Record<string, string>,
    limit: "Dernier message de la séance : place à la note.",
    coachPending: "Le coach relit l'échange…",
    scoreLabel: "Votre note",
    score: (total: number) => `${total}/20`,
    criteria: {
      accroche: "Accroche",
      ecoute: "Écoute",
      objections: "Objections",
      regles: "Règles",
      conclusion: "Conclusion",
    } as Record<string, string>,
    criterionScore: (score: number) => `${score} sur 4`,
    strengths: "Vos points forts",
    tips: "3 conseils pour la prochaine fois",
    breaches: "Règles enfreintes",
    again: "Recommencer avec cet artisan",
    change: "Changer d'artisan",
    history: {
      title: "Mes dernières séances",
      row: (persona: string, total: number) => `${persona} · ${total}/20`,
    },
    errors: {
      rate_limited: "Limite du jour atteinte pour l'entraînement. Réessayez demain.",
      forbidden: "L'entraînement est réservé aux commerciaux actifs.",
      unavailable: "Le simulateur est momentanément indisponible. Réessayez dans quelques minutes.",
    },
  },
  /** Résultats et primes des commerciaux (F-65, lot 3, ADR 0207). */
  commercialResults: {
    nav: "Mes résultats",
    title: "Mes résultats",
    intro:
      "Les artisans inscrits avec votre code, leur validation et leur abonnement, puis vos primes.",
    figures: {
      signups: "Inscrits",
      validated: "Validés",
      subscribed: "Abonnés",
      thisMonth: (n: number) => `${n.toLocaleString("fr-FR")} ce mois-ci`,
      total: (n: number) => `${n.toLocaleString("fr-FR")} au total`,
    },
    objective: (done: number, target: number) =>
      `Objectif du mois : ${done.toLocaleString("fr-FR")} validé${done > 1 ? "s" : ""} sur ${target.toLocaleString("fr-FR")}`,
    pipeline: {
      title: "Mes prospects en cours",
      followed: (n: number) => `${n.toLocaleString("fr-FR")} suivi${n > 1 ? "s" : ""}`,
    },
    months: {
      title: "Mois par mois",
      caption: "Inscrits, validés et abonnés des six derniers mois",
      month: "Mois",
    },
    bonuses: {
      title: "Mes primes",
      notSet: "Les montants des primes ne sont pas encore fixés par l'équipe MENAO.",
      amounts: (validation: string | null, subscription: string | null) =>
        [
          validation ? `${validation} par artisan validé` : null,
          subscription ? `${subscription} par artisan abonné` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      pending: (n: number) =>
        n === 0
          ? "Aucune prime en attente"
          : `${n.toLocaleString("fr-FR")} en attente du délai de vérification`,
      validated: "À payer",
      paid: "Déjà payées",
      empty:
        "Aucune prime pour l'instant : elles apparaissent quand un de vos artisans est validé ou s'abonne.",
      listLabel: "Mes primes",
      kind: { validation: "Dossier validé", abonnement: "Abonnement" } as Record<string, string>,
      status: {
        en_attente: "En attente",
        validee: "À payer",
        annulee: "Annulée",
        payee: "Payée",
      } as Record<string, string>,
      delay: (date: string) => `Vérifiée le ${date}`,
      checkOn: (date: string) => `Vérification à partir du ${date}`,
      // TODO(legal): primes et contrat des commerciaux (question n°3 pour l'avocat).
      rules:
        "Une prime est créée quand un artisan inscrit avec votre code est validé, puis quand il paie son premier mois d'abonnement. Elle est vérifiée après un délai : dossier toujours validé, abonnement toujours actif.",
    },
  },
  /**
   * Tableaux de lancement (F-66, ADR 0208) : « Mon planning » des commerciaux, et libellés du
   * tableau partagés avec le back-office (étapes, catégories, états, filtres).
   */
  commercialLaunch: {
    nav: "Mon planning",
    title: "Mon planning",
    intro:
      "Vos tâches semaine par semaine, les dates clés de l'équipe et les rendez-vous réguliers. Cochez une tâche dès qu'elle est faite.",
    notReady: "Votre planning n'est pas encore prêt.",
    notReadyText: "L'équipe MENAO le prépare : il apparaîtra ici.",
    phases: {
      preparation: "Préparation",
      pre_ouverture: "Pré-ouverture",
      lancement: "Lancement",
      essais: "Essais",
      apres: "Après le lancement",
    } satisfies Record<LaunchPhase, string>,
    categories: {
      digital: "Internet",
      terrain: "Terrain",
      reseaux: "Réseaux sociaux",
      contenus: "Contenus",
      presse: "Presse",
      ambassadeurs: "Ambassadeurs",
      produit: "Produit",
      juridique: "Juridique",
      pilotage: "Pilotage",
      equipe: "Équipe",
      validation: "Validation des dossiers",
      evenement: "Événement",
    } satisfies Record<LaunchCategory, string>,
    kinds: {
      associe: "Associé",
      commercial: "Commercial",
      validation: "Validation des dossiers",
      autre: "Autre",
    } satisfies Record<LaunchMemberKind, string>,
    statuses: {
      a_faire: "À faire",
      en_cours: "En cours",
      fait: "Faite",
    } satisfies Record<LaunchTaskStatus, string>,
    board: {
      progressLabel: "Avancement des tâches",
      progress: (done: number, total: number) =>
        `${done.toLocaleString("fr-FR")} tâche${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total.toLocaleString("fr-FR")}`,
      milestones: "Prochaines dates clés",
      countdown: (days: number) => (days === 0 ? "Aujourd'hui" : `J-${days}`),
      weeks: "Semaines du planning",
      weekCase: (range: string, total: number, done: number, late: number) =>
        `Semaine ${range} : ${
          total === 0
            ? "aucune tâche"
            : [
                `${total} tâche${total > 1 ? "s" : ""}`,
                `${done} faite${done > 1 ? "s" : ""}`,
                late > 0 ? `${late} en retard` : null,
              ]
                .filter(Boolean)
                .join(", ")
        }`,
      thisWeekCase: "cette semaine",
      filters: "Filtrer les tâches",
      filter: {
        a_faire: "À faire",
        retard: "En retard",
        semaine: "Cette semaine",
        faites: "Faites",
        tout: "Tout",
      },
      late: "En retard",
      thisWeek: (range: string) => `Cette semaine · ${range}`,
      week: (range: string) => `Semaine ${range}`,
      range: (from: string, to: string) => `du ${from} au ${to}`,
      regular: "Rendez-vous réguliers",
      regularHint: "Ils reviennent régulièrement et ne comptent pas dans l'avancement.",
      empty: {
        a_faire: "Rien à faire pour l'instant.",
        retard: "Rien en retard.",
        semaine: "Rien de prévu cette semaine.",
        faites: "Aucune tâche faite pour l'instant.",
        tout: "Aucune tâche dans ce planning.",
      },
      markDone: (title: string) => `Marquer comme faite : ${title}`,
      reopen: (title: string) => `Rouvrir : ${title}`,
      edit: (title: string) => `Modifier : ${title}`,
      state: { late: "En retard", inProgress: "En cours", done: "Faite", milestone: "Jalon" },
      team: "Toute l'équipe",
      toggleError: "Pas enregistré. Réessayez.",
    },
  },
  /** Espace partenaire par lien privé (ADR 0139). */
  partnerSpace: {
    metaTitle: "Espace partenaire — MENAO",
    eyebrow: "Espace partenaire",
    suspended:
      "Votre partenariat est suspendu : vos liens ne sont plus attribués. Contactez l'équipe MENAO.",
    resultsTitle: "Vos résultats",
    projects: "Demandes de travaux",
    projectsHint: "arrivées par vos liens",
    qualified: "Demandes qualifiées",
    qualifiedHint: "acceptées par un artisan",
    artisans: "Artisans inscrits",
    artisansHint: "arrivés par vos liens",
    paying: "Abonnés payants",
    payingHint: "premier paiement fait",
    moneyTitle: "Vos primes",
    pending: "En attente",
    pendingHint: (days: number) => `Délai de validation de ${days} jours`,
    validated: "À facturer",
    validatedHint: "Envoyez-nous votre facture",
    paid: "Payées",
    ratesTitle: "Vos montants",
    rateDemande: (amount: string) => `${amount} par demande qualifiée`,
    rateAbonne: (amount: string) => `${amount} par artisan devenu abonné payant`,
    rateNotSet: "Montant communiqué par l'équipe MENAO",
    invoice: (email: string) =>
      `Pour être payé, envoyez votre facture à ${email}, avec le montant « À facturer ». Paiement par virement.`,
    pageLink: "Votre page de recommandation (à envoyer à vos clients)",
    linksTitle: "Vos liens",
    linkClients: "Pour vos clients et visiteurs (demande de travaux)",
    linkPros: "Pour les artisans (inscription)",
    kitTitle: "Votre kit",
    kitLead:
      "À coller sur votre site. Aucun cookie, aucun traceur : vos visiteurs ne sont jamais suivis.",
    kitLink: "Lien texte",
    kitButton: "Bouton",
    kitWidget: "Widget (formulaire intégré)",
    kitIframe: "Widget sans script (iframe seule)",
    copy: "Copier",
    copied: "Copié",
    disclosure:
      "Créateur de contenu ? Signalez le partenariat avec la mention « Publicité » ou « Collaboration commerciale » (loi du 9 juin 2023).",
    privateLink:
      "Ce lien est personnel : ne le partagez pas. L'équipe MENAO peut le renouveler à tout moment.",
    // Maquette du lot 38 : primes en étapes, kit en onglets avec son aperçu.
    kitTabs: "Formats du kit",
    preview: "Aperçu",
    code: "Code à coller",
    previewNote: "Le widget s'affiche ici tel que vos visiteurs le verront.",
  },
  /** Page co-marquée d'un partenaire (ADR 0142). */
  partnerPage: {
    metaTitle: (nom: string) => `${nom} vous recommande MENAO`,
    metaDescription: (nom: string) =>
      `${nom} vous recommande MENAO pour trouver des artisans du bâtiment vérifiés près de chez vous. Gratuit et sans engagement.`,
    eyebrow: (nom: string) => `Recommandé par ${nom}`,
    title: (nom: string) => `${nom} vous recommande MENAO`,
    lead: "Des artisans du bâtiment vérifiés près de chez vous : décrivez votre projet, jusqu'à 3 artisans vous répondent sous 72\u00a0h.",
    messageFrom: (nom: string) => `Le mot de ${nom}`,
    formTitle: "Décrivez votre projet",
    formLead:
      "Quelques phrases suffisent : MENAO vous présente les artisans vérifiés qui interviennent chez vous.",
    transparency: (nom: string) =>
      `${nom} est partenaire de MENAO et peut être rémunéré lorsque votre demande aboutit grâce à cette page. ${nom} ne reçoit jamais vos coordonnées.`,
    guarantees: "Nos garanties",
  },
  /** Bannières du kit partenaire (ADR 0141), dans le back-office et l'espace partenaire. */
  partnerBanners: {
    title: "Bannières",
    lead: "Images aux formats standards, hébergées par MENAO, déjà reliées à vos liens. Collez le code tel quel.",
    audiences: {
      particuliers: "Pour vos visiteurs (demande de travaux)",
      artisans: "Pour les artisans (inscription)",
    } as Record<"particuliers" | "artisans", string>,
    size: (width: number, height: number) => `${width} × ${height}`,
    preview: (width: number, height: number) => `Aperçu de la bannière ${width} × ${height}`,
    download: "Télécharger l'image",
    copyCode: "Copier le code",
    code: (width: number, height: number) => `Code de la bannière ${width} × ${height}`,
  },
  /** Widget intégré chez les partenaires (ADR 0138). */
  widget: {
    metaTitle: "MENAO — trouver un artisan du bâtiment vérifié",
    frameTitle: "MENAO : trouver un artisan du bâtiment vérifié",
    title: "Trouvez un artisan du bâtiment vérifié",
    lead: "Décrivez votre projet : jusqu'à 3 artisans vérifiés vous répondent sous 72\u00a0h.",
    trade: "Métier",
    anyTrade: "Je ne sais pas encore",
    description: "Votre projet",
    placeholder: "Ex. : fuite sous l'évier de la cuisine, à Nice",
    submit: "Décrire mon projet sur MENAO",
    opensNewTab: "(ouvre MENAO dans un nouvel onglet)",
    reassurance: ["Gratuit pour vous", "Artisans vérifiés", "Sans engagement"],
    partner: "Lien partenaire",
  },
  llms: {
    intro:
      "MENAO est disponible d'abord dans les Alpes-Maritimes. Le site est en français. Les espaces des clients, des artisans et de l'équipe sont privés et ne doivent pas être explorés.",
    clients: "Pour les particuliers",
    pros: "Pour les artisans",
    trades: "Métiers",
    guides: "Guides",
    about: "À propos",
    full: "Version complète",
    fullLink:
      "Ces liens, avec les faits clés, le fonctionnement et les questions fréquentes, en un seul texte",
    keyFacts: "Faits clés",
    howItWorksClient: "Comment ça marche pour un particulier",
    howItWorksPro: "Comment ça marche pour un artisan",
    faq: "Questions fréquentes",
    communes: "Communes couvertes",
    links: {
      search: "décrire son projet et recevoir la réponse d'artisans vérifiés",
      howItWorks: "le parcours d'un projet, de la demande à la réception du chantier",
      guarantees: "vérification des artisans, paiements sécurisés, avis",
      faq: "projets, paiements, confiance et artisans",
      ranking: "comment les artisans sont présentés et classés",
      pro: "demandes près de chez soi, devis, signature, paiements et factures, sans commission",
      proSignUp: "inscription et vérification de l'entreprise",
      proFaq:
        "toutes les réponses pour les artisans : inscription, abonnement, demandes, devis, paiements",
      partners: "programme partenaires : recommander MENAO contre une prime fixe",
      about: "mission et engagements de MENAO",
      contact: "écrire à l'équipe MENAO",
    },
    tradeLink: (trade: string) =>
      `trouver un ${trade.toLowerCase()} vérifié dans les Alpes-Maritimes`,
    proTradeLink: (trade: string) => `page des artisans ${trade.toLowerCase()}s`,
  },
  /** Page introuvable (404) et erreur inattendue, aux couleurs MENAO. */
  notFound: {
    code: "Erreur 404",
    title: "Cette page est introuvable",
    text: "Le lien est peut-être erroné, ou la page a été déplacée. Votre projet, lui, reste entre de bonnes mains.",
    home: "Retour à l'accueil",
    search: "Trouver un artisan",
    help: "Besoin d'aide ? Contactez-nous",
    logo: "MENAO, accueil",
  },
  /** Page d'attente du mode pré-lancement (ADR 0101) et accès des testeurs. */
  prelaunch: {
    // Seule page indexable pendant le pré-lancement (ADR 0134) : la marque et ce qu'elle propose.
    metaTitle: "MENAO — Artisans du bâtiment vérifiés, bientôt dans les Alpes-Maritimes",
    metaDescription:
      "Artisans du bâtiment vérifiés, devis, signature, paiement sécurisé et suivi de chantier dans un seul outil. Lancement prochain dans les Alpes-Maritimes.",
    badge: "Bientôt disponible",
    title: "MENAO arrive bientôt",
    lead: "Trouvez des artisans du bâtiment vérifiés près de chez vous, et suivez votre projet du devis jusqu'à la fin du chantier, dans un seul outil.",
    points: [
      "Artisans vérifiés",
      "Devis et signature en ligne",
      "Paiement sécurisé par Stripe",
      "Suivi du chantier en photos",
    ],
    area: "Lancement d'abord dans les Alpes-Maritimes.",
    teaser: {
      label: "Teaser de MENAO",
      soundOn: "Activer le son",
      soundOff: "Couper le son",
      fallback: "Votre navigateur ne peut pas lire cette vidéo.",
    },
    contact: { title: "Une question ?", text: "Écrivez-nous à", email: "contact@menao.fr" },
    access: {
      title: "Accès testeurs",
      text: "Vous participez aux essais ? Saisissez votre code.",
      label: "Code d'accès",
      submit: "Entrer",
      wrong: "Ce code n'est pas valable.",
    },
    footer: "© 2026 MENAO",
  },
  errorPage: {
    title: "Un imprévu sur le chantier",
    text: "Une erreur inattendue est survenue. Réessayez dans un instant ; si elle persiste, contactez-nous.",
    retry: "Réessayer",
    home: "Retour à l'accueil",
  },
  nav: {
    home: "MENAO",
    signIn: "Connexion",
    signUp: "Créer un compte",
    mySpace: "Mon espace",
    pro: "Espace Pro",
    // Page carrefour des métiers dans l'en-tête (plan du site du 9 novembre, ADR 0264).
    trades: "Métiers",
    howItWorks: "Comment ça marche ?",
    guarantees: "Garanties & Confiance",
    myClientSpace: "Mon espace client",
    findArtisan: "Trouver un artisan",
    describeProject: "Décrire mon projet",
    closeMenu: "Fermer le menu",
    menu: "Menu",
    main: "Navigation principale",
  },
  form: {
    // Sans « mot de passe » : le libellé du champ doit rester unique (accessibilité, tests).
    showPassword: "Afficher la saisie",
    hidePassword: "Masquer la saisie",
  },
  footer: {
    tagline: "Les artisans du bâtiment vérifiés, du premier contact à la réception du chantier.",
    zone: "Alpes-Maritimes",
    stripe: "Paiements sécurisés par Stripe",
    clients: "Particuliers",
    findArtisan: "Trouver un artisan",
    mySpace: "Mon espace client",
    pros: "Artisans",
    proSignUp: "Créer mon compte pro",
    plans: "Formules",
    signIn: "Connexion",
    trades: "Métiers",
    allTrades: "Tous les métiers",
    legal: "Informations légales",
    faq: "Questions fréquentes",
    contact: "Contact",
    about: "À propos",
    guides: "Guides",
    partners: "Devenir partenaire",
    legalNotice: "Mentions légales",
    terms: "Conditions générales d'utilisation",
    termsPro: "CGV artisans",
    privacy: "Politique de confidentialité",
    cookies: "Politique cookies",
    ranking: "Critères de classement",
  },
  home: {
    // Vidéo de présentation dans « Comment ça marche » (ADR 0278) : aucun texte visible, libellés
    // d'accessibilité seulement.
    video: {
      label: "Vidéo de présentation de MENAO, avec voix off",
      play: "Lire la vidéo de présentation de MENAO",
      fallback: "Votre navigateur ne peut pas lire cette vidéo.",
    },
    title: "Trouvez l'artisan pro du BTP dont vous avez besoin",
    heroTitleStart: "Trouvez l'artisan pro du BTP dont",
    heroTitleAccent: "vous avez besoin",
    heroFree: "MENAO est 100\u00a0% gratuit.",
    heroSubtitle: "De la mise en relation avec votre artisan à la réception du chantier.",
    searchLabel: "Décrivez votre besoin",
    searchPlaceholder: "Ex. : fuite sous l'évier de la cuisine, à Antibes",
    // Exemples qui s'écrivent dans la barre de recherche de l'accueil (F-01).
    searchExamples: [
      "Fuite sous l'évier de la cuisine, à Nice…",
      "Repeindre un salon de 20 m² à Antibes…",
      "Remplacer le chauffe-eau de mon appartement…",
      "Refaire la salle de bain avec une douche à l'italienne…",
      "Installer une borne de recharge dans mon garage…",
    ],
    searchSubmit: "Lancer la recherche",
    shortcuts: "Raccourcis par métier",
    moreTrades: "Plus de métiers",
    heroTags: ["Artisan vérifié", "Décennale contrôlée", "Réponse sous 72\u00a0h"],
    space: {
      eyebrow: "Votre espace client",
      title: "Tout votre chantier, au même endroit.",
      subtitle: "Devis, signature, paiements, photos et messages, sans papiers ni relances.",
      quote: {
        title: "Signez votre devis en ligne",
        text: "Le devis arrive dans votre espace : demandez une modification, refusez-le ou signez-le en quelques clics.",
      },
      payment: {
        title: "Payez en toute sécurité",
        text: "Acompte et solde par carte, versés directement à votre artisan. MENAO ne touche jamais votre argent.",
      },
      progress: {
        title: "Suivez l'avancement",
        text: "Photos, nouvelles et messages de votre artisan, au fil du chantier.",
      },
      reception: {
        title: "Réceptionnez sereinement",
        text: "Procès-verbal signé en ligne ; avec des réserves, le solde attend leur levée.",
      },
      review: {
        title: "Donnez votre avis",
        text: "Votre avis vérifié guide les prochains clients.",
      },
    },
    tradesEyebrow: "Métiers",
    tradesTitle: "Tous les métiers du bâtiment.",
    tradesSubtitle: "Des artisans vérifiés pour chaque corps de métier, dans les Alpes-Maritimes.",
    faqEyebrow: "Questions fréquentes",
    faqTitle: "Vos questions, nos réponses.",
    faqMore: "Toutes les questions",
    // Accueil, nouvelle structure (ADR 0264). TODO(legal) : faire relire privacyNote, controlsTitle
    // et le prix de l'encart pro avant l'ouverture.
    privacyNote:
      "Vos coordonnées ne vont qu'aux artisans qui acceptent votre demande, 3 au plus. Jamais revendues.",
    proofsMore: (label: string) => `${label} : en savoir plus`,
    allTrades: "Voir tous les métiers",
    moreTradesLabel: "Autres métiers",
    controlsTitle: "Contrôlés avant d'apparaître :",
    // Pages carrefour (ADR 0264).
    tradesPage: {
      title: "Tous les métiers du bâtiment",
      breadcrumb: "Métiers",
    },
    citiesPage: {
      title: "Communes couvertes par MENAO",
      breadcrumb: "Villes",
      tradesIn: (city: string) => `Métiers à ${city}`,
    },
    zone: {
      eyebrow: "Alpes-Maritimes",
      all: "Voir toutes les villes",
      mapLabel: "Carte des communes couvertes dans les Alpes-Maritimes",
      sea: "Mer Méditerranée",
      communesLabel: "Communes couvertes",
    },
  },
  trust: {
    title: "Des artisans du bâtiment vérifiés",
    subtitle:
      "Chaque artisan est contrôlé avant d'apparaître : entreprise active, décennale, RC Pro, identité.",
    stats: [
      { value: "100\u00a0%", label: "Artisans vérifiés" },
      { value: "0\u00a0%", label: "Commission sur vos chantiers" },
      { value: "72\u00a0h", label: "Pour vous répondre" },
    ],
    tradesLabel: "Métiers du bâtiment",
    allTrades: "Voir tous les métiers",
  },
  site: {
    breadcrumb: "Fil d'Ariane",
    // Mockups : vrais écrans de l'application (ADR 0147).
    mockups: {
      screens: {
        clientAccueil:
          "Application MENAO : l'accueil de Camille, avec la recherche de projet et son chantier de salle de bain en cours",
        clientRecherche:
          "Application MENAO : un particulier décrit son projet de salle de bain, l'assistant en déduit le métier",
        clientArtisans:
          "Application MENAO : deux artisans plombiers vérifiés sélectionnés, avec leur photo, leur expérience et leur disponibilité",
        clientFiche:
          "Application MENAO : la fiche d'un plombier vérifié, avec sa photo, son expérience et sa zone d'intervention",
        clientRdv:
          "Application MENAO : le chantier avec le rendez-vous planifié et l'artisan choisi",
        clientDevis:
          "Application MENAO : le devis détaillé, ligne par ligne, avec le total TTC et le bouton Signer le devis",
        clientAcompte: "Application MENAO : l'acompte à régler en ligne pour démarrer le chantier",
        clientSuivi:
          "Application MENAO : le suivi du chantier avec les photos et les nouvelles de l'artisan",
        clientAvis:
          "Application MENAO : l'avis du client noté sur la qualité, les délais et la communication",
        proAccueil:
          "Application MENAO pour les artisans : l'accueil avec l'encaissé du mois, l'argent à venir et les choses à faire",
        proDemandes:
          "Application MENAO pour les artisans : les demandes à traiter, avec le délai pour répondre",
        webPro:
          "Espace pro MENAO sur ordinateur : le tableau de bord avec l'encaissé du mois, les demandes à traiter, le chiffre d'affaires et les chantiers en cours",
      },
      // Parcours du bandeau de l'Espace Pro (ADR 0270) : valeurs d'exemple, celles des écrans.
      flow: {
        request: {
          eyebrow: "Nouvelle demande",
          title: "Douche à l'italienne à la place de la baignoire",
          sub: "06000 Nice · photos jointes",
          pill: "46 h pour répondre",
        },
        signed: {
          eyebrow: "Devis signé en ligne",
          title: "4 854,30 € TTC",
          sub: "Devis D-2026-0017 · Camille Martin",
        },
        deposit: {
          eyebrow: "Acompte reçu",
          title: "+ 1 456,29 €",
          sub: "Versés sur votre compte",
        },
      },
      deposit: {
        title: "Acompte reçu",
        text: "1 456,29 € versés sur votre compte pour la salle de bain de Camille.",
        time: "maintenant",
      },
      example: "Exemple de fiche",
    },
    // Photos de scènes (ADR 0271) : personnages fictifs, textes alternatifs.
    scenes: {
      julienPortrait:
        "Un artisan plombier souriant, bras croisés, adossé à sa camionnette dans une rue de village",
      julienVan:
        "Un artisan assis dans sa camionnette en fin de journée regarde son téléphone en souriant",
      meeting: "Une particulière accueille un artisan à la porte de son appartement",
      handover:
        "Un artisan et sa cliente dans une salle de bain rénovée : elle signe la réception du chantier sur un téléphone",
      camilleProject: "Une particulière photographie sa salle de bain ancienne avec son téléphone",
      camilleArtisans: "Une particulière sur son canapé choisit ses artisans sur son téléphone",
      camilleQuote: "Une particulière à sa table de cuisine signe un devis sur son téléphone",
      camilleFollow:
        "Une particulière en terrasse de café suit l'avancement de son chantier sur son téléphone",
      camillePortrait:
        "Une particulière souriante dans sa salle de bain rénovée, avec une douche à l'italienne",
      coast:
        "Vue aérienne d'un littoral méditerranéen : villages aux toits de tuiles, petit port et collines boisées",
    },
    home: "Accueil",
    clientSteps: {
      eyebrow: "Comment ça marche",
      title: "Votre projet entre de bonnes mains.",
      subtitle:
        "Décrivez vos travaux : MENAO trouve les artisans vérifiés de votre secteur. Vous gardez la main à chaque étape.",
      items: [
        {
          title: "Décrivez votre projet",
          text: "À l'écrit ou à la voix, avec vos photos. L'assistant en déduit le métier, les travaux et les délais.",
        },
        {
          title: "Choisissez vos artisans",
          text: "MENAO vous présente jusqu'à 5 artisans vérifiés de votre secteur : vous en sollicitez jusqu'à 3.",
        },
        {
          title: "Signez votre devis en ligne",
          text: "L'artisan accepte sous 72\u00a0h, vient voir votre chantier, puis vous envoie son devis détaillé.",
        },
        {
          title: "Suivez jusqu'à la réception",
          text: "Acompte, photos, réception et solde : tout se passe dans votre espace.",
        },
      ],
      cta: "Décrire mon projet",
      more: "Tout savoir sur le fonctionnement",
    },
    guarantees: {
      eyebrow: "Garanties & confiance",
      title: "La confiance, ça se vérifie.",
      subtitle:
        "Avant d'être visible sur MENAO, chaque artisan passe nos contrôles. Ensuite, des règles claires protègent votre chantier.",
      items: [
        {
          title: "Artisans vérifiés",
          text: "Entreprise active et vérifiée au registre, assurance décennale, RC Pro et identité du dirigeant contrôlés par l'équipe MENAO.",
        },
        {
          title: "Paiement direct à l'artisan",
          text: "Par carte, via Stripe : MENAO ne prélève rien sur votre chantier et ne détient jamais votre argent.",
        },
        {
          title: "Avis vérifiés",
          text: "Seuls les clients ayant réalisé un chantier via MENAO peuvent noter un artisan, une fois les travaux réceptionnés.",
        },
        {
          title: "Un recours en cas de problème",
          text: "Un souci sur le chantier ? Signalez-le depuis votre espace : l'équipe MENAO l'examine et vous répond.",
        },
      ],
      more: "Nos garanties en détail",
    },
    cta: {
      title: "Votre projet commence ici.",
      text: "Décrivez vos travaux en quelques minutes : MENAO vous présente les artisans vérifiés qui interviennent chez vous.",
      action: "Décrire mon projet",
      reassurance: ["Gratuit pour vous", "Artisans vérifiés", "Sans engagement"],
    },
    proTeaser: {
      eyebrow: "Vous êtes artisan ?",
      title: "Des chantiers près de chez vous. Sans commission.",
      text: "Demandes qualifiées, devis dictés, signature et paiements dans une seule app. Abonnement fixe, 2 mois offerts.",
      action: "Découvrir l'Espace Pro",
      points: ["Demandes qualifiées", "Paiements sur votre compte", "Zéro commission"],
      // Prix lu dans la table des formules (ADR 0264).
      price: (amount: string) => amount,
      priceUnit: (plan: string) => `HT / mois · formule ${plan}`,
    },
    // Illustrations du parcours client (valeurs d'exemple).
    journey: {
      quoteLabel:
        "Illustration : un devis détaillé à signer en ligne depuis l'espace client MENAO.",
      quote: "Devis",
      quoteNumber: "DEVIS-2026-0031",
      quoteLines: [
        { label: "Dépose de l'ancienne baignoire", amount: "280,00\u00a0€" },
        { label: "Receveur extra-plat, fourniture et pose", amount: "520,00\u00a0€" },
        { label: "Paroi de douche, fourniture et pose", amount: "200,00\u00a0€" },
      ],
      quoteTotalLabel: "Total TTC",
      quoteTotal: "1\u00a0100,00\u00a0€",
      quoteSign: "Signer le devis",
      quoteCode: "Code de confirmation envoyé",
      paymentLabel:
        "Illustration : un acompte payé par carte, versé directement sur le compte de l'artisan.",
      payment: "Acompte",
      paymentAmount: "330,00\u00a0€",
      paymentCard: "Carte bancaire",
      paymentSecure: "Paiement sécurisé par Stripe",
      paymentDirect: "Versé directement à votre artisan",
      progressLabel:
        "Illustration : l'avancement d'un chantier et une photo partagée par l'artisan.",
      progressPhoto: "Nouvelle photo du chantier",
      progressCaption: "Pose du receveur terminée",
      progressWhen: "Aujourd'hui",
      receptionLabel: "Illustration : la signature du procès-verbal de réception.",
      reception: "Procès-verbal de réception",
      receptionWithout: "Sans réserves",
      receptionWith: "Avec réserves",
      receptionSign: "Signer le procès-verbal",
      reviewLabel: "Illustration : le formulaire d'avis, ouvert après la réception du chantier.",
      reviewBadge: "Avis vérifié",
    },
  },
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
  seo: {
    tradeTitle: (trade: string) => `${trade} dans les Alpes-Maritimes`,
    tradeIntro: (trade: string) =>
      `Des artisans ${trade.toLowerCase()}s vérifiés par MENAO, près de chez vous. Décrivez votre projet : jusqu'à 3 artisans vous répondent sous 72\u00a0h.`,
    tradeMetaDescription: (trade: string) =>
      `Trouvez un ${trade.toLowerCase()} vérifié dans les Alpes-Maritimes : entreprise, assurance décennale et RC Pro contrôlées par MENAO. Nice, Cannes, Antibes, Grasse, Menton…`,
    tradeEyebrow: "Alpes-Maritimes",
    workTitle: (domain: string) => {
      const d = domain.toLowerCase();
      return `Vos travaux ${/^[aeiouéèêh]/.test(d) ? `d'${d}` : `de ${d}`}`;
    },
    workSubtitle: "Les prestations proposées par nos artisans vérifiés.",
    citiesTitle: (trade: string) => `${trade} près de chez vous`,
    citiesSubtitle:
      "Choisissez votre commune pour découvrir les artisans vérifiés qui y interviennent.",
    tradeFaq: (trade: string) => [
      {
        q: `Comment trouver un ${trade.toLowerCase()} de confiance ?`,
        a: `Décrivez votre projet sur MENAO : nous vous présentons des artisans ${trade.toLowerCase()}s vérifiés (entreprise active, assurance décennale et RC Pro contrôlées) qui interviennent chez vous. Vous en sollicitez jusqu'à 3.`,
      },
      {
        q: `Combien coûte l'intervention d'un ${trade.toLowerCase()} ?`,
        a: "Chaque chantier est différent : l'artisan établit un devis détaillé après avoir vu votre projet. Décrire votre projet et recevoir des devis sur MENAO est gratuit pour vous.",
      },
      {
        q: "Sous quel délai un artisan me répond-il ?",
        a: "Chaque artisan sollicité a 72 heures pour accepter votre demande. Dès qu'il accepte, vous échangez vos coordonnées et il fixe un rendez-vous pour voir votre chantier.",
      },
    ],
    cityTitle: (trade: string, city: string) => `${trade} à ${city}`,
    cityMetaTitle: (trade: string, city: string, dep: string) =>
      `${trade} à ${city} (${dep}) : artisans vérifiés — MENAO`,
    cityDescription: (trade: string, city: string) =>
      `Artisans ${trade.toLowerCase()}s vérifiés par MENAO à ${city} : entreprise, assurance décennale et RC Pro contrôlées. Décrivez votre projet, jusqu'à 3 artisans vous répondent sous 72\u00a0h.`,
    cityIntro: (trade: string, city: string) =>
      `MENAO vérifie chaque artisan avant de le proposer : entreprise en activité, identité du dirigeant, assurance décennale et responsabilité civile professionnelle. Voici les artisans ${trade.toLowerCase()}s qui interviennent à ${city}.`,
    artisansTitle: (trade: string, city: string) => `Artisans ${trade.toLowerCase()}s à ${city}`,
    found: (n: number) =>
      n === 1
        ? "1 artisan vérifié intervient dans cette ville."
        : `${n} artisans vérifiés interviennent dans cette ville.`,
    noneTitle: (trade: string, city: string) =>
      `Pas encore d'artisan ${trade.toLowerCase()} à ${city}`,
    none: (trade: string, city: string) =>
      `Aucun artisan ${trade.toLowerCase()} vérifié n'intervient encore à ${city} sur MENAO. Décrivez votre projet : nous vous mettrons en relation dès qu'un artisan sera disponible, ou nous chercherons pour vous.`,
    cta: "Décrire mon projet",
    ctaHint: "Gratuit et sans engagement pour les particuliers.",
    otherCities: (trade: string) => `${trade} dans d'autres villes`,
    // Pages métier × ville, contenu propre à chaque ville (lot 22, ADR 0268).
    cityChips: (n: number) => [
      ...(n > 0
        ? [n === 1 ? "1 artisan vérifié disponible" : `${n} artisans vérifiés disponibles`]
        : []),
      "Réponse sous 72\u00a0h",
      "Gratuit pour vous",
    ],
    requestQuote: "Lui demander un devis",
    controlsLink: "Comment MENAO vérifie les artisans",
    worksCityTitle: (domain: string, city: string) => {
      const d = domain.toLowerCase();
      return `Vos travaux ${/^[aeiouéèêh]/.test(d) ? `d'${d}` : `de ${d}`} à ${city}`;
    },
    nearbyEyebrow: (city: string) => `Autour de ${city}`,
    nearbyTitle: (trade: string, city: string) => `${trade} près de ${city}`,
    nearbySubtitle: "Les communes voisines et le nombre d'artisans vérifiés qui y interviennent.",
    nearbyCount: (n: number) => (n === 1 ? "1 artisan vérifié" : `${n} artisans vérifiés`),
    nearbySoon: "Bientôt",
    localFaq: (trade: string, city: string, n: number) =>
      n > 0
        ? {
            q: `Combien de ${trade.toLowerCase()}s vérifiés interviennent à ${city} ?`,
            a: `${n === 1 ? "1 artisan vérifié intervient" : `${n} artisans vérifiés interviennent`} à ${city} sur MENAO. Décrivez votre projet : jusqu'à 3 artisans vous répondent sous 72\u00a0h.`,
          }
        : {
            q: `Comment trouver un ${trade.toLowerCase()} à ${city} ?`,
            a: `Aucun artisan ${trade.toLowerCase()} vérifié n'intervient encore à ${city} sur MENAO. Décrivez votre projet : nous vous mettrons en relation dès qu'un artisan sera disponible, ou nous chercherons pour vous.`,
          },
    faqTitle: "Vos questions, nos réponses.",
    otherTrades: (city: string) => `Autres artisans à ${city}`,
    breadcrumbHome: "Accueil",
    noContact: "Les coordonnées des artisans sont communiquées quand ils acceptent votre demande.",
    // Fiche publique d'un artisan, indexée par Google (F-61, ADR 0144).
    artisan: {
      metaTitle: (name: string, trade: string, city: string | null) =>
        `${name}${trade ? `, ${trade.toLowerCase()}` : ""}${city ? ` à ${city}` : ""} — MENAO`,
      descriptionLead: (name: string, trade: string, city: string | null) =>
        `${name}${trade ? `, ${trade.toLowerCase()}` : ""}${city ? ` à ${city}` : ""}, sur MENAO.`,
      descriptionFallback: (name: string) =>
        `Fiche de ${name} sur MENAO : zone d'intervention, expertises, assurances vérifiées et avis de clients. Décrivez votre projet, c'est gratuit.`,
      requestHint: (name: string) =>
        `Décrivez vos travaux en quelques minutes : votre demande sera envoyée à ${name} uniquement. S'il ne peut pas intervenir, nous vous proposerons d'autres artisans.`,
      nearbyTitle: (trade: string) => `Trouver un ${trade.toLowerCase()} près de chez vous`,
      // Carte fixe de demande (lot 23, ADR 0269).
      cardTitle: (name: string) => `Demandez un devis à ${name}`,
      cardPoints: ["Gratuit pour vous", "Réponse sous 72\u00a0h", "Coordonnées protégées"],
      mobileHint: (name: string) => `Envoyée à ${name} uniquement · gratuit`,
      controlsLink: "Comment MENAO vérifie les artisans",
      nearbyCity: (trade: string, city: string) => `${trade} à ${city}`,
      allTrade: (trade: string) => `Tous les artisans ${trade.toLowerCase()}s vérifiés`,
    },
  },
  pages: {
    /** « À propos » (ADR 0134) : qui est MENAO, pour les visiteurs, Google et les assistants IA. */
    /** Programme Partenaires, page publique (ADR 0139). */
    partners: {
      title: "Devenir partenaire MENAO",
      metaTitle: "Devenir partenaire MENAO : recommandez des artisans vérifiés",
      metaDescription:
        "Agences, syndics, notaires, assureurs, comptables, négoces, créateurs de contenu : recommandez MENAO et recevez une prime pour chaque demande qualifiée et chaque artisan abonné.",
      eyebrow: "Programme partenaires",
      heroTitle: "Recommandez des artisans vérifiés,",
      heroAccent: "soyez récompensé",
      intro:
        "Proposez MENAO à vos clients ou à votre audience : vous recevez une prime fixe pour chaque demande de travaux qualifiée et pour chaque artisan devenu abonné.",
      audienceTitle: "Pour qui ?",
      audiences: [
        "Agences immobilières et syndics",
        "Notaires et assureurs",
        "Experts-comptables et négoces",
        "Créateurs de contenu sur la maison et les travaux",
      ],
      stepsEyebrow: "Comment ça marche",
      stepsTitle: "Quatre étapes, aucun traceur",
      steps: [
        {
          title: "Candidatez",
          text: "Le programme est réservé aux professionnels : un numéro SIRET est demandé.",
        },
        {
          title: "Intégrez votre lien",
          text: "Un simple lien, un bouton ou notre widget à coller sur votre site, en une ligne.",
        },
        {
          title: "Suivez vos résultats",
          text: "Votre espace partenaire montre vos demandes, vos artisans et vos primes.",
        },
        {
          title: "Facturez vos primes",
          text: "Après un délai de validation, vous facturez MENAO et êtes payé par virement.",
        },
      ],
      rulesTitle: "Ce qui est récompensé",
      rules: [
        {
          title: "Une demande qualifiée",
          text: "Un visiteur arrivé par votre lien décrit son projet, et au moins un artisan accepte sa demande.",
        },
        {
          title: "Un artisan abonné",
          text: "Un artisan arrivé par votre lien s'inscrit, puis fait son premier paiement après son essai.",
        },
      ],
      amounts: "Les montants des primes vous sont communiqués avec votre inscription.",
      trustTitle: "Transparence",
      trust: [
        "Aucun cookie ni traceur : vos visiteurs ne sont jamais suivis.",
        "Vous ne voyez jamais les coordonnées des clients ni des artisans.",
        "Les créateurs de contenu signalent le partenariat (« Publicité » ou « Collaboration commerciale »).",
      ],
      formTitle: "Candidater",
      formLead: "L'équipe MENAO étudie votre candidature et revient vers vous par e-mail.",
      company: "Nom de l'entreprise",
      siret: "SIRET",
      email: "E-mail professionnel",
      website: "Site web (facultatif)",
      message: "Votre activité et votre audience",
      submit: "Envoyer ma candidature",
      sent: "Candidature envoyée. L'équipe MENAO vous répond par e-mail.",
      subject: (company: string) => `Candidature partenaire : ${company}`,
      body: (fields: { company: string; siret: string; website: string; message: string }) =>
        [
          `Entreprise : ${fields.company}`,
          `SIRET : ${fields.siret}`,
          `Site web : ${fields.website || "non renseigné"}`,
          "",
          fields.message,
        ].join("\n"),
      errors: {
        company: "Indiquez le nom de votre entreprise.",
        message: "Présentez votre activité en quelques mots (1 700 caractères au plus).",
        website: "Adresse de site invalide.",
      },
    },
    about: {
      title: "À propos de MENAO",
      metaDescription:
        "MENAO met en relation les particuliers avec des artisans du bâtiment vérifiés dans les Alpes-Maritimes, et fournit un outil complet : devis, signature, paiement sécurisé et suivi de chantier, sans commission.",
      eyebrow: "À propos",
      heroTitle: "Rendre les travaux",
      heroAccent: "simples et sûrs",
      intro:
        "MENAO réunit en un seul endroit les particuliers qui ont un projet et les artisans du bâtiment vérifiés qui peuvent le réaliser, du premier contact à la réception du chantier.",
      missionTitle: "Notre mission",
      mission: [
        "Trouver un artisan de confiance, comparer des devis, suivre l'avancement et payer en toute sécurité : ces étapes sont souvent longues et incertaines. MENAO les réunit dans un outil simple, pour les particuliers comme pour les artisans.",
        "Les particuliers décrivent leur projet et reçoivent la réponse d'artisans vérifiés. Les artisans reçoivent des demandes près de chez eux et disposent d'un outil complet pour leurs devis, leurs factures et le suivi de leurs chantiers.",
      ],
      commitmentsTitle: "Nos engagements",
      commitments: [
        {
          title: "Des artisans vérifiés",
          text: "Entreprise active et vérifiée au registre, assurance décennale, RC Pro et identité du dirigeant contrôlés par l'équipe MENAO, puis surveillés jusqu'à leur échéance.",
        },
        {
          title: "Aucune commission sur les chantiers",
          text: "Les paiements vont directement sur le compte de l'artisan, via Stripe. MENAO ne prélève rien sur les chantiers et ne détient jamais l'argent des clients.",
        },
        {
          title: "Des réponses rapides",
          text: "Jusqu'à 3 artisans par demande, qui ont chacun 72 heures pour répondre.",
        },
        {
          title: "Des avis vérifiés",
          text: "Seuls les clients ayant réalisé un chantier via MENAO peuvent noter un artisan, une fois les travaux réceptionnés.",
        },
      ],
      areaTitle: "Où intervient MENAO ?",
      area: "MENAO démarre dans les Alpes-Maritimes : Nice, Cannes, Antibes, Grasse, Menton et les communes voisines.",
      tradesLink: "Voir les métiers",
      moreTitle: "En savoir plus",
      more: [
        { href: "/comment-ca-marche", label: "Comment ça marche" },
        { href: "/garanties", label: "Garanties et confiance" },
        { href: "/criteres-de-classement", label: "Critères de classement des artisans" },
        { href: "/faq", label: "Questions fréquentes" },
        { href: "/pro", label: "MENAO pour les artisans" },
        { href: "/contact", label: "Nous contacter" },
      ],
      cta: "Trouver un artisan",
    },
    howItWorks: {
      title: "Comment ça marche ?",
      metaDescription:
        "Trouver un artisan du bâtiment vérifié avec MENAO : description du projet, devis et signature en ligne, paiement direct à l'artisan, suivi et réception du chantier.",
      eyebrow: "Comment ça marche",
      heroTitle: "De la première idée",
      heroAccent: "à la réception du chantier.",
      intro:
        "MENAO vous accompagne à chaque étape, que vous ayez un projet de travaux ou que vous soyez artisan du bâtiment.",
      cta: "Décrire mon projet",
      ctaPro: "Je suis artisan",
      audienceLabel: "Choisir un parcours",
      clientTab: "Particuliers",
      proTab: "Artisans",
      clientEyebrow: "Pour les particuliers",
      clientTitle: "Six étapes, un seul espace.",
      clientSubtitle: "Gratuit et sans engagement : vous décidez à chaque étape.",
      client: [
        {
          title: "Décrivez votre projet",
          text: "Avec vos mots, à l'écrit ou à la voix, et quelques photos. L'assistant en déduit le métier, le lieu et les délais ; vous corrigez si besoin.",
          tag: "Recherche assistée par IA",
        },
        {
          title: "Choisissez jusqu'à 3 artisans",
          text: "Jusqu'à 5 artisans vérifiés qui interviennent chez vous, classés selon des critères publics. Vous en sollicitez 3 au plus.",
          tag: "Artisans vérifiés",
        },
        {
          title: "Rencontrez votre artisan",
          text: "Chaque artisan a 72\u00a0h pour accepter. Vous échangez alors vos coordonnées et il vient voir votre chantier.",
          tag: "Réponse sous 72\u00a0h",
        },
        {
          title: "Signez votre devis en ligne",
          text: "Le devis détaillé arrive dans votre espace : demandez une modification, refusez-le ou signez-le en ligne.",
          tag: "Signature électronique",
        },
        {
          title: "Réglez l'acompte, suivez les travaux",
          text: "L'acompte se règle par carte, directement à l'artisan. Il confirme le démarrage, puis partage photos et nouvelles.",
          tag: "Paiement sécurisé",
        },
        {
          title: "Réceptionnez, réglez le solde, notez",
          text: "Vous signez le procès-verbal de réception, réglez le solde une fois tout conforme, puis laissez votre avis.",
          tag: "Avis vérifié",
        },
      ],
      roleEyebrow: "Le rôle de MENAO",
      roleTitle: "MENAO organise. Votre artisan réalise.",
      roleSubtitle:
        "MENAO vérifie, structure et suit. Le chantier, lui, reste une affaire entre vous et votre artisan.",
      doesTitle: "Ce que fait MENAO",
      does: [
        "Vérifier chaque artisan avant de le rendre visible",
        "Structurer votre demande pour obtenir des devis précis",
        "Réunir devis, signatures, paiements et documents",
        "Examiner les signalements en cas de problème",
      ],
      doesNotTitle: "Ce que MENAO ne fait pas",
      doesNot: [
        "Prendre une commission sur votre chantier",
        "Encaisser ou conserver votre argent",
        "Vendre de meilleures places aux artisans",
        "Réaliser les travaux : votre artisan en répond, devis signé à l'appui",
      ],
      proEyebrow: "Pour les artisans",
      proTitle: "Des chantiers près de chez vous, sans commission.",
      proSubtitle:
        "Un abonnement fixe pour recevoir des demandes qualifiées et gérer chaque chantier, du devis à la facture.",
      pro: [
        {
          title: "Créez votre profil pro",
          text: "SIRET, métiers, zone d'intervention et documents : décennale, RC Pro, pièce d'identité. Le Kbis n'est demandé que si l'entreprise n'a pas pu être vérifiée au registre.",
        },
        {
          title: "Faites vérifier votre dossier",
          text: "L'équipe MENAO contrôle votre entreprise et vos documents avant de vous rendre visible.",
        },
        {
          title: "Recevez des demandes qualifiées",
          text: "Des projets précisés par l'IA, dans votre zone : vous avez 72\u00a0h pour accepter.",
        },
        {
          title: "Devis, signature, paiements",
          text: "Devis dicté et signé en ligne ; acompte et solde versés directement sur votre compte.",
        },
      ],
      proCta: "Découvrir l'Espace Pro",
      proNote: "Abonnement fixe, zéro commission, 2 mois offerts.",
      faqTitle: "Questions fréquentes",
    },
    guarantees: {
      title: "Garanties & Confiance",
      metaDescription:
        "Artisans vérifiés (entreprise vérifiée au registre, décennale, RC Pro, identité), paiement direct à l'artisan via Stripe, avis vérifiés, données protégées et recours en cas de problème : les garanties MENAO.",
      eyebrow: "Garanties & Confiance",
      heroTitle: "La confiance,",
      heroAccent: "ça se vérifie.",
      intro:
        "Ce que MENAO contrôle avant de vous présenter un artisan, comment votre argent et vos données sont protégés, et ce qui se passe en cas de problème.",
      cta: "Décrire mon projet",
      card: {
        label:
          "Illustration : les contrôles réalisés par l'équipe MENAO sur le dossier d'un artisan.",
        title: "Dossier artisan",
        status: "Vérifié",
        checks: [
          "Entreprise active (INSEE)",
          "Entreprise vérifiée au registre (ou Kbis récent)",
          "Assurance décennale",
          "Responsabilité civile professionnelle",
          "Pièce d'identité du dirigeant",
        ],
        footer: "Contrôlé par l'équipe MENAO",
      },
      checksEyebrow: "Artisans vérifiés",
      checksTitle: "Aucun artisan n'est visible sans avoir été vérifié.",
      checksSubtitle:
        "Chaque dossier est contrôlé par l'équipe MENAO, document par document, avant la première mise en relation.",
      checks: [
        {
          title: "Entreprise en activité",
          text: "SIRET contrôlé dans le répertoire Sirene de l'INSEE, avec une activité du bâtiment.",
        },
        {
          title: "Entreprise vérifiée au registre",
          text: "Entreprise active et dirigeant reconnu dans l'annuaire public des entreprises (registre national) ; à défaut, Kbis ou extrait de moins de 3 mois.",
        },
        {
          title: "Assurance décennale",
          text: "Attestation en cours de validité, vérifiée par l'équipe MENAO.",
        },
        {
          title: "RC professionnelle",
          text: "Responsabilité civile professionnelle en cours de validité.",
        },
        { title: "Identité du dirigeant", text: "Pièce d'identité contrôlée pour chaque dossier." },
      ],
      expiry:
        "Échéances suivies : un artisan dont l'assurance expire sans être renouvelée n'est plus proposé.",
      paymentEyebrow: "Paiements",
      paymentTitle: "Votre argent ne transite jamais par MENAO.",
      paymentText:
        "Vous réglez votre artisan par carte, via Stripe, prestataire de paiement agréé. Les fonds sont versés directement sur son compte : MENAO ne prélève aucune commission et ne détient jamais votre argent.",
      paymentFlow: {
        label: "Schéma : le paiement va de votre carte au compte de l'artisan, via Stripe.",
        you: "Vous",
        youDetail: "Carte bancaire",
        stripe: "Stripe",
        stripeDetail: "Paiement sécurisé",
        artisan: "Votre artisan",
        artisanDetail: "Versement direct",
        menao: "MENAO : 0\u00a0€ prélevé sur votre chantier",
      },
      paymentSteps: [
        {
          title: "L'acompte",
          text: "Réglé après la signature du devis, selon les conditions prévues par l'artisan.",
        },
        {
          title: "Le solde",
          text: "Réglé après la réception des travaux, et seulement une fois les éventuelles réserves levées.",
        },
        {
          title: "Vos factures",
          text: "Factures d'acompte et de solde, au nom de votre artisan, rangées dans votre espace.",
        },
      ],
      reviewsEyebrow: "Avis vérifiés",
      reviewsTitle: "Des avis qui ne s'achètent pas.",
      reviews: [
        "Seuls les clients ayant réalisé un chantier via MENAO peuvent laisser un avis, une fois le procès-verbal de réception signé.",
        "Un avis par chantier, daté, avec la date de réception des travaux.",
        "L'artisan peut répondre publiquement, une seule fois.",
        "Un avis n'est jamais masqué parce qu'il est négatif : seulement s'il enfreint la loi ou nos conditions d'utilisation.",
      ],
      dataEyebrow: "Données personnelles",
      dataTitle: "Vos informations restent les vôtres.",
      data: [
        {
          title: "Coordonnées protégées",
          text: "Transmises uniquement aux artisans qui acceptent votre demande.",
        },
        {
          title: "IA sans données personnelles",
          text: "E-mails, téléphones et noms sont retirés de votre description avant son analyse.",
        },
        {
          title: "Photos privées",
          text: "Seuls vous et les artisans que vous contactez y avez accès.",
        },
      ],
      issueEyebrow: "En cas de problème",
      issueTitle: "Un souci sur le chantier ? Vous n'êtes pas seul.",
      issue: [
        {
          title: "Vous signalez",
          text: "Retard, malfaçon, comportement, paiement : décrivez le problème depuis la page du chantier, photos à l'appui.",
        },
        {
          title: "Le chantier est suspendu",
          text: "Pendant un chantier en cours, paiements, démarrage et réception attendent la décision de l'équipe MENAO.",
        },
        {
          title: "MENAO examine et décide",
          text: "L'équipe MENAO examine le signalement et vous répond, puis fait reprendre le chantier ou l'annule.",
        },
      ],
      rankingEyebrow: "Classement",
      rankingTitle: "Aucune place ne s'achète.",
      rankingText:
        "Les artisans de proximité passent avant ceux qui couvrent une région ou toute la France. Parmi eux, les disponibles tout de suite passent en premier, puis viennent leur Score MENAO sur 100 (vérifications, expérience, diplômes, profil, réactivité et avis des clients) et leur distance. Une place est réservée à un nouvel artisan, le temps qu'il se fasse connaître. Le classement ne dépend ni de leur formule d'abonnement ni d'un paiement.",
      rankingLink: "Lire les critères de classement",
    },
    faq: {
      title: "Questions fréquentes",
      metaDescription:
        "Toutes les réponses sur MENAO : gratuité, choix des artisans, devis et signature en ligne, paiements, avis vérifiés, données personnelles et Espace Pro.",
      eyebrow: "Aide",
      heroTitle: "Questions",
      heroAccent: "fréquentes",
      intro:
        "Tout ce qu'il faut savoir sur MENAO, que vous ayez un projet de travaux ou que vous soyez artisan du bâtiment.",
      categoriesLabel: "Thèmes",
      project: {
        title: "Votre projet",
        items: [
          {
            q: "MENAO est-il payant pour les particuliers ?",
            a: "Non. Décrire votre projet, contacter des artisans, recevoir et signer vos devis, suivre votre chantier : tout est gratuit pour vous, sans engagement.",
          },
          {
            q: "Combien d'artisans puis-je contacter ?",
            a: "Jusqu'à 3 artisans par projet, parmi les 5 au plus que MENAO vous présente. Si l'un d'eux refuse ou ne répond pas sous 72 heures, vous pouvez en choisir un autre.",
          },
          {
            q: "Quand l'artisan reçoit-il mes coordonnées ?",
            a: "Seulement s'il accepte votre demande. Avant, il voit votre projet, votre prénom et votre ville.",
          },
          {
            q: "Comment se passe le devis ?",
            a: "Après le rendez-vous, l'artisan vous envoie son devis détaillé dans votre espace. Vous pouvez demander une modification, le refuser en indiquant pourquoi, ou le signer en ligne avec un code de confirmation.",
          },
          {
            q: "Puis-je suivre l'avancement des travaux ?",
            a: "Oui. Votre artisan partage photos et nouvelles du chantier dans votre espace, et vous échangez avec lui par messagerie.",
          },
          {
            q: "Comment se passe la fin du chantier ?",
            a: "Quand l'artisan déclare les travaux terminés, vous signez le procès-verbal de réception, avec ou sans réserves. Avec des réserves, le solde n'est demandé qu'une fois leur levée confirmée par vos soins.",
          },
          {
            q: "Dans quelles villes MENAO est-il disponible ?",
            a: "MENAO démarre dans les Alpes-Maritimes, de Menton à Mandelieu-la-Napoule, en passant par Nice, Antibes, Cannes et Grasse.",
          },
        ],
      },
      payments: {
        title: "Paiements",
        items: [
          {
            q: "Comment payer mon artisan ?",
            a: "En ligne, par carte bancaire, via Stripe : l'acompte après la signature du devis, le solde après la réception. L'argent est versé directement à votre artisan.",
          },
          {
            q: "MENAO prend-il une commission ?",
            a: "Non. Les artisans paient un abonnement mensuel. MENAO ne prend aucune commission et ne détient jamais l'argent des chantiers.",
          },
          {
            q: "Où trouver mes factures ?",
            a: "Les factures d'acompte et de solde, émises au nom de votre artisan, sont rangées dans le dossier de votre chantier et dans « Mes documents ».",
          },
        ],
      },
      trust: {
        title: "Confiance et sécurité",
        items: [
          {
            q: "Comment les artisans sont-ils vérifiés ?",
            a: "Nous contrôlons l'entreprise (SIRET actif), l'identité du dirigeant, l'assurance décennale et la responsabilité civile professionnelle avant de rendre un artisan visible, puis nous suivons les échéances de ses assurances.",
          },
          {
            q: "Les avis sont-ils fiables ?",
            a: "Seuls les clients ayant réalisé un chantier via MENAO peuvent laisser un avis, une fois le procès-verbal de réception signé, et un seul par chantier. Un avis n'est jamais masqué parce qu'il est négatif.",
          },
          {
            q: "Que se passe-t-il en cas de problème sur le chantier ?",
            a: "Signalez-le depuis la page du chantier : retard, malfaçon, comportement, paiement… Pendant un chantier en cours, ses étapes sont suspendues le temps que l'équipe MENAO examine le signalement ; elle peut ensuite faire reprendre le chantier ou l'annuler.",
          },
          {
            q: "Que devient la description de mon projet ?",
            a: "Elle sert à préparer votre demande : une intelligence artificielle l'analyse pour en déduire le métier, les travaux et les délais, après en avoir retiré e-mails, téléphones et noms.",
          },
        ],
      },
      pros: {
        title: "Artisans",
        items: [
          {
            q: "Je suis artisan : comment rejoindre MENAO ?",
            a: "Créez votre compte depuis l'Espace Pro avec votre SIRET, complétez votre profil et vos documents : l'équipe MENAO vérifie votre dossier.",
          },
          {
            q: "Combien coûte MENAO pour un artisan ?",
            a: "La formule Base coûte 150\u00a0€ HT par mois, avec 2 mois offerts et sans commission sur vos chantiers. Tous les détails sont dans l'Espace Pro.",
          },
          {
            q: "Comment l'artisan est-il payé ?",
            a: "Directement sur son compte Stripe, ouvert à son nom pendant l'inscription : MENAO ne touche jamais l'argent des chantiers.",
          },
        ],
      },
      contactTitle: "Vous n'avez pas trouvé votre réponse ?",
      contactText: "Écrivez-nous : l'équipe MENAO vous répond sous 7 jours.",
      contactCta: "Nous contacter",
    },
    contact: {
      title: "Contact",
      eyebrow: "Contact",
      heroTitle: "Une question ?",
      heroAccent: "Parlons-en.",
      intro:
        "Une question, une suggestion ? Écrivez-nous : l'équipe MENAO vous répond sous 7 jours.",
      formTitle: "Écrire à l'équipe MENAO",
      helpTitle: "Avant de nous écrire",
      help: {
        faq: {
          title: "Une question fréquente ?",
          text: "Gratuité, paiements, avis, Espace Pro : la réponse est peut-être déjà là.",
          link: "Voir les questions fréquentes",
        },
        chantier: {
          title: "Un souci sur un chantier ?",
          text: "Signalez-le depuis la page du chantier, dans votre espace : c'est le plus rapide.",
          link: "Ouvrir mon espace",
        },
        project: {
          title: "Pas d'artisan pour votre projet ?",
          text: "Décrivez-le, puis utilisez « Envoyer mon dossier à MENAO » : nous aurons tous les détails.",
          link: "Décrire mon projet",
        },
        pro: {
          title: "Vous êtes artisan ?",
          text: "Formules, inscription, vérification : tout est dans l'Espace Pro.",
          link: "Découvrir l'Espace Pro",
        },
      },
      email: "Votre adresse e-mail",
      subject: "Sujet (facultatif)",
      message: "Votre message",
      submit: "Envoyer",
      sent: "Votre message est envoyé. L'équipe MENAO vous répond sous 7 jours.",
      follow: "Suivre la réponse dans « Mes échanges avec MENAO »",
      privacy: "Votre adresse e-mail sert uniquement à vous répondre.",
    },
    legalNotice: {
      title: "Mentions légales",
      editorTitle: "Éditeur du site",
      editor:
        "[À compléter : dénomination sociale, forme juridique, capital, siège social, RCS, numéro de TVA, téléphone, adresse e-mail.]",
      directorTitle: "Directeur de la publication",
      director: "[À compléter.]",
      hostTitle: "Hébergement",
      host: [
        "Site web : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (fonctions exécutées dans l'Union européenne).",
        "Données : Supabase Inc., hébergement des bases de données dans l'Union européenne.",
      ],
    },
    cookies: {
      title: "Politique cookies",
      intro: "MENAO utilise uniquement les cookies nécessaires au fonctionnement du site.",
      items: [
        "Cookies de session (Supabase) : ils maintiennent votre connexion et votre recherche en cours. Indispensables, ils ne nécessitent pas votre consentement.",
        "Aucun cookie publicitaire ni de mesure d'audience n'est déposé à ce jour. Si nous en utilisions, votre consentement serait demandé au préalable, et le refus serait aussi simple que l'acceptation.",
      ],
      monitoring:
        "Suivi des erreurs : en cas de plantage, des informations techniques (navigateur, page, message d'erreur) sont transmises à notre outil de suivi Sentry, sans donnée personnelle ni cookie.",
    },
  },
  search: {
    // Demande préparée au téléphone par Manon (F-77, ADR 0227) : page du lien de l'e-mail.
    prepared: {
      metaTitle: "Votre demande de travaux",
      title: (firstName: string) => `${firstName}, votre demande est prête`,
      intro:
        "Manon a préparé votre demande au téléphone. Rien n'est encore envoyé aux artisans : créez votre espace MENAO gratuit ou connectez-vous, puis vérifiez votre demande et envoyez-la.",
      project: "Votre demande",
      expiredTitle: "Ce lien n'est plus valable",
      expired:
        "Il a peut-être déjà servi, ou il date de plus de 7 jours. Si vous avez déjà envoyé votre demande, retrouvez-la dans votre espace MENAO ; sinon, faites une nouvelle demande en quelques minutes.",
      newRequest: "Faire une demande",
      signIn: "Me connecter",
    },
    rehire: (name: string) =>
      `Nouvelle demande pour ${name} : décrivez vos travaux, elle lui sera envoyée directement.`,
    titleStart: "Trouvez l'artisan du BTP dont",
    titleAccent: "vous avez besoin",
    tagline: "Recherche rapide et intelligente",
    label: "Décrivez votre projet",
    /** Assistant des particuliers (F-71, ADR 0220), ouvert depuis la saisie du besoin. */
    assistant: {
      open: "Vous ne savez pas comment décrire votre problème, ou vous avez une question ?",
      openAction: "Demandez à l'assistant",
      // Bulle sur les pages d'information du site.
      bubbleLabel: "Poser une question à l'assistant MENAO",
      bubbleTitle: "Une question ?",
      title: "Assistant MENAO",
      subtitle: "IA · répond en quelques secondes",
      close: "Fermer l'assistant",
      greeting:
        "Bonjour ! Décrivez votre problème avec vos mots, ou posez votre question : je vous aide à trouver le bon artisan et à préparer votre demande.",
      quick: [
        "J'ai une fuite ou de l'humidité",
        "Je ne sais pas quel artisan contacter",
        "C'est gratuit pour moi ?",
        "Comment les artisans sont vérifiés ?",
      ],
      placeholder: "Écrivez votre message…",
      inputLabel: "Votre message",
      send: "Envoyer",
      thinking: "L'assistant écrit…",
      you: "Vous",
      suggestionsLabel: "Vous pouvez répondre :",
      unavailable:
        "L'assistant est momentanément indisponible. Décrivez votre besoin directement dans le champ, ou écrivez à l'équipe MENAO.",
      limit:
        "Vous pouvez maintenant décrire votre besoin dans le champ de recherche ; pour une autre question, écrivez à l'équipe MENAO.",
      write: "Écrire à l'équipe",
      draft: {
        title: "Votre demande est prête",
        trade: (label: string) => `Artisan proposé : ${label}`,
        use: "Utiliser cette description",
        hint: "Vous pourrez la relire et la compléter avant de l'envoyer.",
      },
      // Texte de référence de l'assistant (/assistant-particulier.txt) : titres des parties.
      knowledge: {
        trades: "Métiers des artisans sur MENAO",
        guides: "Guides MENAO (à conseiller selon la question)",
      },
    },
    placeholder:
      "Décrivez en détail votre besoin (ex : « Je cherche un plombier pour la rénovation complète de ma salle de bain de 8 m² à Nice »)",
    listening: "Écoute …",
    // Photo → description (ADR 0180).
    photoDescription: {
      reading: "Lecture de votre photo…",
      filled: "Description rédigée d'après votre photo : vérifiez-la et complétez-la.",
      failed: "Cette photo n'a pas pu être décrite : décrivez votre besoin avec vos mots.",
      fromPhoto: "D'après votre photo :",
      add: "Ajouter",
    },
    // Compréhension en direct (ADR 0179).
    understanding: { title: "Compris :" },
    // Propositions instantanées (ADR 0178).
    proposals: { label: "Demandes proposées" },
    // Suggestions pendant la saisie (ADR 0177).
    suggestions: {
      accept: "Compléter",
      acceptAria: (suite: string) => `Compléter avec : ${suite}`,
      ideas: "Précisez :",
      ideasAria: "Idées pour préciser votre demande",
      addIdea: (label: string) => `Ajouter : ${label}`,
    },
    // Urgence (F-128, ADR 0279) : bouton de la saisie, repérage dans la description.
    urgency: {
      button: "Urgent",
      detectedTitle: (reason: string) => `Urgence détectée : ${reason}`,
      detectedBody:
        "Votre demande sera signalée comme urgente aux artisans, et ceux qui sont disponibles tout de suite vous seront présentés d'abord.",
      notUrgent: "Ce n'est pas urgent",
      reasons: {
        fuite: "fuite en cours",
        chauffage: "panne de chauffage ou d'eau chaude",
        electricite: "panne ou danger électrique",
        serrure: "porte ou serrure bloquée",
        vitre: "vitre brisée",
        canalisation: "canalisation bouchée",
        toiture: "toiture endommagée",
        exprimee: "intervention demandée au plus vite",
      },
      // TODO(legal) : numéros d'urgence et formulation à faire relire avant l'ouverture au public.
      danger:
        "Danger immédiat ? Appelez le 18 ou le 112. Odeur de gaz : 0 800 47 33 33 (appel gratuit).",
      searching: "Demande urgente : nous cherchons d'abord les artisans disponibles tout de suite.",
    },
    dropHere: "Déposez vos fichiers ici",
    attach: "Joindre des photos",
    moreTrades: "Afficher plus de métiers",
    lessTrades: "Afficher moins de métiers",
    features: [
      {
        title: "Accompagnement par IA",
        body: "Une demande claire du premier coup, des artisans qui interviennent chez vous.",
      },
      {
        title: "Réponse sous 72 h",
        body: "Les artisans que vous choisissez ont 72 heures pour accepter votre demande.",
      },
      {
        title: "Artisans vérifiés",
        body: "Entreprise, identité et assurances contrôlées par MENAO avant toute mise en relation.",
      },
      {
        title: "100 % gratuit",
        body: "Trouvez votre artisan et suivez vos demandes en toute sérénité. MENAO est gratuit pour vous.",
      },
    ],
    helpEmpty: "Décrivez vos travaux avec vos mots, ou dictez-les.",
    helpShort:
      "Afin d'obtenir de meilleurs résultats, donnez un maximum de détails sur votre besoin ou votre projet.",
    helpEnough: "Avec ces informations, nous avons de quoi trouver votre artisan idéal !",
    tradesLegend: "Vous savez déjà quel artisan il vous faut ?",
    submit: "Trouver mon artisan",
    analyzing: "Analyse de votre projet en cours",
    uploadingPhotos: "Envoi de vos photos…",
    analysis: {
      steps: {
        read: "Lecture de votre description",
        trade: "Identification du métier et des travaux",
        place: "Repérage du lieu et des pièces",
        criteria: "Préparation de vos critères",
        photos: "Envoi de vos photos",
      },
      // Refonte de l'écran (F-128) : la description et ce qui en est déjà compris.
      yourText: "Votre description",
      understoodTitle: "Ce que nous avons compris",
      understood: { trade: "Métier", place: "Lieu", timing: "Délai" },
      pending: "Travaux…",
      factsTitle: "Le saviez-vous ?",
      facts: [
        "Chaque artisan MENAO est vérifié : SIRET, assurance décennale, responsabilité civile professionnelle et pièce d'identité.",
        "Vous payez l'artisan directement, par paiement sécurisé : MENAO ne prend aucune commission sur vos travaux.",
        "Devis, signature, paiement et suivi du chantier : tout se passe au même endroit.",
        "Votre demande part à 3 artisans au plus, qui ont 72 heures pour vous répondre.",
      ],
    },
    privacy:
      "Votre description est analysée par une intelligence artificielle pour pré-remplir votre recherche. Ne saisissez ni nom, ni téléphone, ni e-mail : ils sont de toute façon retirés avant l'analyse.",
    errors: {
      rate_limited:
        "Vous avez lancé beaucoup d'analyses en peu de temps. Réessayez dans une heure.",
      invalid: "Décrivez votre projet en 5 000 caractères au plus.",
      unavailable: "L'analyse est momentanément indisponible. Réessayez dans quelques instants.",
      session:
        "Impossible de démarrer votre recherche. Vérifiez votre connexion et réessayez dans quelques instants.",
      photos:
        "Certaines photos n'ont pas pu être ajoutées. Vous pourrez les ajouter à l'étape suivante.",
    },
    dictation: {
      start: "Dicter mon projet",
      stop: "Arrêter la dictée",
      listening: (seconds: number) => `Écoute… ${seconds} s`,
      transcribing: "Transcription en cours…",
      denied:
        "Le micro n'est pas autorisé. Autorisez-le dans les réglages de votre navigateur pour dicter votre projet.",
      unsupported: "La dictée n'est pas disponible sur ce navigateur.",
      failed: "La transcription a échoué. Réessayez ou saisissez votre projet au clavier.",
      rate_limited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
      limit: "Dictée limitée à 2 minutes.",
      quiet: "On ne vous entend pas…",
      silent:
        "Aucun son capté : vérifiez que votre micro n'est pas coupé et qu'il est bien choisi dans votre navigateur, puis réessayez.",
    },
    photos: {
      add: "Ajouter des photos",
      drop: "ou glissez-les ici",
      hint: "JPEG, PNG ou HEIC, 10 Mo maximum par photo, 10 photos maximum.",
      remove: (index: number) => `Retirer la photo ${index}`,
      tooMany: "10 photos maximum.",
      tooLarge: (name: string) => `« ${name} » dépasse 10 Mo.`,
      unreadable: (name: string) =>
        `« ${name} » n'a pas pu être lue. Sur ordinateur, convertissez les photos HEIC en JPEG.`,
      count: (n: number) => `${n} photo${n > 1 ? "s" : ""}`,
    },
    review: {
      title: "Vérifiez vos critères de recherche",
      // Refonte « Nette » (ADR 0257) : résumé à droite.
      summaryTitle: "Votre projet",
      summaryPlace: "Ville",
      intro:
        "Assurez-vous que ces informations correspondent à votre besoin et complétez-les si nécessaire.",
      back: "Retour",
      noAnalysis:
        "Nous n'avons pas pu analyser votre description automatiquement. Complétez les rubriques ci-dessous.",
      lowConfidence:
        "Vérifiez bien ces critères : votre description laissait plusieurs interprétations possibles.",
      // Refonte de l'écran (F-128, ADR 0279) : deux groupes, une ligne par information.
      groups: {
        essential: {
          title: "L'essentiel",
          description: "Ces trois informations suffisent pour lancer la recherche.",
        },
        site: {
          title: "Votre chantier",
          description: "Plus vous en dites, plus les réponses des artisans seront précises.",
        },
      },
      ok: "OK",
      add: "Ajouter",
      complete: "Compléter",
      optional: "Non renseigné · facultatif",
      free: "Gratuit pour vous · Sans engagement",
      summaryDelay: "Délai",
      urgency: {
        title: "Demande urgente",
        fromText: (excerpt: string) => `D'après votre description (« ${excerpt} »).`,
        fromAnalysis: "D'après votre description.",
        manual: "Vous l'avez signalée comme urgente.",
        body: "Les artisans la verront comme urgente, et ceux qui sont disponibles tout de suite vous seront présentés d'abord.",
        notUrgent: "Ce n'est pas urgent",
      },
      yourText: "Votre description",
      text: {
        description: "Ce que vous avez écrit ou dicté : l'artisan le lira avec votre demande.",
        label: "Description de votre projet",
        help: "En enregistrant, nous complétons les critères encore vides à partir de votre texte. Les choix déjà faits ne sont jamais remplacés.",
        analyzing: "Analyse en cours…",
        more: "Lire la suite",
        less: "Réduire",
        saved: "Description enregistrée.",
        completed: (sections: string) =>
          `Description enregistrée. Critères complétés : ${sections}.`,
        notAnalysed:
          "Description enregistrée. Nous n'avons pas pu l'analyser : vérifiez les critères ci-dessous.",
        locked: "Cette demande a déjà été envoyée : sa description ne peut plus être modifiée.",
      },
      edit: "Modifier",
      editLabel: (section: string) => `Modifier : ${section}`,
      cancel: "Annuler",
      save: "Enregistrer",
      done: "Terminer",
      saving: "Enregistrement…",
      saved: "Critères enregistrés.",
      notSet: "Non renseigné",
      remove: (label: string) => `Retirer ${label}`,
      noMatch: "Aucun résultat.",
      submit: "Trouver l'artisan idéal",
      submitHint: "Renseignez au moins le métier et la ville pour lancer la recherche.",
      // Chantier à plusieurs métiers (ADR 0167).
      lots: {
        title: "Autres métiers du chantier",
        suggested:
          "Votre chantier fait souvent aussi appel à ces métiers. Cochez ceux dont vous avez besoin : vous pourrez contacter des artisans pour chacun.",
        none: "Votre chantier demande plusieurs métiers ? Ajoutez-les : vous pourrez contacter des artisans pour chacun.",
        add: "Ajouter un métier",
        addPlaceholder: "Choisir un autre métier",
        limit: "4 autres métiers au plus.",
        independent: "Chaque artisan intervient pour son métier et établit son propre devis.",
      },
      trade: {
        title: "Artisan recherché",
        description: "Quel type d'artisan conviendrait le mieux à votre besoin ?",
        label: "Métier",
        placeholder: "Choisissez un métier",
        help: "Si vous ne connaissez pas le type d'artisan, indiquez simplement les informations sur votre projet : MENAO se charge de vous trouver l'artisan correspondant à votre besoin.",
      },
      site: {
        title: "Informations sur le chantier",
        description:
          "Assurez-vous des informations du chantier afin de trouver l'artisan qu'il vous faut.",
        lieu: "Où seront réalisés les travaux ?",
        lieuHelp: "Indiquez s'il s'agit de travaux de particulier, d'extérieur, d'entreprise…",
        lieuPlaceholder: "Choisissez un lieu",
        rooms: "Pièce des travaux",
        roomsHelp: "Dans quelle(s) pièce(s) les travaux auront-ils lieu ?",
        roomsFilter: "Recherchez les pièces des travaux (ex : « Cuisine, Salle de bain… »)",
        works: "Travaux attendus",
        worksHelp: "Quels travaux seront réalisés ?",
        worksFilter: "Saisissez des mots-clés (ex : « Peinture murale, Carrelage… »)",
        worksNeedTrade: "Choisissez d'abord le métier recherché.",
        place: "Lieu et pièces",
        placeMissing: "Appartement ou maison ?",
        size: "Surface et budget",
        surface: "Surface estimée des travaux",
        surfaceHelp:
          "Indiquez la surface estimée des travaux : cela aidera l'artisan à préparer son devis.",
        surfacePlaceholder: "Choisissez une surface",
        // Budget approximatif (ADR 0163), facultatif.
        budget: "Budget approximatif",
        budgetHelp:
          "Facultatif : un ordre d'idée aide l'artisan à vous proposer une solution adaptée.",
        budgetPlaceholder: "Je ne sais pas encore",
      },
      address: {
        title: "Adresse",
        description: "Préciser votre adresse permet de trouver un artisan proche de chez vous.",
        city: "Votre ville",
        cityHint: "Indiquez dans quelle ville l'artisan devra intervenir.",
        street: "Adresse exacte",
        streetHint:
          "Une adresse exacte permet d'affiner la recherche d'artisans. Elle ne sera communiquée qu'aux artisans qui acceptent votre demande.",
        streetPlaceholder: "Commencez à saisir une adresse (ex : « 1 rue de France, Nice »)",
        streetNeedCity: "Choisissez d'abord la ville.",
        noStreet: "adresse exacte non renseignée",
        specify: "Préciser l'adresse",
        clear: "Retirer l'adresse exacte",
      },
      date: {
        title: "Date de début souhaitée",
        description: "Quand souhaitez-vous que le chantier démarre ?",
        legend: "Quand souhaitez-vous commencer ?",
        asap: "Dès que possible",
        unknown: "Date de début inconnue",
        // Les quatre choix du délai (F-128) : « Urgent » d'abord.
        urgent: "Urgent",
        urgentHelp: "Fuite, panne, mise en sécurité",
        asapHelp: "Sans urgence",
        from: "À partir d'une date",
        fromHelp: "Vous choisissez le jour",
        later: "Je ne sais pas encore",
        laterHelp: "À voir avec l'artisan",
        pick: "Date de début",
        startsOn: (date: string) => `Début le ${date}`,
      },
      photos: {
        title: "Photos supplémentaires",
        description: "Ajouter des photos permet une analyse plus précise de votre besoin.",
        add: "Ajouter une photo",
        addHelp: "Vous pouvez ajouter jusqu'à 10 photos.",
        none: "Aucune photo · jusqu'à 10",
        alt: (index: number) => `Photo ${index} du chantier`,
        delete: "Supprimer",
        limit: "Vous avez atteint la limite de 10 photos.",
        // Description encore vague (ADR 0163) : un conseil, jamais une obligation.
        advice:
          "Votre demande est encore peu détaillée : ajoutez quelques photos, les artisans comprendront mieux vos travaux et vous répondront plus vite.",
      },
      urgent: "Urgent",
    },
    lieux: {
      appartement: "En appartement",
      maison: "En maison",
      jardin: "Dans un jardin",
      entreprise: "En entreprise",
    },
    surfaces: {
      moins_10: "Surface < 10 m²",
      "10_20": "Surface entre 10 m² et 20 m²",
      "20_50": "Surface entre 20 m² et 50 m²",
      plus_50: "Surface > 50 m²",
    },
    surfacesShort: {
      moins_10: "< 10 m²",
      "10_20": "10 à 20 m²",
      "20_50": "20 à 50 m²",
      plus_50: "> 50 m²",
    },
    // Budget approximatif, en euros TTC (ADR 0163).
    budgets: {
      moins_1000: "Moins de 1\u00a0000\u00a0€",
      "1000_5000": "De 1\u00a0000 à 5\u00a0000\u00a0€",
      "5000_15000": "De 5\u00a0000 à 15\u00a0000\u00a0€",
      "15000_50000": "De 15\u00a0000 à 50\u00a0000\u00a0€",
      plus_50000: "Plus de 50\u00a0000\u00a0€",
    },
    results: {
      title: "Sélectionnez votre artisan idéal",
      found: (n: number) =>
        n === 1
          ? "Nous avons trouvé 1 artisan vérifié qui correspond à votre projet."
          : `Nous avons trouvé ${n} artisans vérifiés qui correspondent à votre projet.`,
      noneTitle: "Aucun artisan disponible pour l'instant",
      // Chantier à plusieurs métiers (ADR 0167).
      lots: {
        title: "Les autres métiers de votre chantier",
        found: (n: number) =>
          n === 0
            ? "Aucun artisan disponible pour l'instant"
            : n === 1
              ? "1 artisan vérifié trouvé"
              : `${n} artisans vérifiés trouvés`,
        see: "Voir les artisans",
        sent: "Demande envoyée",
        lotOf: (trade: string) => `${trade} : un des métiers de votre chantier`,
        back: "Retour au chantier",
        workOrder: (trades: string) => `Ordre habituel des travaux : ${trades}.`,
        // Date propre au métier (ADR 0169).
        start: {
          label: (when: string) => `Début souhaité : ${when}`,
          same: "comme le reste du chantier",
          edit: "Modifier",
          editLabel: (trade: string) => `Modifier la date de début : ${trade}`,
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
      // Zone élargie (ADR 0165) : artisans dont la zone s'arrête un peu avant le chantier.
      wider: {
        emptyTitle: "Aucun artisan dans votre secteur pour l'instant",
        emptyLead:
          "Ces artisans vérifiés interviennent habituellement un peu plus loin : ils peuvent accepter votre demande ou la décliner.",
        title: "Un peu plus loin",
        lead: "Les artisans de votre secteur ont déjà reçu votre demande. Ces artisans vérifiés interviennent habituellement un peu plus loin : ils peuvent accepter votre demande ou la décliner.",
        badge: "Un peu hors de sa zone",
      },
      none: "Aucun artisan vérifié ne couvre encore votre secteur pour ce métier. Envoyez-nous votre dossier : nous cherchons pour vous.",
      summary: "Votre projet",
      edit: "Modifier",
      ranking: "Comment les artisans sont-ils classés ?",
      knownArtisan: "Déjà venu chez vous",
      // Partenaire recommandé par un artisan du chantier (ADR 0174), hors du classement.
      recommended: {
        title: "Recommandés par vos artisans",
        lead: "Un artisan que vous avez contacté vous recommande un de ses partenaires MENAO. Il ne voit rien de votre demande tant que vous ne le contactez pas, et chacun établit son propre devis.",
        by: (name: string) => `Recommandé par ${name}, son partenaire`,
        someone: "un de vos artisans",
      },
      score: (n: number) => `Score MENAO ${n}/100`,
      // Demande directe (ADR 0198) : l'artisan choisi par le client reçoit seul la demande.
      direct: {
        title: (name: string) => `Votre demande pour ${name}`,
        lead: (name: string) =>
          `Votre demande ne sera envoyée qu'à ${name}. S'il ne peut pas intervenir, nous vous proposerons d'autres artisans vérifiés.`,
        sentLead: (name: string) =>
          `Si ${name} ne peut pas intervenir, nous vous proposerons d'autres artisans vérifiés.`,
        hint: (name: string) => `${name} recevra seul votre demande.`,
        submit: (name: string) => `Envoyer ma demande à ${name}`,
      },
      knownUnavailable: (name: string) =>
        `${name} n'est pas disponible pour cette demande (métier, zone d'intervention ou congés) : voici d'autres artisans vérifiés.`,
      viewProfile: (name: string) => `Voir le profil de ${name}`,
      viewProfileShort: "Voir le profil",
      experience: (years: number) =>
        years <= 1 ? `${years} an d'expérience` : `${years} ans d'expérience`,
      zoneRadius: (km: number, city: string | null) =>
        city ? `${km} km autour de ${city}` : `Rayon de ${km} km`,
      zoneCommunes: (communes: string[]) =>
        communes.length > 3
          ? `${communes.slice(0, 3).join(", ")} et ${communes.length - 3} autre${communes.length > 4 ? "s" : ""}`
          : communes.join(", "),
      distance: (km: number) => `à ${km.toLocaleString("fr-FR")} km`,
      verified: "Assuré et vérifié",
      availableNow: "Dispo immédiate",
      availableFrom: (date: string) => `Disponible à partir du ${date}`,
      paused: "Indisponible pour le moment",
      more: (n: number) => `+${n}`,
      date: { des_que_possible: "Dès que possible", inconnue: "Date inconnue" },
      ticket: {
        title: "Vous ne trouvez pas votre artisan idéal ?",
        intro: "Envoyez votre dossier à l'équipe MENAO : nous vous répondons sous 7 jours.",
        message: "Votre message (facultatif)",
        email: "Votre adresse e-mail",
        emailHint: "Pour que l'équipe MENAO puisse vous répondre.",
        submit: "Envoyer mon dossier à MENAO",
        sent: "Votre dossier est transmis à l'équipe MENAO. Nous vous répondons sous 7 jours.",
      },
    },
    summary: {
      title: "Résumé de mon besoin",
      edit: "Modifier",
      trade: "Artisan recherché",
      site: "Informations sur le chantier",
      address: "Adresse",
      date: "Date de début",
      photos: "Photos du projet",
      photoCount: (n: number) => (n <= 1 ? "1 photo" : `${n} photos`),
      editLabel: "Modifier mon besoin",
    },
    selection: {
      select: (name: string) => `Sélectionner ${name}`,
      selectShort: "Sélectionner",
      selected: "Sélectionné",
      hint: "Sélectionnez jusqu'à 3 artisans : ils recevront votre demande en même temps.",
      submit: (n: number) =>
        n <= 1 ? "Envoyer ma demande" : `Envoyer ma demande aux ${n} artisans`,
      limit: "Vous pouvez contacter 3 artisans au plus pour ce projet.",
      // Chantier à plusieurs métiers (ADR 0170) : un seul envoi pour tous les métiers.
      hintLots:
        "Sélectionnez jusqu'à 3 artisans par métier : ils recevront tous votre demande en un seul envoi.",
      limitLots: "Vous pouvez contacter 3 artisans au plus par métier.",
      alreadySent: "Demande envoyée",
      sentBanner: (names: string) => `Votre demande est déjà envoyée à ${names}.`,
      noSlot: "Vous avez déjà contacté 3 artisans pour ce projet.",
    },
    request: {
      title: (names: string) => `Envoyez votre demande de chantier à ${names}`,
      intro:
        "Assurez-vous que toutes les informations relatives à votre chantier sont correctes, et ajoutez un message personnalisé si vous le souhaitez.",
      back: "Retour",
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
      passwordHint: "Doit contenir au moins 8 caractères.",
      free: "La création d'espace client MENAO et la mise en relation avec un artisan sont 100 % gratuites.",
      signUpSubmit: "Créer mon espace et continuer",
      haveAccountTitle: "Vous avez déjà un espace MENAO ?",
      haveAccountText: "Connectez-vous et accédez à vos demandes et à vos chantiers.",
      haveAccountButton: "Me connecter à mon espace",
      signInTitle: "Me connecter à mon espace",
      signInSubmit: "Me connecter et continuer",
      backToSignUp: "Créer un espace client",
      checkEmail:
        "Nous venons de vous envoyer un e-mail de confirmation. Cliquez sur le lien qu'il contient : vous reviendrez ici pour envoyer votre demande.",
      selected: "Artisan sélectionné",
      selectedMany: "Artisans sélectionnés",
      responseBands: {
        deux_heures: "Répond en général en moins de 2 h",
        six_heures: "Répond en général en moins de 6 h",
        journee: "Répond en général dans la journée",
      } as Record<string, string>,
      changeSelection: "Modifier",
      project: "Votre projet",
      messageTitle: "Ajouter un message personnalisé",
      messageIntro: (names: string) =>
        `Ajoutez un message personnalisé à votre demande : cela pourrait aider ${names} pour le chantier et la réalisation du devis.`,
      messageAdd: "Ajouter un message personnalisé",
      messageRemove: "Ne pas ajouter de message personnalisé",
      message: "Votre message",
      messageCount: (n: number) => `${n.toLocaleString("fr-FR")} / 10 000 caractères max.`,
      contactTitle: "Vérifiez vos coordonnées",
      contactIntro:
        "Vous suivrez l'évolution du projet dans votre espace MENAO ; l'artisan pourra aussi vous contacter par téléphone ou par e-mail. Vérifiez qu'elles sont exactes : elles ne sont transmises qu'aux artisans qui acceptent votre demande.",
      email: "E-mail",
      phone: "Téléphone",
      callbackTitle: "Quand souhaitez-vous être recontacté ?",
      callbackIntro: (names: string) =>
        `Indiquez votre préférence afin de permettre à ${names} de vous recontacter quand vous le souhaitez.`,
      callback: "Préférence de rappel",
      callbackAsap: "Dès que possible",
      callbackRange: "Indiquer une plage horaire",
      from: "À partir de",
      to: "Jusqu'à",
      submit: (n: number) =>
        n <= 1 ? "Envoyer ma demande" : `Envoyer ma demande aux ${n} artisans`,
      deadline: "Chaque artisan a 72 heures pour vous répondre.",
      transferError:
        "Nous n'avons pas pu rattacher votre projet à votre compte. Recommencez votre recherche depuis l'accueil.",
      notParticulier: "Connectez-vous avec un compte particulier pour envoyer une demande.",
      sentTitle: (names: string) => `Votre demande est envoyée à ${names}\u00a0!`,
      sentText: (names: string, many: boolean) =>
        many
          ? `${names} ont bien reçu votre demande dans leur espace MENAO. Chacun a 72 heures pour l'accepter.`
          : `${names} a bien reçu votre demande dans son espace MENAO. Il a 72 heures pour l'accepter.`,
      reminder: "Rappel",
      sentCallbackAsap: "Vous avez demandé à être rappelé dès que possible.",
      sentCallbackRange: (from: string, to: string) =>
        `Vous avez indiqué être joignable par téléphone entre ${from} et ${to}.`,
      sentNext: "Vous recevrez les coordonnées de chaque artisan dès qu'il accepte votre demande.",
      // Délai de réponse habituel (ADR 0221) : une information, pas une garantie.
      responseNote: "Délais indicatifs, tirés des réponses passées de chaque artisan.",
      follow: "Suivre ma demande depuis mon espace",
      // Chantier à plusieurs métiers (ADR 0168) : les métiers qui restent à contacter.
      otherLots: {
        title: "Les autres métiers de votre chantier",
        lead: "Choisissez maintenant les artisans des autres métiers :",
        choose: (trade: string) => `Choisir un artisan : ${trade}`,
      },
      workOrder: (trades: string) => `Ordre habituel des travaux : ${trades}.`,
    },
    profile: {
      breadcrumb: {
        label: "Fil d'Ariane",
        criteria: "Vérification des critères",
        selection: "Sélection d'artisan",
      },
      title: (name: string, trade: string) => (trade ? `${name} - ${trade}` : name),
      request: "Envoyer une demande",
      requestHint: "Vous pourrez encore modifier votre besoin et ajouter un message personnalisé.",
      experience: "Expérience",
      experienceValue: (years: number) => (years <= 1 ? `${years} an` : `${years} ans`),
      zone: "Zone d'intervention",
      insurance: "Assurance décennale",
      insuranceValue: "Vérifiée par MENAO",
      insuranceRcPro: "Assurance",
      insuranceRcProValue: "RC Pro vérifiée par MENAO",
      verifiedBadge: "Assuré et vérifié",
      // Réseau du parrainage (ADR 0161).
      recommendedBy: "Recommandé par",
      partners: "Artisans partenaires",
      partnersHint: (name: string) =>
        `Des artisans recommandés par ${name}, souvent d'autres métiers.`,
      // Badge du temps de réponse moyen (ADR 0160), absent au-delà de 2 h.
      fastResponse: "Répond en moyenne en moins de 2\u00a0h",
      about: (name: string) => `À propos de ${name}`,
      expertise: "Expertises",
      guarantees: "Garanties & Assurances",
      verifiedTitle: "Assuré et vérifié par MENAO",
      // Fiche publique (lot 23, ADR 0269).
      verifiedOn: (date: string, detail: string) => `Dernier contrôle le ${date}. ${detail}`,
      reviewsRule:
        "Seuls les clients ayant réalisé un chantier via MENAO peuvent noter un artisan, une fois les travaux réceptionnés.",
      reviewsHow: "Comment nous contrôlons les avis",
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
      rgeDetail: "Vérifié dans l'annuaire officiel des entreprises RGE",
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
      scoreHow: "Comment est-il calculé ?",
      clientReviews: "Avis des clients",
      scoreEmpty:
        "Pas encore d'avis MENAO : cet artisan vient de rejoindre la plateforme. Ses clients pourront le noter après la réception de leur chantier.",
      google: (rating: string, count: number) => `Note Google : ${rating}/5 (${count} avis)`,
      googleLink: "Voir la fiche Google",
      diplomaTitle: (label: string) => `Diplôme : ${label}`,
      diplomaDetail: "Déclaré par l'artisan",
      recent: "Chantiers récents",
      recentEmpty: "Aucune photo de chantier pour l'instant.",
      reviews: "Derniers avis clients",
      reviewsEmpty: "Pas encore d'avis vérifié.",
      scoreRows: {
        quality: "Qualité des prestations",
        delays: "Respect des délais",
        communication: "Communication",
        value_for_money: "Rapport qualité/prix",
      },
      scoreGlobal: "Note globale",
      scoreBasis: (n: number) =>
        n <= 1 ? "Calculé sur 1 avis vérifié" : `Calculé sur ${n} avis vérifiés`,
      verified: "Avis vérifié",
      stars: (score: number, stars: number) => `Note : ${score}\u00a0% (${stars} sur 5)`,
      receivedOn: (date: string) => `Chantier réceptionné le ${date}`,
      replyFrom: (name: string) => `Réponse de ${name}`,
      showAllReviews: (n: number) => `Afficher les ${n} avis`,
      report: "Signaler cet avis",
      reportTitle: "Signaler cet avis à l'équipe MENAO",
      reportLabel: "Motif du signalement",
      reportHint:
        "Propos injurieux, données personnelles, faux avis… L'équipe MENAO examinera l'avis.",
      reportSubmit: "Envoyer le signalement",
      reportCancel: "Annuler",
      reportSent: "Signalement envoyé à l'équipe MENAO. Merci.",
      reportSignIn: "Signaler un contenu (page Contact)",
      photoAlt: (index: number, name: string) => `Chantier ${index} réalisé par ${name}`,
      photoCounter: (index: number, total: number) => `${index} / ${total}`,
      close: "Fermer",
      previous: "Photo précédente",
      next: "Photo suivante",
      company: "Entreprise",
      unavailable: "Indisponible pour le moment",
    },
    upload: {
      ok: "Photo ajoutée.",
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
  signUp: {
    title: "Créer mon compte",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone (optionnel)",
    optional: "(optionnel)",
    phoneHint: "Indicatif +33 par défaut.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum.",
    acceptTermsBefore: "J'accepte les ",
    terms: "conditions générales d'utilisation",
    acceptTermsMiddle: " et la ",
    privacy: "politique de confidentialité",
    marketing: "J'accepte de recevoir les actualités de MENAO (optionnel).",
    submit: "Créer mon compte",
    haveAccount: "Déjà un compte ?",
    signInLink: "Me connecter à mon espace",
  },
  verifyEmail: {
    title: "Vérifiez votre boîte mail",
    body: "Si cette adresse n'a pas encore de compte, nous venons d'y envoyer un lien de confirmation. Cliquez dessus pour activer votre compte.",
  },
  signIn: {
    title: "Me connecter",
    email: "Adresse e-mail",
    password: "Mot de passe",
    submit: "Me connecter",
    magicLinkLink: "Recevoir un lien de connexion par e-mail",
    noAccount: "Pas encore de compte ?",
    signUpLink: "Créer un compte",
    invalidLink: "Ce lien est invalide ou a expiré. Connectez-vous ou demandez un nouveau lien.",
    forgotPassword: "Mot de passe oublié ?",
    passwordUpdated: "Votre mot de passe a été modifié.",
    signedOutEverywhere: "Vous êtes déconnecté de tous vos appareils.",
    oauthError:
      "La connexion avec Google ou Apple n'a pas abouti. Réessayez, ou utilisez votre adresse e-mail.",
  },
  /** Connexion avec Google ou Apple, pour les clients (ADR 0108). */
  oauth: {
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    orEmail: "ou avec votre adresse e-mail",
    group: "Se connecter avec un compte Google ou Apple",
  },
  completeSignup: {
    title: "Finaliser mon compte",
    intro: (provider: string, email: string | null) =>
      `Vous êtes connecté avec ${provider}${email ? ` (${email})` : ""}. Vérifiez vos informations et acceptez les conditions d'utilisation pour accéder à votre espace.`,
    submit: "Accéder à mon espace",
    notYou: "Ce n'est pas vous ? Se déconnecter",
  },
  forgotPassword: {
    title: "Mot de passe oublié",
    intro:
      "Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.",
    email: "Adresse e-mail",
    submit: "Recevoir le lien",
    sent: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
  },
  resetPassword: {
    title: "Nouveau mot de passe",
    password: "Nouveau mot de passe",
    passwordHint: "8 caractères minimum.",
    submit: "Enregistrer mon mot de passe",
  },
  magicLink: {
    title: "Connexion par lien magique",
    intro:
      "Saisissez votre adresse e-mail : nous vous enverrons un lien de connexion valable une heure.",
    email: "Adresse e-mail",
    submit: "Recevoir mon lien",
    sent: "Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé.",
    back: "Revenir à la connexion par mot de passe",
  },
  myRequests: {
    title: "Mes demandes",
    empty: "Vous n'avez pas encore envoyé de demande.",
    emptyHint:
      "Décrivez votre projet : nous vous proposons des artisans vérifiés près de chez vous.",
    status: {
      envoyee: "En attente de réponse",
      acceptee: "Acceptée",
      refusee: "Refusée",
      expiree: "Sans réponse",
      annulee: "Annulée",
      a_verifier: "En cours de vérification",
    },
    // Chantier à plusieurs métiers (ADR 0168).
    lotOf: (chantier: string) => `Un des métiers de votre chantier : ${chantier}`,
    verificationHint:
      "L'équipe MENAO vérifie votre demande avant de la transmettre à l'artisan : vous serez prévenu de sa réponse.",
    timeLeft: (h: number, m: number) =>
      `Réponse attendue sous ${h} h ${String(m).padStart(2, "0")}`,
    yourArtisans: "Vos artisans",
    chooseAnother: "Choisir un autre artisan",
    cancelledByArtisan: "L'artisan a annulé le rendez-vous.",
    cancelledByYou: "Vous avez annulé cette demande.",
    seeArtisans: "Voir les artisans",
    seeChantier: "Voir le chantier",
  },
  myChantiers: {
    title: "Mes chantiers",
    subtitle: "Suivez vos chantiers MENAO, en toute simplicité",
    start: "Démarrer un chantier",
    countActive: (n: number) => (n <= 1 ? `${n} chantier en cours` : `${n} chantiers en cours`),
    // Accepter en un toucher (ADR 0222) : créneaux proposés par les artisans.
    slots: {
      title: "Rendez-vous à choisir",
      from: (artisan: string) => `${artisan} vous propose de venir voir votre projet :`,
      hint: "Touchez le créneau qui vous convient : le rendez-vous est fixé aussitôt, et ses coordonnées vous sont communiquées.",
    },
    countToSign: (n: number) => `${n} devis à signer`,
    // Refonte « Nette » (ADR 0251) : chiffres de l'accueil et colonne de droite.
    toDoCount: (n: number) =>
      n === 1
        ? "1 chose à faire pour que vos chantiers avancent."
        : `${n} choses à faire pour que vos chantiers avancent.`,
    figuresLabel: "Vos chantiers en chiffres",
    figActive: "Chantiers en cours",
    figActiveShort: "en cours",
    figActiveHint: "suivis ici, étape par étape",
    figToDo: "À faire",
    figToDoShort: "à faire",
    figNext: "Prochain rendez-vous",
    figNextShort: "prochain RDV",
    figNextHint: (artisan: string, time: string) => `${artisan} · ${time}`,
    figNextNone: "aucun pour le moment",
    figPaid: "Payé via MENAO",
    figPaidHint: "directement à vos artisans",
    protectedTitle: "Comment vous payez",
    protectedText:
      "Par carte, en ligne, directement sur le compte de votre artisan : MENAO ne prend rien sur vos chantiers. Le solde se paie après la réception des travaux.",
    // « À faire maintenant » (ADR 0132), comme l'accueil de l'application (ADR 0082).
    todoTitle: "À faire maintenant",
    todo: {
      signer_devis: "Signer le devis",
      payer_acompte: "Payer l'acompte",
      payer_demarrage: "Payer au démarrage",
      valider_reception: "Réceptionner les travaux",
      confirmer_levee: "Confirmer la levée des réserves",
      payer_solde: "Payer le solde",
      donner_avis: (artisan: string) => `Noter ${artisan}`,
    },
    todoDetail: (title: string, artisan: string) => `${title} · ${artisan}`,
    allDone: "Tout est à jour",
    allDoneHint: "Rien à faire de votre côté pour le moment : votre artisan avance.",
    inProgress: "Mes chantiers en cours",
    pending: "Mes demandes en attente",
    finished: "Mes chantiers terminés",
    noActive: "Aucun chantier en cours pour le moment.",
    drafts: {
      title: "Recherches non envoyées",
      intro:
        "Vous avez commencé ces recherches sans envoyer de demande : reprenez-les quand vous voulez.",
      started: (date: string) => `Commencée le ${date}`,
      untitled: "Recherche sans titre",
      resume: "Reprendre",
      delete: "Supprimer",
      deleteLabel: (title: string) => `Supprimer la recherche « ${title} »`,
    },
    rehire: (name: string) => `Redemander un devis à ${name}`,
    newRequest: {
      intro:
        "Décrivez vos travaux, avec vos mots ou à la voix : nous vous proposons des artisans vérifiés près de chez vous.",
    },
  },
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
  // « Invitez votre artisan de confiance » (ADR 0162).
  inviteArtisan: {
    title: "Invitez votre artisan de confiance",
    intro:
      "Un artisan vous a donné satisfaction et n'est pas encore sur MENAO ? Donnez-nous ses coordonnées : l'équipe MENAO le contacte de votre part pour lui présenter MENAO.",
    company: "Nom de l'artisan ou de son entreprise",
    contactName: "Personne à contacter",
    phone: "Téléphone",
    email: "E-mail",
    contactHint: "Le téléphone ou l'e-mail, au moins l'un des deux.",
    trade: "Métier",
    tradeChoose: "Choisir un métier",
    city: "Ville",
    message: "Ce que vous avez apprécié",
    optional: "(facultatif)",
    submit: "Envoyer l'invitation",
    sent: "Merci ! L'équipe MENAO va contacter cet artisan de votre part.",
    privacy:
      "Ces coordonnées servent seulement à contacter cet artisan ; elles sont effacées sous 12 mois s'il ne rejoint pas MENAO.",
    listTitle: "Vos invitations",
    sentOn: (date: string) => `Envoyée le ${date}`,
    status: { envoyee: "Transmise à l'équipe MENAO", inscrit: "Inscrit sur MENAO" },
    // Carte de l'accueil « Mes chantiers ».
    cardText: "Un artisan vous a donné satisfaction et n'est pas encore sur MENAO ?",
    cardAction: "Inviter un artisan",
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
    comment: "Un mot pour l'artisan ?",
    optional: "(facultatif)",
    back: "Retour",
    request: {
      open: "Annuler ma demande",
      openLabel: (artisan: string) => `Annuler ma demande à ${artisan}`,
      title: "Annuler votre demande ?",
      intro: (artisan: string) =>
        `${artisan} sera prévenu et n'aura plus à vous répondre. Vous pourrez solliciter un autre artisan.`,
      submit: "Annuler ma demande",
      done: "Votre demande est annulée.",
    },
    chantier: {
      open: "Annuler le chantier",
      title: "Annuler ce chantier ?",
      intro: (artisan: string) =>
        `Le rendez-vous avec ${artisan} sera annulé et il en sera prévenu. Cette annulation est définitive.`,
      submit: "Annuler le chantier",
      done: "Le chantier est annulé.",
    },
  },
  chantier: {
    back: "Retour",
    // Fiche du chantier côté particulier (refonte « Nette », ADR 0251).
    yourProject: "Votre projet",
    steps: {
      signature: "Signature",
      paiement: "Paiement",
      planification: "Planification",
      travaux: "Travaux",
      reception: "Réception",
    },
    stepsLabel: "Avancement du chantier",
    stepState: { done: "étape franchie", current: "étape en cours", upcoming: "étape à venir" },
    yourArtisan: "Votre artisan",
    yourClient: "Votre client",
    verified: "Artisan vérifié par MENAO",
    call: "Appeler",
    tabsLabel: "Sections du chantier",
    tabs: { suivi: "Suivi du chantier", dossier: "Dossier du chantier" },
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
    depositReceived: "Acompte reçu",
    journal: {
      title: "Suivi du chantier",
      lastUpdate: (ago: string) => `Dernière mise à jour : ${ago}`,
      clientIntro: (artisan: string) =>
        `Vous pourrez suivre ici toutes les photos et messages laissés par ${artisan} concernant votre chantier.`,
      clientWaiting: (artisan: string) =>
        `Le suivi de chantier débutera dès que ${artisan} commencera les travaux.`,
      clientEmpty: (artisan: string) =>
        `Les photos et messages du chantier laissés par ${artisan} seront affichés ici.`,
      artisanIntro: (client: string) =>
        `Ajoutez des photos et des messages pour que ${client} puisse suivre son chantier.`,
      artisanLocked:
        "Vous pourrez ajouter des photos et des messages sur ce chantier une fois celui-ci en cours.",
      seePhotos: (n: number) => (n <= 1 ? "Voir la photo" : `Voir les ${n} photos`),
      photosTitle: "Photos du chantier",
      photoAlt: (i: number, n: number) => `Photo du chantier ${i} sur ${n}`,
      you: "Vous",
      messageLeft: (ago: string) => `Message laissé ${ago}`,
      showAllMessages: "Afficher tous les messages",
      showFewerMessages: "Afficher moins de messages",
      close: "Fermer",
    },
    next: {
      title: "Prochaine intervention",
      appointmentOn: (day: string, time: string) => `Rendez-vous le ${day} à ${time}`,
      startOn: (day: string, time: string) => `Démarrage le ${day} à ${time}`,
      addToCalendar: "Ajouter à mon agenda",
      google: "Ajouter à Google Agenda",
      outlook: "Ajouter à Outlook",
      apple: "Ajouter à Calendrier",
      newTab: "(nouvel onglet)",
      close: "Fermer",
    },
    dossier: {
      documents: "Documents liés",
      quote: "Devis",
      signedQuote: "Devis signé",
      invoice: {
        acompte: "Facture d'acompte",
        demarrage: "Facture d'acompte (démarrage)",
        solde: "Facture de solde",
      },
      meta: (numero: string, date: string) => `${numero} · ${date}`,
      openPdf: "PDF, nouvel onglet",
      // Refonte « Nette » (ADR 0256) : Mes documents.
      count: (n: number) => (n <= 1 ? `${n} document` : `${n} documents`),
      kinds: { devis: "Devis", facture: "Facture", pv: "PV" },
      noDocuments: "Les documents du chantier (devis, factures) apparaîtront ici.",
      schedule: "Échéancier de paiement",
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
      // Paiement au démarrage (F-146, lot 40).
      startChip: "Travaux commencés",
      startTitle: "Paiement au démarrage",
      startText: (percent: number) =>
        `Votre artisan a prévu ${percent} % au démarrage des travaux.`,
      payNow: "À payer maintenant",
      total: "Total du chantier",
      pay: "Payer maintenant",
    },
    reception: {
      validate: "Valider la réception du chantier",
      addReserves: "Ajouter des réserves sur ce chantier",
      conformTitle: "Tout est conforme ?",
      conformText: (artisan: string) =>
        `En validant la réception, vous confirmez que les travaux de ${artisan} sont terminés et ne présentent aucune malfaçon visible.`,
      important: "Information importante :",
      conformNext: (balance: string) =>
        `vous allez signer le procès-verbal de réception. Le solde de ${balance} vous sera demandé ensuite.`,
      signPv: "Signer le PV de réception",
      back: "Retour",
      close: "Fermer",
      reservesQuestion: "Un détail vous semble incomplet ou une finition nécessite une retouche ?",
      reservesText: (artisan: string) =>
        `En ajoutant des réserves, vous pourrez lister les points que ${artisan} doit corriger pour finaliser parfaitement votre projet. Ces réserves seront inscrites sur votre PV de réception et ${artisan} en sera immédiatement informé pour intervenir.`,
      addReservesSubmit: "Ajouter des réserves",
      processing:
        "Signature reçue : son enregistrement est en cours. Actualisez la page dans quelques instants.",
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
      lifted: "Levée des réserves confirmée.",
      balanceProcessing:
        "Paiement reçu : sa confirmation est en cours. Actualisez la page dans quelques instants.",
      closed: (date: string) => `Vous avez finalisé le paiement de ce chantier le ${date}`,
    },
    reviewInvite: {
      title: (artisan: string) => `Noter ${artisan} pour son chantier`,
      text: (artisan: string) =>
        `Vous avez fait confiance à ${artisan} pour votre chantier. D'autres personnes pourraient faire appel à ses services : prenez un court instant pour noter son intervention et aider la communauté MENAO à choisir les meilleurs artisans.`,
      cta: (artisan: string) => `Noter ${artisan}`,
    },
    report: "Signaler un problème lié au chantier",
    chooseAnother: "Choisir un autre artisan",
  },
  reception: {
    title: "Réception des travaux",
    back: "Retour au chantier",
    stepsLabel: "Étapes de la réception",
    steps: {
      reserves: "Ajout des réserves",
      pv: "Signature du PV",
      solde: "Paiement du solde",
      avis: "Votre avis",
    },
    reservesTitle: "Ajouter des réserves",
    reservesHelp: (artisan: string) =>
      `Décrivez ici les points que ${artisan} doit corriger pour finaliser votre projet. Ces réserves seront inscrites sur votre PV de réception et ${artisan} en sera immédiatement informé.`,
    reservesLabel: "Vos réserves",
    reservesPlaceholder:
      "Ex. : peinture à retoucher sur la plinthe, prise de courant mal fixée, nettoyage de fin de chantier à compléter…",
    reservesTooShort: "Décrivez vos réserves en 10 caractères au moins.",
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
  balance: {
    title: "Paiement du solde",
    back: "Retour au chantier",
    intro:
      "Réglez le solde de votre chantier. Le paiement est fait directement à l'entreprise de l'artisan, par Stripe.",
    // Refonte « Nette » (ADR 0256).
    summaryTitle: "Votre chantier",
    paid: "Montant déjà payé",
    today: "Montant à payer aujourd'hui",
    total: "Total du chantier",
    beneficiary: (name: string) => `Bénéficiaire : ${name}`,
    direct: "Le solde est versé directement à l'entreprise, dès la réception de votre paiement.",
    submit: (amount: string) => `Payer ${amount}`,
    submitting: "Ouverture du paiement…",
    unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
    inProgress: "Votre paiement du solde est en cours de confirmation.",
  },
  /** Paiement au démarrage des travaux (F-146, maquette lot 40). */
  startPayment: {
    title: "Paiement au démarrage",
    back: "Retour au chantier",
    intro:
      "Les travaux ont commencé : réglez la part prévue au démarrage. Le paiement est fait directement à l'entreprise de l'artisan, par Stripe.",
    chip: "Travaux commencés",
    started: (date: string | null, percent: number) =>
      `${date ? `Les travaux ont commencé le ${date}.` : "Les travaux ont commencé."} Votre artisan a prévu ${percent} % au démarrage.`,
    scheduleTitle: "Échéancier",
    steps: {
      signature: "Signature",
      demarrage: "Démarrage des travaux",
      reception: "Réception",
    },
    depositPaid: (amount: string) => `Acompte payé · ${amount}`,
    depositDue: (amount: string) => `Acompte · ${amount}`,
    noDeposit: "Sans acompte",
    startNow: (amount: string) => `À payer aujourd'hui · ${amount}`,
    balance: (amount: string) => `Solde · ${amount}`,
    today: "Montant à payer aujourd'hui",
    beneficiary: (name: string) => `Bénéficiaire : ${name}`,
    secure:
      "Paiement sécurisé par Stripe, versé directement à l'entreprise. MENAO ne prend aucune commission.",
    submit: (amount: string) => `Payer ${amount}`,
    submitting: "Ouverture du paiement…",
    unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
    inProgress: "Votre paiement au démarrage est en cours de confirmation.",
  },
  /** Maquette « Mes chantiers - Modale » : fenêtre de l'application mobile (QR code). */
  appDownload: {
    title: "Suivez tous vos chantiers, depuis votre poche.",
    features: [
      "Recherchez et échangez facilement avec un artisan",
      "Signature de devis et factures rapides",
      "Suivi détaillé de chaque étape de vos chantiers",
    ],
    qrAlt: "QR code de l'application MENAO",
    scan: "Scannez avec votre téléphone",
    appStore: "Télécharger dans l'App Store",
    playStore: "Disponible sur Google Play",
    close: "Fermer",
  },
  messages: {
    title: "Messages",
    subtitleClient: "Vos échanges avec vos artisans, chantier par chantier.",
    subtitlePro: "Vos échanges avec vos clients, chantier par chantier.",
    emptyClient:
      "Aucun message pour le moment. Écrivez à votre artisan depuis la page de votre chantier (bouton « Message »).",
    emptyPro:
      "Aucun message pour le moment. Écrivez à votre client depuis la fiche du chantier (bouton « Message »).",
    unread: (n: number) => (n <= 1 ? "1 message non lu" : `${n} messages non lus`),
    you: "Vous : ",
    photo: "Photo",
    file: "Document PDF",
    hiddenPreview: "Message masqué",
    closedTag: "Conversation fermée",
    back: "Messages",
    seeChantier: "Voir le chantier",
    // Vue en deux colonnes de l'espace pro (refonte « Nette », ADR 0249).
    search: "Rechercher un client, un chantier…",
    searchLabel: "Rechercher une conversation",
    filtersLabel: "Filtrer les conversations",
    all: "Tous",
    unreadFilter: "Non lus",
    noMatch: "Aucune conversation ne correspond.",
    pick: "Choisissez une conversation pour la lire ici.",
    call: (name: string) => `Appeler ${name}`,
    conversation: (name: string) => `Conversation avec ${name}`,
    noMessages: (name: string) =>
      `Aucun message pour l'instant : écrivez à ${name} pour préparer votre chantier.`,
    today: "Aujourd'hui",
    yesterday: "Hier",
    read: "Lu",
    hidden: "Message masqué par l'équipe MENAO.",
    openPhoto: "Photo envoyée (ouvrir dans un nouvel onglet)",
    openFile: "Document PDF (ouvrir dans un nouvel onglet)",
    composerLabel: "Votre message",
    composerPlaceholder: "Écrivez votre message…",
    send: "Envoyer",
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
    attach: "Joindre une photo ou un PDF",
    uploading: "Envoi de la pièce jointe…",
    closed: "Conversation fermée : le chantier a été annulé ou le devis refusé.",
    attachErrors: {
      too_large: "Fichier trop lourd : 10 Mo au plus.",
      invalid_type: "Format non pris en charge : photo JPEG ou PNG, ou document PDF.",
      locked: "Cette conversation est fermée.",
      limit: "Nombre maximal de pièces jointes atteint pour ce chantier.",
      rate_limited: "Trop d'envois : réessayez dans un moment.",
      failed: "La pièce jointe n'a pas pu être envoyée. Réessayez.",
    },
    report: "Signaler ce message",
    reportLabel: "Motif du signalement",
    reportHint:
      "Propos injurieux, demande de paiement hors MENAO, spam… L'équipe MENAO examinera le message.",
    reportSubmit: "Envoyer le signalement",
    reportCancel: "Annuler",
    reportSent: "Signalement envoyé à l'équipe MENAO. Merci.",
    button: "Message",
    writeClient: "Écrire au client",
  },
  clientApp: {
    home: "MENAO, mes chantiers",
    search: "Décrivez votre besoin de travaux…",
    searchLabel: "Démarrer un chantier : décrivez votre besoin",
    account: "Mon compte",
    chantiers: "Mes chantiers",
    documents: "Mes documents",
    messagesLink: "Messages",
    notifications: "Notifications",
    help: "Aide et contact",
    signOut: "Me déconnecter",
  },
  appShell: {
    skip: "Aller au contenu",
    collapse: "Réduire le menu",
    expand: "Déplier le menu",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    messages: (n: number) => (n === 0 ? "Messages" : `Messages : ${n} non lu${n > 1 ? "s" : ""}`),
    spaces: {
      client: "Espace client",
      pro: "Espace pro",
      admin: "Back-office",
      exemples: "Exemples",
      commercial: "Espace commercial",
    },
    /** Étiquette du menu quand le bouton de repli la côtoie (ADR 0262). */
    spacesShort: {
      client: "Espace client",
      pro: "Espace pro",
      admin: "Back-office",
      exemples: "Exemples",
      commercial: "Commercial",
    },
    nav: {
      client: "Navigation de mon espace",
      pro: "Navigation de l'espace pro",
      admin: "Navigation du back-office",
      exemples: "Navigation des exemples",
      commercial: "Navigation de l'espace commercial",
    },
    sections: {
      activity: "Activité",
      profile: "Profil",
      account: "Mon compte",
      // Rubrique « Mon profil » de l'espace pro, sous les autres (ADR 0188).
      proAccount: "Compte",
      tools: "Pilotage",
      // Back-office par pôle (ADR 0133), rangé en six sections (ADR 0283).
      verification: "Vérification",
      support: "Support",
      money: "Argent",
      settings: "Réglages",
      artisans: "Artisans",
      clients: "Clients et chantiers",
      growth: "Croissance",
      system: "Système",
    },
    help: "Aide et support",
    toDo: (n: number) => (n === 1 ? "1 élément à traiter" : `${n} éléments à traiter`),
    badge: (n: number) => (n > 99 ? "99+" : String(n)),
    visibility: {
      visible: "Profil visible",
      visibleText: "Les particuliers de votre zone peuvent vous envoyer leurs demandes.",
      hidden: "Profil masqué",
      hiddenText: "Pour apparaître dans les recherches, il reste :",
    },
    availability: {
      disponible: "Disponible",
      pause: "En pause",
      conges: (until: string) => `En congés jusqu'au ${until}`,
      aPartirDu: (date: string) => `Nouveaux chantiers à partir du ${date}`,
      hiddenText: "Vous n'apparaissez plus dans les recherches.",
      manage: "Gérer mes disponibilités",
    },
  },
  documentLogo: {
    alt: (name: string) => `Logo de ${name}`,
  },
  clientDocuments: {
    title: "Mes documents",
    subtitle: "Devis signés, factures et procès-verbaux de vos chantiers.",
    empty: "Vos documents (devis signés, factures, PV de réception) apparaîtront ici.",
    figuresLabel: "Vos documents en chiffres",
    figQuotes: "Devis signés",
    figInvoices: "Factures",
    figReceptions: "PV de réception",
  },
  notificationCenter: {
    title: "Notifications",
    subtitle: "Les dernières nouvelles de vos demandes et de vos chantiers.",
    empty: "Aucune notification pour le moment.",
    // Refonte « Nette » (ADR 0258).
    today: "Aujourd'hui",
    earlier: "Plus tôt",
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
  dispute: {
    reportTitle: "Signaler un problème",
    back: "Retour au chantier",
    // Refonte « Nette » (ADR 0255) : à droite du formulaire.
    chantierLabel: "Chantier",
    nextTitle: "Ce qui se passe ensuite",
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
    descriptionHint: "20 caractères au moins. Vous pourrez ajouter des photos ensuite.",
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
    photoAlt: (i: number) => `Photo du signalement ${i}`,
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
  },
  review: {
    pageTitle: "Votre avis",
    back: "Retour au chantier",
    title: (artisan: string) => `Comment s'est passée votre expérience avec ${artisan} ?`,
    intro:
      "Partagez votre expérience pour aider la communauté MENAO à faire le bon choix pour leurs chantiers.",
    yourArtisan: "Votre artisan",
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
    seeProfile: (artisan: string) => `Voir la fiche de ${artisan}`,
  },
  clientQuote: {
    back: "Mon espace",
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
    // Refonte « Nette » (ADR 0251) : total et échéancier à droite.
    totalTtc: "Total TTC",
    totalHt: "Total HT",
    totalTva: "TVA",
    toPay: "À payer",
    trancheSignature: (percent: number) => `Acompte à la signature · ${percent} %`,
    trancheDemarrage: (percent: number) => `Au démarrage des travaux · ${percent} %`,
    trancheReception: "Solde à la réception",
    // Devis sans acompte (F-146, maquette lot 40).
    noDeposit: {
      chip: "Sans acompte",
      title: "Rien à payer à la signature",
      text: (amount: string) => `Vous payez tout à la réception des travaux : ${amount}.`,
      next: "Après la signature, votre artisan fixe tout de suite la date des travaux.",
    },
    // Échéancier accepté à la signature (case « échéancier »), tranche par tranche.
    scheduleParts: {
      signature: (amount: string) => `acompte de ${amount} à la signature`,
      demarrage: (amount: string) => `${amount} au démarrage des travaux`,
      reception: (amount: string) => `solde de ${amount} à la réception des travaux`,
      noDeposit: "sans acompte",
    },
    document: "Contenu du devis",
    viewPdf: "Voir le PDF",
    newTab: "(nouvel onglet)",
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
    depositInvoice: (numero: string) => `Facture d'acompte ${numero} (PDF)`,
    depositAdvice: (percent: number) =>
      `Conseil MENAO : l'acompte demandé est de ${percent} %. Nous vous conseillons de ne pas verser plus de 30 % du montant avant le début des travaux. N'hésitez pas à en parler avec l'artisan.`,
    depositInProgress:
      "Votre paiement de l'acompte est en cours de confirmation par Stripe (virement ou prélèvement en attente).",
    paymentReturned:
      "Merci ! Votre paiement est en cours de confirmation : actualisez la page dans quelques instants.",
    deposit: {
      title: "Paiement de l'acompte",
      intro:
        "L'acompte est versé directement à l'artisan, sur son compte Stripe. MENAO ne perçoit aucune commission.",
      start: (date: string) => `Démarrage prévu le ${date}`,
      // Refonte « Nette » (ADR 0256).
      scheduleTitle: "Votre échéancier",
      today: "À payer aujourd'hui",
      later: "À la réception des travaux",
      beneficiary: (name: string) => `Bénéficiaire : ${name}`,
      methods: "Carte bancaire, Apple Pay ou Google Pay, selon les moyens acceptés par l'artisan.",
      secure: "Paiement sécurisé par Stripe",
      submit: (amount: string) => `Payer ${amount}`,
      submitting: "Ouverture du paiement…",
      unavailable: "Le paiement est momentanément indisponible. Réessayez dans un instant.",
    },
    downloadSigned: "Télécharger le devis signé",
    signatureReturned:
      "Merci ! Votre signature est en cours d'enregistrement : actualisez la page dans quelques instants.",
    signature: {
      title: "Signature du devis",
      tabs: {
        label: "Étapes de la signature",
        sign: "Signature du devis",
        deposit: "Paiement de l'acompte",
      },
      intro:
        "Vérifiez le devis et cochez les cases ci-dessous : vous signerez ensuite chez notre prestataire de signature électronique, DocuSeal.",
      summary: (numero: string, amount: string) => `Devis n° ${numero} · ${amount} TTC`,
      start: (date: string) => `Début prévisionnel des travaux : ${date}`,
      consents: {
        document: "J'ai lu et j'accepte le devis.",
        cgu_prestataire:
          "J'accepte les conditions d'utilisation de DocuSeal, prestataire de signature électronique.",
        cgu_menao:
          "J'accepte les conditions générales d'utilisation et la politique de confidentialité de MENAO.",
        echeancier: (schedule: string) => `J'accepte l'échéancier : ${schedule}.`,
      },
      links: {
        provider: "Conditions DocuSeal",
        terms: "CGU",
        privacy: "Confidentialité",
      },
      otp: "Un code à usage unique vous sera demandé pour confirmer votre identité.",
      submit: "Signer le devis",
      submitting: "Ouverture de la signature…",
      unavailable:
        "La signature électronique est momentanément indisponible. Réessayez dans un instant.",
      depositNext: "Le paiement de l'acompte vous sera proposé après la signature.",
    },
    revision: {
      title: "Demander une modification",
      intro:
        "Expliquez à l'artisan ce que vous souhaitez changer : il vous enverra une nouvelle version du devis.",
      label: "Modification souhaitée",
      submit: "Envoyer la demande",
      done: "Votre demande a été envoyée à l'artisan.",
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
      comment: "Message pour l'artisan",
      optional: "(facultatif)",
      submit: "Refuser le devis",
      done: "Vous avez refusé le devis.",
    },
    backToQuote: "Retour au devis",
  },
  /** Page de retour après une signature ou un paiement ouverts depuis l'application (ADR 0060). */
  /** Aperçu de la zone d'intervention sur le Plan IGN (ADR 0126, 0127). */
  zoneMap: {
    // Source du Plan IGN, exigée par la Licence Ouverte.
    credit: "© IGN",
  },
  appReturn: {
    title: "Retour à l'application",
    states: {
      signature: "Merci\u00a0! Votre signature est en cours d'enregistrement.",
      reception: "Merci\u00a0! Votre signature du PV est en cours d'enregistrement.",
      paiement: "Merci\u00a0! Votre paiement est en cours de confirmation.",
      annule: "Le paiement n'a pas été effectué.",
      connect: "Merci\u00a0! L'état de votre compte de paiement est en cours de mise à jour.",
      connect_expire: "Le lien Stripe a expiré : reprenez la configuration depuis l'application.",
    },
    redirecting: "Retour à l'application MENAO…",
    open: "Ouvrir l'application MENAO",
    site: "Continuer sur le site",
    invalid: "Ce lien de retour n'est pas valide.",
    mySpace: "Aller à mon espace",
  },
  agenda: {
    summary: (title: string) => `Rendez-vous MENAO : ${title}`,
    startSummary: (title: string) => `Démarrage des travaux : ${title}`,
    feedName: "MENAO",
    visitSummary: (title: string) => `Visite : ${title}`,
    blockedSummary: (label: string | null) => (label ? `Occupé : ${label}` : "Occupé"),
    absenceSummary: (label: string | null) => (label ? `Absent : ${label}` : "Absent"),
    feedDescription: (url: string) => `Détails sur MENAO : ${url}`,
    description: (artisan: string | null, client: string | null) =>
      [artisan && `Artisan : ${artisan}`, client && `Client : ${client}`, "Suivi sur MENAO"]
        .filter(Boolean)
        .join("\n"),
  },
  mySpace: {
    role: "Type de compte",
    signOut: "Me déconnecter",
  },
  exchanges: {
    title: "Mes échanges avec MENAO",
    intro:
      "Vos messages à l'équipe MENAO et ses réponses : page Contact, dossiers de recherche, signalements et demande de suppression du compte.",
    empty: "Aucun échange pour le moment.",
    emptyHint: "Une question ? Écrivez-nous depuis la page Contact : la réponse arrivera ici.",
    write: "Écrire à l'équipe MENAO",
    types: {
      contact: "Message",
      dossier_recherche: "Dossier de recherche",
      litige: "Signalement sur un chantier",
      suppression_compte: "Suppression du compte",
      avis: "Avis signalé",
      message: "Message signalé",
      expertise: "Expertise signalée",
      recompense: "Récompense MENAO",
      demande_sans_reponse: "Demande sans réponse",
      faux_particulier: "Signalement d'un faux particulier",
      invitation_artisan: "Invitation d'un artisan",
    },
    statuses: { ouvert: "En attente de réponse", en_cours: "Réponse de l'équipe", resolu: "Clos" },
    untitled: "Sans objet",
    sentOn: (date: string) => `Envoyé le ${date}`,
    lastReply: (date: string) => `Dernière réponse le ${date}`,
    back: "Mes échanges avec MENAO",
    yourMessage: "Votre message",
    thread: "Échanges avec l'équipe MENAO",
    you: "Vous",
    support: "Équipe MENAO",
    noMessages: "L'équipe MENAO vous répondra ici.",
    messageLabel: "Votre message à l'équipe MENAO",
    messageSubmit: "Envoyer",
    closed:
      "Cet échange est clos. Pour une nouvelle question, écrivez-nous depuis la page Contact.",
  },
  account: {
    title: "Mon compte",
    intro:
      "Vos informations, votre adresse e-mail, votre mot de passe et vos données personnelles.",
    // Refonte « Nette » (ADR 0258) : rubriques à gauche.
    rubricsLabel: "Rubriques du compte",
    proNav: "Paramètres du compte",
    profile: {
      title: "Mes informations",
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Téléphone",
      phoneOptional: "(facultatif)",
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
      confirmed: "C'est noté : votre adresse e-mail est confirmée.",
      partial:
        "Premier lien confirmé : ouvrez aussi le lien envoyé à votre autre adresse pour terminer le changement.",
      same: "C'est déjà l'adresse de votre compte.",
      taken: "Cette adresse est déjà utilisée par un autre compte.",
    },
    password: {
      title: "Mot de passe",
      current: "Mot de passe actuel",
      new: "Nouveau mot de passe",
      hint: "8 caractères minimum.",
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
      save: "Enregistrer mes choix",
      subscribed: "C'est noté : vous recevrez les actualités de MENAO.",
      unsubscribed: "C'est noté : vous ne recevrez plus les actualités de MENAO.",
      notifications: "Choisir les e-mails de suivi",
    },
    data: {
      title: "Mes données",
      intro:
        "Téléchargez une copie de vos données personnelles, dans un fichier lisible par ordinateur (JSON) : compte, demandes, chantiers, devis, paiements, messages et avis.",
      download: "Télécharger mes données",
    },
    deletion: {
      title: "Supprimer mon compte",
      intro:
        "L'équipe MENAO traite votre demande sous un mois et vous écrit à l'adresse de votre compte. Certains documents liés à vos chantiers, comme les factures, doivent être conservés pendant une durée fixée par la loi.",
      open: "Demander la suppression de mon compte",
      message: "Une remarque ?",
      messageNote: "(facultatif)",
      confirm: "Je demande la suppression de mon compte MENAO.",
      submit: "Envoyer ma demande",
      sent: "Votre demande est enregistrée : l'équipe MENAO vous répond sous un mois.",
      pending: (date: string) =>
        `Demande de suppression envoyée le ${date}. L'équipe MENAO vous répond sous un mois à l'adresse de votre compte.`,
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
  },
  roles: {
    particulier: "Particulier",
    artisan: "Artisan",
    artisan_en_attente: "Artisan (vérification en cours)",
    admin: "Administrateur MENAO",
    support: "Support MENAO",
    commercial: "Commercial MENAO",
    verification: "Vérification MENAO",
    visiteur: "Visiteur",
  },
  legal: {
    eyebrow: "Informations légales",
    navTitle: "Informations légales",
    draftBadge: "Version provisoire",
    draftTitle: "Document en cours de rédaction",
    draftBody:
      "Ce document est en cours de validation juridique. Sa version définitive sera publiée avant l'ouverture du service.",
    terms: "Conditions générales d'utilisation",
    privacy: "Politique de confidentialité",
    cgv: "Conditions générales de vente artisans",
  },
  pro: {
    /** Gamification artisan (F-24) : maquettes « Mon grade Menao », mêmes textes que l'application. */
    /** Notation du client par l'artisan (F-23, ADR 0106). */
    clientRating: {
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
      saved: "Merci, votre note est enregistrée.",
      reputationTitle: "Ce client sur MENAO",
      reputation: (n: number) =>
        n === 1
          ? "Noté par 1 artisan après un chantier."
          : `Noté par ${n} artisans après leurs chantiers.`,
    },
    /** Charte qualité demandée à un artisan déjà inscrit (ADR 0109), en tutoiement comme la charte. */
    charterRenewal: {
      title: "Charte qualité MENAO",
      intro:
        "Nouveau : la charte qualité MENAO. Prends quelques minutes pour la lire et la signer, ton espace pro s'ouvre juste après.",
      continue: "Accéder à mon espace pro",
    },
    /** Score MENAO de l'artisan (ADR 0155), critère par critère, avec les points à gagner. */
    score: {
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
      learnMore: "Comprendre le classement",
    },
    grade: {
      title: "Mon grade MENAO",
      subtitle: "Vos objectifs, vos badges et vos récompenses.",
      xp: (xp: number, next: number | null) =>
        next === null ? `${xp}\u00a0XP` : `${xp} / ${next}\u00a0XP`,
      level: (n: number) => `Niv. ${n}`,
      levelLong: (n: number) => `Niveau ${n}`,
      yourLevel: "Votre niveau",
      maxLevel: "Niveau maximal atteint",
      nextReward: "Prochaine récompense de niveau :",
      outfitAlt:
        "Illustration de l'ensemble de chantier MENAO : veste et pantalon bleus, logo brodé",
      /** La tenue n'existe pas encore : le dessin est indicatif (aucune promesse sur son aspect). */
      illustrationNote: "Illustration : la tenue définitive peut différer.",
      rewardReady: "Votre récompense vous attend\u00a0!",
      claim: "Réclamer ma récompense",
      claimed: "Récompense demandée : l'équipe MENAO prépare son envoi.",
      tabs: { objectives: "Mes objectifs", badges: "Mes badges MENAO" },
      tabsLabel: "Mon grade",
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
      newBadgeShort: "Nouveau badge\u00a0!",
      newBadge: {
        title: "Nouveau badge MENAO débloqué\u00a0!",
        congrats: "MENAO vous félicite\u00a0!",
        continue: "Continuer sur MENAO",
      },
      reward: {
        waiting: "Votre récompense vous attend\u00a0!",
        title: (name: string | null) =>
          name ? `Félicitations, ${name}\u00a0!` : "Félicitations\u00a0!",
        intro: (level: number) =>
          `Vous avez atteint le niveau ${level} sur MENAO. Votre excellence est désormais reconnue par toute la communauté.`,
        sizesTitle: "Sélectionnez votre taille pour l'envoi",
        jacket: "Veste",
        pants: "Pantalon",
        delivery: "Adresse de livraison",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        countryDefault: "France",
        phone: "Numéro de téléphone",
        submit: "Recevoir ma récompense",
        note: "Envoi organisé par l'équipe MENAO, qui vous recontacte si besoin.",
        done: "Demande envoyée : l'équipe MENAO prépare votre récompense.",
        // Maquette du lot 37 : récompense en grand en haut de « Mon grade ».
        levelReached: (level: number) => `Niveau ${level} atteint`,
        companyAddress: "Adresse de votre entreprise",
        editAddress: "Modifier l'adresse",
      },
    },
    space: {
      grade: "Mon grade MENAO",
      dashboard: "Tableau de bord",
      requests: "Demandes",
      chantiers: "Chantiers",
      agenda: "Agenda",
      reviews: "Avis",
      publicProfile: "Ma fiche",
      myProfile: "Mon profil",
      quotes: "Devis",
      messages: "Messages",
      file: "Mon dossier",
      signOut: "Me déconnecter",
      account: "Mon compte",
      // Menu regroupé (ADR 0188) : accueil, argent (devis, factures, dépenses), vitrine.
      home: "Accueil",
      money: "Argent",
      storefront: "Ma vitrine",
      // Rubrique de la secrétaire dédiée (ADR 0244).
      secretary: "Secrétaire",
      moneyTabs: {
        devis: "Devis",
        factures: "Factures",
        depenses: "Dépenses",
        bibliotheque: "Bibliothèque",
        suivi: "Suivi",
      },
      moneyIntro: "Vos devis, factures, dépenses et vos prix, au même endroit.",
      // Lot 40 (F-146) : réglage de l'échéancier par défaut, depuis l'en-tête d'Argent.
      moneyAction: { label: "Mes paiements", slug: "paiements" },
      storefrontTabs: { profil: "Ma fiche", avis: "Avis", grade: "Mon grade" },
      storefrontIntro: "Ce que voient les particuliers quand ils vous cherchent.",
    },
    /** Exemples de l'espace (ADR 0184) : données fictives, en lecture seule. */
    examples: {
      badge: "Exemple",
      banner: {
        title: "Données d'exemple",
        text: "Les demandes, chantiers et clients de cet espace sont fictifs : rien n'est envoyé et les boutons sont désactivés.",
        more: "En savoir plus",
        backToFile: "Revenir à mon dossier",
        backToSpace: "Revenir à mon espace",
        backToCommercial: "Revenir à mon espace commercial",
      },
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
      onboardingCard: {
        title: "Découvrez votre futur espace",
        text: "Parcourez votre espace avec des demandes et des chantiers d'exemple, en attendant de recevoir les vôtres.",
        open: "Découvrir mon espace",
      },
      locked: "Exemple : les boutons sont désactivés.",
    },
    /**
     * « Mon profil » de l'artisan (ADR 0131), comme dans l'application (ADR 0129) : fiche,
     * entreprise, conformité, argent et compte, avec l'état de chaque rubrique.
     */
    hub: {
      /** Parrainage entre artisans (F-60, ADR 0137 et 0154). */
      referral: {
        title: "Parrainez un confrère",
        lead: "Un mois offert pour vous dès son premier paiement, jusqu'à 12 par an. Votre confrère reçoit un cadeau de bienvenue.",
        linkLabel: "Votre lien de parrainage",
        copy: "Copier le lien",
        copied: "Lien copié",
        joined: (n: number) =>
          n === 0
            ? "Aucun confrère inscrit pour l'instant"
            : `${n} confrère${n > 1 ? "s" : ""} inscrit${n > 1 ? "s" : ""}`,
        thisYear: (n: number, cap: number) =>
          `${n} mois offert${n > 1 ? "s" : ""} sur ${cap} cette année`,
        capped: (cap: number) =>
          `Plafond de ${cap} mois offerts atteint cette année : merci pour vos recommandations\u00a0!`,
        // Réseau du parrain (ADR 0161) : QR code, WhatsApp, score de fidélité, suivi des filleuls.
        qrAlt: "QR code de parrainage",
        whatsApp: "Envoyer par WhatsApp",
        shareMessage: (link: string, code: string) =>
          `Je t'invite sur MENAO, l'outil des artisans du bâtiment : des demandes de particuliers, et devis, signature et paiement au même endroit. Inscris-toi avec mon lien : ${link} (ou mon code ${code}).`,
        loyalty: (n: number) => `Score de fidélité : ${n}`,
        loyaltyHint: "Un point par confrère devenu abonné.",
        listTitle: "Vos filleuls",
        joinedOn: (date: string) => `Inscrit le ${date}`,
        steps: {
          inscription: "Inscription en cours",
          valide: "Dossier validé, en période d'essai",
          abonne: "Abonné : parrainage validé",
          annule: "Non retenu",
        },
      },
      /** Carte de visite et parrainage (ADR 0191), comme dans l'application. */
      share: {
        label: "Montrer ma fiche ou parrainer un confrère",
        tabs: { card: "Ma carte de visite", referral: "Parrainage" },
        expand: "Agrandir",
        close: "Fermer",
        card: {
          qrAlt: "QR code de votre fiche MENAO",
          hint: "Votre client scanne ce code avec l'appareil photo de son téléphone : il voit votre fiche et vos avis vérifiés.",
          shareMessage: (name: string, url: string) =>
            `${name} sur MENAO : ma fiche et mes avis vérifiés. ${url}`,
          print: "Imprimer mes cartes de visite",
        },
        referral: {
          hint: "Votre confrère scanne ce code pour créer son compte MENAO, votre code déjà rempli. Ou il saisit le code à l'inscription.",
          orCode: "ou le code",
        },
        fullscreen: {
          referral: "Rejoignez MENAO",
          cardHint: "Scannez pour voir ma fiche et mes avis vérifiés.",
          referralHint: "Scannez pour créer votre compte avec mon code.",
        },
      },
      /** Cadeau de bienvenue du filleul (F-60, ADR 0154). */
      welcomeGift: {
        title: "Votre cadeau de bienvenue",
        lead: (referrer: string) =>
          `${referrer} vous a recommandé MENAO. Choisissez votre cadeau : nous vous l'envoyons.`,
        itemLegend: "Votre cadeau",
        items: { tshirt: "T-shirt MENAO", casquette: "Casquette MENAO" } as Record<
          "tshirt" | "casquette",
          string
        >,
        sizeLegend: "Taille du t-shirt",
        delivery: "Adresse de livraison",
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
        // Maquette du lot 37 : grands choix illustrés, adresse en résumé, suivi de l'envoi.
        companyAddress: "Adresse de votre entreprise",
        editAddress: "Modifier l'adresse",
        statusPending: "En préparation",
        statusSent: "Envoyé",
        stepsLabel: "Suivi de votre cadeau",
        steps: {
          chosen: "Choisi",
          preparing: "En préparation",
          preparingHint: "Par l'équipe MENAO",
          sent: "Envoyé",
          sentLater: "La date s'affichera ici",
          sentOn: (date: string) => `Le ${date}`,
        },
      },
      title: "Mon profil",
      lead: "Tout ce qui concerne votre fiche, votre entreprise et votre compte, avec ce qui reste à faire.",
      seeProfile: "Voir ma fiche",
      changePhoto: "Changer ma photo de profil",
      strength: (percent: number) => `Fiche complète à ${percent} %`,
      complete: "Votre fiche est complète",
      completeHint: "Elle donne aux particuliers toutes les raisons de vous choisir.",
      // Refonte « Nette », lot 5 (ADR 0250).
      nextStep: "Prochaine étape",
      businessCard: "Carte de visite",
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
        `Score ${percent} % · ${count === 1 ? "1 avis" : `${count} avis`}`,
      status: {
        brouillon: "Dossier à compléter",
        en_verification: "Dossier en vérification",
        refuse: "Dossier à corriger",
        suspendu: "Profil suspendu",
        radie: "Entreprise radiée",
      },
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
        logo: "Logo sur vos documents",
        trades: "Métiers et certifications",
        zone: "Zone d'intervention",
        availability: "Disponibilités",
        team: "Mon équipe",
        documents: "Documents",
        charter: "Charte qualité",
        payments: "Paiements",
        subscription: "Abonnement",
        invoices: "Factures",
        identity: "Identité et connexion",
        notifications: "Notifications",
        help: "Aide et contact",
        businessCards: "Cartes de visite clients",
        examples: "Voir des données d'exemple",
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
        logoAdded: "Ajouté",
        logoToAdd: "À ajouter",
        trades: (n: number, rge: boolean) =>
          `${n === 1 ? "1 métier" : `${n} métiers`}${rge ? " · RGE" : ""}`,
        radius: (km: number) => `${km} km`,
        communes: (n: number) => (n === 1 ? "1 commune" : `${n} communes`),
        departements: (n: number) => (n === 1 ? "1 département" : `${n} départements`),
        regions: (n: number) => (n === 1 ? "1 région" : `${n} régions`),
        france: "Toute la France",
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
        subscriptionActive: "Active",
        subscriptionToChoose: "À choisir",
        team: (used: number, seats: number) => `${used} sur ${seats}`,
        teamNotIncluded: "Premium et Entreprise",
      },
    },
    dashboard: {
      title: "Tableau de bord",
      /** Accueil d'un ouvrier (ADR 0241) : ses rendez-vous et ses chantiers, sans montants. */
      worker: {
        subtitle: (company: string | null) =>
          company ? `Vos chantiers chez ${company}.` : "Vos chantiers.",
        chantiers: "Mes chantiers",
        empty:
          "Aucun chantier ne vous est attribué pour l'instant. Votre patron ou votre chef d'équipe vous l'attribue depuis la fiche du chantier.",
      },
      /** Activité de l'artisan (ADR 0185) : raccourcis, chiffre d'affaires, devis, chantiers. */
      activity: {
        shortcuts: {
          title: "Raccourcis",
          quote: "Préparer un devis",
          block: "Bloquer un créneau",
          share: "Partager ma fiche",
        },
        revenue: {
          title: "Chiffre d'affaires",
          titleYear: (year: number) => `Chiffre d'affaires ${year}`,
          collected: "Encaissé :",
          years: "Année",
          year: (year: number) => `Encaissé en ${year}`,
          upcoming: "À venir",
          upcomingHint: "Reste à payer sur vos devis signés",
          toCollect: "À recevoir",
          toCollectHint: "Soldes des chantiers réceptionnés",
          chart: (year: number) => `Encaissé chaque mois en ${year}`,
          month: "Mois",
          amount: "Encaissé",
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
          all: "Voir mes chantiers",
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
      },
      greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : "Bonjour"),
      /** « Vous avez **2 choses à faire**. » sous la salutation (refonte « Nette », ADR 0245). */
      todoLead: "Vous avez",
      /** Bandeau des trois chiffres de l'argent, en haut de l'accueil (ADR 0245). */
      money: "Argent",
      // « À faire maintenant » (ADR 0131), comme dans l'application (ADR 0130).
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
      upcoming: "À venir",
      openAgenda: "Voir l'agenda",
      noUpcoming: "Aucune visite ni aucun démarrage de chantier à venir.",
      kinds: { visite: "Visite", demarrage: "Démarrage du chantier" },
      latestRequests: "Dernières demandes de devis",
      noRequests: "Aucune nouvelle demande pour le moment.",
      allRequests: "Toutes mes demandes",
      allChantiers: "Tous mes chantiers",
      hiddenProfile: "Votre profil n'est pas encore visible des particuliers.",
      completeFile: "Compléter mon dossier",
      documents: "Mes documents",
    },
    chantiers: {
      title: "Chantiers",
      subtitle: "Vos rendez-vous et vos chantiers en cours.",
      empty:
        "Aucun chantier pour le moment. Fixez un rendez-vous depuis une demande pour créer votre premier chantier.",
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
    },
    agenda: {
      title: "Agenda",
      subtitle:
        "Vos visites, démarrages de chantier, créneaux bloqués et absences, semaine par semaine.",
      tabs: { agenda: "Agenda", availability: "Mes disponibilités" },
      weekdays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
      weekdaysShort: ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."],
      tabsLabel: "Rubriques de l'agenda",
      week: (from: string, to: string) => `Du ${from} au ${to}`,
      previousWeek: "Semaine précédente",
      nextWeek: "Semaine suivante",
      // Téléphone (refonte « Nette », ADR 0249) : bande des jours et jour choisi.
      daysLabel: "Jours de la semaine",
      dayLabel: (day: string, n: number) =>
        `${day}, ${n === 0 ? "rien de prévu" : n === 1 ? "1 rendez-vous" : `${n} rendez-vous`}`,
      dayCount: (n: number) => (n === 0 ? "" : n === 1 ? "1 rendez-vous" : `${n} rendez-vous`),
      later: "Plus tard cette semaine",
      free: (ranges: readonly string[]) =>
        `Libre : ${ranges.length > 1 ? `${ranges.slice(0, -1).join(", ")} et ${ranges[ranges.length - 1]}` : (ranges[0] ?? "")}`,
      upcoming: "À venir",
      upcomingEmpty: "Aucune visite ni aucun démarrage à venir.",
      seeChantier: "Voir le chantier",
      calendarTitle: "Calendrier du téléphone",
      calendarText: "Vos rendez-vous MENAO s'y ajoutent tout seuls.",
      calendarCta: "Brancher mon calendrier",
      thisWeek: "Aujourd'hui",
      allDay: "Journée",
      closed: "Fermé",
      kinds: {
        visite: "Visite",
        demarrage: "Démarrage",
        creneau: "Occupé",
        occupe: "Pris ailleurs",
        absence: "Absent",
      },
      // Détail d'un créneau (ADR 0232) : fenêtre ouverte au clic.
      details: {
        secretaryKind: "RDV client",
        open: (what: string) => `Voir le détail : ${what}`,
        close: "Fermer",
        titles: {
          secretaire: "Rendez-vous pris par votre secrétaire",
          creneau: "Créneau bloqué",
          occupe: "Rendez-vous de votre téléphone",
        } as Record<string, string>,
        when: (day: string, range: string) => `${day} · ${range}`,
        client: "Client",
        phone: "Téléphone",
        city: "Commune",
        reason: "Motif",
        urgent: "Urgent",
        takenAt: (date: string) => `Pris par votre secrétaire ${date}.`,
        label: "Motif",
        noLabel: "Sans motif.",
        phoneBusy:
          "Plage occupée de l'agenda de votre téléphone : elle n'est plus proposée pour vos rendez-vous.",
        call: (phone: string) => `Appeler le ${phone}`,
        messages: "Voir les messages de votre secrétaire",
        release: "Libérer le créneau",
        released: "Créneau libéré.",
      },
      legendLabel: "Légende",
      legend: {
        visite: "Visite chez le client",
        demarrage: "Démarrage de chantier",
        creneau: "Créneau bloqué",
        occupe: "Rendez-vous de votre téléphone",
        absence: "Absence",
        hours: "Vos horaires",
      },
      emptyDay: "Rien de prévu",
      emptyWeek: "Rien de prévu cette semaine.",
      hoursMissing: "Renseignez vos horaires de travail pour les voir dans l'agenda.",
      setHours: "Renseigner mes horaires",
      openChantier: (title: string) => `Ouvrir le chantier « ${title} »`,
      at: (time: string) => `à ${time}`,
      range: (from: string, to: string) => `${from} – ${to}`,
      upcomingAbsence: (period: string) => `Absence prévue ${period}`,
      block: {
        open: "Bloquer un créneau",
        title: "Bloquer un créneau",
        intro:
          "Rendez-vous personnel, chantier hors MENAO… Le créneau s'affiche dans votre agenda et n'est plus proposé pour vos rendez-vous.",
        date: "Date",
        start: "De",
        end: "À",
        label: "Motif",
        labelNote: "(facultatif, visible par vous seul)",
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
      availability: {
        title: "Mes disponibilités",
        intro:
          "Choisissez quand vous recevez de nouvelles demandes, vos horaires de travail, vos absences, et retrouvez votre agenda MENAO dans celui de votre téléphone.",
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
          visibilityHidden:
            "Votre profil n'est pas encore visible : terminez votre dossier pour apparaître dans les recherches.",
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
          label: "Motif",
          labelNote: "(facultatif, visible par vous seul)",
          suggestionsLabel: "Motifs fréquents",
          suggestions: ["Congés", "Formation", "Fermeture annuelle", "Salon professionnel"],
          add: "Ajouter l'absence",
          added: "Absence ajoutée.",
          remove: (period: string) => `Supprimer l'absence ${period}`,
          removed: "Absence supprimée.",
          period: (from: string, to: string) =>
            from === to ? `le ${from}` : `du ${from} au ${to}`,
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
          copy: "Copier le lien",
          copied: "Lien copié",
          google: "Google Agenda",
          apple: "Apple Calendrier",
          outlook: "Outlook",
          addTo: "Ajouter à :",
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
        },
      },
    },
    // Cartes de visite à donner aux clients, avec le QR code de la fiche (ADR 0161).
    businessCards: {
      title: "Cartes de visite pour vos clients",
      intro:
        "Donnez une carte à chaque client, y compris ceux trouvés hors MENAO : le QR code mène à votre fiche, avec vos réalisations et vos avis vérifiés.",
      printHint:
        "Deux pages : les rectos puis les versos, 10 cartes de 85 × 55 mm par feuille A4. Imprimez en recto-verso (bord long), à 100 %, sans mise à l'échelle.",
      printNoDuplex:
        "Sans recto-verso : imprimez la page 1, remettez la feuille dans l'imprimante, puis imprimez la page 2.",
      print: "Imprimer la planche",
      // Refonte « Nette » (ADR 0253).
      printTitle: "Imprimer",
      screenTitle: "Ou montrez-la à l'écran",
      screenText:
        "Dans l'application, Mon profil puis Carte de visite : votre client scanne le QR code avec son téléphone.",
      back: "Mon profil",
      unavailable: "Vos cartes seront disponibles quand votre fiche sera visible des particuliers.",
      qrAlt: "QR code de votre fiche MENAO",
      scan: "Mes réalisations et mes avis vérifiés",
      // Modèles aux couleurs de MENAO (ADR 0263).
      verified: "Artisan vérifié",
      modelTitle: "Modèle",
      // Modèles du lot 39 (ADR 0299), recto et verso.
      models: {
        signature: {
          label: "Signature",
          text: "Le dégradé bleu nuit de MENAO, le symbole en filigrane.",
        },
        sourire: { label: "Sourire", text: "Le sourire du logo traverse la carte en bleu." },
        bleu: { label: "Bleu vif", text: "Tout en bleu MENAO, votre nom en grand." },
        label: { label: "Label", text: "Crème et quadrillé, le sceau « Artisan vérifié »." },
      },
      faces: { recto: "Recto", verso: "Verso" },
      previewTitle: "Votre carte",
      scanHint: "Scannez pour voir ma fiche MENAO et me demander un devis.",
      seal: "ARTISAN VÉRIFIÉ · MENAO · ARTISAN VÉRIFIÉ · MENAO ·",
    },
    publicProfile: {
      // Adresse publique de la fiche, choix pour Google et badge pour son site (F-61, ADR 0144).
      web: {
        title: "Votre fiche sur internet",
        lead: "Votre fiche a sa propre adresse : partagez-la, mettez-la sur vos devis, vos réseaux ou votre site.",
        hidden:
          "Votre fiche aura son adresse publique dès que vous serez visible des particuliers (dossier validé, abonnement et paiements actifs).",
        link: "Adresse de votre fiche",
        open: "Ouvrir ma fiche",
        google: "Afficher ma fiche dans Google",
        googleHint:
          "Recommandé : les particuliers qui cherchent un artisan près de chez eux vous trouvent plus facilement. Votre fiche ne montre jamais votre téléphone, votre e-mail ni votre adresse.",
        googleOff:
          "Votre fiche reste accessible par son adresse, mais Google ne la propose plus. Le retrait peut prendre quelques semaines.",
        save: "Enregistrer",
        saved: "Choix enregistré.",
        badgeTitle: "Badge pour votre site",
        badgeLead:
          "Collez ce code sur votre site : le badge renvoie vers votre fiche et se met à jour tout seul.",
        badgeVerified:
          "Il affiche « Assuré et vérifié par MENAO » tant que vos documents sont à jour.",
        badgeNeutral:
          "Il affichera « Assuré et vérifié par MENAO » dès que votre décennale, votre RC Pro et votre attestation URSSAF seront vérifiées et à jour.",
        badgePreview: "Aperçu du badge",
        badgeCode: "Code du badge",
        copy: "Copier",
        copied: "Copié",
      },
      title: "Ma fiche publique",
      previewTitle: "Aperçu de votre fiche",
      previewVisible:
        "Voici votre fiche telle que la voient les particuliers depuis leurs résultats de recherche.",
      previewHidden:
        "Votre fiche n'est pas encore visible des particuliers. Voici comment elle apparaîtra.",
      previewPaused:
        "Vous êtes en pause : votre fiche n'apparaît plus dans les recherches. Voici comment elle s'affichera à votre retour.",
      previewConges:
        "Vous êtes en congés : votre fiche n'apparaît plus dans les recherches pendant votre absence.",
      completeFile: "Terminer mon dossier",
      manageAvailability: "Gérer mes disponibilités",
      editLabel: "Modifier",
      edit: {
        profil: "Photo, présentation et réalisations",
        metiers: "Métiers, spécialités et certifications",
        zone: "Zone d'intervention",
      },
      ctaHint: "Le bouton que voient les particuliers pour vous envoyer leur demande.",
      tipsTitle: "Pour une fiche plus convaincante",
      tips: {
        assure_verifie: {
          text: "Obtenez le badge «\u00a0Assuré et vérifié\u00a0» : décennale (si vos métiers y sont soumis), RC Pro et attestation URSSAF validées et à jour.",
          action: "Voir mes documents",
        },
        photo_profil: {
          text: "Ajoutez une photo de vous ou votre logo : les particuliers choisissent plus volontiers un visage.",
          action: "Ajouter ma photo",
        },
        realisations: {
          text: "Montrez au moins 3\u00a0photos de chantiers réalisés.",
          action: "Ajouter des photos",
        },
        presentation: {
          text: "Développez votre présentation (300\u00a0caractères ou plus) : spécialités, expérience, secteur.",
          action: "Compléter ma présentation",
        },
        specialites: {
          text: "Indiquez vos spécialités : elles s'affichent sur votre fiche et dans les résultats.",
          action: "Choisir mes spécialités",
        },
        certifications: {
          text: "Ajoutez vos certifications (RGE, Qualibat…) : elles rassurent et apparaissent dans «\u00a0Garanties\u00a0».",
          action: "Ajouter une certification",
        },
      },
      tipsDone:
        "Votre fiche est complète : photo, réalisations, présentation, spécialités et certifications.",
      unavailable: "Votre fiche n'est pas disponible pour le moment.",
      // Refonte « Nette », lot 5 (ADR 0250) : chiffres clés, liste à cocher, cadre d'aperçu.
      figuresLabel: "Chiffres de votre fiche",
      completion: "Fiche complétée",
      completionShort: "complétée",
      completionHint: (n: number) =>
        n === 0
          ? "rien à ajouter"
          : n === 1
            ? "1 étape pour la compléter"
            : `${n} étapes pour la compléter`,
      rating: "Note de vos clients",
      ratingShort: "note",
      ratingHint: (n: number) => (n <= 1 ? `${n} avis vérifié` : `${n} avis vérifiés`),
      noRating: "avec votre premier avis",
      responseTime: "Temps de réponse",
      responseShort: "temps de réponse",
      responseHint: "sur les 6 derniers mois",
      noResponse: "pas encore assez de réponses",
      tipsLead: (n: number) =>
        n === 0
          ? "Tout y est : votre fiche est prête à convaincre."
          : n === 1
            ? "Encore 1 étape pour une fiche plus convaincante."
            : `Encore ${n} étapes pour une fiche plus convaincante.`,
      tipLabels: {
        assure_verifie: "Assuré et vérifié",
        photo_profil: "Photo de profil",
        realisations: "Photos de chantiers",
        presentation: "Présentation",
        specialites: "Métiers et spécialités",
        certifications: "Certifications",
      },
      tipDone: "Fait",
      previewStrip: "Aperçu : votre fiche telle que la voient les particuliers",
    },
    reviews: {
      title: "Mes avis",
      subtitle:
        "Les avis de vos clients après la réception de leur chantier, et leur note moyenne.",
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
      listTitle: "Tous vos avis",
      publishedOn: (date: string) => `Publié le ${date}`,
      chantier: (title: string) => `Chantier « ${title} »`,
      noReply: "Sans réponse",
      hidden: "Masqué",
      seePublic: "Voir ma fiche publique",
      // Refonte « Nette », lot 5 (ADR 0250).
      figuresLabel: "Chiffres de vos avis",
      global: "Note globale",
      globalShort: "note globale",
      globalHint: "moyenne des avis publiés",
      globalEmpty: "dès votre premier avis",
      count: "Avis vérifiés",
      countShort: "avis vérifiés",
      countHint: "sur de vrais chantiers MENAO",
      unanswered: "Sans réponse",
      unansweredShort: "sans réponse",
      unansweredHint: (n: number) =>
        n === 0 ? "vous avez répondu à tout" : "répondre montre votre sérieux",
      filtersLabel: "Filtrer les avis",
      filterAll: "Tous",
      filterUnanswered: "Sans réponse",
      noneUnanswered: "Aucun avis n'attend votre réponse.",
      filterLow: "4 étoiles ou moins",
      noneLow: "Aucun avis à 4 étoiles ou moins.",
    },
    appointment: {
      // Accepter en un toucher (ADR 0222) : créneaux proposés au client, qui en choisit un.
      propose: (n: number) => `Proposer ${n} créneaux`,
      proposeTitle: (name: string | null) =>
        name ? `Proposer des créneaux à ${name}` : "Proposer des créneaux à votre client",
      proposeHint:
        "Votre client choisit l'un de ces créneaux : le rendez-vous est fixé aussitôt, et vos coordonnées sont échangées.",
      proposeLegend: "Vos créneaux libres",
      proposeCount: (n: number) =>
        n < 2 ? "Choisissez 2 ou 3 créneaux." : `${n} créneaux seront proposés.`,
      proposeSubmit: "Proposer ces créneaux",
      proposeSent: "Créneaux envoyés : votre client va choisir.",
      proposeErrors: {
        nombre: "Choisissez 2 ou 3 créneaux différents.",
        passe: "Proposez des créneaux à venir, au moins une heure plus tard.",
        trop_loin: "Les créneaux doivent être dans les 6 prochains mois.",
      },
      proposedTitle: "Créneaux proposés",
      proposedWaiting: (name: string | null) =>
        name ? `En attente du choix de ${name}.` : "En attente du choix de votre client.",
      proposeOther: "Proposer d'autres créneaux",
      title: "Informations du rendez-vous",
      back: "Mes chantiers",
      client: "Client",
      place: "Lieu du rendez-vous",
      reminder: "Rappel du chantier",
      reschedule: "Modifier",
      rescheduleTitle: "Modifier le rendez-vous",
      rescheduleSubmit: "Enregistrer la nouvelle date",
      rescheduled: "Rendez-vous modifié.",
      fixTitle: (name: string | null) =>
        name ? `Fixer un rendez-vous avec ${name}` : "Fixer un rendez-vous",
      date: "Date du rendez-vous",
      time: "Heure d'arrivée estimée",
      fixSubmit: "Envoyer le rendez-vous",
      fixHint: "Le client voit la date dans son espace et vos coordonnées lui sont communiquées.",
      notes: "Notes privées",
      addNotes: "Ajouter des notes",
      editNotes: "Modifier mes notes",
      notesHint: "Visibles par vous seul : code d'accès, matériel à prévoir…",
      saveNotes: "Enregistrer les notes",
      notesSaved: "Notes enregistrées.",
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
      cancelCauseHint:
        "Votre réponse reste entre vous et l'équipe MENAO : le client ne la voit pas.",
      cancelReason: "Message pour le client",
      cancelReasonNote: "(facultatif)",
      cancelConfirm: "Annuler le chantier",
      cancelled: (date: string) => `Chantier annulé le ${date}.`,
      addToCalendar: "Ajouter à mon agenda",
      backToForm: "Retour",
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
    },
    followUp: {
      confirmTitle: "Confirmer la date de démarrage",
      confirm: "Confirmer la date de démarrage",
      edit: "Modifier",
      editTitle: "Modifier la date de démarrage",
      editSubmit: "Enregistrer la nouvelle date",
      saved: "Date de démarrage enregistrée : votre client est informé.",
      startDate: "Date de démarrage",
      startTime: "Heure de démarrage",
      quoteStart: (day: string) => `Date de début prévue au devis : ${day}.`,
      confirmedTitle: "Date de démarrage des travaux confirmée",
      confirmed: (day: string, time: string, client: string) =>
        `Vous avez confirmé le début des travaux le ${day} à ${time}. Une notification a bien été envoyée à ${client}.`,
      dashboard: "Retourner à mon tableau de bord",
      errors: {
        passe: "Choisissez une date et une heure à venir.",
        trop_loin: "Le démarrage doit avoir lieu dans les 12 prochains mois.",
      },
      addPhoto: "Ajouter une photo",
      addPhotos: "Ajouter des photos",
      photosHint: "JPEG ou PNG, 10 photos à la fois, 10 Mo au plus par photo.",
      uploading: (done: number, total: number) => `Envoi des photos : ${done} sur ${total}…`,
      photosAdded: (n: number) =>
        n <= 1
          ? "Photo ajoutée au suivi du chantier."
          : `${n} photos ajoutées au suivi du chantier.`,
      photoErrors: {
        tooMany: "Ajoutez 10 photos au plus à la fois.",
        tooLarge: (name: string) => `« ${name} » dépasse 10 Mo.`,
        failed: (n: number) =>
          n <= 1
            ? "Une photo n'a pas pu être ajoutée. Réessayez."
            : `${n} photos n'ont pas pu être ajoutées. Réessayez.`,
        limit: "Ce chantier a atteint 100 photos.",
        rate_limited: "Trop de photos envoyées en peu de temps : réessayez dans un moment.",
      },
      addMessage: "Ajouter un message",
      messageLabel: "Message pour votre client",
      messageSubmit: "Publier le message",
      messageCancel: "Annuler",
      messageSent: "Message publié.",
      finish: "Déclarer le chantier terminé",
      finishTitle: "Ce chantier est-il terminé ?",
      finishClose: "Fermer",
      finishIntro: (client: string) =>
        `En déclarant ce chantier comme terminé, ${client} recevra une notification l'invitant à réceptionner les travaux.`,
      finishImportant: "Information importante :",
      finishReminder:
        "Avant de déclarer le chantier comme terminé, assurez-vous d'avoir ajouté des photos du chantier une fois terminé.",
      // Refonte « Nette » (ADR 0255) : ce qui suit la fin du chantier.
      finishNext: (client: string) => [
        `${client} réceptionne les travaux et signe le procès-verbal.`,
        "Des réserves peuvent être émises : vous les levez ensuite.",
        "Le solde est réglé, puis la facture de solde est émise.",
      ],
      finished: "Chantier déclaré terminé.",
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
      liftMessage: "Message pour votre client",
      liftMessageNote: "(facultatif)",
      liftSubmit: "Signaler la levée",
      liftSignaled: (client: string, date: string) =>
        `Levée signalée le ${date} : en attente de la confirmation de ${client}.`,
      liftSent: "Levée des réserves signalée à votre client.",
      closed: (date: string, amount: string) =>
        `Chantier clôturé le ${date} : solde de ${amount} reçu, facture de solde émise.`,
      reviewTitle: (client: string) => `Avis de ${client}`,
      reviewPending: (client: string) =>
        `${client} a été invité à donner son avis sur votre intervention. Il sera publié sur votre fiche MENAO.`,
      reviewHidden: (reason: string) => `Avis masqué par l'équipe MENAO : ${reason}`,
      replyLabel: "Votre réponse publique",
      replyHint: "Une seule réponse possible, visible sur votre fiche MENAO sous l'avis.",
      replySubmit: "Publier ma réponse",
      replySent: "Réponse publiée sur votre fiche.",
      yourReply: "Votre réponse",
      yourClientFallback: "votre client",
    },
    quote: {
      title: "Envoyer un devis",
      // Bibliothèque d'ouvrages et marge dans le devis (ADR 0294) : pour l'artisan seul.
      library: {
        heading: "Votre bibliothèque",
        previous: "Vos anciens devis",
        detailed: "détaillé",
        suppliesSuffix: "(fournitures)",
        laborSuffix: "(main d'œuvre)",
        marginTitle: "Votre marge",
        private: "Vous seul",
        counted: (counted: number, total: number) =>
          `Calculée sur ${counted} ligne${counted > 1 ? "s" : ""} sur ${total}.`,
        none: "Ajoutez des ouvrages de votre bibliothèque pour voir votre marge.",
        unknownCost: "Coût inconnu",
        loss: "Vendu à perte",
        lineMargin: (rate: string) => `Marge ${rate}`,
        threshold: (rate: string) => `Votre seuil : ${rate}`,
        below: (rate: string, threshold: string) =>
          `Ce devis vous laisse ${rate} de marge, sous votre seuil de ${threshold}. L'envoi reste possible : vous décidez.`,
        // Maquette du lot 36 : jauge, lignes sans coût, recherche, fenêtre avant l'envoi.
        withoutCost: (n: number) => (n > 1 ? `${n} lignes sans coût.` : "1 ligne sans coût."),
        addCost: "Ajouter leur coût",
        gaugeLabel: "Votre marge sur l'échelle de 0 à 40 %",
        gaugeThreshold: (rate: string) => `votre seuil : ${rate}`,
        costToAdd: "Coût à ajouter",
        elements: (n: number) => (n > 1 ? `${n} éléments` : "1 élément"),
        fromQuotes: "repris de vos devis",
        vatShort: (rate: string) => `TVA ${rate}`,
        confirmTitle: (client: string) => `Envoyer le devis à ${client}`,
        confirmTotal: "Total TTC",
        confirmClient: "votre client",
        belowTitle: (rate: string, threshold: string) =>
          `Ce devis vous laisse ${rate} de marge, sous votre seuil de ${threshold}.`,
        belowText: "L'envoi reste possible : vous décidez.",
        review: "Revoir les prix",
        sendAnyway: "Envoyer quand même",
        privacy: "Le client ne voit ni vos coûts ni votre marge.",
      },
      back: "Rendez-vous",
      statusDraft: "Brouillon",
      statusDirty: "Modifications apportées",
      statusSaved: "Enregistré et à jour",
      save: "Enregistrer",
      generate: "Générer le devis",
      generating: "Génération du devis…",
      saving: "Enregistrement…",
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
      description: "Description",
      optional: "(optionnel)",
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
      unitsShort: {
        u: "u",
        h: "h",
        jour: "j",
        m: "m",
        ml: "ml",
        m2: "m²",
        m3: "m³",
        kg: "kg",
        l: "l",
        forfait: "forfait",
      },
      unitPrice: "Prix unitaire HT",
      hourlyRate: "Taux horaire HT",
      price: "Prix HT",
      totalHt: "Total HT",
      vat: "TVA",
      totalTtc: "Total TTC",
      ttc: "TTC",
      none: "-- €",
      vatExempt: "TVA non applicable, art. 293 B du CGI",
      vatHint:
        "Taux réduits (5,5 % et 10 %) : travaux dans un logement achevé depuis plus de 2 ans, sous conditions.",
      validate: "Valider la ligne",
      cancelLine: "Annuler la ligne",
      edit: (designation: string) => `Modifier « ${designation} »`,
      remove: (designation: string) => `Supprimer « ${designation} »`,
      saved: "Devis enregistré.",
      create: "Créer un devis",
      resume: "Reprendre le devis",
      toReview: "À vérifier",
      tabs: {
        label: "Étapes de l'envoi du devis",
        preview: "Aperçu du devis",
        send: "Envoi du devis",
      },
      next: "Suivant",
      send: {
        title: "Envoi du devis",
        scheduleTitle: "Échéancier de paiement",
        defaultSchedule: "Mon échéancier par défaut",
        customSchedule: "Échéancier personnalisé",
        customHint: "Acompte, démarrage et solde, pour ce devis",
        deposit: "Acompte à la signature (%)",
        // Lot 40 (F-146) : trois tranches, barre et montants en direct.
        customRows: {
          signature: { title: "Acompte à la signature", hint: "0\u00a0% : sans acompte" },
          demarrage: { title: "Au démarrage des travaux", hint: "0\u00a0% : aucun" },
          reception: { title: "Solde à la réception", hint: "Calculé" },
        },
        defaultsLink: "Régler mon échéancier par défaut",
        short: (percent: number, trigger: "signature" | "demarrage" | "reception") =>
          `${percent} % ${trigger === "signature" ? "à la signature" : trigger === "demarrage" ? "au démarrage" : "à la réception"}`,
        tranche: (
          percent: number,
          trigger: "signature" | "demarrage" | "reception",
          amount: string | null,
        ) =>
          `${percent} % ${trigger === "signature" ? "à la signature du devis" : trigger === "demarrage" ? "au démarrage des travaux" : "à la réception du chantier"}${amount ? `, soit ${amount}` : ""}`,
        saveDefault: "En faire mon échéancier par défaut",
        datesTitle: "Dates des travaux",
        startDate: "Date de début prévisionnelle",
        duration: "Durée estimée (en jours)",
        datesHint:
          "Indiquées sur le devis. Vous confirmerez la date de démarrage après le paiement de l'acompte (dès la signature pour un devis sans acompte).",
        validity: (days: number) => `Le devis sera valable ${days} jours à compter de son envoi.`,
        attachTitle: "Ce devis sera rattaché au chantier suivant",
        client: "Client",
        clientNotice:
          "Le client recevra une notification et pourra consulter le devis dans son espace personnel.",
        chantier: "Rappel du chantier",
        insuranceMissing:
          "Votre assurance décennale est incomplète ou expirée : elle doit figurer sur le devis.",
        insuranceLink: "Mettre à jour mes documents",
        submit: "Envoyer le devis",
        sending: "Envoi du devis…",
        footer: "Retrouvez tous vos devis dans l'onglet « Devis ».",
      },
      sent: {
        title: "Devis envoyé",
        summary: (numero: string, amount: string) => `N° ${numero} · ${amount} TTC`,
        sentOn: (day: string, until: string) => `Envoyé le ${day}, valable jusqu'au ${until}`,
        waiting: "En attente de la réponse du client.",
        revision: "Le client demande une modification :",
        edit: "Modifier le devis",
        refused: (reason: string) => `Le client a refusé le devis : ${reason}.`,
        signed: (date: string) => `Le client a signé le devis le ${date}.`,
        depositPaid: (amount: string, date: string) => `Acompte de ${amount} payé le ${date}.`,
        depositInvoice: (numero: string) => `Facture d'acompte ${numero} (PDF)`,
        depositInProgress: "Paiement de l'acompte en cours (virement ou prélèvement en attente).",
        depositWaiting: "En attente du paiement de l'acompte par le client.",
        viewSigned: "Voir le devis signé",
        viewPdf: "Voir le PDF",
        newTab: "(nouvel onglet)",
      },
      refusalReasons: {
        trop_cher: "prix trop élevé",
        autre_artisan: "un autre artisan a été choisi",
        projet_reporte: "projet reporté",
        autre: "autre raison",
      },
      preview: {
        title: "Aperçu du devis",
        back: "Lignes du devis",
        ready: "Votre devis est prêt !",
        check: (firstName: string | null) =>
          firstName
            ? `Vérifiez une dernière fois votre devis avant de l'envoyer à ${firstName}.`
            : "Vérifiez une dernière fois votre devis avant de l'envoyer.",
        miniature: "Miniature du devis",
        viewPdf: "Voir le PDF",
        newTab: "(nouvel onglet)",
        savedNote: "Votre devis est enregistré dans l'onglet « Devis ».",
      },
      dictation: {
        open: "Dictée intelligente",
        title: "Dictez votre devis",
        example:
          "Dites par exemple : « 4 prises de courant Legrand Céliane à 22,50 euros et 3 heures de pose à 55 euros de l'heure ».",
        transcriptLabel: "Texte de la dictée",
        placeholder: "Ce que vous dicterez s'affichera ici…",
        record: "Dicter",
        resume: "Reprendre la dictée",
        pause: "Mettre en pause",
        discard: "Effacer la dictée",
        timer: (seconds: number, max: number) =>
          `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} / ${Math.floor(max / 60)}:${String(max % 60).padStart(2, "0")}`,
        recording: "Enregistrement…",
        transcribing: "Transcription…",
        save: "Sauvegarder cet enregistrement",
        saveHint:
          "Vous pourrez générer les lignes plus tard à partir d'un enregistrement sauvegardé.",
        saved: "Enregistrement sauvegardé.",
        generate: "Générer les lignes",
        generating: "Génération des lignes…",
        generated: (n: number) =>
          n <= 1 ? "1 ligne ajoutée : vérifiez-la." : `${n} lignes ajoutées : vérifiez-les.`,
        back: "Retour",
        denied:
          "Le micro n'est pas autorisé. Autorisez-le dans les réglages de votre navigateur pour dicter.",
        unsupported: "La dictée n'est pas disponible sur ce navigateur.",
        failed: "La transcription a échoué. Réessayez ou écrivez le texte.",
        limit: "Dictée limitée à 2 minutes.",
        rateLimited: "Trop de dictées en peu de temps. Réessayez dans une heure.",
        quiet:
          "On ne vous entend pas : rapprochez-vous du micro ou vérifiez qu'il n'est pas coupé.",
        silent:
          "Aucun son capté : vérifiez que votre micro n'est pas coupé et qu'il est bien choisi dans votre navigateur, puis réessayez.",
        empty:
          "Aucune ligne n'a pu être tirée de la dictée. Citez les fournitures, les quantités et les prix.",
        unavailable: "La génération des lignes a échoué. Réessayez dans un instant.",
      },
      // Devis en conversation avec Manon (F-85, ADR 0234).
      // Reprise d'un DPGF chiffré (F-138, ADR 0289).
      fromTender: {
        label: "Reprendre un DPGF",
        hint: "Les postes chiffrés d'un appel d'offres arrivent en lignes de devis, à relire.",
        select: "Appel d'offres",
        add: "Reprendre les postes",
        added: (count: number, skipped: number, truncated: number) =>
          [
            `${count} poste${count > 1 ? "s" : ""} repris du DPGF : relisez-les puis enregistrez le devis.`,
            skipped > 0
              ? `${skipped} poste${skipped > 1 ? "s" : ""} sans quantité ou sans prix laissé${skipped > 1 ? "s" : ""} de côté.`
              : "",
            truncated > 0 ? `${truncated} au-delà de la limite de 200 lignes.` : "",
          ]
            .filter(Boolean)
            .join(" "),
        none: "Aucun poste chiffré dans ce DPGF.",
      },
      conversation: {
        start: "Dicter avec Manon",
        hint: "elle vous pose les questions",
        live: "Manon vous écoute : les lignes s'ajoutent pendant l'appel",
        speaking: "Manon parle…",
        updated: (n: number) =>
          n <= 1
            ? "Manon a proposé 1 ligne : vérifiez-la."
            : `Manon a proposé ${n} lignes : vérifiez-les.`,
        draft: (n: number) =>
          n <= 1
            ? "Lors de votre dernier appel, Manon a préparé 1 ligne."
            : `Lors de votre dernier appel, Manon a préparé ${n} lignes.`,
        draftAdd: "Ajouter au devis",
        draftDiscard: "Écarter",
        errors: {
          non_inclus: "Le devis avec Manon est inclus dans les formules Premium et Entreprise.",
          minutes_epuisees:
            "Vos minutes de voix du mois sont épuisées : vous pouvez en recharger dans « Ma formule ».",
          invalid: "Ce chantier n'attend plus de devis.",
          unavailable: "Manon n'est pas disponible pour le moment. Réessayez dans un instant.",
          generic: "L'appel n'a pas pu démarrer. Réessayez dans un instant.",
        } as Record<string, string>,
        // Page intégrée à l'application (ADR 0235) : aucun achat évoqué (CLAUDE.md règle 10).
        outsideApp: "Ouvrez cette page depuis l'application MENAO.",
        appMinutes: "Vos minutes de voix du mois sont épuisées.",
      },
      list: {
        title: "Devis",
        subtitle: "Suivez vos devis MENAO.",
        toSend: "Devis à envoyer",
        sent: "Devis envoyés",
        emptyToSend: "Vous n'avez aucun devis à envoyer.",
        emptySent: "Vous n'avez encore envoyé aucun devis.",
        visit: (day: string, time: string) => `Visite le ${day} à ${time}`,
        updated: (date: string) => `Modifié le ${date}`,
        sentOn: (day: string, time: string) => `Envoyé le ${day} à ${time}`,
        version: (n: number) => `Version ${n}`,
        statuses: {
          brouillon: "Brouillon",
          envoye: "Envoyé",
          signe: "Signé",
          refuse: "Refusé",
          revision_demandee: "Modification demandée",
          remplace: "Remplacé par une nouvelle version",
        },
        sentNotice: (client: string | null) =>
          client ? `Votre devis a bien été envoyé à ${client}.` : "Votre devis a bien été envoyé.",
        // Liste en lignes (ADR 0189).
        filtersLabel: "Filtrer les devis",
        filterToSend: "À envoyer",
        filterSent: "Envoyés",
        replaced: "Remplacé",
        open: (title: string) => `Ouvrir le devis ${title}`,
      },
    },
    invoices: {
      title: "Factures",
      subtitle:
        "Factures émises en votre nom à chaque paiement reçu, numérotées sans interruption.",
      link: "Mes factures",
      empty: "Aucune facture pour le moment : elles sont émises à chaque paiement reçu.",
      export: "Exporter pour le comptable (CSV)",
      kinds: { acompte: "Acompte", demarrage: "Acompte au démarrage", solde: "Solde" },
      line: (kind: string, date: string, client: string | null) =>
        [kind, date, client].filter(Boolean).join(" · "),
      view: (numero: string) => `Voir la facture ${numero} (PDF)`,
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
    // Listes de l'espace pro (ADR 0189) : menu « … » des actions secondaires.
    lists: {
      more: "Plus d'actions",
      add: "Ajouter",
      search: "Rechercher",
    },
    // Envoi au comptable (F-63, ADR 0187) : factures et dépenses de la période, par un lien sécurisé.
    // Suivi de l'argent, agent comptable avancé (F-87, ADR 0237).
    /** « Mes paiements » (F-146, maquette lot 40) : échéancier par défaut de l'artisan. */
    payments: {
      title: "Mes paiements",
      metaTitle: "Mes paiements — MENAO",
      scheduleTitle: "Mon échéancier par défaut",
      scheduleHint: "Proposé à chaque devis, modifiable devis par devis",
      templatesLabel: "Modèles d'échéancier",
      templates: [
        { deposit: 30, start: 0, label: "30 / 70", hint: "Acompte et solde" },
        { deposit: 30, start: 40, label: "30 / 40 / 30", hint: "Avec le démarrage" },
        { deposit: 0, start: 0, label: "0 / 100", hint: "Sans acompte" },
        { deposit: 50, start: 0, label: "50 / 50", hint: "Moitié-moitié" },
      ],
      rows: {
        signature: {
          title: "Acompte à la signature",
          hint: "Payé en ligne dès que le client signe. 0\u00a0% : sans acompte.",
        },
        demarrage: {
          title: "Au démarrage des travaux",
          hint: "Demandé au client le jour où le chantier commence. 0\u00a0% : aucun.",
        },
        reception: {
          title: "Solde à la réception",
          hint: "Le reste, calculé : payé à la fin des travaux, après la réception.",
        },
      },
      percentLabel: (title: string) => `${title}, en pourcentage`,
      total: "Total : 100 %. Le solde est toujours calculé.",
      save: "Enregistrer",
      saving: "Enregistrement…",
      saved: "Échéancier par défaut enregistré.",
      exampleTotalCents: 480_000,
      exampleTitle: (total: string) => `Sur un devis de ${total} TTC`,
      exampleLines: {
        signature: "À la signature",
        demarrage: "Au démarrage",
        reception: "À la réception",
      },
      exampleNote:
        "Chaque paiement a sa facture, et le client reçoit un rappel le jour où il est dû.",
      tipTitle: "Bon à savoir",
      tip: "Avec un paiement au démarrage, vos chantiers longs sont mieux financés. Sans acompte, le client signe plus facilement les petits travaux : la date se fixe dès la signature.",
    },
    moneyOverview: {
      title: "Suivi",
      monthTitle: (month: string) => `${month.charAt(0).toUpperCase()}${month.slice(1)} en bref`,
      ttc: "Montants TTC, tirés de votre espace : ils ne remplacent pas votre comptabilité.",
      collected: "Encaissé",
      signed: "Devis signés",
      signedCount: (n: number) => `${n} devis`,
      open: "À encaisser",
      openCount: (n: number) => (n <= 1 ? `${n} paiement` : `${n} paiements`),
      expenses: "Dépenses",
      previous: (month: string, value: string) => `${month} : ${value}`,
      openTitle: "À encaisser",
      openEmpty: "Rien à encaisser : tous vos paiements sont à jour.",
      kinds: { acompte: "Acompte", demarrage: "Démarrage", solde: "Solde" } as Record<
        string,
        string
      >,
      dueSince: (days: number) =>
        days === 0
          ? "Dû depuis aujourd'hui"
          : days === 1
            ? "Dû depuis 1 jour"
            : `Dû depuis ${days} jours`,
      failed: "Dernier paiement échoué",
      checkTitle: "À vérifier",
      withoutInvoice: (kind: string) => `${kind} reçu sans facture`,
      withoutInvoiceHint:
        "La facture n'a pas pu être émise : écrivez à l'équipe MENAO pour la régénérer.",
      help: "Aide et support",
      // Relance des impayés (ADR 0238).
      remind: "Relancer",
      reminding: "Envoi…",
      reminded: "Relance envoyée au client.",
      lastReminder: (date: string, n: number) =>
        `Relancé le ${date}${n > 1 ? ` · ${n} relances` : ""}`,
      remindTooSoon: "Relancé il y a moins de 3 jours",
      remindHint: "Le client reçoit un e-mail courtois, en votre nom, avec le lien pour payer.",
      autoTitle: "Relances automatiques",
      autoText:
        "À J+7, J+15 et J+30 après l'échéance, MENAO envoie un rappel courtois à votre client, en votre nom, avec le lien pour payer.",
      autoLabel: "Activer les relances automatiques",
      autoOn: "Relances automatiques activées.",
      autoOff: "Relances automatiques désactivées.",
      // Maquette du lot 37 : écarts sur le mois précédent, frise des relances, réglage à droite.
      autoShort:
        "MENAO envoie un rappel courtois à votre client, en votre nom, avec le lien pour payer.",
      autoSteps: [
        ["J+7", "7 jours après l'échéance"],
        ["J+15", "15 jours après l'échéance"],
        ["J+30", "30 jours après l'échéance"],
      ] as const,
      autoManual: "Vous pouvez aussi relancer à la main, au plus une fois tous les 3 jours.",
      deltaVs: (month: string) => `par rapport à ${month}`,
      openLate: (n: number, late: number) =>
        late > 0
          ? `${n <= 1 ? `${n} paiement` : `${n} paiements`}, dont ${late} en retard`
          : n <= 1
            ? `${n} paiement`
            : `${n} paiements`,
      openTotal: (total: string, n: number) =>
        `${total} · ${n <= 1 ? `${n} paiement` : `${n} paiements`}`,
      columns: { item: "Chantier et paiement", reminders: "Relances", amount: "Montant" },
      remindersDone: (n: number) => `${n} relance${n > 1 ? "s" : ""} sur 3`,
      nextAuto: (date: string) => `Prochain rappel automatique le ${date}`,
    },
    /**
     * Comptes d'équipe (F-89, ADR 0240) : « Mon équipe » du patron (places de la formule, membres,
     * invitation), et page d'un membre dont l'accès est suspendu.
     */
    /** Rubrique « Secrétaire » (ADR 0244) : appels à traiter, historique, essai, réglages. */
    secretaryPage: {
      title: "Secrétaire",
      lead: (name: string) =>
        `${name} répond à vos clients quand vous êtes sur un chantier : rendez-vous dans votre agenda ou message transmis tout de suite.`,
      minutes: (n: number) => `${n} min restantes ce mois-ci`,
      noMinutes: "Plus de minutes ce mois-ci : elle ne prend plus d'appels.",
      recharge: "Recharger",
      filters: "Vues de la secrétaire",
      todo: "À traiter",
      history: "Traités",
      settings: "Réglages",
      todoEmpty:
        "Rien à traiter. Quand vous ne pouvez pas décrocher, votre secrétaire prend l'appel : ses messages et rendez-vous arrivent ici.",
      historyEmpty: "Aucun appel traité pour l'instant.",
      seeAgenda: "Voir dans l'agenda",
      tryTitle: "L'essayer",
      // Refonte « Nette », lot 4 (ADR 0249) : chiffres clés et carte de la secrétaire.
      figuresLabel: "Chiffres de la secrétaire",
      toHandle: "À traiter",
      toHandleShort: "à traiter",
      toHandleHint: (urgent: number) =>
        urgent === 0 ? "aucun urgent" : urgent === 1 ? "dont 1 urgent" : `dont ${urgent} urgents`,
      monthAppointments: "Rendez-vous pris ce mois",
      monthAppointmentsShort: "rendez-vous ce mois",
      monthAppointmentsHint: "ajoutés à votre agenda",
      monthCalls: "Appels pris ce mois",
      monthCallsHint: "messages et rendez-vous",
      minutesShort: "min restantes",
      minutesLabel: "Minutes ce mois-ci",
      minutesOf: (remaining: number, total: number) => `${remaining} / ${total} min`,
      minutesLeftOf: (remaining: number, total: number) =>
        `${remaining} min restantes sur ${total}`,
      answering: "Répond quand vous ne décrochez pas",
      paused: "Ne prend plus d'appels ce mois-ci",
      booking: "Rendez-vous",
      bookingYes: (duration: string) => `Oui, visites de ${duration}`,
      bookingNo: "Non, messages seulement",
      hoursRow: "Horaires",
      hoursSet: "Renseignés dans l'agenda",
      hoursMissing: "À renseigner",
      instructionsRow: "Consignes",
      noInstructions: "Aucune",
      settingsLink: "Réglages",
      rdvTaken: (when: string) => `Rendez-vous pris : ${when}`,
      toCallBack: "Message à rappeler",
      notIncluded: {
        title: "Une secrétaire qui répond pour vous",
        text: "Elle décroche quand vous êtes sur un chantier, prend un rendez-vous dans votre agenda ou un message, et vous le transmet tout de suite. Incluse dans les formules Premium et Entreprise.",
        cta: "Voir les formules",
        askPatron: "Votre patron peut l'activer depuis sa formule.",
      },
      moved: {
        title: "Votre secrétaire",
        text: "Ses messages, ses rendez-vous, l'essai et ses réglages ont maintenant leur rubrique dans le menu.",
        cta: "Ouvrir la rubrique Secrétaire",
      },
    },
    /** Équipe d'un chantier (ADR 0241) : le patron ou le chef choisit qui y travaille. */
    chantierTeam: {
      title: "Équipe sur ce chantier",
      intro:
        "Les ouvriers ne voient que les chantiers qui leur sont attribués : journal, photos, messages et rendez-vous, sans aucun montant.",
      save: "Enregistrer",
      saved: "Équipe du chantier enregistrée.",
      errors: {
        member: "Ce membre ne fait plus partie de votre équipe : rechargez la page.",
        generic: "L'équipe du chantier n'a pas pu être enregistrée. Réessayez.",
      },
    },
    team: {
      title: "Mon équipe",
      lead: "Invitez vos salariés : chacun a son propre accès à MENAO, sur le site et dans l'application.",
      seats: (used: number, seats: number) =>
        `${used} compte${used > 1 ? "s" : ""} sur ${seats}, vous compris`,
      // Refonte « Nette » (ADR 0253).
      seatsTitle: "Comptes utilisés",
      seatsValue: (used: number, seats: number) => `${used} sur ${seats}`,
      membersTitle: "Membres",
      workerNote:
        "Un ouvrier ne voit que les chantiers qui lui sont attribués : journal, photos, messages et rendez-vous, sans aucun montant.",
      notIncluded: {
        title: "Avec Premium et Entreprise",
        text: "Donnez un accès à vos chefs d'équipe et à vos ouvriers : 3 comptes en Premium, 10 en Entreprise, vous compris.",
        cta: "Voir les formules",
      },
      full: "Toutes les places de votre formule sont prises : retirez ou suspendez un membre pour en inviter un autre.",
      you: "Vous",
      patron: "Patron",
      roles: { chef: "Chef d'équipe", ouvrier: "Ouvrier" } as Record<"chef" | "ouvrier", string>,
      states: {
        actif: "Actif",
        en_attente: "Invitation envoyée",
        suspendu_places: "Suspendu : plus de place dans votre formule",
        suspendu_patron: "Suspendu",
      } as Record<"actif" | "en_attente" | "suspendu_places" | "suspendu_patron", string>,
      since: (date: string) => `Depuis le ${date}`,
      invite: {
        title: "Inviter un membre",
        hint: "Il reçoit un e-mail pour choisir son mot de passe, puis se connecte sur le site ou dans l'application.",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Adresse e-mail",
        role: "Rôle",
        submit: "Envoyer l'invitation",
        sent: (email: string) => `Invitation envoyée à ${email}.`,
      },
      actions: {
        role: (name: string) => `Rôle de ${name}`,
        suspend: "Suspendre",
        reactivate: "Réactiver",
        remove: "Retirer",
        confirmRemove: (name: string) =>
          `Retirer ${name} de votre équipe ? Son accès est fermé tout de suite.`,
        removed: (name: string) => `${name} ne fait plus partie de votre équipe.`,
        cancel: "Annuler",
      },
      errors: {
        no_seat:
          "Toutes les places de votre formule sont prises : retirez ou suspendez un membre d'abord.",
        email_taken:
          "Cette adresse a déjà un compte MENAO : invitez votre salarié avec une autre adresse.",
        rate_limited: "Trop d'invitations envoyées : réessayez dans une heure.",
        forbidden: "Seul le patron de l'entreprise gère son équipe.",
        not_found: "Ce membre ne fait plus partie de votre équipe.",
        invalid: "Vérifiez les informations saisies.",
        unavailable: "L'invitation n'a pas pu être envoyée. Réessayez dans quelques minutes.",
      } as Record<string, string>,
      suspended: {
        title: "Accès suspendu",
        heading: "Votre accès est suspendu",
        contact: "Une question ? L'équipe MENAO répond à",
        email: "contact@menao.fr",
        text: (company: string | null) =>
          `Votre accès à l'espace${company ? ` de ${company}` : " de votre entreprise"} est suspendu. Votre patron peut le réactiver depuis « Mon équipe ».`,
      },
    },
    // Aide et support de l'espace artisan, avec l'assistant (F-86, ADR 0236).
    helpCenter: {
      title: "Aide et support",
      subtitle: "Posez votre question : l'assistant connaît votre espace et votre compte.",
      assistantTitle: "Posez votre question",
      speaker: "Assistant MENAO",
      knows: "Connaît votre espace et votre compte",
      // Guides pas à pas de la colonne de droite (refonte « Nette », ADR 0253).
      guidesTitle: "Guides pas à pas",
      guides: {
        devis: "Envoyer mon premier devis",
        paiements: "Être payé en ligne",
        agenda: "Brancher mon agenda",
        secretaire: "Ma secrétaire",
      },
      you: "Vous",
      quick: [
        "Qu'est-ce que je dois faire maintenant ?",
        "Comment envoyer un devis ?",
        "Comment être payé en ligne ?",
        "Comment synchroniser mon agenda ?",
      ],
      quickLabel: "Questions fréquentes",
      suggestionsLabel: "Vous pourriez aussi demander",
      placeholder: "Votre question…",
      label: "Votre question à l'assistant",
      send: "Envoyer",
      typing: "L'assistant écrit…",
      unavailable:
        "L'assistant n'est pas disponible pour le moment. Réessayez dans un instant ou écrivez à l'équipe.",
      limit: "Pour aller plus loin, écrivez à l'équipe MENAO : elle vous répond par e-mail.",
      writeTeam: "Écrire à l'équipe",
      restart: "Nouvelle conversation",
      contactTitle: "Écrire à l'équipe MENAO",
      contactText: "Une question précise sur votre compte ? Nous vous répondons par e-mail.",
      email: "contact@menao.fr",
      contactForm: "Formulaire de contact",
      screens: {
        accueil: "Ouvrir l'accueil",
        demandes: "Ouvrir mes demandes",
        chantiers: "Ouvrir mes chantiers",
        agenda: "Ouvrir l'agenda",
        disponibilites: "Ouvrir mes disponibilités",
        messages: "Ouvrir mes messages",
        devis: "Ouvrir mes devis",
        factures: "Ouvrir mes factures",
        depenses: "Ouvrir mes dépenses",
        comptable: "Ouvrir « Mon comptable »",
        paiements: "Ouvrir les paiements",
        fiche: "Ouvrir ma fiche",
        documents: "Ouvrir mes documents",
        zone: "Ouvrir ma zone",
        metiers: "Ouvrir mes métiers",
        avis: "Ouvrir mes avis",
        grade: "Ouvrir mon grade",
        profil: "Ouvrir mon profil",
        formule: "Ouvrir ma formule",
      } as Record<string, string>,
    },
    accountant: {
      title: "Envoi au comptable",
      subtitle:
        "Chaque mois ou chaque trimestre, vos factures et vos dépenses de la période écoulée partent chez votre comptable : tableaux et pièces, par un lien de téléchargement valable 30 jours.",
      link: "Envoi au comptable",
      settingsTitle: "Réglages",
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
      saving: "Enregistrement…",
      saved: "Réglages enregistrés.",
      next: (date: string) => `Prochain envoi automatique : ${date}.`,
      off: "Envoi automatique désactivé : vous pouvez toujours envoyer à la main.",
      sendTitle: "Envoyer maintenant",
      sendLead: (period: string, email: string) =>
        `Envoie tout de suite l'export de ${period} à ${email}.`,
      saveFirst: "Enregistrez l'e-mail de votre comptable pour pouvoir lui envoyer un export.",
      send: (period: string) => `Envoyer ${period}`,
      sending: "Préparation et envoi…",
      sent: (period: string) => `Export de ${period} envoyé à votre comptable.`,
      sendErrors: {
        echec: "L'envoi n'a pas abouti. Réessayez dans un instant.",
        no_settings: "Enregistrez d'abord l'e-mail de votre comptable.",
        rate_limited: "Trop d'envois en peu de temps : réessayez dans une heure.",
        unavailable: "L'envoi est momentanément indisponible. Réessayez plus tard.",
      },
      historyTitle: "Derniers envois",
      historyEmpty: "Aucun envoi pour le moment.",
      // Chiffres de l'envoi au comptable (refonte « Nette », ADR 0253).
      figuresLabel: "Envoi au comptable en chiffres",
      figNext: "Prochain envoi",
      figNextShort: "prochain envoi",
      figNextOff: "désactivé",
      figNextHint: (period: string) => `automatique, pour ${period}`,
      figNextOffHint: "envoi automatique désactivé",
      figLast: "Dernier envoi",
      figLastShort: "dernier envoi",
      figLastNone: "aucun envoi pour le moment",
      figMissing: "Dépenses sans pièce",
      figMissingShort: "sans pièce",
      figMissingHint: "ajoutez la facture ou le ticket",
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
    },
    // Dépenses de l'artisan (F-62, ADR 0186) : achats et leurs pièces, rattachés aux chantiers.
    // Bibliothèque d'ouvrages et marge (F-141, ADR 0293).
    library: {
      title: "Bibliothèque",
      seeded: (n: number) =>
        n > 0
          ? `Votre bibliothèque est déjà remplie : ${n} ouvrage${n > 1 ? "s" : ""} repris de vos devis, au dernier prix. Ajoutez un coût quand vous voulez, pour voir votre marge.`
          : "Votre bibliothèque est prête : ajoutez vos ouvrages, ou ils viendront de vos prochains devis.",
      views: { ouvrages: "Ouvrages", fournitures: "Fournitures" },
      viewsLabel: "Contenu de la bibliothèque",
      search: "Rechercher",
      searchLabel: "Rechercher dans la bibliothèque",
      newWork: "Nouvel ouvrage",
      empty: "Aucun ouvrage pour l'instant. Ils arrivent avec vos devis, ou créez le premier.",
      noResult: "Aucun ouvrage ne correspond.",
      columns: {
        work: "Ouvrage",
        unit: "Unité",
        price: "Prix de vente HT",
        cost: "Coût",
        margin: "Marge",
        origin: "Origine",
      },
      origin: {
        compose: "Composé",
        devis: "Repris de vos devis",
        manuel: "Saisi",
        import: "Importé",
      } as Record<string, string>,
      costMissing: "Coût à ajouter",
      // Import du catalogue (F-148, ADR 0309-0310, maquette lot 42).
      importer: {
        button: "Importer",
        title: "Importer mon catalogue",
        steps: ["Fichier", "Colonnes", "Vérification"],
        stepsLabel: "Étapes de l'import",
        kindTitle: "Que contient votre fichier ?",
        kinds: {
          ouvrages: "Des ouvrages (prix de vente)",
          fournitures: "Des fournitures (prix d'achat)",
        } as Record<string, string>,
        drop: "Déposez votre fichier ici",
        dropHint: "Excel (.xlsx) ou CSV, 5 000 lignes au plus",
        choose: "Choisir un fichier",
        fileLabel: "Fichier du catalogue",
        dropNote:
          "Une ligne par article, une colonne par information. Pas besoin de modèle : gardez votre fichier tel qu'il est, nous reconnaissons les colonnes.",
        reading: "Lecture du fichier…",
        knownTitle: "Colonnes reconnues",
        knownLead:
          "Par leurs titres, même écrits autrement : « Libellé », « PU HT », « Px vente »…",
        known: [
          ["Désignation", "obligatoire"],
          ["Unité", "u, m², ml, h, forfait…"],
          ["Prix HT", "12,50 ou 12,50 €"],
          ["TVA", "facultative, 10 % par défaut"],
          ["Description", "facultative"],
          ["Référence, fournisseur", "fournitures"],
        ] as [string, string][],
        recognizedBanner: (n: number, total: number) =>
          `${n} colonne${n > 1 ? "s" : ""} reconnue${n > 1 ? "s" : ""} sur ${total}.`,
        recognizedNext: "Vérifiez-les, changez-en une si besoin, puis continuez.",
        fileSummary: (name: string, rows: number) =>
          `${name} · ${rows} ligne${rows > 1 ? "s" : ""}`,
        sheetInfo: (sheet: string | null, headerRow: number) =>
          [
            sheet ? `Feuille « ${sheet} »` : null,
            headerRow >= 0 ? `titres en ligne ${headerRow + 1}` : "sans ligne de titres",
          ]
            .filter(Boolean)
            .join(" · "),
        tooLong: "Seules les 5 000 premières lignes seront importées.",
        column: (letter: string, title: string) =>
          title ? `Colonne ${letter} · « ${title} »` : `Colonne ${letter}`,
        recognized: "Reconnue",
        unused: "Non utilisée",
        roleOf: (letter: string) => `Rôle de la colonne ${letter}`,
        roles: {
          designation: "Désignation",
          unit: "Unité",
          price_ouvrages: "Prix de vente HT",
          price_fournitures: "Prix d'achat HT",
          vat: "TVA",
          description: "Description",
          reference: "Référence",
          supplier: "Fournisseur",
          ignore: "Ignorer",
        } as Record<string, string>,
        previewCount: (shown: number, total: number) =>
          `Les ${shown} premières lignes sur ${total}`,
        needColumns: "Choisissez au moins la colonne Désignation et la colonne Prix.",
        changeFile: "Changer de fichier",
        next: "Continuer",
        back: "Colonnes",
        figures: {
          fresh: (kind: string) =>
            kind === "ouvrages" ? "nouveaux ouvrages à ajouter" : "nouvelles fournitures à ajouter",
          existing: "déjà dans votre bibliothèque",
          issues: "lignes à corriger",
        },
        existingTitle: (n: number, kind: string) =>
          `${kind === "ouvrages" ? (n > 1 ? "Les" : "L'") : n > 1 ? "Les" : "La"} ${n} ${
            kind === "ouvrages"
              ? `ouvrage${n > 1 ? "s" : ""} déjà présent${n > 1 ? "s" : ""}`
              : `fourniture${n > 1 ? "s" : ""} déjà présente${n > 1 ? "s" : ""}`
          }`,
        existingLead: "Même désignation et même unité qu'un article de votre bibliothèque.",
        update: "Mettre à jour leur prix",
        updateHint: (kind: string) =>
          kind === "ouvrages"
            ? "Le prix du fichier remplace l'ancien. Leur composition ne change pas."
            : "Le prix d'achat du fichier remplace l'ancien, daté d'aujourd'hui.",
        keep: "Les laisser tels quels",
        keepHint: "Seuls les nouveaux articles sont ajoutés.",
        issuesTitle: (n: number) =>
          `${n} ligne${n > 1 ? "s" : ""} ne ser${n > 1 ? "ont" : "a"} pas importée${n > 1 ? "s" : ""}`,
        issuesLead:
          "Corrigez-les dans votre fichier et importez-le de nouveau, ou ajoutez-les à la main ensuite.",
        issuesMore: (n: number) => `Et ${n} autre${n > 1 ? "s" : ""}.`,
        line: (n: number) => `Ligne ${n}`,
        reasons: {
          designation: () => "Désignation vide",
          too_long: () => "Désignation trop longue (200 caractères au plus)",
          price: (v: string) => `Prix illisible : « ${v} »`,
          missing_price: () => "Prix manquant",
          unit: (v: string) => `Unité inconnue : « ${v} »`,
          vat: (v: string) => `TVA inconnue : « ${v} »`,
        } as Record<string, (value: string) => string>,
        summaryTitle: "Ce qui sera importé",
        summaryMore: (n: number) => (n > 0 ? `Et ${n} autre${n > 1 ? "s" : ""}.` : ""),
        vatNote: "TVA du fichier, 10 % quand elle manque.",
        importButton: (n: number, kind: string) =>
          `Importer ${n} ${kind === "ouvrages" ? `ouvrage${n > 1 ? "s" : ""}` : `fourniture${n > 1 ? "s" : ""}`}`,
        updateButton: (n: number) => `Mettre à jour ${n} prix`,
        updateNote: (n: number) =>
          `${n > 1 ? `Les ${n} prix déjà présents seront mis à jour` : "Le prix déjà présent sera mis à jour"}.`,
        nothing: "Rien à importer : aucune ligne valide dans ce fichier.",
        done: (added: number, updated: number, kind: string) =>
          [
            added > 0
              ? `${added} ${kind === "fournitures" ? `fourniture${added > 1 ? "s" : ""} importée${added > 1 ? "s" : ""}` : `ouvrage${added > 1 ? "s" : ""} importé${added > 1 ? "s" : ""}`}`
              : null,
            updated > 0 ? `${updated} prix mis à jour` : null,
          ]
            .filter(Boolean)
            .join(", ") + ".",
        errors: {
          type: "Choisissez un fichier Excel (.xlsx) ou CSV. Un ancien fichier .xls : enregistrez-le en .xlsx.",
          size: "Fichier trop lourd : 5 Mo au plus.",
          upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
          unreadable: "Fichier illisible : enregistrez-le en .xlsx ou en .csv, puis réessayez.",
          rate_limited: "Trop d'essais en une heure. Réessayez un peu plus tard.",
          forbidden: "Réservé au patron ou au chef d'équipe.",
          generic: "Le fichier n'a pas pu être lu. Réessayez dans un instant.",
        } as Record<string, string>,
      },
      // Bibliothèque MENAO par défaut (F-147, ADR 0306-0307) : premier passage, liste, ouvrage.
      menao: {
        chip: "MENAO",
        startTitle: "Comment voulez-vous remplir votre bibliothèque ?",
        startLead: "Vous pourrez combiner les trois plus tard.",
        choiceLabel: "Point de départ de la bibliothèque",
        menaoTitle: "Démarrer avec la bibliothèque MENAO",
        menaoText:
          "Des ouvrages prêts à chiffrer pour vos métiers : désignation, unité, TVA, temps de pose et fournitures.",
        tradesLabel: "Vos métiers, repris de votre fiche",
        tradesHint: (n: number) =>
          `${n} ouvrage${n > 1 ? "s" : ""} copié${n > 1 ? "s" : ""} dans votre bibliothèque, modifiables. Temps de pose et quantités sont des repères MENAO.`,
        importTitle: "Importer mon catalogue",
        importText:
          "Un fichier Excel ou CSV : désignation, unité, prix. Nous reconnaissons les colonnes.",
        devisTitle: "Partir de mes devis",
        devisText: (n: number) =>
          n > 0
            ? `Vos ${n} ouvrage${n > 1 ? "s" : ""} déjà repris de vos devis, et ceux que vous ajouterez à la main.`
            : "Les ouvrages de vos prochains devis, et ceux que vous ajouterez à la main.",
        settingsTitle: "Pour chiffrer vos ouvrages",
        settingsLead:
          "Deux réglages suffisent : chaque prix de la bibliothèque en découle. Personne d'autre ne les voit.",
        settingsNote:
          "Prix d'achat × coefficient = prix de vente des fournitures. Le coût de l'heure, pour la marge, peut attendre.",
        create: "Créer ma bibliothèque",
        exampleTitle: "Exemple : cloison BA13, au m²",
        examplePose: (price: string) => `Pose : 0,35 h × ${price}`,
        exampleSupplies: (coef: string) => `Fournitures : vos prix d'achat × ${coef}`,
        exampleSuppliesValue: "selon vos prix",
        noTrade: "Choisissez au moins un métier.",
        invalid: "Vérifiez le prix de l'heure et le coefficient (0,5 à 10).",
        hourRequired: "Indiquez votre prix de vente de l'heure.",
        error: "La bibliothèque n'a pas pu être créée. Réessayez.",
        added: (n: number, trades: number) =>
          `${n} ouvrage${n > 1 ? "s" : ""} MENAO ajouté${n > 1 ? "s" : ""}${trades > 0 ? ` pour vos ${trades} métier${trades > 1 ? "s" : ""}` : ""}.`,
        addedNext:
          "Ajustez les temps de pose et mettez vos prix d'achat : la fourchette devient votre prix.",
        filtersLabel: "Filtrer par métier",
        all: (n: number) => `Tous (${n})`,
        mine: (n: number) => `Les miens (${n})`,
        pose: "Pose",
        indicative: "Votre prix indicatif HT",
        sourceFooter: (date: string) =>
          `Fourchettes : vos réglages + prix publics des fournitures au ${date}`,
        whereTitle: "D'où viennent ces prix ?",
        wherePose: "Pose",
        wherePoseText: " : repère MENAO de temps par unité × votre prix de l'heure.",
        whereSupplies: "Fournitures",
        whereSuppliesText:
          " : votre prix d'achat × votre coefficient. Tant qu'il manque, la fourchette des prix publics constatés en ligne, quand elle est disponible.",
        whereOwn:
          "Un artisan achète souvent moins cher : remplacez une fourniture par votre prix d'achat, et la fourchette laisse place à votre prix.",
        whereNote: "Ce sont des repères, pas des prix conseillés : vous fixez vos prix.",
      },
      count: (shown: number, total: number, withCost: number) =>
        `${shown} ouvrage${shown > 1 ? "s" : ""} sur ${total} · coût renseigné pour ${withCost}`,
      settings: {
        title: "Mes réglages de chiffrage",
        lead: "Une fois pour toutes. Le prix de vente de chaque ouvrage en découle.",
        hourCost: "Coût d'une heure",
        hourCostHint: "Salaire chargé, ou la rémunération que vous visez.",
        hourPrice: "Prix de vente de l'heure",
        coef: "Coefficient fournitures",
        coefHint: "Prix d'achat × coefficient = prix de vente (1,30 par exemple).",
        alert: "Seuil d'alerte de marge (%)",
        alertHint: "Facultatif. Sans seuil, pas d'alerte.",
        note: "La marge s'affiche en taux de marque : la part du prix de vente qui vous reste.",
        save: "Enregistrer",
        saved: "Réglages enregistrés.",
        invalid: "Vérifiez les montants, le coefficient (0,5 à 10) et le seuil (0 à 90 %).",
      },
      supplies: {
        title: "Mes fournitures",
        lead: "Vos prix d'achat HT, remises comprises. Ils restent privés.",
        designation: "Désignation",
        reference: "Référence",
        supplier: "Fournisseur",
        unit: "Unité",
        price: "Prix d'achat HT",
        priceOn: "Date du prix",
        waste: "Perte (%)",
        add: "Ajouter une fourniture",
        save: "Enregistrer",
        saved: "Fourniture enregistrée.",
        remove: (name: string) => `Supprimer ${name}`,
        removed: "Fourniture supprimée.",
        inUse:
          "Cette fourniture est utilisée dans un ouvrage : retirez-la d'abord de sa composition.",
        old: "Prix à vérifier",
        // Fourniture copiée de la bibliothèque MENAO (F-147) : prix d'achat pas encore saisi.
        missing: "À renseigner",
        empty: "Aucune fourniture pour l'instant.",
        invalid: "Indiquez la désignation et un prix d'achat valide.",
      },
      work: {
        back: "Bibliothèque",
        newTitle: "Nouvel ouvrage",
        clientTitle: "Ce que voit le client",
        clientBadge: "Sur le devis",
        designation: "Désignation",
        description: "Description",
        descriptionNote: "(facultative)",
        unit: "Unité",
        vat: "TVA par défaut",
        lineType: "Type de ligne",
        display: "Sur le devis",
        displayLine: "Une ligne",
        displayLineHint: "La composition reste privée",
        displayDetail: "Détaillé",
        displayDetailHint: "Fournitures et main d'œuvre séparées",
        displayNote:
          "Dépannage, réparation, entretien : un décompte détaillé peut être exigé. Point à faire confirmer.",
        compoTitle: "Composition",
        private: "Visible par vous seul",
        element: "Élément",
        quantity: "Quantité",
        unitCost: "Prix d'achat",
        costColumn: "Coût",
        cost: "Coût",
        kinds: { fourniture: "Fourniture", heures: "Main d'œuvre", frais: "Autre frais" } as Record<
          string,
          string
        >,
        addSupply: "Une fourniture",
        addHours: "Des heures",
        addOther: "Un autre frais",
        chooseSupply: "Choisir une fourniture",
        noSupplies: "Ajoutez d'abord vos fournitures dans l'onglet Fournitures.",
        otherLabel: "Libellé du frais",
        hourCost: "Votre coût horaire",
        // Ouvrage MENAO (F-147) : repère de pose, prix publics, prix d'achat en ligne, prix retenu.
        poseTitle: "Temps de pose",
        poseHint: "Repère MENAO : ajustez-le à votre rythme",
        myPurchase: "Mon prix d'achat",
        publicPrices: (low: string, high: string) => `Prix publics ${low} – ${high}`,
        publicSource: (source: string | null, date: string | null) =>
          [source, date].filter(Boolean).join(" · "),
        publicNote: "Prix publics TTC des enseignes, convertis en HT.",
        indicativeTitle: "Votre prix indicatif",
        suppliesRange: (coef: string) => `Fournitures × ${coef}`,
        pickTitle: "Prix retenu sur vos devis",
        picks: { bas: "Bas", milieu: "Milieu", haut: "Haut", main: "À la main" } as Record<
          string,
          string
        >,
        pickValue: (pick: string, price: string, unit: string) => `${pick} : ${price} HT / ${unit}`,
        rangeNote: "Mettez vos prix d'achat : la fourchette se resserre jusqu'à votre prix exact.",
        removeComponent: (name: string) => `Retirer ${name}`,
        removeColumn: "Retirer",
        fieldOf: (label: string, name: string) => `${label} : ${name}`,
        pricingTitle: "Prix et marge",
        costLine: "Coût (déboursé sec)",
        suppliesLine: (cost: string, coef: string) => `Fournitures ${cost} × ${coef}`,
        hoursLine: (hours: string, price: string) => `Main d'œuvre ${hours} h × ${price}`,
        otherLine: (cost: string, coef: string) => `Autres frais ${cost} × ${coef}`,
        salePrice: "Prix de vente HT",
        margin: (amount: string) => `Marge ${amount}`,
        rate: (rate: string) => `${rate} du prix`,
        loss: "Vendu à perte",
        manual: "Fixer le prix à la main",
        manualLabel: "Prix fixé à la main (HT)",
        computed: "Revenir au prix calculé",
        unknownCost: "Coût inconnu : ajoutez la composition pour voir votre marge.",
        missingSettings:
          "Réglez le coût et le prix de vente de l'heure dans « Mes réglages de chiffrage » pour chiffrer la main d'œuvre.",
        rateNote: (onCost: string) =>
          `Taux de marque : la part du prix de vente qui vous reste. Sur le coût, ce serait ${onCost} : même somme, autre calcul.`,
        save: "Enregistrer",
        saved: "Ouvrage enregistré.",
        delete: "Supprimer l'ouvrage",
        deleteConfirm: "L'ouvrage sort de la bibliothèque. Vos devis ne changent pas.",
        deleteYes: "Oui, supprimer",
        invalid: "Vérifiez la désignation, les quantités et les montants.",
        error: "L'ouvrage n'a pas pu être enregistré. Réessayez.",
      },
    },
    expenses: {
      title: "Dépenses",
      subtitle:
        "Vos achats et leurs factures, rattachés à vos chantiers. MENAO ne paie rien : vous suivez ce qu'il reste à payer.",
      add: "Ajouter une dépense",
      export: "Exporter (CSV)",
      empty:
        "Aucune dépense pour le moment. Photographiez une facture ou un ticket : MENAO lit les montants pour vous.",
      noResults: "Aucune dépense ne correspond.",
      filtersLabel: "Filtrer les dépenses",
      filters: { toutes: "Toutes", a_payer: "À payer", en_retard: "En retard", paye: "Payées" },
      searchLabel: "Rechercher une dépense",
      searchPlaceholder: "Titre, fournisseur ou numéro",
      searchSubmit: "Rechercher",
      summaryLabel: "Reste à payer",
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
        back: "Dépenses",
        document: {
          title: "Pièce",
          lead: "Photographiez la facture ou le ticket, ou choisissez un fichier : MENAO lit les montants pour vous.",
          camera: "Prendre en photo",
          file: "Choisir un fichier",
          hint: "PDF, JPEG ou PNG, 10 Mo au plus.",
          chosen: (name: string) => `Pièce choisie : ${name}`,
          current: "Une pièce est enregistrée. Choisissez-en une autre pour la remplacer.",
          remove: "Retirer la pièce choisie",
          tooLarge: "Fichier trop lourd : 10 Mo au plus.",
          uploadFailed: "La pièce n'a pas pu être envoyée. Réessayez.",
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
          titleHint:
            "Quelques mots sur l'achat, par exemple « Tableau électrique et disjoncteurs ».",
          supplier: "Fournisseur",
          reference: "Numéro de la pièce",
          kind: "Type de pièce",
          category: "Catégorie",
          categoryNone: "Choisir une catégorie",
          issuedOn: "Date de la pièce",
          dueOn: "Échéance de paiement",
          dueOnHint: "Facultatif : passé cette date, la dépense est « en retard ».",
          totalHt: "Montant HT (€)",
          totalTva: "Montant de la TVA (€)",
          totalTtc: "Total TTC",
          chantier: "Chantier",
          chantierNone: "À classer (aucun chantier)",
          paid: "Déjà payée",
          paidOn: "Date du paiement",
          notes: "Note",
          notesHint: "Facultatif, visible de vous seul.",
        },
        lines: {
          title: "Lignes lues sur la pièce",
          remove: (designation: string) => `Retirer la ligne ${designation}`,
        },
        save: "Enregistrer la dépense",
        saving: "Enregistrement…",
        cancel: "Annuler",
      },
      detail: {
        back: "Dépenses",
        edit: "Modifier",
        markPaid: "Marquer comme payée",
        markUnpaid: "Marquer comme non payée",
        paidOn: (date: string) => `Payée le ${date}`,
        dueOn: (date: string) => `Échéance le ${date}`,
        overdueSince: (date: string) => `En retard depuis le ${date}`,
        delete: "Supprimer la dépense",
        deleteConfirm: "Supprimer cette dépense et sa pièce ? C'est définitif.",
        deleteSubmit: "Supprimer définitivement",
        document: "Pièce",
        noDocument: "Aucune pièce : ajoutez-la depuis « Modifier ».",
        openDocument: "Ouvrir la pièce",
        documentAlt: (title: string) => `Pièce de la dépense ${title}`,
        documentFailed:
          "La dépense est enregistrée, mais la pièce n'a pas pu être rangée : ajoutez-la de nouveau depuis « Modifier ».",
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
    // « Recommander un partenaire » (ADR 0174) : réseau de parrainage, le client décide.
    // Limites des formules (F-139, ADR 0290) : prévenir sans bloquer.
    planLimits: {
      plans: { base: "Base", premium: "Premium", entreprise: "Entreprise" } as Record<
        string,
        string
      >,
      proche: (received: number, limit: number, plan: string, next: string) =>
        `${received} demandes reçues sur ${limit} ce mois-ci avec la formule ${plan}. Passez à ${next} pour en recevoir davantage.`,
      atteinte: (limit: number, plan: string, next: string) =>
        `Vous avez reçu les ${limit} demandes du mois prévues par la formule ${plan}. Passez à ${next} pour en recevoir davantage.`,
      depassee: (received: number, limit: number, plan: string, next: string) =>
        `${received} demandes reçues ce mois-ci, au-delà des ${limit} prévues par la formule ${plan}. Passez à ${next} pour en recevoir davantage.`,
      cta: "Voir les formules",
    },
    // Appels d'offres et DPGF (F-136, ADR 0287) : formule Entreprise.
    tenders: {
      tabsLabel: "Sections des demandes",
      tabRequests: "Demandes",
      tabTenders: "Appels d'offres",
      title: "Appels d'offres",
      subtitle: "Les demandes des particuliers, et les appels d'offres des architectes.",
      // Écran d'attente pendant la lecture par l'IA : étapes au fil du temps, dernière en cours.
      waiting: {
        duration: "Environ une minute",
        quick: "Quelques secondes",
        long: "Un peu plus long que d'habitude, la lecture continue",
        done: "(terminé)",
        factTitle: "Le saviez-vous ?",
        rooms: [
          { name: "Séjour", area: "28,4 m²" },
          { name: "Chambre", area: "12,1 m²" },
          { name: "Cuisine", area: "9,8 m²" },
          { name: "SdB", area: "4,6 m²" },
          { name: "Chambre 2", area: "11,3 m²" },
        ],
        table: { designation: "Désignation", quantity: "Qté", unit: "U" },
        plan: {
          title: "Lecture de vos plans",
          steps: [
            "Envoi des plans",
            "Lecture de l'échelle et des cotes",
            "Repérage des pièces",
            "Calcul des surfaces",
            "Comptage des portes et fenêtres",
          ],
          facts: [
            "Chaque pièce et chaque surface restent modifiables : vous gardez la main sur le relevé.",
            "Une cote illisible ? La pièce est marquée « à vérifier » plutôt qu'inventée.",
            "Les quantités du DPGF suivent des règles affichées : vous voyez d'où vient chaque chiffre.",
            "L'Excel et le PDF s'ouvrent quand vous cochez « J'ai vérifié les quantités ».",
          ],
        },
        dpgf: {
          title: "Lecture du DPGF",
          steps: [
            "Envoi du document",
            "Lecture des pages",
            "Repérage des lots",
            "Relevé des postes et des quantités",
            "Préparation du tableau",
          ],
          facts: [
            "Chaque ligne lue reste modifiable avant le chiffrage.",
            "Une ligne illisible est signalée plutôt qu'inventée.",
            "Vous retrouvez les lots et les postes de l'architecte, prêts à chiffrer.",
          ],
        },
      },
      locked: {
        title: "Inclus dans la formule Entreprise",
        body: "Déposez le DPGF de l'architecte : MENAO le lit, propose vos prix habituels pour chaque poste, et le remplit au format de l'architecte, avec un PDF prêt à joindre à votre offre.",
        cta: "Voir les formules",
      },
      newTitle: "Nouvel appel d'offres",
      newLead: "Déposez le DPGF vierge de l'architecte, ou seulement ses plans.",
      // DPGF créé depuis les plans (F-140, ADR 0291).
      modes: {
        legend: "Ce que l'architecte vous a envoyé",
        dpgf: "J'ai le DPGF de l'architecte",
        dpgfHint: "Son tableau en Excel ou en PDF : MENAO le lit et reprend vos prix.",
        plans: "J'ai seulement les plans",
        plansHint:
          "MENAO relève les pièces et les mesures sur les plans, puis prépare le DPGF de vos lots.",
        new: "Nouveau",
      },
      // « Comment ça marche » à côté du dépôt (maquettes des lots 34 et 35).
      how: {
        title: "Comment ça marche",
        dpgf: [
          "MENAO lit le DPGF de l'architecte : lots, postes, unités et quantités.",
          "Il propose pour chaque poste votre prix habituel, repris de votre bibliothèque ou de vos devis.",
          "Vous vérifiez les quantités et ajustez vos prix.",
          "Vous rendez le DPGF dans le fichier de l'architecte, avec un PDF, et vous passez en devis.",
        ],
        plans: [
          "MENAO relève ce qui est écrit sur les plans : pièces, surfaces, hauteur sous plafond, portes, fenêtres, appareils.",
          "Vous corrigez le relevé et choisissez les revêtements de chaque pièce.",
          "MENAO calcule les quantités de vos lots et montre chaque calcul.",
          "Vous vérifiez, puis vous chiffrez avec vos prix comme un DPGF reçu.",
        ],
        plansNote:
          "MENAO ne devine jamais une mesure : ce qui n'est pas écrit sur le plan reste « à compléter ». C'est un forfait : vous restez responsable de vos quantités.",
      },
      // Zone de dépôt des fichiers (maquette du lot 35).
      drop: {
        choose: "Choisir le fichier",
        choosePlans: "Choisir les plans",
        addPlan: "Ajouter un plan",
        dpgfHint: "Excel (.xlsx) ou PDF, 15 Mo au plus, ou glissez-le ici",
        plansHint: "PDF, JPG ou PNG, 15 Mo par fichier, ou glissez-les ici",
        xlsx: "Excel : MENAO le remplit tel quel",
        pdfDpgf: "PDF : lu par l'IA, à vérifier ligne à ligne",
        pdfPlan: "PDF : exporté du logiciel de l'architecte, les mesures y sont écrites",
        photo: "Photo d'un plan papier : lecture moins sûre, chaque mesure sera à vérifier",
        remove: (name: string) => `Retirer ${name}`,
      },
      plan: {
        files: "Plans de l'architecte",
        filesHint:
          "PDF exporté du logiciel de l'architecte de préférence : les mesures y sont écrites. Une photo d'un plan papier est lue aussi, avec des mesures à vérifier. 10 fichiers au plus, 15 Mo chacun.",
        trades: "Lots à préparer",
        tradesHint: "Vos métiers sont cochés. Un lot par métier dans le DPGF.",
        otherTrades: "Un autre métier",
        submit: "Lire les plans",
        reading: "Lecture des plans…",
        duration: "Environ une minute de lecture.",
        errors: {
          files: "Choisissez au moins un plan, en PDF, JPG ou PNG.",
          tooMany: "Déposez 10 plans au plus.",
          tooLarge: "Un plan dépasse 15 Mo.",
          trades: "Choisissez au moins un métier.",
        },
        readOk: (rooms: number) =>
          `Plans lus : ${rooms} pièce${rooms > 1 ? "s" : ""} relevée${rooms > 1 ? "s" : ""}. Vérifiez chaque mesure avant de continuer.`,
        status: {
          not_plan:
            "Ces fichiers ne ressemblent pas à des plans de bâtiment. Déposez les plans de niveaux de l'architecte.",
          unreadable:
            "Ces plans n'ont pas pu être lus (fichier abîmé, ou photo trop floue). Déposez le PDF de l'architecte de préférence.",
          too_large:
            "Les plans dépassent 20 Mo ensemble. Déposez seulement les plans de niveaux et les coupes.",
          too_long:
            "Ces plans comptent trop de pièces pour être lus en une fois. Déposez-les niveau par niveau.",
          no_sheet: "Aucun plan à lire.",
          unavailable:
            "La lecture des plans est momentanément indisponible. Réessayez dans quelques minutes.",
          rate_limited: "Trop de lectures en peu de temps. Réessayez dans une heure.",
          forbidden: "Les appels d'offres sont inclus dans la formule Entreprise.",
          error: "Les plans n'ont pas pu être lus. Réessayez.",
        } as Record<string, string>,
        warnings: {
          sans_surfaces:
            "Aucune surface n'est écrite sur ces plans : indiquez la surface et le périmètre de chaque pièce.",
          tronque: "Plus de 200 pièces : seules les 200 premières sont reprises.",
          photo: "Des mesures viennent d'une photo de plan : vérifiez-les en priorité.",
        } as Record<string, string>,
        retry: "Relire les plans",
        summaryTitle: "MENAO a lu vos plans",
        summary: {
          scale: (scale: string) => `Échelle ${scale} lue dans le cartouche`,
          read: (n: number) =>
            `${n} surface${n > 1 ? "s" : ""} écrite${n > 1 ? "s" : ""} sur le plan, reprise${n > 1 ? "s" : ""} telle${n > 1 ? "s" : ""} quelle${n > 1 ? "s" : ""}`,
          computed: (n: number) =>
            `${n} surface${n > 1 ? "s" : ""} absente${n > 1 ? "s" : ""} du plan, calculée${n > 1 ? "s" : ""} avec les cotes`,
          toCheck: (n: number) =>
            `${n} pièce${n > 1 ? "s" : ""} à vérifier (photo ou lecture incertaine)`,
          missing: (n: number) => `${n} pièce${n > 1 ? "s" : ""} avec une mesure à compléter`,
        },
        filesTitle: "Plans déposés",
        tradesTitle: "Lots à préparer",
        roomsTitle: (n: number) => `${n} pièce${n > 1 ? "s" : ""} relevée${n > 1 ? "s" : ""}`,
        roomsLabel: "Pièces relevées",
        columns: {
          name: "Pièce",
          level: "Niveau",
          area: "Surface (m²)",
          perimeter: "Périmètre (ml)",
          height: "Hauteur (m)",
          wet: "Pièce humide",
          habitable: "Habitable",
          source: "Origine",
        },
        fieldOf: (label: string, room: string) => `${label} : ${room}`,
        source: {
          plan: (page: number | null) => (page ? `Lu p. ${page}` : "Lu sur le plan"),
          cotes: "Calculé (cotes)",
          photo: "Photo : à vérifier",
          saisi: "Saisi",
          uncertain: "À vérifier",
          missing: "À compléter",
        },
        openPage: (page: number) => `Ouvrir la page ${page}`,
        addRoom: "Ajouter une pièce",
        removeRoom: (name: string) => `Retirer ${name || "la pièce"}`,
        countsTitle: "Aussi relevé sur les plans",
        countsHint: "Comptés avec les symboles du plan. Corrigez si besoin.",
        counts: {
          portes: "Portes intérieures",
          fenetres: "Fenêtres et baies",
          wc: "WC",
          lavabos: "Lavabos, vasques",
          douches: "Douches",
          baignoires: "Baignoires",
          eviers: "Éviers",
          escaliers: "Escaliers",
        } as Record<string, string>,
        save: "Enregistrer le relevé",
        saved: "Relevé enregistré.",
        // Écran du relevé (maquette du lot 35, écran 2).
        viewerLabel: "Plans déposés",
        viewerTitle: (name: string) => `Plan : ${name}`,
        viewerPage: (page: number) => `Page ${page}`,
        viewerMissing: "Ce plan n'a pas pu être affiché.",
        viewerHint: "Cliquez une pièce du tableau pour afficher la page où elle a été lue.",
        roomsNote:
          "Surfaces en m², périmètres en ml, hauteur sous plafond en m. Une valeur corrigée passe en « Saisi ».",
        okTitle: "Le relevé vous convient ?",
        okText:
          "Corrigez une valeur d'un clic : elle passe en « Saisi ». Ensuite, choisissez les revêtements de chaque pièce.",
        toFinishes: "Choisir les revêtements",
        // Étapes de l'appel d'offres créé depuis les plans (maquette du lot 35).
        steps: {
          label: "Étapes de l'appel d'offres",
          plans: "Plans",
          releve: "Relevé",
          revetements: "Revêtements",
          dpgf: "DPGF",
          chiffrage: "Chiffrage",
        },
        withoutDpgf: "sans DPGF",
        planBadge: "Formule Entreprise",
        invalid:
          "Vérifiez les mesures : un nom pour chaque pièce, des nombres positifs (hauteur entre 1,5 et 10 m).",
        responsibility:
          "MENAO ne devine aucune mesure : ce qui n'est pas écrit sur le plan reste à compléter. C'est un forfait : vous restez responsable de vos quantités.",
        // Revêtements et création du DPGF (ADR 0292).
        finishes: {
          title: "Revêtements par pièce",
          lead: "Proposés selon le type de pièce : corrigez-les, puis MENAO calcule les quantités de vos lots.",
          label: "Revêtements par pièce",
          floor: "Sol",
          walls: "Murs",
          ceiling: "Plafond",
          tileHeight: "Faïence (m)",
          floorOptions: {
            carrelage: "Carrelage",
            parquet: "Parquet",
            sol_souple: "Sol souple",
            aucun: "Aucun",
          } as Record<string, string>,
          wallOptions: {
            peinture: "Peinture",
            faience: "Faïence + peinture",
            aucun: "Aucun",
          } as Record<string, string>,
          ceilingOptions: {
            peinture: "Peinture",
            plaque: "Plaque + peinture",
            aucun: "Aucun",
          } as Record<string, string>,
          rulesTitle: "Ce que MENAO calcule",
          rules: [
            "Surfaces : somme des surfaces du relevé, pièce par pièce.",
            "Plinthes : périmètre moins une porte de 0,83 m par pièce.",
            "Faïence : périmètre × hauteur de faïence, moins la porte.",
            "Murs peints : périmètre × hauteur, moins faïence, portes et fenêtres (1,5 m² chacune).",
            "Appareils, portes et fenêtres : comptés sur le plan. Électricité : minimum de la norme NF C 15-100 par pièce, à vérifier.",
            "Ce qui ne se mesure pas sur le relevé (toiture, cloisons, réseaux…) reste à compléter.",
          ],
          rulesByTrade: [
            [
              "Carrelage",
              "Sol des pièces carrelées, ragréage, plinthes (périmètre moins les portes), faïence (périmètre × hauteur moins les portes).",
            ],
            ["Peinture", "Plafonds, murs (périmètre × hauteur moins ouvertures et faïence)."],
            ["Plâtrerie", "Plafonds en plaque ; cloisons et doublages à compléter."],
            ["Plomberie", "Appareils comptés sur le plan, un poste par type."],
            [
              "Électricité",
              "Points lumineux et prises au minimum de la norme NF C 15-100, par pièce, à vérifier.",
            ],
          ] as const,
          rulesNote:
            "Conventions : une porte de 0,83 m par pièce, 1,5 m² par fenêtre, faïence de 2,10 m (1,20 m aux WC).",
          othersTitle: "Autres métiers",
          othersText:
            "Maçonnerie, menuiseries, couverture… : MENAO prépare les postes qu'il peut mesurer sur le plan. Les autres restent « à compléter ».",
          create: "Créer le DPGF",
          recreate: "Recréer le DPGF",
          recreateWarning:
            "Le DPGF actuel est remplacé : vos quantités corrigées et vos prix saisis sont perdus.",
          creating: "Calcul du DPGF…",
          invalid: "Vérifiez les revêtements (hauteur de faïence entre 0,1 et 4 m).",
        },
        created: (lots: number, posts: number, missing: number) =>
          `DPGF créé : ${lots} lot${lots > 1 ? "s" : ""}, ${posts} poste${posts > 1 ? "s" : ""}${missing ? `, dont ${missing} à compléter` : ""}. Vérifiez chaque quantité.`,
        toVerify: (missing: number, photo: number) =>
          [
            "Quantités lues et calculées sur les plans : à vérifier.",
            missing ? `${missing} poste${missing > 1 ? "s" : ""} à compléter.` : null,
            photo
              ? `${photo} quantité${photo > 1 ? "s" : ""} tirée${photo > 1 ? "s" : ""} d'une photo.`
              : null,
          ]
            .filter(Boolean)
            .join(" "),
        quantitySource: {
          plan: "Plan",
          calcul: "Calculé",
          photo: "Photo : à vérifier",
          manque: "À compléter",
          saisi: "Saisi",
        } as Record<string, string>,
        detail: "Calcul",
        origin: "Origine",
        // Écran du DPGF créé (maquette du lot 35, écran 4).
        lotsLabel: "Lots du DPGF",
        lotPosts: (n: number) => `${n} poste${n > 1 ? "s" : ""}`,
        lotMissing: (n: number) => `${n} à compléter`,
        lotComplete: "Complet",
        tableHint: "Cliquez une ligne pour voir son calcul",
        quantity: "Quantité",
        lotTotal: (code: string) => `Total du ${code ? code.toLocaleLowerCase("fr-FR") : "lot"} HT`,
        detailLabel: "Détail du calcul",
        detailEyebrow: (code: string) => `Poste ${code} · détail du calcul`,
        noDetail: "Quantité saisie : pas de calcul.",
        checkMissing: (n: number, total: number) =>
          `${n} poste${n > 1 ? "s" : ""} à compléter sur ${total}`,
        checkPhoto: (n: number) =>
          `${n} quantité${n > 1 ? "s" : ""} tirée${n > 1 ? "s" : ""} d'une photo`,
        totalTtc: "Total TTC",
        figureMissing: "À compléter",
        figureMissingHint: "postes sans quantité",
        check: {
          title: "Avant d'exporter",
          label:
            "J'ai vérifié les quantités lues et calculées sur les plans. Je sais que j'en reste responsable au forfait.",
          locked: "Cochez « J'ai vérifié les quantités » pour télécharger l'Excel et le PDF.",
          stillOpen: "Le chiffrage et le passage en devis restent ouverts.",
          error: "La case n'a pas pu être enregistrée. Réessayez.",
        },
        releveTitle: "Relevé et revêtements",
        exportBlocked:
          "Vérifiez les quantités avant de télécharger : cochez « J'ai vérifié les quantités ».",
        excel: "Excel du DPGF",
        excelHint: "Un classeur avec vos lots, vos quantités, vos prix et les totaux.",
      },
      fields: {
        name: "Nom du projet",
        namePlaceholder: "Maison individuelle — Mougins",
        client: "Architecte ou maître d'œuvre",
        clientNote: "(facultatif)",
        due: "Date de remise des offres",
        dueNote: "(facultative)",
        dueShort: "Date de remise",
        file: "DPGF de l'architecte",
        fileHint:
          "Excel (.xlsx) de préférence : MENAO le remplit tel quel. Un PDF est lu par l'IA, à vérifier ligne à ligne. 15 Mo au plus.",
      },
      submit: "Lire le DPGF",
      reading: "Lecture du DPGF…",
      errors: {
        name: "Indiquez le nom du projet.",
        file: "Choisissez le DPGF de l'architecte, en Excel (.xlsx) ou en PDF.",
        tooLarge: "Le fichier dépasse 15 Mo.",
        upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
        forbidden: "Les appels d'offres sont inclus dans la formule Entreprise.",
        generic: "Une erreur est survenue. Réessayez.",
      } as Record<string, string>,
      importOk: (posts: number, priced: number) =>
        `DPGF lu : ${posts} poste${posts > 1 ? "s" : ""}, dont ${priced} avec un prix repris de vos devis.`,
      importStatus: {
        no_header:
          "MENAO n'a pas trouvé le tableau du DPGF (colonnes « Désignation », « Unité », « Quantité », « Prix »). Vérifiez le fichier.",
        unreadable:
          "Ce fichier n'a pas pu être lu (Excel abîmé, ou PDF trop flou). Déposez une version plus nette, au format .xlsx de préférence.",
        no_sheet: "Ce fichier n'est ni un classeur Excel ni un PDF.",
        not_dpgf:
          "Ce PDF ne ressemble pas à un DPGF (tableau de lots et d'ouvrages à chiffrer). Vérifiez le document.",
        too_long:
          "Ce DPGF est trop long pour être lu en PDF. Demandez la version Excel à l'architecte et déposez-la.",
        unavailable:
          "La lecture du PDF est momentanément indisponible. Réessayez dans quelques minutes.",
        rate_limited: "Trop de lectures en peu de temps. Réessayez dans une heure.",
        forbidden: "Les appels d'offres sont inclus dans la formule Entreprise.",
        error: "Le DPGF n'a pas pu être lu. Réessayez.",
      } as Record<string, string>,
      warnings: {
        sans_colonne_prix:
          "Le DPGF n'a pas de colonne de prix : le fichier rendu reprendra vos quantités, et vos prix seront dans le PDF.",
        sans_quantites:
          "Le DPGF ne donne pas de quantités : indiquez les vôtres pour chaque poste.",
        tronque: "Le DPGF dépasse 1 000 lignes : seules les 1 000 premières sont reprises.",
        pdf: "DPGF lu dans un PDF par l'IA : vérifiez chaque poste, son unité et sa quantité, avant de chiffrer.",
      } as Record<string, string>,
      listLabel: "Vos appels d'offres",
      empty: "Aucun appel d'offres pour l'instant.",
      columns: { project: "Projet", status: "Suivi", due: "Remise", total: "Total HT" },
      dueOn: (date: string) => `remise le ${date}`,
      status: {
        en_cours: "En cours",
        envoye: "Envoyé",
        retenu: "Retenu",
        perdu: "Non retenu",
      } as Record<string, string>,
      back: "Appels d'offres",
      figuresLabel: "Le DPGF en chiffres",
      figures: {
        posts: "Postes",
        priced: (n: number) => `${n} chiffré${n > 1 ? "s" : ""}`,
        toPrice: "À chiffrer",
        toPriceHint: (n: number) => (n === 0 ? "tout est chiffré" : "prix ou quantité manquant"),
        totalHt: "Total HT",
        totalTtc: (value: string) => `${value} TTC`,
        gaps: "Écarts avec le DPGF",
        gapsHint: (amount: string | null) =>
          amount ? `${amount} HT de travaux en plus` : "aucune quantité changée",
      },
      table: {
        label: "Postes du DPGF",
        code: "N°",
        designation: "Désignation",
        unit: "U.",
        architectQuantity: "Qté DPGF",
        quantity: "Votre qté",
        unitPrice: "Prix unitaire HT",
        total: "Total HT",
        quantityOf: (designation: string) => `Votre quantité : ${designation}`,
        priceOf: (designation: string) => `Prix unitaire HT : ${designation}`,
      },
      source: {
        devis: "Vos devis",
        bibliotheque: "Bibliothèque",
        manuel: "Saisi",
        none: "À chiffrer",
        reference: (designation: string) => `Repris de votre ligne « ${designation} »`,
      },
      vat: "TVA de l'offre",
      vatOptions: { 2000: "20 %", 1000: "10 %", 550: "5,5 %", 0: "Non applicable" } as Record<
        number,
        string
      >,
      save: "Enregistrer",
      saved: "Enregistré.",
      unsaved: "Modifications non enregistrées",
      exportTitle: "Rendre le DPGF",
      exportExcel: "Excel au format de l'architecte",
      exportExcelMenao: "Excel du DPGF chiffré",
      exportExcelMenaoHint:
        "Un classeur avec les postes du PDF, les quantités du DPGF et les vôtres, vos prix et les totaux.",
      exportExcelHint:
        "Son fichier, avec vos quantités et vos prix ; ses formules et sa mise en page sont gardées. Une feuille « Écarts MENAO » liste les quantités changées.",
      exportPdf: "PDF à joindre à l'offre",
      exportPdfHint: "Avec votre logo, vos mentions et le rappel des quantités du DPGF.",
      download: "Télécharger",
      saveFirst: "Enregistrez vos modifications avant de télécharger.",
      followTitle: "Suivi",
      followSave: "Mettre à jour",
      deleteTitle: "Supprimer l'appel d'offres",
      deleteConfirm: "Le DPGF et vos prix seront supprimés. Vos devis ne changent pas.",
      deleteYes: "Oui, supprimer",
      responsibility:
        "C'est un forfait : vous restez responsable de vos quantités. MENAO propose vos prix habituels, vérifiez-les avant d'envoyer.",
      // Passage en devis MENAO (F-138, ADR 0289) : le client passe par la fiche de l'artisan.
      toQuote: {
        title: "Passer en devis MENAO",
        steps: [
          "Envoyez à votre client (maître d'ouvrage) le lien de votre fiche MENAO : il décrit ses travaux, la demande n'arrive qu'à vous.",
          "Acceptez sa demande et fixez le rendez-vous, comme pour toute demande.",
          "Dans l'éditeur du devis, « Reprendre un DPGF » ajoute ces postes chiffrés : signature en ligne, acompte et chantier suivent.",
        ],
        link: "Lien de votre fiche",
        copy: "Copier",
        copied: "Copié",
        email: "Envoyer par e-mail",
        subject: (project: string) => `Votre devis — ${project}`,
        body: (project: string, url: string, company: string) =>
          `Bonjour,\n\nPour recevoir mon devis « ${project} » et le signer en ligne, décrivez vos travaux depuis ma fiche MENAO (votre demande n'arrivera qu'à moi) :\n${url}\n\nBien cordialement,\n${company}`,
        noPage:
          "Votre fiche publique n'est pas encore en ligne : complétez votre profil (Ma vitrine) pour obtenir son lien.",
      },
    },
    partners: {
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
    /** Fiches demande et chantier, refonte « Nette » (ADR 0246). */
    sheet: {
      answerWithin: "Répondez sous",
      hoursLeft: (h: number) => (h < 1 ? "< 1 h" : `${h} h`),
      expiryNote: "Au-delà de 72 h, la demande expire.",
      received: (day: string) => `reçue le ${day}`,
      waiting: (name: string | null) => `${name ?? "Le client"} attend votre réponse`,
      waitingHint: "Fixez une visite : le client reçoit le créneau et vous voyez ses coordonnées.",
      briefBadge: "Résumé MENAO",
      clientSays: "Ce que dit le client",
      messageForYou: "Son message pour vous",
      details: "Détails du chantier",
      detail: {
        lieu: "Logement",
        rooms: "Pièce",
        works: "Travaux",
        budget: "Budget",
        start: "Début souhaité",
      },
      particulier: "Particulier",
      expertiseTitle: "Il faut un autre métier ?",
      expertiseText: "Indiquez-le : l'équipe MENAO proposera un artisan adapté au client.",
      nextStep: "Prochaine étape",
      next: {
        quote: "Le rendez-vous est passé ? Préparez le devis.",
        quoteText: (name: string) => `${name} le reçoit par e-mail et peut le signer en ligne.`,
        quoteRevision: (name: string) => `${name} demande une modification du devis.`,
        quoteRevisionText: "Corrigez le devis puis renvoyez-le.",
        quoteWaiting: (name: string) => `Devis envoyé : ${name} doit le signer.`,
        quoteWaitingText: "Vous serez prévenu dès sa réponse.",
        depositWaiting: (name: string) => `Devis signé : ${name} doit payer l'acompte.`,
        depositWaitingText: "La date de démarrage se fixe une fois l'acompte reçu.",
        start: "Confirmez la date de démarrage des travaux.",
        startText: "Le client est prévenu de la date choisie.",
        finish: "Travaux finis ? Déclarez le chantier terminé.",
        finishText: (name: string) => `${name} sera invité à réceptionner les travaux.`,
        finishTextBalance: (name: string, amount: string) =>
          `${name} sera invité à réceptionner, puis à payer le solde de ${amount}.`,
        reception: (name: string) => `En attente de la réception par ${name}.`,
        reserves: "Réserves à lever : signalez-les une fois reprises.",
        reservesText: (name: string) => `${name} sera invité à vérifier les reprises.`,
      },
      money: "Argent du chantier",
      signedQuote: "Devis signé",
      sentQuote: "Devis envoyé",
      deposit: "Acompte",
      depositPaid: "Acompte reçu",
      depositPaidOn: (day: string) => `le ${day}`,
      depositPending: "en attente du paiement",
      balance: "Solde",
      balancePaid: "Solde reçu",
      balanceHint: "à la réception des travaux",
      startPayment: "Au démarrage",
      startPaid: "Démarrage reçu",
      startHint: "dû le jour où les travaux commencent",
      seeQuote: "Voir le devis",
      planning: "Planning",
      appointment: "Rendez-vous",
      start: "Démarrage",
      clientCard: "Client",
      messages: "Messages",
      quoteHeading: (title: string) => `Devis · ${title}`,
      visitOn: (day: string) => `visite du ${day}`,
      steps: { lignes: "Lignes", apercu: "Aperçu", envoi: "Envoi" },
      figures: {
        quotesLabel: "Chiffres des devis",
        pending: "En attente de signature",
        pendingHint: (n: number) => (n <= 1 ? `${n} devis envoyé` : `${n} devis envoyés`),
        toSend: "À envoyer",
        toSendHint: "brouillons à terminer",
        signRate: "Taux de signature",
        signRateHint: "sur les 6 derniers mois",
        invoicesLabel: "Chiffres des factures",
        invoicedMonth: "Facturé ce mois",
        invoicedMonthHint: (n: number) => (n <= 1 ? `${n} facture` : `${n} factures`),
        invoicedYear: "Facturé cette année",
        invoicedHint: "Une facture est créée à chaque paiement reçu.",
        expensesLabel: "Chiffres des dépenses",
        spentMonth: "Dépenses du mois",
        spentMonthHint: (n: number, vat: string) =>
          `${n <= 1 ? `${n} dépense` : `${n} dépenses`} · ${vat} de TVA`,
        toPay: "Reste à payer",
        toPayHint: (overdue: string | null) =>
          overdue ? `dont ${overdue} en retard` : "rien en retard",
      },
      quick: {
        dictation: "Dites vos lignes, MENAO les écrit",
        articles: "Mes articles",
        articlesHint: "Reprendre un article déjà chiffré",
        nextSteps: "Échéancier, dates des travaux et durée de validité à l'étape « Envoi ».",
      },
      tabSuivi: "Suivi",
      tabDossier: "Dossier",
      journalVisible: (name: string) => `${name} voit ce fil`,
      journalEmpty: "Aucune photo ni aucun message pour l'instant.",
      today: "Aujourd'hui",
      yesterday: "Hier",
    },
    // Listes « Demandes » et « Chantiers » (refonte « Nette », lot 3, ADR 0248).
    worklists: {
      requestsLabel: "Chiffres des demandes",
      open: "À traiter",
      openShort: "à traiter",
      openHint: (left: string | null) =>
        left ? `la plus urgente : ${left} restantes` : "aucune demande en attente",
      urgentShort: "plus urgente",
      month: "Reçues ce mois",
      monthHint: (n: number) => (n <= 1 ? `dont ${n} acceptée` : `dont ${n} acceptées`),
      responseShort: "temps de réponse",
      openGroup: "À traiter",
      doneGroup: "Déjà traitées",
      leftShort: "pour répondre",
      chantiersLabel: "Chiffres des chantiers",
      appointments: "Rendez-vous à venir",
      appointmentsShort: "rendez-vous",
      noAppointment: "aucun pour le moment",
      nextAppointment: (day: string, time: string) => `le prochain ${day} à ${time}`,
      waiting: "En attente du client",
      waitingShort: "attente client",
      waitingHint: (quotes: number, deposits: number) =>
        `${quotes} devis à signer, ${deposits} acompte${deposits > 1 ? "s" : ""}`,
      works: "En travaux",
      worksShort: "en travaux",
      worksHint: (planned: number, ongoing: number) =>
        `${planned} planifié${planned > 1 ? "s" : ""}, ${ongoing} en cours`,
      closed: "Chantiers terminés",
      closedHint: "clôturés, solde payé",
      filtersLabel: "Filtrer les chantiers",
      phases: {
        tous: "Tous",
        avant_devis: "Avant devis",
        devis_paiement: "Devis et paiement",
        travaux: "Travaux",
        termines: "Terminés",
      },
      search: "Rechercher un client, une ville…",
      searchLabel: "Rechercher un chantier",
      noMatch: "Aucun chantier ne correspond.",
      finishedGroup: "Terminés",
      columns: {
        chantier: "Chantier",
        next: "Prochaine étape",
        progress: "Avancement",
        status: "État",
      },
      steps: ["Signature", "Paiement", "Planification", "Travaux", "Réception"],
      stepOf: (label: string, n: number, total: number) => `${label} · ${n}/${total}`,
      stepsDone: "Terminé",
      progressLabel: "Avancement : ",
      quoteToSend: "Devis à envoyer",
      next: {
        demande_envoyee: "Rendez-vous à fixer",
        rdv_planifie: "Rendez-vous à fixer",
        devis_envoye: "Signature du client attendue",
        devis_en_revision: "Devis à modifier",
        devis_refuse: "Devis refusé",
        devis_signe: "Acompte attendu",
        acompte_paye: "Date de démarrage à fixer",
        planifie: "Date de démarrage à fixer",
        en_cours: "Fin des travaux à déclarer",
        travaux_termines: "Réception par le client",
        reserves_a_lever: "Réserves à lever",
        receptionne: "Solde attendu",
        cloture: "Chantier terminé",
        en_litige: "Litige en cours",
        annule: "Chantier annulé",
      },
    },
    expertise: {
      open: "Ce chantier a besoin d'une expertise",
      title: "Ce chantier a besoin d'une expertise",
      intro:
        "Indiquez le corps de métier nécessaire : l'équipe MENAO proposera un artisan adapté au client.",
      trade: "Corps de métier nécessaire",
      choose: "Choisissez un métier",
      message: "Précisions",
      messageNote: "(facultatif)",
      submit: "Envoyer à l'équipe MENAO",
      sent: "Merci ! L'équipe MENAO a bien reçu votre signalement.",
    },
    /** « Je pense que ce n'est pas un vrai particulier » (ADR 0157), sur chaque demande. */
    fakeClient: {
      open: "Je pense que ce n'est pas un vrai particulier",
      title: "Signaler un faux particulier",
      intro:
        "Un professionnel qui se fait passer pour un particulier pour connaître vos prix ? Dites-le-nous : l'équipe MENAO vérifie la demande, en toute discrétion.",
      detail: "Ce qui vous fait penser cela",
      detailNote: "(facultatif)",
      submit: "Envoyer le signalement",
      sent: "Merci : l'équipe MENAO va vérifier cette demande.",
    },
    /**
     * Pages Espace Pro par métier (ADR 0134) : acquisition des artisans sur Google et dans les
     * assistants IA (« chantiers de plombier dans les Alpes-Maritimes »). Aucun chiffre inventé.
     */
    tradeLanding: {
      metaTitle: (trade: string) =>
        `Artisan ${trade.toLowerCase()} dans les Alpes-Maritimes : trouvez des chantiers`,
      metaDescription: (trade: string) =>
        `Artisan ${trade.toLowerCase()} dans les Alpes-Maritimes ? Recevez les demandes des particuliers de votre zone, sans commission : devis, signature, paiement et suivi de chantier dans une seule app.`,
      eyebrow: "Espace Pro · Alpes-Maritimes",
      breadcrumb: "Espace Pro",
      audience: (trade: string) => `Artisans ${trade.toLowerCase()}s des Alpes-Maritimes`,
      title: (trade: string) => `Artisan ${trade.toLowerCase()} : des chantiers près de chez vous`,
      subtitle: (trade: string) =>
        `MENAO vous transmet les demandes des particuliers qui cherchent un ${trade.toLowerCase()} vérifié dans votre zone. Vous gardez 100\u00a0% de vos chantiers : aucune commission, et chaque paiement arrive directement sur votre compte.`,
      signUp: "Créer mon compte pro",
      more: "Découvrir l'Espace Pro",
      worksEyebrow: "Vos chantiers",
      worksTitle: (trade: string) =>
        `Les travaux que demandent les clients d'un ${trade.toLowerCase()}`,
      worksSubtitle:
        "Les prestations que les particuliers peuvent décrire sur MENAO pour ce métier.",
      citiesEyebrow: "Votre zone",
      citiesTitle: "Les communes où MENAO démarre",
      citiesSubtitle:
        "Vous choisissez votre zone d'intervention : un rayon autour de votre adresse, une liste de communes, des départements, des régions ou toute la France.",
      clientPage: (trade: string) => `Voir la page ${trade.toLowerCase()} côté particuliers`,
      faqTitle: (trade: string) => `Questions fréquentes des artisans ${trade.toLowerCase()}s`,
      faq: (trade: string) => [
        {
          q: `Combien coûte MENAO pour un artisan ${trade.toLowerCase()} ?`,
          a: "Le même prix pour tous les métiers : un abonnement mensuel fixe, sans engagement de durée, et aucune commission ni marge sur vos chantiers. Les formules sont détaillées sur la page Espace Pro.",
        },
        {
          q: "Que faut-il pour m'inscrire ?",
          a: "Votre numéro SIRET (MENAO vérifie votre entreprise au registre ; un Kbis n'est demandé que si cette vérification échoue), vos attestations d'assurance décennale (si votre activité y est soumise) et de responsabilité civile professionnelle, votre attestation de vigilance URSSAF et une pièce d'identité. L'équipe MENAO vérifie votre entreprise et vos documents avant de vous rendre visible.",
        },
        {
          q: "Combien d'artisans reçoivent la même demande ?",
          a: "Trois au plus. Vous avez 72\u00a0h pour l'accepter ou la refuser ; l'adresse exacte et les coordonnées du client vous sont transmises dès que vous acceptez.",
        },
        {
          q: "Comment suis-je payé ?",
          a: "Vos clients règlent l'acompte puis le solde en ligne, par carte bancaire, sur votre compte Stripe à votre nom. MENAO ne détient jamais l'argent de vos chantiers.",
        },
      ],
      ctaTitle: "Prêt à recevoir vos premières demandes de chantier ?",
      ctaText:
        "Créez votre profil en quelques minutes : l'équipe MENAO vérifie votre entreprise, puis les demandes de votre zone arrivent dans votre espace.",
      proTeaser: (trade: string) =>
        `Vous êtes ${trade.toLowerCase()} ? Recevez les demandes des particuliers de votre zone`,
      byTradeEyebrow: "Par métier",
      byTradeTitle: "MENAO pour votre métier",
      byTradeSubtitle: "Les travaux demandés et les réponses aux questions de chaque métier.",
    },
    landing: {
      // Encart « Espace Pro » de l'accueil.
      teaser:
        "MENAO met en relation les artisans du bâtiment vérifiés avec des particuliers. Devis, signature, paiement et suivi de chantier dans un seul outil. Abonnement mensuel, zéro commission.",
      metaTitle: "Espace Pro : des chantiers près de chez vous, zéro commission",
      metaDescription:
        "Recevez les demandes qualifiées des particuliers de votre zone. Devis dictés, signature, acompte et facture dans une seule app. Abonnement fixe, aucune commission, 2 mois offerts.",
      hero: {
        eyebrow: "Espace Pro · Alpes-Maritimes",
        titleLead: "Remplissez votre agenda.",
        titleAccent: "Gardez 100\u00a0% de vos chantiers.",
        subtitle:
          "Les demandes des particuliers de votre zone, déjà qualifiées. Devis, signature, paiements et factures dans une seule app, et chaque paiement arrive directement sur votre compte. Aucune commission, jamais.",
        signUp: "Créer mon compte pro",
        plans: "Voir les formules",
        signIn: "J'ai déjà un compte",
        // Lot 19 (ADR 0265) : ouvre le formulaire de rappel de l'assistant (ADR 0218).
        callback: "Être rappelé",
        proofs: [
          "0\u00a0% de commission",
          "Paiements versés sur votre compte",
          "2 mois offerts, sans engagement",
        ],
      },
      // Lot 19 (ADR 0265). TODO(legal) : faire relire la bande de preuves et les assistants.
      proofStrip: {
        label: "Les engagements de MENAO envers les artisans",
        items: [
          { value: "0\u00a0%", label: "de commission sur vos chantiers" },
          { value: "3", label: "artisans au plus par demande" },
          { value: "100\u00a0%", label: "des paiements versés sur votre compte" },
          { value: "2 mois", label: "d'essai offerts" },
        ],
      },
      agents: {
        eyebrow: "Assistants IA",
        title: "Pendant que vous êtes sur le chantier, MENAO travaille pour vous.",
        items: [
          {
            title: "Manon répond au téléphone",
            text: "Votre secrétaire prend les appels quand vous êtes sur le chantier, note la demande et fixe le rendez-vous dans votre agenda.",
          },
          {
            title: "Le devis se prépare tout seul",
            text: "Brouillon prêt dès la demande, à partir des photos et de votre catalogue. Vous relisez, vous envoyez.",
          },
          {
            title: "Vos tickets sont lus",
            text: "Photographiez un ticket : la dépense est classée et envoyée à votre comptable.",
          },
          {
            title: "Vos clients sont relancés",
            text: "Devis à signer, paiement en attente, rendez-vous du lendemain : rappels automatiques.",
          },
        ],
        more: "Voir ce qui est inclus dans chaque formule",
        callLabel: "Exemple de compte rendu d'appel de Manon",
        callTitle: "Manon · appel entrant",
        callMeta: "06 •• •• •• 41 · il y a 12 min",
        callStatus: "RDV pris",
        callText:
          "Mme Bernard, Antibes : fuite sous l'évier depuis hier. Rendez-vous fixé jeudi à 9h dans votre agenda. Photos demandées par SMS.",
        draftTitle: "Brouillon de devis prêt",
        draftText: "Salle de bain · Antibes : 6 lignes à relire depuis votre catalogue.",
        draftTime: "il y a 1 h",
      },
      plansCompare: "Comparer les formules en détail",
      // Pages par fonction (lot 21, ADR 0267) : faits repris de la FAQ des artisans et des
      // réglages de l'espace pro. TODO(legal) : faire relire les promesses avant l'ouverture.
      featurePages: {
        breadcrumb: "Espace Pro",
        stepsEyebrow: "Comment ça marche",
        gainsEyebrow: "Ce que vous y gagnez",
        gainsTitle: "Moins de soirées sur les papiers.",
        includedEyebrow: "Formules",
        includedHead: "Dans chaque formule",
        faqEyebrow: "Questions fréquentes",
        othersEyebrow: "Tout-en-un",
        othersTitle: "Les autres outils de MENAO",
        discover: "Découvrir",
        trial: "2 mois d'essai offerts",
        noCommission: "Sans commission",
        toolsEyebrow: "Tout-en-un",
        toolsTitle: "Les outils MENAO pour votre métier",
        guideTitle: "Facture électronique : ce qui change pour les artisans du bâtiment",
        guideEyebrow: "À lire",
        pages: {
          "logiciel-devis": {
            eyebrow: "Logiciel de devis artisan",
            metaTitle: "Logiciel de devis pour artisan du bâtiment : dictez, MENAO rédige",
            metaDescription:
              "Dictez vos devis sur le chantier : MENAO les met en forme avec la TVA, les totaux et les mentions obligatoires, et votre client les signe en ligne. Sans commission, 2 mois d'essai.",
            title: "Vos devis dictés, prêts en quelques minutes.",
            lead: "Vous dictez les fournitures, les quantités et les prix : MENAO met en forme le devis avec la TVA, les totaux et les mentions obligatoires. Votre client le signe en ligne.",
            availability: "Inclus dès la formule Base",
            stepsTitle: "Du chantier au devis signé.",
            steps: [
              {
                title: "Dictez ou ajoutez vos lignes",
                text: "Matériel, main-d'œuvre ou autre, avec quantité, unité et prix HT : à la main ou à voix haute, jusqu'à 2 minutes par dictée. La recherche retrouve les articles déjà utilisés.",
              },
              {
                title: "MENAO met en forme",
                text: "TVA, totaux, mentions obligatoires, votre logo et votre assurance décennale. Vous vérifiez l'aperçu PDF avant l'envoi. MENAO n'invente aucun prix.",
              },
              {
                title: "Votre client signe en ligne",
                text: "Avec un code à usage unique. Il peut demander une modification ou refuser en disant pourquoi. Le devis est valable 30 jours.",
              },
            ],
            gains: [
              {
                title: "Aucun prix inventé",
                text: "Seuls les prix que vous dictez sont repris : vous gardez la main sur chaque ligne.",
              },
              {
                title: "Vos articles retrouvés",
                text: "La recherche reprend les prestations de vos devis précédents et de votre catalogue.",
              },
              {
                title: "L'acompte à la signature",
                text: "Vous choisissez le pourcentage payé à la signature, 30 % par défaut, le reste à la réception.",
              },
              {
                title: "Les relances automatiques",
                text: "MENAO relance votre client quand un devis attend sa signature ou quand l'acompte n'est pas réglé.",
              },
            ],
            includedTitle: "Inclus dès la formule Base.",
            faqTitle: "Vos questions sur les devis.",
          },
          "secretaire-telephonique": {
            eyebrow: "Secrétaire téléphonique",
            metaTitle: "Secrétaire téléphonique pour artisan : Manon répond à vos clients",
            metaDescription:
              "Quand vous êtes sur le chantier, Manon répond à vos clients avec votre nom, vos horaires et votre agenda : rendez-vous pris dans vos créneaux, ou message transmis tout de suite.",
            title: "Manon répond à vos clients quand vous êtes sur le chantier.",
            lead: "Votre secrétaire dédiée, avec votre nom, vos horaires et votre agenda : rendez-vous pris dans vos créneaux, ou message transmis tout de suite.",
            availability: "Avec Premium et Entreprise",
            stepsTitle: "Votre secrétaire, réglée en quelques minutes.",
            steps: [
              {
                title: "Réglez votre secrétaire",
                text: "Votre nom, vos horaires renseignés dans l'agenda, vos consignes, et si elle peut prendre des rendez-vous de visite.",
              },
              {
                title: "Elle répond quand vous ne décrochez pas",
                text: "Elle note la demande du client, puis fixe le rendez-vous dans vos créneaux libres ou vous transmet le message.",
              },
              {
                title: "Vous retrouvez tout",
                text: "Messages et rendez-vous arrivent dans « Secrétaire » et dans votre agenda, à traiter quand vous le voulez.",
              },
            ],
            gains: [
              {
                title: "Plus d'appel perdu",
                text: "Le client qui appelle pendant que vous êtes sur un toit ou sous un évier obtient une réponse.",
              },
              {
                title: "Des rendez-vous dans vos créneaux",
                text: "Manon ne réserve que vos créneaux libres, selon les horaires de votre agenda.",
              },
              {
                title: "Des minutes incluses",
                text: "300 minutes par mois avec Premium, 1 000 avec Entreprise, et des recharges si vous en voulez plus.",
              },
              {
                title: "Vos clients rappelés",
                text: "Rappels de rendez-vous par SMS avec Premium, par appel et SMS avec Entreprise.",
              },
            ],
            includedTitle: "Avec Premium et Entreprise.",
            faqTitle: "Vos questions sur la secrétaire.",
          },
          "acompte-en-ligne": {
            eyebrow: "Acompte en ligne",
            metaTitle: "Acompte en ligne pour artisan : payé directement sur votre compte",
            metaDescription:
              "Votre client paie l'acompte en ligne après avoir signé le devis, puis le solde après la réception. Chaque paiement arrive sur votre compte Stripe, sans commission.",
            title: "Acompte et solde payés en ligne, directement sur votre compte.",
            lead: "Votre client règle l'acompte après avoir signé, puis le solde après la réception. Chaque paiement arrive sur votre compte Stripe : MENAO ne touche jamais à votre argent.",
            availability: "Inclus dès la formule Base",
            stepsTitle: "Du devis signé au solde encaissé.",
            steps: [
              {
                title: "Choisissez l'acompte",
                text: "À l'envoi du devis, vous fixez le pourcentage payé à la signature, 30 % par défaut, ou votre propre échéancier.",
              },
              {
                title: "Votre client paie en ligne",
                text: "Il règle l'acompte par carte après avoir signé, puis le solde après la réception, une fois les réserves levées.",
              },
              {
                title: "L'argent arrive sur votre compte",
                text: "Chaque paiement arrive sur votre compte Stripe, puis il est viré sur votre compte bancaire selon le calendrier de vos virements.",
              },
            ],
            gains: [
              {
                title: "Directement chez vous",
                text: "MENAO ne prélève ni commission ni marge, et ne détient jamais votre argent.",
              },
              {
                title: "Moins de relances",
                text: "MENAO relance votre client quand l'acompte n'est pas réglé.",
              },
              {
                title: "Les gros chantiers en tranches",
                text: "Avec Premium et Entreprise, un échéancier en plusieurs tranches pour les situations de travaux.",
              },
              {
                title: "Les factures suivent",
                text: "Une facture d'acompte puis une facture de solde sont émises à votre nom à chaque paiement.",
              },
            ],
            includedTitle: "Inclus dès la formule Base.",
            faqTitle: "Vos questions sur les paiements.",
          },
          facturation: {
            eyebrow: "Facturation et dépenses",
            metaTitle: "Facturation pour artisan : factures automatiques et dépenses lues",
            metaDescription:
              "Factures d'acompte et de solde émises à chaque paiement, tickets de dépenses lus automatiquement, envoi à votre comptable chaque mois ou chaque trimestre.",
            title: "Vos factures se font toutes seules.",
            lead: "Une facture d'acompte puis une facture de solde à chaque paiement, numérotées sans interruption. Vos tickets sont lus, et votre comptable reçoit tout chaque mois.",
            availability: "Inclus dès la formule Base",
            stepsTitle: "Votre comptabilité, sans y penser.",
            steps: [
              {
                title: "Les factures se font à chaque paiement",
                text: "Facture d'acompte puis facture de solde, à votre nom, numérotées sans interruption, dans « Argent ».",
              },
              {
                title: "Vos tickets sont lus",
                text: "Photographiez une facture ou un ticket : MENAO lit les montants, vous vérifiez avant d'enregistrer.",
              },
              {
                title: "Votre comptable reçoit tout",
                text: "Chaque mois ou chaque trimestre, factures et dépenses de la période, tableaux et pièces, par un lien de téléchargement.",
              },
            ],
            gains: [
              {
                title: "Plus de facture oubliée",
                text: "Chaque paiement reçu donne sa facture, sans rien saisir.",
              },
              {
                title: "Un export prêt",
                text: "Vos factures s'exportent en CSV pour votre comptable.",
              },
              {
                title: "Vos dépenses par chantier",
                text: "Chaque dépense peut être rattachée à un chantier, et vous suivez ce qu'il reste à payer.",
              },
              {
                title: "Votre marge réelle",
                text: "Avec Premium et Entreprise, les dépenses comparées au montant facturé, chantier par chantier.",
              },
            ],
            includedTitle: "Inclus dès la formule Base.",
            faqTitle: "Vos questions sur les factures.",
          },
        },
      },
      // Page d'atterrissage des campagnes, sans menu (lot 20, ADR 0266).
      campaign: {
        metaTitle: "Rejoindre MENAO : des chantiers près de chez vous, zéro commission",
        metaDescription:
          "Artisan du bâtiment dans les Alpes-Maritimes : recevez les demandes qualifiées de votre zone, sans commission. 2 mois d'essai gratuits.",
        badge: "Pro",
        step: "Étape 1 sur 4 · 2 minutes",
        question: "Quel est votre métier ?",
        tradesLabel: "Vos métiers",
        continue: (n: number) =>
          n === 0 ? "Choisissez un métier" : `Continuer · ${n} métier${n > 1 ? "s" : ""}`,
        more: (n: number) => `+ ${n} métiers`,
        noPay: "Rien à payer avant la vérification",
        already: "Déjà inscrit ?",
        signIn: "Connexion",
        subtitle:
          "Les demandes des particuliers de votre zone, déjà qualifiées. Devis, signature, paiements et factures dans une seule app. Aucune commission, jamais.",
        benefits: [
          {
            title: "Des demandes qualifiées",
            text: "Besoin, photos, commune et délais : vous choisissez vos chantiers en connaissance de cause. Trois artisans au plus par demande.",
          },
          {
            title: "Vous dictez, MENAO rédige le devis",
            text: "Chaque prestation devient une ligne chiffrée, avec TVA et mentions obligatoires. Votre client signe en ligne.",
          },
          {
            title: "Payé directement sur votre compte",
            text: "Acompte et solde par carte, versés sur votre compte Stripe. MENAO ne touche jamais à votre argent.",
          },
          {
            title: "Manon répond au téléphone",
            text: "Votre secrétaire prend les appels quand vous êtes sur le chantier et fixe le rendez-vous dans votre agenda.",
          },
        ],
        priceFrom: "Dès",
        priceUnit: (plan: string) => `HT / mois · formule ${plan}`,
        priceOthers: (premium: string, entreprise: string) =>
          `Premium ${premium} et Entreprise ${entreprise} HT / mois, avec Manon au téléphone. Au mois sans engagement, ou à l'année avec 2 mois offerts.`,
      },
      // Fragments d'interface des cartes de l'outil (valeurs d'exemple, ADR 0265).
      featureVisuals: {
        signedBy: "Signé par Camille R.",
        signature: "Camille R.",
        codeOk: "Code de vérification validé",
        deposit: "+ 1 456,29 €",
        depositNote: "Acompte versé sur votre compte · Stripe",
        agenda: [
          { time: "9h00", label: "Visite · Antibes" },
          { time: "14h30", label: "Chantier · Nice" },
        ],
        pv: "PV signé · sans réserve",
        invoices: [
          { title: "Facture d'acompte", ref: "FA-2026-031" },
          { title: "Facture de solde", ref: "FA-2026-032" },
        ],
        review: "« Travail propre, délais tenus. »",
      },
      // Questions sur les objections, reprises de la FAQ des artisans (ADR 0265).
      objections: [
        "MENAO prend-il une commission sur mes chantiers ?",
        "Combien d'artisans reçoivent la même demande ?",
        "Dois-je payer avant d'être vérifié, et quand commence l'essai de 2 mois ?",
        "Puis-je arrêter mon abonnement ?",
        "Une formule plus chère améliore-t-elle mon classement ?",
        "Combien de temps faut-il pour s'inscrire ?",
      ],
      plansPage: {
        metaTitle: "Formules et prix pour les artisans",
        metaDescription:
          "Base, Premium ou Entreprise : un abonnement fixe, aucune commission, 2 mois d'essai gratuits. Comparez les formules, les assistants IA et calculez votre rentabilité.",
        breadcrumb: "Formules",
        faqTitle: "Vos questions avant de vous lancer.",
        agentsWritten: "Assistants écrits : devis dicté, tickets lus, aide",
        agentsVoice: (minutes: string) => `Manon, secrétaire au téléphone · ${minutes} min / mois`,
        agentsLines: (lines: number, minutes: string) =>
          `Manon sur ${lines} lignes · ${minutes} min / mois`,
      },
      calculator: {
        eyebrow: "Rentabilité",
        title: "Combien de chantiers pour rentabiliser votre formule ?",
        text: "Indiquez le montant moyen de vos chantiers et votre marge : le calcul est fait sous vos yeux, sans promesse de volume.",
        plan: "Formule",
        job: "Montant moyen d'un chantier",
        margin: "Votre marge sur un chantier",
        marginPerJob: "Marge par chantier",
        paidBy: (plan: string) => `${plan} remboursé par`,
        every: (months: number) =>
          months === 1 ? "1 chantier par mois" : `1 chantier tous les ${months} mois`,
        perMonth: (jobs: number) => `${jobs} chantiers par mois`,
        note: "Calcul indicatif : prix mensuel de la formule comparé à la marge d'un chantier moyen. MENAO ne garantit aucun nombre de demandes.",
      },
      video: {
        eyebrow: "En vidéo",
        title: "MENAO en 60 secondes",
        subtitle:
          "De la demande de votre client à la réception du chantier : voyez comment MENAO vous accompagne à chaque étape.",
        label: "Vidéo de démonstration de MENAO, avec voix off et sous-titres",
        captions: "Français",
        fallback: "Votre navigateur ne peut pas lire cette vidéo.",
      },
      preview: {
        label:
          "Illustration : une demande de chantier qualifiée, un devis signé et un acompte reçu dans l'application MENAO.",
        request: "Nouvelle demande",
        requestTrade: "Plomberie · 06000 Nice",
        requestSummary: "Fuite sous l'évier de la cuisine, 3 photos jointes",
        requestQualified: "Qualifiée par l'IA",
        requestShared: "3 artisans au plus",
        requestDeadline: "Réponse attendue sous 72 h",
        quote: "Devis",
        quoteNumber: "DEVIS-2026-0012",
        quoteSigned: "Signé en ligne",
        quoteAmount: "1 240,00 € TTC",
        payment: "Acompte reçu",
        paymentAmount: "372,00 €",
        paymentWhere: "sur votre compte",
      },
      pains: {
        eyebrow: "Le constat",
        title: "Votre temps vaut mieux que la prospection.",
        subtitle:
          "Trois choses pèsent sur les artisans du bâtiment. MENAO les règle pour un abonnement fixe.",
        solutionLabel: "Avec MENAO",
        items: [
          {
            title: "Chercher des clients",
            text: "Appels, relances, devis sans réponse : une heure de prospection, c'est une heure de chantier en moins.",
            solution: "Les demandes de votre zone viennent à vous, déjà qualifiées.",
          },
          {
            title: "Payer pour travailler",
            text: "Commissions et contacts achetés sans garantie : vos marges fondent avant le premier coup de pinceau.",
            solution: "Un abonnement fixe. Pas de commission, pas de contact à l'unité.",
          },
          {
            title: "Courir après l'administratif",
            text: "Devis, signatures, acomptes, factures, relances de paiement : la paperasse déborde sur vos soirées.",
            solution: "Devis, signature, paiements et factures au même endroit.",
          },
        ],
      },
      steps: {
        eyebrow: "Comment ça marche",
        title: "De l'inscription au premier chantier.",
        subtitle:
          "L'équipe MENAO vérifie votre entreprise une fois, puis les demandes de votre zone arrivent dans votre espace.",
        items: [
          {
            title: "Créez votre profil pro",
            text: "SIRET, assurances, métiers, zone et réalisations. Nous vérifions votre entreprise avant de vous rendre visible.",
          },
          {
            title: "Recevez des demandes qualifiées",
            text: "Besoin, photos, commune et délais précisés avec l'IA. Trois artisans au plus par demande, et 72\u00a0h pour accepter.",
          },
          {
            title: "Envoyez votre devis en quelques minutes",
            text: "Fixez le rendez-vous, dictez votre devis : MENAO le met en forme avec les mentions obligatoires, votre client le signe en ligne.",
          },
          {
            title: "Encaissez, suivez, facturez",
            text: "Paiements directs sur votre compte, suivi en photos, réception signée et factures automatiques.",
          },
        ],
      },
      features: {
        eyebrow: "Tout-en-un",
        title: "Tout votre chantier dans une seule app.",
        subtitle: "Du premier contact à la facture de solde, sans jongler entre cinq outils.",
        voice: {
          tag: "Dictée du devis",
          title: "Vous dictez, MENAO rédige le devis.",
          text: "Décrivez les travaux à voix haute, sur le chantier ou dans le camion : chaque prestation devient une ligne chiffrée, avec TVA, totaux et mentions obligatoires. Vous relisez, vous envoyez.",
          promise: "MENAO n'invente aucun prix : seuls ceux que vous dictez sont repris.",
          // Illustration (valeurs d'exemple).
          recording: "Dictée en cours",
          transcript:
            "« Mitigeur d'évier, fourniture et pose, 89 euros. Une heure de main-d'œuvre à 55 euros. »",
          lines: [
            { label: "Mitigeur d'évier, fourniture et pose", qty: "1 u", amount: "89,00 €" },
            { label: "Main-d'œuvre", qty: "1 h", amount: "55,00 €" },
          ],
          totalLabel: "Total HT",
          total: "144,00 €",
        },
        request: {
          tag: "Demandes qualifiées",
          title: "Vous savez tout avant d'accepter.",
          text: "Le besoin analysé par l'IA, les photos, la commune et les délais souhaités : vous choisissez vos chantiers en connaissance de cause.",
          checks: ["Besoin analysé", "Photos du chantier", "Commune", "Délais souhaités"],
        },
        items: [
          {
            title: "Signature électronique",
            text: "Votre client signe le devis en ligne, sans imprimer ni scanner.",
          },
          {
            title: "Paiements directs",
            text: "Acompte et solde versés sur votre compte Stripe. MENAO ne touche jamais à votre argent.",
          },
          {
            title: "Suivi, messages et agenda",
            text: "Photos, échanges et rendez-vous au même endroit : votre client suit l'avancement sans vous appeler.",
          },
          {
            title: "Réception et PV",
            text: "Procès-verbal signé en ligne, réserves suivies jusqu'à leur levée.",
          },
          {
            title: "Factures automatiques",
            text: "Factures d'acompte et de solde à votre nom, export prêt pour votre comptable.",
          },
          {
            title: "Avis vérifiés",
            text: "Seuls vos clients peuvent vous noter, après la réception : votre score MENAO reflète votre vrai travail.",
          },
        ],
      },
      commission: {
        eyebrow: "Zéro commission",
        title: "Le montant de vos chantiers vous revient. En entier.",
        text: "Sur MENAO, vous payez un abonnement fixe, et rien d'autre. Vos clients vous paient directement, sur votre compte : MENAO ne prélève ni commission, ni marge, et ne détient jamais votre argent.",
        bullets: [
          "Aucun pourcentage prélevé sur vos devis",
          "Aucun contact à acheter à l'unité",
          "Un prix connu d'avance, chaque mois",
        ],
        calculator: {
          title: "Ce que vous coûterait une commission",
          revenue: "Chantiers obtenus par une plateforme, par mois",
          rate: "Taux de commission",
          commission: "Commission prélevée",
          menao: "Abonnement MENAO Base",
          perMonth: "par mois",
          saving: (monthly: string, yearly: string) =>
            `Vous gardez ${monthly} de plus chaque mois, soit ${yearly} par an.`,
          noSaving:
            "À ce niveau d'activité, une commission coûte moins cher : MENAO est pensé pour les artisans qui veulent développer leur activité.",
          note: "Simulation indicative, montants hors taxes. Les frais de paiement de Stripe restent à votre charge, comme pour tout encaissement par carte.",
        },
      },
      fairness: {
        eyebrow: "Un réseau juste",
        title: "Votre réputation se construit sur vos chantiers.",
        subtitle:
          "Pas sur un budget publicitaire : les particuliers découvrent votre fiche vérifiée, vos spécialités et vos disponibilités, classées selon des critères publics.",
        items: [
          {
            title: "Trois artisans au plus par demande",
            text: "Vous n'êtes jamais un nom parmi dix : chaque particulier reçoit au plus trois propositions.",
          },
          {
            title: "Un classement transparent",
            text: "Disponibilité, Score MENAO (vérifications, expérience, avis des clients, réactivité), puis distance : nos critères sont publics, et une mise en avant est toujours signalée comme telle.",
          },
          {
            title: "Des pros vérifiés",
            text: "Entreprise active et vérifiée au registre, décennale, RC Pro et identité contrôlés par l'équipe MENAO avant toute mise en ligne.",
          },
        ],
        criteria: "Lire nos critères de classement",
      },
      plansEyebrow: "Formules",
      plansTitle: "Un abonnement fixe, aucune commission.",
      plansSubtitle:
        "Commencez par 2 mois d'essai gratuits. Ensuite, au mois sans engagement, ou à l'année avec 2 mois offerts.",
      perMonth: "HT / mois",
      trial: "Essai gratuit de 2 mois",
      soon: "Bientôt disponible",
      // Formule mise en avant (ADR 0200), paramètre `plans.recommandee`.
      recommended: "Recommandé",
      start: "Essayer gratuitement",
      // Paiement au mois ou à l'année (ADR 0200).
      billing: {
        label: "Mode de paiement",
        monthly: "Au mois",
        yearly: "À l'année",
        yearlyBadge: (free: number) => `${free} mois offerts`,
        monthlyHint: "Sans engagement",
        yearlyHint: (annual: string, free: number) =>
          `Soit ${annual} HT facturés par an, ${free} mois offerts`,
        yearlyEngagement: (months: number) => `Engagement ${months} mois, payé d'avance`,
      },
      engagement: {
        title: "Au mois ou à l'année",
        monthly: {
          title: "Au mois",
          text: "Sans engagement : vous arrêtez quand vous voulez, depuis votre espace pro.",
        },
        yearly: {
          title: "À l'année",
          text: (months: number, free: number) =>
            `${months} mois payés d'avance, ${free} mois offerts. L'engagement commence au premier paiement, après les 2 mois d'essai, et il est affiché clairement au moment de payer.`,
        },
        guarantee: {
          title: "Garantie de l'engagement",
          text: (minRequests: number, months: number) =>
            `Moins de ${minRequests} demandes ${months} mois de suite ? Vous partez sans frais. Même chose si vous cessez votre activité.`,
        },
      },
      compare: {
        title: "Comparez les fonctionnalités",
        caption: "Fonctionnalités incluses dans chaque formule",
        feature: "Fonctionnalité",
        included: "Inclus",
        notIncluded: "Non inclus",
        more: (n: number) => `Voir les ${n} fonctionnalités`,
        less: "Réduire le comparatif",
      },
      plansNote:
        "Prix hors taxes. Frais de paiement de Stripe à votre charge sur les sommes encaissées. Toute mise en avant dans les résultats est signalée par la mention « Mis en avant ».",
      faqEyebrow: "Questions fréquentes",
      faqTitle: "Tout ce que vous voulez savoir.",
      faq: [
        {
          q: "Combien coûte MENAO ?",
          a: "Trois formules, après 2 mois d'essai gratuits : Base à 150 €, Premium à 500 € et Entreprise à 1 500 € HT par mois, sans engagement. À l'année, payée d'avance, vous avez 2 mois offerts : 125 €, 417 € ou 1 250 € HT par mois.",
        },
        {
          q: "MENAO prend-il une commission sur mes chantiers ?",
          a: "Non. MENAO ne prend ni commission ni marge sur vos chantiers, et ne détient jamais votre argent : vos clients vous paient directement, sur votre compte Stripe.",
        },
        {
          q: "Comment suis-je payé ?",
          a: "Pendant l'inscription, vous ouvrez un compte Stripe à votre nom. Vos clients y règlent l'acompte puis le solde en ligne, par carte bancaire, et les fonds sont versés sur votre compte bancaire. Les frais de Stripe s'appliquent comme pour tout paiement par carte.",
        },
        {
          q: "Combien d'artisans reçoivent la même demande ?",
          a: "Trois au plus. Vous avez 72\u00a0h pour l'accepter ou la refuser ; passé ce délai, la demande expire et le particulier peut choisir un autre artisan. L'adresse exacte et les coordonnées du client vous sont transmises dès que vous acceptez.",
        },
        {
          q: "Que faut-il pour m'inscrire ?",
          a: "Votre numéro SIRET (MENAO vérifie votre entreprise au registre ; un Kbis n'est demandé que si cette vérification échoue), vos attestations d'assurance décennale et de responsabilité civile professionnelle, votre attestation de vigilance URSSAF, une pièce d'identité, puis vos métiers, votre zone d'intervention et une courte présentation.",
        },
        {
          q: "Qui vérifie mon dossier ?",
          a: "L'équipe MENAO contrôle votre entreprise auprès de l'INSEE, puis vos documents un par un. Vous suivez l'état de votre dossier depuis votre espace pro.",
        },
        {
          q: "Dans quelle zone suis-je visible ?",
          a: "MENAO ouvre d'abord dans les Alpes-Maritimes. Vous choisissez votre zone : un rayon autour de votre adresse, une liste de communes, des départements, des régions ou toute la France.",
        },
        {
          q: "Puis-je arrêter mon abonnement ?",
          a: "Oui. Au mois, à tout moment depuis votre espace pro. À l'année, l'engagement court 12 mois à partir du premier paiement ; vous partez sans frais si nous vous apportons moins de 4 demandes 2 mois de suite, ou si vous cessez votre activité.",
        },
      ],
      finalTitle: "Votre prochain chantier vous attend.",
      finalText:
        "Créez votre profil en quelques minutes : l'équipe MENAO s'occupe de la vérification.",
      finalReassurance: ["2 mois offerts", "Sans engagement", "Sans commission"],
    },
    /** Assistant des pages Pro (F-69, ADR 0218). */
    assistant: {
      // Secrétaire vocale « Manon » (ADR 0225) : appel web, visible quand elle est configurée.
      voice: {
        start: "Parler à Manon",
        hint: "Assistante vocale · IA",
        connecting: "Connexion…",
        live: "En ligne avec Manon",
        speaking: "Manon parle…",
        mute: "Couper mon micro",
        unmute: "Rétablir mon micro",
        hangUp: "Raccrocher",
        ended: "Appel terminé.",
        failed:
          "L'appel n'a pas pu démarrer. Vérifiez que le micro est autorisé pour ce site, puis réessayez.",
      },
      open: "Une question ?",
      openLabel: "Poser une question à l'assistant MENAO",
      title: "Assistant MENAO",
      subtitle: "IA · répond en quelques secondes",
      close: "Fermer l'assistant",
      greeting:
        "Bonjour ! Je réponds à vos questions sur MENAO : prix, inscription, demandes de chantier, paiements. Que voulez-vous savoir ?",
      // Questions à réponse immédiate : la réponse est celle de la FAQ de la page (index).
      quick: [
        { label: "Combien ça coûte ?", faq: 0 },
        { label: "Quels documents pour m'inscrire ?", faq: 4 },
        { label: "Comment je reçois des demandes ?", faq: 3 },
        { label: "Vous prenez une commission ?", faq: 1 },
      ],
      placeholder: "Posez votre question…",
      send: "Envoyer",
      inputLabel: "Votre question",
      thinking: "L'assistant écrit…",
      suggestionsLabel: "Vous pourriez aussi demander :",
      you: "Vous",
      unavailable:
        "L'assistant est momentanément indisponible. Demandez à être rappelé ou écrivez-nous : nous répondons vite.",
      limit:
        "Pour aller plus loin, le plus simple est d'en parler avec l'équipe : demandez à être rappelé.",
      signUp: "Créer mon compte pro",
      callback: "Être rappelé",
      write: "Écrire à l'équipe",
      callbackForm: {
        title: "Être rappelé par l'équipe MENAO",
        intro: "Laissez vos coordonnées : un membre de l'équipe vous rappelle dès que possible.",
        firstName: "Prénom",
        phone: "Téléphone",
        email: "E-mail",
        trade: "Métier",
        city: "Commune",
        optional: "(facultatif)",
        // TODO(legal) : formulation du consentement et information RGPD à faire valider.
        consent:
          "J'accepte d'être rappelé par l'équipe MENAO au sujet de mon inscription. Mes coordonnées servent uniquement à ce rappel.",
        privacy: "Vos données",
        submit: "Demander à être rappelé",
        sent: "C'est noté ! L'équipe MENAO vous rappelle dès que possible.",
        back: "Revenir à la conversation",
      },
      // Texte de référence de l'assistant (/assistant-pro.txt) : titres des parties.
      knowledge: {
        title: "MENAO : informations publiées pour les artisans",
        intro:
          "Textes publiés sur les pages Pro de menao.fr, seule source des réponses de l'assistant.",
        presentation: "Présentation",
        steps: "Comment ça marche",
        features: "Outils inclus",
        commission: "Zéro commission",
        fairness: "Un réseau juste",
        plans: "Formules et prix",
        planPrice: (name: string, monthly: string, yearly: string) =>
          `${name} : ${monthly} HT par mois au mois, sans engagement ; ${yearly} HT par mois à l'année.`,
        planSoon: "Formule bientôt disponible.",
        compare: "Comparatif des fonctionnalités par formule",
        included: "inclus",
        notIncluded: "non inclus",
        faq: "Questions fréquentes",
      },
    },
    /** FAQ des artisans (/pro/faq, F-69, ADR 0218) : aussi lue par l'assistant des pages Pro. */
    faqPage: {
      title: "Questions fréquentes des artisans",
      metaDescription:
        "Toutes les réponses pour les artisans du bâtiment : inscription et vérification, abonnement sans commission, demandes de chantier, devis dictés, paiements directs, avis et classement.",
      eyebrow: "Espace Pro · Aide",
      heroTitle: "Vos questions,",
      heroAccent: "nos réponses.",
      intro:
        "Tout ce qu'il faut savoir pour travailler avec MENAO : de l'inscription au paiement du solde, sans commission sur vos chantiers.",
      categoriesLabel: "Thèmes",
      essentials: "L'essentiel",
      seeAll: "Voir toutes les questions des artisans",
      contactTitle: "Vous ne trouvez pas votre réponse ?",
      contactText:
        "Posez votre question à l'assistant MENAO en bas de la page, ou demandez à être rappelé par l'équipe.",
      groups: [
        {
          id: "inscription-et-verification",
          title: "Inscription et vérification",
          items: [
            {
              q: "Combien de temps faut-il pour s'inscrire ?",
              a: "Créer votre profil prend environ 2 minutes : vos métiers, votre entreprise et votre zone. Le dossier de vérification demande ensuite environ 5 minutes, documents pris en photo depuis votre téléphone. Tout est enregistré au fur et à mesure : vous pouvez vous arrêter et reprendre plus tard.",
            },
            {
              q: "Quels métiers peuvent s'inscrire sur MENAO ?",
              a: "Aujourd'hui, quinze métiers du bâtiment : électricien, plombier, chauffagiste, climaticien, maçon, peintre, plaquiste, carreleur, menuisier, charpentier, couvreur, façadier, serrurier, terrassier et paysagiste. Vous en choisissez un ou plusieurs à l'inscription, puis vous précisez vos spécialités.",
            },
            {
              q: "Comment fonctionne la vérification au registre qui remplace le Kbis ?",
              a: "MENAO vérifie automatiquement dans l'annuaire public des entreprises que votre entreprise est active et que vous figurez parmi ses dirigeants : vous n'avez alors rien à déposer. Si l'entreprise est introuvable ou fermée, si ses dirigeants ne sont pas publiés ou si votre nom n'y figure pas, déposez un Kbis ou un extrait RNE de moins de 3 mois.",
            },
            {
              q: "Ma décennale ne couvre pas tous mes métiers, ou mon activité n'y est pas soumise : que faire ?",
              a: "En déposant votre attestation, décochez les métiers qu'elle ne couvre pas : ils passent en vérification manuelle par l'équipe MENAO. Pour les rares métiers sans travaux sur le bâti, vous pouvez déclarer vos métiers non soumis à la décennale avant l'envoi du dossier ; l'équipe MENAO vérifie cette déclaration, et la RC Pro reste demandée.",
            },
            {
              q: "Qui a accès à mes documents ?",
              a: "Vos documents restent privés : seule l'équipe MENAO les consulte pour vérifier votre entreprise. À l'envoi, ils sont lus automatiquement pour pré-remplir les informations utiles (dates, assureur, numéro de contrat), que vous vérifiez avant de valider.",
            },
            {
              q: "Que se passe-t-il si l'équipe demande un complément ou refuse mon dossier ?",
              a: "Le message de l'équipe MENAO, ou le motif du refus, s'affiche dans votre espace pro. Vous corrigez les éléments concernés, puis vous renvoyez votre dossier. Pendant la vérification, vos documents ne peuvent pas être modifiés.",
            },
            {
              q: "Qu'est-ce que la charte qualité MENAO ?",
              a: "C'est l'engagement que vous lisez et signez en ligne pendant votre inscription : réactivité (devis dans les 72 h, planning à jour chaque semaine), relation client, qualité du travail, transparence et avis. Elle prévoit notamment de toujours passer par MENAO avec un client trouvé sur MENAO, pendant comme après le chantier. En cas de manquement, la procédure est progressive (rappel, avertissement, suspension des demandes, puis radiation), et une faute grave, comme le contournement de la plateforme, entraîne une radiation immédiate.",
            },
          ],
        },
        {
          id: "abonnement-essai-et",
          title: "Abonnement, essai et formules",
          items: [
            {
              q: "Dois-je payer avant d'être vérifié, et quand commence l'essai de 2 mois ?",
              a: "Rien n'est à payer avant la vérification : le choix de la formule s'ouvre une fois votre dossier validé par l'équipe MENAO. L'essai de 2 mois commence le jour où vous choisissez votre formule ; aucun prélèvement n'a lieu avant la date indiquée à ce moment-là, et vous pouvez arrêter à tout moment pendant l'essai.",
            },
            {
              q: "Quelle différence entre les formules Base, Premium et Entreprise ?",
              a: "Toutes donnent accès aux demandes de votre zone, sans commission, et aux outils de devis, de signature, de paiement, de suivi de chantier et de factures. Le détail de ce que chaque formule inclut figure dans le comparatif des formules de la page Espace Pro.",
            },
            {
              q: "Comment fonctionne le paiement à l'année ?",
              a: "Vous payez 12 mois d'avance et 2 mois vous sont offerts. L'engagement commence au premier paiement, à la fin des 2 mois d'essai, puis l'année se renouvelle pour un an, sauf résiliation depuis le portail d'abonnement avant l'échéance.",
            },
            {
              q: "Puis-je changer de formule en cours de route ?",
              a: "Oui, depuis « Gérer mon abonnement ». Passer à une formule supérieure prend effet tout de suite ; passer à une formule inférieure, ou de l'année au mois, prend effet à la fin de la période en cours.",
            },
            {
              q: "Que se passe-t-il si un prélèvement de l'abonnement échoue ?",
              a: "Stripe réessaie le paiement et MENAO vous prévient par e-mail : mettez à jour votre moyen de paiement depuis « Gérer mon abonnement ». Si l'impayé dure plus de 15 jours, votre profil n'apparaît plus dans les recherches, jusqu'à ce que l'abonnement soit régularisé.",
            },
            {
              q: "Comment fonctionne le parrainage d'un confrère ?",
              a: "Partagez votre lien, votre QR code ou votre code de parrainage depuis « Mon profil ». Vous gagnez un mois offert dès le premier paiement de votre confrère, jusqu'à 12 mois par an, et il reçoit un cadeau de bienvenue (t-shirt ou casquette MENAO) à la validation de son dossier.",
            },
          ],
        },
        {
          id: "recevoir-des-demandes",
          title: "Recevoir des demandes",
          items: [
            {
              q: "Que contient une demande de chantier ?",
              a: "Le besoin résumé par l'IA de MENAO, la description et les photos du client, les travaux, la commune, la date de début souhaitée et, s'il l'a indiqué, son budget approximatif. Si le chantier prévoit d'autres métiers, la demande les cite : chaque artisan établit son propre devis. Avant d'accepter, vous voyez le prénom et la ville du client, pas ses coordonnées.",
            },
            {
              q: "Comment accepter une demande ?",
              a: "En fixant un rendez-vous depuis la demande : MENAO vous propose des créneaux libres d'après vos horaires et votre agenda. Le client voit alors la date dans son espace, et ses coordonnées ainsi que l'adresse exacte du chantier s'affichent pour vous.",
            },
            {
              q: "Comment refuser une demande ?",
              a: "Avec le bouton « Refuser le chantier » et un motif : planning complet, hors de votre domaine d'expertise, hors de votre zone ou autre. La charte qualité vous demande de répondre à chaque demande sous 24 h et de refuser vite celles que vous ne pouvez pas prendre, pour que le client puisse choisir un autre artisan.",
            },
            {
              q: "Comment suis-je prévenu d'une nouvelle demande ?",
              a: "Par e-mail, par notification et dans votre espace, rubrique « À faire maintenant », avec le temps qu'il vous reste pour répondre. Sans réponse de votre part, MENAO vous relance au bout de 24 h puis de 48 h ; passé 72 h, la demande expire.",
            },
            {
              q: "Puis-je ne recevoir que les chantiers au-dessus d'un certain budget ?",
              a: "Oui : dans « Métiers et certifications », réglez un budget minimum, à partir de 1 000, 5 000, 15 000 ou 50 000 €. Vous ne recevez plus les demandes dont le budget annoncé est inférieur ; celles sans budget vous restent proposées.",
            },
            {
              q: "Pourquoi ai-je reçu une demande un peu hors de ma zone ?",
              a: "Quand un client n'a plus d'artisan disponible plus près, MENAO peut lui proposer des artisans dont la zone s'arrête à 20 km au plus de son chantier. La demande l'indique, et vous pouvez la décliner sans pénalité avec le motif « Hors zone » ; votre zone, elle, ne change pas.",
            },
            {
              q: "Qu'est-ce qu'une demande directe ?",
              a: "Quand un client passe par votre fiche publique (lien ou QR code de votre carte de visite) ou vous redemande un devis, sa demande vous est envoyée à vous seul, si vous remplissez les conditions habituelles. Aucun autre artisan ne lui est présenté pour ce métier tant que vous n'avez pas répondu ; si vous refusez ou ne répondez pas sous 72 h, il peut en choisir d'autres.",
            },
          ],
        },
        {
          id: "devis-et-signature",
          title: "Devis et signature",
          items: [
            {
              q: "Comment préparer mon devis ?",
              a: "Ajoutez vos lignes (matériel, main-d'œuvre ou autre) avec quantité, unité et prix HT, à la main ou par la dictée intelligente ; la recherche retrouve aussi les articles déjà utilisés dans vos devis. MENAO calcule la TVA et les totaux, puis vous montre l'aperçu PDF avant l'envoi.",
            },
            {
              q: "Comment fonctionne la dictée du devis ?",
              a: "Vous citez à voix haute les fournitures, les quantités et les prix, jusqu'à 2 minutes par dictée. MENAO transforme chaque prestation en ligne chiffrée, que vous vérifiez avant d'envoyer. MENAO n'invente aucun prix : seuls ceux que vous dictez sont repris.",
            },
            {
              q: "Quelles informations figurent sur le devis ?",
              a: "MENAO met en forme le devis avec les mentions obligatoires, votre logo si vous en avez ajouté un, et votre assurance décennale, qui doit être complète et à jour pour y figurer. Chaque devis envoyé porte aussi la mention « Confidentiel », établi pour votre client et à son usage personnel.",
            },
            {
              q: "Quel taux de TVA appliquer, et si je suis en franchise ?",
              a: "Vous choisissez le taux de chaque ligne ; les taux réduits de 5,5 % et 10 % concernent les travaux dans un logement achevé depuis plus de 2 ans, sous conditions. Si votre entreprise ne facture pas la TVA, indiquez-le dans vos informations d'entreprise : vos devis portent alors la mention « TVA non applicable, art. 293 B du CGI ».",
            },
            {
              q: "Comment fixer l'acompte demandé au client ?",
              a: "Dans Argent, le bouton « Mes paiements » règle votre échéancier par défaut : acompte à la signature (0 % pour un devis sans acompte), paiement facultatif au démarrage des travaux, et solde calculé à la réception. À l'envoi de chaque devis, vous gardez cet échéancier ou vous le personnalisez. MENAO propose 30 % d'acompte par défaut. Au-delà de 30 %, MENAO conseille au client de ne pas verser plus de 30 % avant le début des travaux, sans rien bloquer.",
            },
            {
              q: "Comment mon client signe-t-il le devis, et combien de temps est-il valable ?",
              a: "Votre client reçoit le devis dans son espace et le signe en ligne chez DocuSeal, notre prestataire de signature électronique, avec un code à usage unique. Il peut aussi demander une modification, et vous envoyez alors une nouvelle version, ou refuser le devis en indiquant pourquoi. Le devis est valable 30 jours à compter de son envoi.",
            },
            {
              q: "Puis-je annuler un chantier ?",
              a: "Oui, depuis la page du rendez-vous, en indiquant pourquoi : client injoignable, absent au rendez-vous, demande pas sérieuse ou autre raison. Ce motif reste entre vous et l'équipe MENAO ; le client est informé de l'annulation, avec votre message si vous en laissez un, et peut contacter un autre artisan. L'annulation est définitive.",
            },
          ],
        },
        {
          id: "paiements-et-factures",
          title: "Paiements et factures",
          items: [
            {
              q: "Quand et comment ouvrir mon compte de paiement Stripe ?",
              a: "Dès l'envoi de votre dossier à l'équipe MENAO, sans attendre sa validation. Il faut votre date de naissance, votre adresse personnelle, l'IBAN du compte professionnel qui recevra vos paiements et, si vous le souhaitez, votre site web ou votre page Facebook ou Instagram. Ces informations partent directement chez Stripe sans être enregistrées par MENAO, puis Stripe vous demande de créer votre accès et de vérifier vos informations.",
            },
            {
              q: "Stripe me demande des informations ou refuse mon compte : que faire ?",
              a: "Votre espace pro liste ce que Stripe attend encore, avec la date limite éventuelle : complétez-le avec « Compléter mes informations sur Stripe ». Si Stripe refuse l'ouverture du compte, contactez l'équipe MENAO pour trouver une solution.",
            },
            {
              q: "Quand l'acompte et le solde sont-ils payés ?",
              a: "Votre client règle l'acompte en ligne après avoir signé le devis, le paiement au démarrage (s'il est prévu) le jour où les travaux commencent, puis le solde après la réception des travaux, une fois les éventuelles réserves levées. Chaque paiement arrive sur votre compte Stripe, puis il est viré sur votre compte bancaire selon le calendrier de vos virements Stripe.",
            },
            {
              q: "Où suivre mon argent, les frais Stripe et les remboursements ?",
              a: "La rubrique « Votre argent » affiche le disponible, les paiements en cours, le prochain virement, les frais Stripe du mois et ce que vous avez encaissé via MENAO. Ces chiffres sont lus chez Stripe : virements, remboursements et coordonnées bancaires se gèrent dans votre propre tableau de bord Stripe.",
            },
            {
              q: "Les factures sont-elles faites automatiquement ?",
              a: "Oui. Une facture d'acompte puis une facture de solde sont émises en votre nom à chaque paiement reçu, numérotées sans interruption. Vous les retrouvez dans « Argent », onglet « Factures », avec un export CSV pour votre comptable.",
            },
            {
              q: "MENAO relance-t-il mes clients ?",
              a: "Oui : MENAO relance automatiquement votre client quand un devis attend sa signature, quand l'acompte n'est pas réglé, et pour l'inviter à donner son avis après le chantier.",
            },
          ],
        },
        {
          id: "suivi-de-chantier",
          title: "Suivi de chantier et réception",
          items: [
            {
              q: "Que faire une fois l'acompte payé ?",
              a: "Confirmez la date de démarrage des travaux : votre client en est informé et la date apparaît dans votre agenda. Vous pouvez la modifier ensuite si besoin.",
            },
            {
              q: "Comment tenir mon client informé pendant les travaux ?",
              a: "Une fois le chantier en cours, ajoutez des photos (10 à la fois, 10 Mo au plus chacune) et des messages dans le suivi du chantier : votre client les voit dans son espace. Vous échangez aussi avec lui par la messagerie du chantier.",
            },
            {
              q: "Comment se passe la fin des travaux ?",
              a: "Ajoutez des photos du chantier terminé, puis déclarez-le terminé : votre client est invité à réceptionner les travaux en signant le procès-verbal en ligne, avec ou sans réserves. Sans réserves, le solde lui est demandé juste après.",
            },
            {
              q: "Mon client a émis des réserves : que faire ?",
              a: "Intervenez pour les lever, ajoutez des photos des reprises dans le suivi, puis signalez la levée des réserves. Votre client vérifie, confirme la levée, et le solde lui est alors demandé.",
            },
            {
              q: "Que se passe-t-il en cas de problème sur un chantier ?",
              a: "Vous comme votre client pouvez signaler un problème depuis la page du chantier (retard, malfaçon, comportement, paiement…), photos à l'appui. Pendant un chantier en cours, ses étapes (paiements, démarrage, réception) sont suspendues jusqu'à la décision de l'équipe MENAO, qui fait reprendre le chantier ou l'annule.",
            },
          ],
        },
        {
          id: "avis-score-menao",
          title: "Avis, Score MENAO et classement",
          items: [
            {
              q: "Qui peut me laisser un avis ?",
              a: "Seuls vos clients ayant réalisé un chantier avec vous via MENAO, une fois les travaux réceptionnés, à raison d'un avis par chantier, marqué « Avis vérifié ». Votre client y note la qualité, le respect des délais, la communication, la propreté et le rapport qualité-prix.",
            },
            {
              q: "Puis-je répondre à un avis, ou faire retirer un avis négatif ?",
              a: "Vous pouvez répondre publiquement à chaque avis, une seule fois : votre réponse s'affiche sous l'avis, sur votre fiche. Un avis contraire aux règles peut être signalé à l'équipe MENAO ; il n'est masqué que s'il enfreint la loi ou les conditions d'utilisation, jamais au seul motif qu'il est négatif.",
            },
            {
              q: "Comment est calculé mon Score MENAO ?",
              a: "Sur 100 points : badge « Assuré et vérifié » (20), expérience (10), diplôme et qualification (10), fiche complète (10), réactivité (10) et avis des clients (40). Il s'affiche sur votre fiche et compte dans votre place quand un client cherche un artisan ; votre espace pro le détaille critère par critère.",
            },
            {
              q: "Je débute sans avis : comment suis-je classé ?",
              a: "Sans avis MENAO, le critère des avis part de la note de votre fiche Google vérifiée par l'équipe MENAO, ou de 3 sur 5, et la réactivité part d'une valeur neutre, remplacée ensuite par vos résultats réels. Une place est aussi réservée aux nouveaux artisans (validés depuis moins de 90 jours ou avec moins de 3 chantiers menés à terme) : quand aucun ne figure parmi les 5 premiers, l'un d'eux est présenté en 3e position.",
            },
            {
              q: "Comment gagner des points rapidement ?",
              a: "Faites valider votre décennale, votre RC Pro et votre attestation URSSAF pour obtenir le badge « Assuré et vérifié », indiquez votre diplôme du métier et ajoutez vos qualifications : le RGE est vérifié automatiquement avec votre SIRET, les autres (Qualibat, Qualifelec…) par l'équipe MENAO. Complétez aussi votre fiche : photo, au moins 3 photos de réalisations, une présentation de 300 caractères ou plus et vos spécialités.",
            },
            {
              q: "Une formule plus chère améliore-t-elle mon classement ?",
              a: "Non. Le classement ne dépend ni de votre formule d'abonnement ni d'un paiement. Si une mise en avant payante existait un jour, elle serait signalée par la mention « Mis en avant ».",
            },
            {
              q: "Puis-je noter mes clients ?",
              a: "Oui, après la clôture du chantier : accueil et accès au chantier, clarté du besoin et délai des paiements, avec un commentaire. Votre note n'est jamais montrée au client ni publiée ; selon le réglage en vigueur, seule l'équipe MENAO la consulte, ou les artisans qui reçoivent une demande de ce client voient la moyenne des notes, jamais votre commentaire.",
            },
          ],
        },
        {
          id: "zone-d-intervention",
          title: "Zone d'intervention et disponibilités",
          items: [
            {
              q: "Puis-je modifier ma zone d'intervention après l'inscription ?",
              a: "Oui, depuis « Ma fiche », rubrique « Zone d'intervention ». Vous pouvez choisir un rayon de 10 à 100 km autour de votre adresse, une liste de communes, des départements, des régions ou toute la France.",
            },
            {
              q: "Choisir une région ou toute la France me pénalise-t-il ?",
              a: "Sur une région ou toute la France, vous passez après les artisans de proximité, c'est-à-dire ceux dont la zone est un rayon, une liste de communes ou des départements. Dans chaque groupe, l'ordre suit ensuite les mêmes critères de classement.",
            },
            {
              q: "Comment arrêter de recevoir des demandes pendant un moment ?",
              a: "Dans « Mes disponibilités », mettez-vous en pause, ou déclarez vos congés et absences : vous n'apparaissez plus dans les recherches, et vos chantiers en cours comme vos rendez-vous ne changent pas. Après des congés, vous réapparaissez de vous-même le lendemain.",
            },
            {
              q: "Mon carnet est plein : puis-je rester visible ?",
              a: "Oui : indiquez à partir de quelle date vous pouvez commencer un nouveau chantier. Vous restez dans les recherches avec la mention « Disponible à partir du » et cette date ; les artisans disponibles tout de suite passent avant vous dans le classement.",
            },
            {
              q: "Puis-je retrouver mon agenda MENAO dans mon agenda habituel ?",
              a: "Oui : créez votre lien d'abonnement dans « Mes disponibilités » et ajoutez-le à Google Agenda, Apple Calendrier ou Outlook. Visites, démarrages, créneaux bloqués et absences s'y mettent à jour automatiquement, en général toutes les quelques heures. Le lien est personnel et ne contient ni adresse ni nom de client.",
            },
          ],
        },
        {
          id: "outils-de-gestion",
          title: "Outils de gestion et visibilité",
          items: [
            {
              q: "Comment suivre mes dépenses de chantier ?",
              a: "Dans « Argent », onglet « Dépenses », photographiez une facture ou un ticket : MENAO lit les montants pour vous, et vous les vérifiez avant d'enregistrer. Chaque dépense peut être rattachée à un chantier, et vous suivez ce qu'il reste à payer ; MENAO ne paie rien à votre place.",
            },
            {
              q: "Puis-je envoyer mes factures et mes dépenses à mon comptable ?",
              a: "Oui : enregistrez l'e-mail de votre comptable et choisissez un envoi automatique chaque mois ou chaque trimestre, ou envoyez à la main. Il reçoit vos factures et vos dépenses de la période, tableaux et pièces, par un lien de téléchargement valable 30 jours.",
            },
            {
              q: "Ma fiche MENAO est-elle visible sur internet ?",
              a: "Oui : dès que vous êtes visible des particuliers, votre fiche a sa propre adresse, à mettre sur vos devis, vos réseaux ou votre site, avec un badge à coller sur votre site. Vous choisissez si Google peut la proposer, et elle ne montre jamais votre téléphone, votre e-mail ni votre adresse.",
            },
            {
              q: "À quoi servent les cartes de visite MENAO ?",
              a: "Vous imprimez une planche de 10 cartes depuis « Mon profil » ; leur QR code mène à votre fiche, avec vos réalisations et vos avis vérifiés. Un client, même rencontré hors de MENAO, qui lance sa demande depuis votre fiche vous l'envoie à vous seul.",
            },
            {
              q: "Puis-je découvrir mon espace avant de recevoir des demandes ?",
              a: "Oui : des données d'exemple fictives (demandes, rendez-vous, devis, chantier en cours) vous montrent comment tout fonctionne, sans rien envoyer. Elles disparaissent dès votre première demande, et vous pouvez les masquer avant.",
            },
          ],
        },
        {
          id: "compte-documents-et",
          title: "Compte, documents et données",
          items: [
            {
              q: "Pourquoi mon profil n'est-il pas visible des particuliers ?",
              a: "Trois conditions sont nécessaires : votre dossier validé par l'équipe MENAO, un abonnement actif et un compte de paiement actif. Votre espace pro vous indique ce qui manque ; vous n'apparaissez pas non plus quand vous êtes en pause ou en congés.",
            },
            {
              q: "Que se passe-t-il quand une assurance ou mon attestation URSSAF arrive à échéance ?",
              a: "MENAO vous prévient 30, 15 puis 7 jours avant l'expiration : déposez le document à jour dans « Documents ». Si un document obligatoire expire sans renouvellement validé, votre compte est suspendu, puis réactivé dès la validation du nouveau document.",
            },
            {
              q: "Comment récupérer mes données ou supprimer mon compte ?",
              a: "Dans « Mon compte », vous téléchargez une copie de vos données (compte, demandes, chantiers, devis, paiements, messages, avis) dans un fichier JSON. Vous pouvez aussi demander la suppression de votre compte : l'équipe MENAO traite la demande sous un mois, et certains documents, comme les factures, doivent être conservés pendant une durée fixée par la loi.",
            },
            {
              q: "Comment joindre l'équipe MENAO ?",
              a: "Depuis « Aide et contact » dans « Mon profil », ou par le formulaire de contact du site : l'équipe MENAO répond sous 7 jours. Sur les pages Pro, vous pouvez aussi demander à être rappelé.",
            },
          ],
        },
      ],
    },
    /** Inscription artisan en un seul parcours (ADR 0110). */
    signUp: {
      title: "Créer mon profil professionnel",
      back: "Retour",
      progressLabel: "Créer mon profil",
      progress: (step: number, total: number) => `Étape ${step} sur ${total}`,
      // Refonte « Nette » (ADR 0254) : avancement à droite des étapes.
      asideSteps: {
        metiers: "Vos métiers",
        entreprise: "Votre entreprise",
        zone: "Votre zone",
        compte: "Votre compte",
      },
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
          {
            title: "Recevez vos premières demandes",
            text: "Dès que votre entreprise est vérifiée",
          },
        ],
        trust:
          "Les clients ne voient que des artisans vérifiés : assurés, déclarés et à jour de leurs documents.",
        start: "Commencer",
        resume: "Reprendre mon inscription",
        haveAccount: "Déjà inscrit ?",
        signIn: "Me connecter",
        isParticulier: "Vous êtes un particulier ?",
        particulierLink: "Créer un compte particulier",
      },
      trades: {
        title: "Quels sont vos métiers ?",
        lead: "Choisissez-en un ou plusieurs. Vous préciserez vos spécialités plus tard.",
        search: "Rechercher un métier",
        none: (query: string) => `Aucun métier ne correspond à « ${query} ».`,
        continue: (count: number) => `Continuer · ${count} métier${count > 1 ? "s" : ""}`,
        // Limite de la formule de Base (ADR 0290).
        limit: (max: number) =>
          `Jusqu'à ${max} métiers avec la formule Base. D'autres avec Premium, une fois inscrit.`,
      },
      company: {
        title: "Trouvons votre entreprise",
        lead: "Tapez son nom ou son SIRET : nous remplissons le reste grâce à l'Annuaire des entreprises de l'État.",
        search: "Nom de l'entreprise ou SIRET",
        searchHint: "3 caractères minimum.",
        searching: "Recherche en cours…",
        results: "Entreprises trouvées",
        noResult:
          "Aucune entreprise trouvée. Vérifiez l'orthographe, ou tapez votre numéro SIRET (14 chiffres).",
        unavailable: "La recherche ne répond pas pour le moment : saisissez votre SIRET.",
        closed: "Fermée",
        notListed: "Mon entreprise n'apparaît pas",
        manualLabel: "Numéro SIRET",
        manualHint:
          "14 chiffres, sur votre Kbis ou votre avis de situation INSEE. Nous le vérifions auprès de l'INSEE.",
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
        closedWarning:
          "Cette entreprise est fermée selon l'INSEE : MENAO n'accepte que les entreprises en activité.",
        isManager: (name: string) => `Êtes-vous ${name} ?`,
        isManagerGeneric: "Êtes-vous le dirigeant de l'entreprise ?",
        yesMe: "Oui, c'est moi",
        yes: "Oui",
        no: "Non",
        notManagerNote:
          "Pas de souci : vous continuez l'inscription, et le dirigeant signera l'engagement à la fin.",
        vatQuestion: "Votre entreprise facture-t-elle la TVA ?",
        vatHint:
          "Répondez « Non » si vous êtes en franchise de TVA (micro-entreprise, par exemple).",
        // Entreprise déjà inscrite (ADR 0175).
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
        communesLater:
          "Vous préférez une liste de communes ? Vous pourrez la choisir depuis votre espace.",
        mode: "Comment définir votre zone ?",
        modeRayon: "Un rayon",
        modeDepartements: "Des départements",
        modeRegions: "Des régions",
        modeFrance: "Toute la France",
        departementSearch: "Ajouter un département",
        departementSearchHint: "Tapez un nom ou un numéro, par exemple 06.",
        regionSearch: "Ajouter une région",
        regionSearchHint: "Tapez le nom d'une région puis choisissez-la dans la liste.",
        territories: "Territoires choisis",
        remove: (nom: string) => `Retirer ${nom}`,
        noTerritory: "Choisissez au moins un territoire.",
        franceNote: "Vous recevrez les demandes de toute la France.",
        wideNote:
          "Sur une région ou toute la France, vous passez après les artisans proches du chantier.",
      },
      account: {
        title: "Créez votre compte",
        lead: "C'est la dernière étape pour créer votre profil.",
        email: "E-mail professionnel",
        phone: "Téléphone portable",
        phoneHint: "Pour que MENAO et vos clients puissent vous joindre.",
        acceptCgvBefore: "J'accepte les ",
        cgv: "conditions générales de vente artisans",
        submit: "Créer mon compte",
        oauthTitle: "Finalisez votre compte",
        oauthLead: (provider: string, email: string | null) =>
          `Vous êtes connecté avec ${provider}${email ? ` (${email})` : ""}. Complétez vos informations pour créer votre profil.`,
        // Code d'un parrain, d'un partenaire ou d'un conseiller MENAO (commercial, ADR 0205).
        referralToggle: "J'ai un code (parrain ou conseiller MENAO)",
        referralLabel: "Code de parrainage ou de votre conseiller (facultatif)",
        referralHint:
          "Le code de votre conseiller MENAO, ou celui d'un artisan MENAO qui vous a recommandé : avec ce dernier, un cadeau de bienvenue vous attend à la validation de votre dossier.",
        referralApplied: (code: string) => `Code appliqué : ${code}`,
        oauthSubmit: "Créer mon profil",
        notYou: "Ce n'est pas vous ? Se déconnecter",
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
        linkToo: "Vous pouvez aussi cliquer sur le lien reçu dans l'e-mail.",
      },
      finalize: {
        title: "Finaliser mon profil professionnel",
        notAvailable:
          "Ce compte est déjà un compte client MENAO. Pour votre activité, créez un compte pro avec une autre adresse e-mail.",
        signOut: "Me déconnecter",
      },
      welcome: {
        title: "Votre profil est créé",
        lead: "Voici l'aperçu de votre fiche. Les clients la verront dès que votre entreprise sera vérifiée.",
        toVerify: "Vérification à faire",
        zone: (place: string, km: number) => `${km} km autour de ${place}`,
        nextTitle: "Dernière étape : faites vérifier votre entreprise",
        charter: "La charte qualité MENAO, à signer en ligne",
        profil: "Votre photo et votre présentation",
        duration: "Environ 5 minutes, en photo depuis votre téléphone",
        cta: "Faire vérifier mon entreprise",
        later: "Pas le temps maintenant ? Nous vous enverrons un rappel par e-mail.",
        sirene: {
          not_found:
            "Nous n'avons pas trouvé votre SIRET auprès de l'INSEE : vérifiez-le à l'étape « Entreprise ».",
          inactive:
            "D'après l'INSEE, votre entreprise n'est pas en activité : vérifiez votre SIRET à l'étape « Entreprise ».",
          siret_missing:
            "Ce SIRET est déjà utilisé sur MENAO : indiquez le vôtre à l'étape « Entreprise ».",
          unavailable:
            "La vérification de votre SIRET auprès de l'INSEE n'a pas pu se faire : relancez-la à l'étape « Entreprise ».",
        },
      },
    },
    onboarding: {
      title: "Mon inscription",
      /** « Faire vérifier mon entreprise » : la page du dossier (ADR 0111). */
      // Demande de la zone (ADR 0182) : des nombres, jamais une recherche ni un particulier.
      zoneDemand: {
        title: "Des particuliers cherchent déjà",
        body: (n: number, days: number) =>
          `${n} recherche${n > 1 ? "s" : ""} dans vos métiers et votre zone ces ${days} derniers jours.`,
        next: "Terminez votre dossier pour recevoir les prochaines demandes.",
        trade: (label: string, n: number) => `${label} : ${n}`,
      },
      dossier: {
        title: "Faire vérifier mon entreprise",
        lead: "Ajoutez chaque élément, dans l'ordre que vous voulez. Tout est enregistré au fur et à mesure : vous pouvez vous arrêter et reprendre plus tard.",
        back: "Mon dossier",
        progress: (done: number, total: number) => `${done} sur ${total}`,
        progressLabel: "Éléments terminés",
        left: (n: number) =>
          n === 1 ? "Encore 1 élément avant l'envoi." : `Encore ${n} éléments avant l'envoi.`,
        ready: "Tout est prêt : envoyez votre dossier à l'équipe MENAO.",
        profileTitle: "Votre entreprise, vos métiers, votre zone",
        edit: "Modifier",
        charterTitle: "Charte qualité MENAO",
        charterHint: (rules: number) =>
          `${rules} règles à cocher et votre engagement à certifier, puis une signature`,
        profilTitle: "Votre photo et votre présentation",
        profilHint: "Ce que les clients verront sur votre fiche",
        documentHints: {
          kbis: "De moins de 3 mois",
          decennale: "En cours de validité",
          rc_pro: "En cours de validité",
          identite: "Carte d'identité ou passeport",
          urssaf: "De moins de 6 mois",
        },
        // Kbis remplacé par la vérification au registre (ADR 0217).
        registryHint: "Vérifié automatiquement au registre des entreprises",
        registryFailedHint: "Vérification automatique impossible : déposez-le",
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
        privacy: "Vos documents restent privés : seule l'équipe MENAO les consulte.",
        // Refonte « Nette » (ADR 0254) : éléments par groupe.
        groups: {
          company: "Votre entreprise",
          documents: "Vos documents",
          profile: "Votre fiche",
        },
        afterTitle: "Après la vérification",
        afterLead: "Pour recevoir des demandes, il faudra aussi :",
        paiementsTitle: "Recevoir les paiements de vos clients",
        paiementsHint: "Compte Stripe à votre nom : MENAO ne prend aucune commission",
        paiementsHintNow: "Vous pouvez le faire dès maintenant, pendant la vérification",
        formuleTitle: "Choisir votre formule",
        formuleHint: "Vous pouvez le faire dès maintenant",
      },
      steps: {
        entreprise: "Entreprise",
        metiers: "Métiers",
        zone: "Zone d'intervention",
        charte: "Charte qualité",
        documents: "Documents",
        profil: "Profil public",
        paiements: "Paiements",
        formule: "Formule",
      },
      saveAndContinue: "Enregistrer et continuer",
      saved: "Enregistré.",
      /** Charte qualité (ADR 0104) : commandes autour du texte de la charte, en tutoiement comme elle. */
      charter: {
        summary: "Sommaire de la charte",
        progressTitle: "Ta progression",
        progressCount: (n: number, total: number) => `${n} règle(s) validée(s) sur ${total}`,
        navPromises: "Ce que MENAO fait pour toi",
        navSignature: "Signature",
        validated: "Validé",
        ruleLabel: (code: string, title: string) => `Règle ${code} : ${title}`,
        scoreLabel: "Critères du score MENAO",
        dockSuffix: "règles validées",
        dockTodo: " · coche chaque règle pour pouvoir signer",
        dockDone: " · toutes les règles sont validées",
        nextRule: "Règle suivante",
        toSignature: "Aller à la signature",
        name: "Nom et prénom",
        namePlaceholder: "Ex. Jean Martin",
        company: "Entreprise",
        companyPlaceholder: "Ex. Martin Électricité",
        siret: "N° SIRET",
        siretPlaceholder: "14 chiffres",
        signature: "Signature",
        clear: "Effacer",
        padLabel: "Zone de signature : signe avec le doigt ou la souris",
        padHint: "Signe ici avec le doigt ou la souris",
        missingPrefix: "Pour signer : ",
        missing: {
          rules: (n: number) => `coche les ${n} règle(s) restante(s)`,
          name: "indique ton nom",
          company: "indique ton entreprise",
          siret: "saisis un SIRET à 14 chiffres",
          signature: "signe dans le cadre",
          engagement: "certifie ton engagement d’artisan",
          agree: "coche l’acceptation de la charte",
        },
        submit: "Signer et rejoindre MENAO",
        recap: {
          company: "Entreprise",
          siret: "SIRET",
          signedAt: "Signée le",
          rules: "Règles acceptées",
          rulesValue: (total: number, first: string, last: string) =>
            `${total} / ${total} (${first} à ${last})`,
          level: "Niveau de départ",
          engagement: "Engagement de l'artisan",
          engagementValue: (version: string) => `Certifié (version ${version})`,
        },
        signedOn: (date: string, time: string) => `${date} à ${time}`,
        next: "Continuer : mes documents",
        reread: "Relire la charte",
        back: "Retour",
      },
      submit: {
        button: "Envoyer mon dossier en vérification",
        error: "Votre dossier est incomplet. Vérifiez chaque étape puis réessayez.",
      },
      status: {
        brouillon: null,
        en_verification:
          "Votre dossier est en cours de vérification par l'équipe MENAO. Vous serez prévenu par e-mail.",
        valide: "Votre dossier est validé.",
        complement: (message: string) => `L'équipe MENAO demande un complément : ${message}`,
        refuse: (motif: string | null) =>
          `Votre dossier a été refusé${motif ? ` : ${motif}` : ""}. Corrigez les éléments concernés puis renvoyez-le.`,
        suspendu: "Votre compte est suspendu. Contactez l'équipe MENAO.",
        radie: (motif: string | null) =>
          `Votre compte a été radié du réseau MENAO${motif ? ` : ${motif}` : ""}. Votre profil n'apparaît plus. Vous gardez l'accès à vos chantiers en cours et à vos factures ; pour toute question, contactez l'équipe MENAO.`,
        suspenduDocuments:
          "Votre compte est suspendu : un document obligatoire a expiré (assurance ou attestation URSSAF). Déposez l'attestation à jour dans « Documents » ; le compte sera réactivé dès sa validation.",
      },
      company: {
        siretLabel: "Numéro SIRET",
        siretChange: "Modifier le SIRET",
        siretLocked: "Le SIRET ne peut plus être modifié après l'envoi en vérification.",
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
        formeJuridique: "Forme juridique",
        ape: "Code APE",
        apeWarning:
          "Ce code d'activité ne relève pas du bâtiment : l'équipe MENAO vérifiera votre activité lors de la validation.",
        address: "Adresse",
        nomCommercial: "Nom commercial (optionnel)",
        nomCommercialHint:
          "Le nom sous lequel vos clients vous connaissent, s'il diffère de la raison sociale.",
        tva: "Êtes-vous assujetti à la TVA ?",
        tvaYes: "Oui",
        tvaNo: "Non (franchise en base, art. 293 B du CGI)",
        tvaNumber: "Numéro de TVA intracommunautaire",
        verifyFirst: "Vérifiez d'abord votre SIRET pour continuer.",
        logo: {
          title: "Logo sur vos documents (facultatif)",
          intro:
            "Il apparaît en haut de vos devis, factures, procès-verbaux de réception, DPGF et cartes de visite. Les documents déjà envoyés gardent le logo qu'ils avaient.",
          // Rappel dans l'éditeur de devis tant qu'il n'y a pas de logo (ADR 0300).
          promptTitle: "Ajoutez le logo de votre entreprise",
          promptText:
            "Il apparaîtra en haut de ce devis, de vos factures, de vos DPGF et sur vos cartes de visite.",
          file: "Fichier du logo",
          hint: "PNG, JPEG ou WebP, 10 Mo maximum. Un PNG à fond transparent rend le mieux.",
          send: "Envoyer mon logo",
          change: "Remplacer mon logo",
          remove: "Retirer le logo",
          current: "Votre logo actuel",
        },
      },
      trades: {
        legend: "Vos métiers",
        hint: "Cochez vos métiers puis, si vous le souhaitez, vos spécialités.",
        // Limite de la formule (ADR 0290).
        limit: (max: number) =>
          `Votre formule permet ${max} métier${max > 1 ? "s" : ""}. D'autres avec la formule Premium.`,
        limitLink: "Voir les formules",
        specialties: "Spécialités",
        experience: "Années d'expérience",
        diploma: "Votre diplôme du métier (le plus élevé)",
        diplomaNone: "Aucun diplôme du métier",
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
        certifications: "Certifications et qualifications",
        certificationsHint:
          "Qualibat, Qualifelec, QualiPAC… L'équipe MENAO les vérifie avant de les afficher sur votre fiche.",
        rgeTitle: "RGE : vérifié automatiquement avec votre SIRET",
        rgeFound: "Domaines RGE trouvés dans l'annuaire officiel, affichés sur votre fiche :",
        rgeNone:
          "Aucune qualification RGE en cours pour votre SIRET dans l'annuaire officiel. Si vous venez de l'obtenir, elle apparaîtra dès sa publication.",
        rgeCheckedOn: (date: string) => `Annuaire consulté le ${date}.`,
        rgeRefresh: "Actualiser",
        rgeStatus: {
          ok: "Annuaire RGE consulté : votre fiche est à jour.",
          rate_limited: "Trop de demandes : réessayez dans une heure.",
          siret_missing: "Renseignez d'abord votre SIRET à l'étape Entreprise.",
          unavailable: "L'annuaire RGE ne répond pas pour l'instant. Réessayez plus tard.",
        },
        certType: "Type",
        certNumber: "Numéro",
        certEnd: "Date de fin de validité",
        certAdd: "Ajouter la certification",
        certDelete: "Supprimer",
        certValidUntil: (date: string) => `valable jusqu'au ${date}`,
        noCertification: "Aucune certification ajoutée.",
      },
      connect: {
        intro:
          "Vos clients vous paient directement sur votre compte, via Stripe (prestataire de paiement agréé). MENAO ne touche jamais l'argent de vos chantiers et ne prélève aucune commission.",
        fees: "Les frais de paiement Stripe sont déduits de chaque encaissement ; vous gérez vos paiements, remboursements et virements depuis votre propre tableau de bord Stripe.",
        notValidated:
          "La configuration des paiements sera disponible dès l'envoi de votre dossier à l'équipe MENAO.",
        // Refonte « Nette » (ADR 0254) : à côté de la configuration.
        how: {
          title: "Comment vous êtes payé",
          steps: [
            "Vos clients paient par carte : l'acompte à la signature du devis, le solde après la réception.",
            "L'argent arrive sur votre compte Stripe, puis sur votre compte bancaire.",
            "Aucune commission MENAO sur vos chantiers : seul votre abonnement est payant.",
          ],
        },
        start: "Configurer mes paiements avec Stripe",
        // Compléments saisis dans MENAO, transmis directement à Stripe (ADR 0215).
        prepare: {
          title: "Préparez votre compte de paiement",
          intro:
            "Ces informations partent directement chez Stripe, sans être enregistrées par MENAO : vous n'aurez plus à les saisir.",
          birthDate: "Votre date de naissance",
          homeAddress: "Votre adresse personnelle",
          sameAddress: "Même adresse que l'entreprise",
          line1: "Adresse",
          postalCode: "Code postal",
          city: "Ville",
          iban: "IBAN du compte qui recevra vos paiements",
          ibanHint: "Le compte bancaire professionnel, au nom de l'entreprise.",
          soleOwner: "Je suis le seul associé de l'entreprise",
          soleOwnerHint:
            "Sinon, Stripe vous demandera les associés qui détiennent plus de 25 % du capital.",
          website: "Site web, page Facebook ou Instagram",
          optional: "(facultatif)",
          websiteHint:
            "Stripe la demande pour vérifier votre activité. Indiquez l'adresse complète de votre page, par exemple facebook.com/votre-entreprise.",
          submit: "Continuer",
          sending: "Envoi à Stripe…",
          skip: "Tout remplir chez Stripe",
        },
        // Formulaire Stripe affiché dans MENAO (ADR 0215).
        embedded: {
          lead: "Stripe vous demande d'abord de vous connecter ou de créer votre accès Stripe (code reçu par SMS), puis de vérifier vos informations.",
          website:
            "Pas de site web ? Stripe accepte l'adresse complète de votre page Facebook ou Instagram.",
          loading: "Chargement du formulaire Stripe…",
          fallback: "Le formulaire ne s'affiche pas ?",
          openStripe: "Continuer sur le site de Stripe",
        },
        resume: "Reprendre la configuration Stripe",
        active:
          "Votre compte de paiement est actif : vous pouvez recevoir les paiements de vos clients.",
        payoutsPending:
          "Les virements vers votre compte bancaire seront activés dès que Stripe aura terminé ses vérifications.",
        dashboard: "Ouvrir mon tableau de bord Stripe",
        linkExpired: "Le lien Stripe a expiré : reprenez la configuration.",
        dueTitle: "Stripe attend encore quelques informations pour activer vos paiements :",
        duePayoutsTitle: "Pour activer les virements vers votre banque, Stripe attend encore :",
        deadline: (date: string) => `À fournir avant le ${date}.`,
        complete: "Compléter mes informations sur Stripe",
        verifying:
          "Stripe vérifie les informations transmises. Rien à faire de votre côté pour l'instant : revenez sur cette page un peu plus tard pour voir où en est votre compte.",
        verifyingItems: "En cours de vérification :",
        check: "Actualiser l'état de mon compte",
        refused:
          "Stripe a refusé l'ouverture de ce compte de paiement. Contactez l'équipe MENAO pour trouver une solution.",
        contact: "Contacter l'équipe MENAO",
        // Aperçu du compte Stripe, en lecture seule (ADR 0152).
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
            monthly: (day: number) =>
              `Virement automatique chaque mois, le ${day === 1 ? "1er" : day}`,
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
          representant:
            "Informations sur le représentant légal (nom, date de naissance, coordonnées)",
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
          not_validated: "Envoyez d'abord votre dossier à l'équipe MENAO.",
          no_account: "Aucun compte de paiement pour le moment.",
          rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
          unavailable: "Stripe est momentanément indisponible. Réessayez dans quelques minutes.",
          forbidden: "Cette action est réservée aux comptes professionnels.",
        },
      },
      requests: {
        title: "Demandes",
        empty:
          "Vous n'avez pas encore reçu de demande. Elles apparaîtront ici dès qu'un particulier vous contactera.",
        backToList: "Toutes mes demandes",
        subtitle: "Les particuliers qui vous ont choisi : répondez sous 72 heures.",
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
        writeEmail: "Écrire un e-mail",
        callbackAsap: "À contacter dès que possible",
        callbackRange: (from: string, to: string) =>
          `À contacter de préférence entre ${from} et ${to}`,
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
        seeMore: "Voir plus",
        seeLess: "Voir moins",
        works: "Travaux",
        rooms: "Pièces",
        surface: "Surface",
        lieu: "Lieu",
        date: "Date de début souhaitée",
        photos: "Photos",
        photoAlt: (i: number) => `Photo ${i} du chantier`,
        fixAppointment: "Fixer un rendez-vous",
        refuseShort: "Refuser",
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
        refused: "Demande refusée.",
      },
      availability: {
        title: "Disponibilités et agenda",
        intro:
          "Pause, congés, date de disponibilité, horaires de travail et synchronisation avec votre agenda se règlent au même endroit.",
        manage: "Gérer mes disponibilités",
      },
      visibility: {
        visible:
          "Votre profil est visible des particuliers : vous pouvez recevoir des demandes de chantier.",
        hidden: "Votre profil n'est pas encore visible des particuliers. Il reste :",
        missing: {
          validation: "la validation de votre dossier par l'équipe MENAO",
          abonnement: "un abonnement actif (étape « Formule »)",
          paiements: "un compte de paiement actif (étape « Paiements »)",
        },
      },
      plans: {
        // Rappels aux clients par SMS (F-88, ADR 0239).
        clientReminders: {
          title: "Rappels à vos clients",
          intro:
            "En plus de l'e-mail, vos clients reçoivent un SMS à votre nom, sur le portable qu'ils ont donné dans leur demande.",
          items: {
            rdv: "La veille d'un rendez-vous",
            demarrage: "La veille du démarrage du chantier",
            acompte: "Acompte ou solde à régler",
            avis: "Demande d'avis à la fin du chantier",
          } as Record<string, string>,
          smsCount: (used: number, included: number) => `${used} / ${included} SMS ce mois-ci`,
          smsHint: "Au-delà, l'e-mail part toujours, mais plus aucun SMS jusqu'au 1er du mois.",
          save: "Enregistrer",
          saving: "Enregistrement…",
          saved: "Réglages enregistrés.",
        },
        // Secrétaire dédiée (F-83, ADR 0232).
        secretary: {
          title: "Votre secrétaire",
          intro:
            "Elle répond à vos clients au nom de votre entreprise quand vous êtes sur un chantier : rendez-vous dans votre agenda sur vos créneaux libres, ou message transmis tout de suite.",
          testTitle: "L'essayer",
          testText:
            "Appelez-la depuis cette page, comme le ferait un client. Les minutes de l'essai comptent dans votre formule.",
          testStart: "Appeler ma secrétaire",
          testHint: "Appel d'essai",
          live: "En ligne avec votre secrétaire",
          speaking: "Votre secrétaire parle…",
          errors: {
            non_inclus: "La secrétaire est incluse dans les formules Premium et Entreprise.",
            generic: "L'appel n'a pas pu être préparé. Réessayez dans un instant.",
          } as Record<string, string>,
          settingsTitle: "Ses réglages",
          displayName: "Nom annoncé au téléphone",
          displayNameHint: (fallback: string) => `Laissé vide : « ${fallback} ».`,
          canBook: "Elle peut prendre des rendez-vous dans mon agenda",
          visitMinutes: "Durée d'un rendez-vous",
          visitChoices: {
            30: "30 minutes",
            60: "1 heure",
            90: "1 h 30",
            120: "2 heures",
          } as Record<number, string>,
          instructions: "Consignes à donner aux clients",
          instructionsHint: "Par exemple : pas de dépannage le week-end, devis gratuit.",
          save: "Enregistrer",
          saved: "Réglages enregistrés.",
          noHours:
            "Renseignez vos horaires dans l'agenda : sans eux, elle prend des messages mais pas de rendez-vous.",
          messagesTitle: "Messages et rendez-vous",
          messagesEmpty: "Aucun message pour l'instant.",
          rdv: (when: string) => `Rendez-vous le ${when}`,
          message: "Message",
          urgent: "Urgent",
          call: "Appeler",
          markDone: "Marquer comme traité",
          markTodo: "Remettre à traiter",
          done: "Traité",
        },
        // Agents IA de la formule (F-82, ADR 0231).
        agents: {
          title: "Vos agents IA",
          intro: (plan: string) => `Ce que votre formule ${plan} comprend.`,
          noPlan: "Choisissez une formule pour voir les agents IA qu'elle comprend.",
          items: {
            dictation: "Devis dicté dans l'application",
            expenses: "Lecture des tickets de dépenses",
            secretary: "Secrétaire dédiée, avec votre nom, vos horaires et votre agenda",
            conversationalQuote: "Devis dicté en conversation avec Manon",
            accounting: "Agent comptable : rapprochement, relance des impayés, synthèse du mois",
            reminders: "Rappels automatiques de vos clients",
          },
          included: "Inclus",
          soon: "Inclus, bientôt disponible",
          upgrade: "Avec Premium et Entreprise",
          reminderModes: {
            sms: "Inclus par SMS et e-mail",
            appel: "Inclus par SMS et e-mail, appel bientôt disponible",
          } as Record<string, string>,
          minutesTitle: "Minutes de voix ce mois-ci",
          minutesUsed: (used: number, included: number) => `${used} / ${included} minutes`,
          minutesLeft: (left: number, topUp: number) =>
            topUp > 0
              ? `Il vous reste ${left} minute${left > 1 ? "s" : ""}, dont ${topUp} rechargée${topUp > 1 ? "s" : ""}.`
              : `Il vous reste ${left} minute${left > 1 ? "s" : ""}.`,
          minutesReset: (date: string) => `Les minutes incluses repartent à zéro le ${date}.`,
          minutesAlert: "Plus de 80 % des minutes incluses sont utilisées.",
          minutesEmpty:
            "Minutes épuisées : votre assistante se contente de noter le nom et le numéro de vos clients jusqu'au 1er du mois.",
          topUp: (minutes: number, euros: string) => `Recharger ${minutes} minutes · ${euros} HT`,
          topUpHint: (months: number) =>
            `Paiement unique sur le site, sans abonnement. Minutes valables ${months} mois.`,
          topUpDone: "Paiement reçu : vos minutes seront ajoutées dans quelques secondes.",
          topUpExpiry: (date: string) => `Prochaine échéance de minutes rechargées : ${date}.`,
          callsTitle: "Derniers appels",
          agentNames: {
            secretaire: "Secrétaire",
            devis: "Devis dicté",
            rappel: "Rappel",
          } as Record<string, string>,
          duration: (minutes: number, seconds: number) =>
            minutes ? `${minutes} min ${String(seconds).padStart(2, "0")}` : `${seconds} s`,
        },
        intro: (date: string) =>
          `Choisissez votre formule et votre mode de paiement. Les 2 premiers mois sont offerts : aucun prélèvement avant le ${date}, et vous pouvez arrêter à tout moment pendant l'essai.`,
        notValidated:
          "Le choix de la formule sera disponible dès que l'équipe MENAO aura validé votre dossier.",
        perMonth: "HT / mois",
        priceHt: (euros: string) => `${euros} €`,
        trialBadge: "2 mois offerts",
        choose: (nom: string) => `Choisir la formule ${nom}`,
        // Au mois ou à l'année (ADR 0200).
        yearlyAlt: (annual: string, monthly: string) =>
          `ou ${annual} € HT par an, soit ${monthly} € par mois`,
        chooseMonthly: (nom: string) => `Choisir ${nom} au mois`,
        recommended: "Recommandé",
        chooseYearly: (nom: string, free: number) =>
          `Choisir ${nom} à l'année, ${free} mois offerts`,
        monthlyLabel: "Au mois",
        yearlyLabel: (free: number) => `À l'année, ${free} mois offerts`,
        monthlyNote: "Au mois : sans engagement, vous arrêtez quand vous voulez.",
        yearlyNote: (months: number, free: number, date: string) =>
          `À l'année : ${months} mois payés d'avance, ${free} mois offerts. L'engagement commence au premier paiement, le ${date}.`,
        guaranteeNote: (minRequests: number, months: number) =>
          `Garantie de l'engagement : moins de ${minRequests} demandes ${months} mois de suite, ou activité cessée, et vous partez sans frais.`,
        yearlyTrial: (date: string) =>
          `Paiement à l'année : engagement de 12 mois à partir du ${date}.`,
        yearlyActive: (date: string) =>
          `Paiement à l'année : engagement jusqu'au ${date}, puis renouvellement pour un an, sauf résiliation depuis le portail avant cette date.`,
        soon: "Bientôt disponible",
        current: "Votre abonnement",
        manage: "Gérer mon abonnement",
        manageHint:
          "Changer de moyen de paiement, télécharger vos factures ou résilier (fin de période).",
        processing:
          "Merci ! Votre abonnement est en cours d'activation : cette page se met à jour dans quelques instants.",
        status: {
          trialing: (date: string) => `Période d'essai jusqu'au ${date}`,
          active: (date: string) => `Actif — prochain prélèvement le ${date}`,
          past_due:
            "Paiement en échec : Stripe va réessayer. Mettez à jour votre moyen de paiement.",
          unpaid:
            "Abonnement impayé : votre compte n'est plus visible. Mettez à jour votre moyen de paiement.",
          canceled: "Abonnement résilié.",
          incomplete: "Abonnement incomplet : finalisez le paiement.",
          incomplete_expired: "Abonnement expiré avant finalisation.",
          paused: "Abonnement en pause.",
        },
        cancelAtPeriodEnd: (date: string) => `Résiliation programmée le ${date}.`,
        vatNote: "Prix hors taxes ; TVA de 20 % appliquée sur la facture.",
        errors: {
          not_validated: "Votre dossier doit d'abord être validé par l'équipe MENAO.",
          plan_unavailable: "Cette formule n'est pas encore disponible.",
          already_subscribed: "Vous avez déjà un abonnement : gérez-le depuis le portail.",
          no_customer: "Aucun abonnement à gérer pour le moment.",
          rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
          unavailable:
            "Le service de paiement est momentanément indisponible. Réessayez dans quelques minutes.",
          forbidden: "Cette action est réservée aux comptes professionnels.",
          non_inclus:
            "Les recharges de minutes sont incluses dans les formules Premium et Entreprise.",
        },
      },
      upload: {
        file: "Fichier",
        fileHintDocument: "PDF, JPEG ou PNG, 10 Mo maximum.",
        fileHintPhoto: "JPEG ou PNG.",
        sending: "Envoi en cours…",
        fileRequired: "Choisissez un fichier.",
        fileTooLarge: "Ce fichier dépasse 10 Mo.",
        uploadFailed: "L'envoi du fichier a échoué. Réessayez.",
        status: {
          ok: "Fichier enregistré.",
          invalid: "Envoi invalide. Réessayez.",
          invalid_type:
            "Ce type de fichier n'est pas accepté (le contenu ne correspond pas à un PDF, JPEG ou PNG).",
          too_large: "Ce fichier dépasse 10 Mo.",
          not_found: "Le fichier n'a pas été reçu. Réessayez.",
          locked:
            "Vos documents ne peuvent pas être modifiés pendant la vérification de votre dossier.",
          limit: "Vous avez atteint le nombre maximum de photos (12).",
          forbidden: "Cette action est réservée aux comptes professionnels.",
          rate_limited: "Trop d'envois en peu de temps. Réessayez plus tard.",
          unavailable:
            "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
        },
      },
      documents: {
        intro:
          "Déposez les justificatifs ci-dessous. Ils restent privés : seule l'équipe MENAO peut les consulter pour vérifier votre entreprise.",
        types: {
          kbis: "Kbis ou extrait INSEE/RNE de moins de 3 mois",
          decennale: "Attestation d'assurance décennale",
          rc_pro: "Attestation de responsabilité civile professionnelle",
          identite: "Pièce d'identité du dirigeant",
          urssaf: "Attestation de vigilance URSSAF",
        },
        missing: "À déposer",
        statuses: {
          en_attente: "Déposé, en attente de vérification",
          valide: "Vérifié",
          refuse: "Refusé",
        },
        invalidNow: "Ce document n'est plus valable (date dépassée) : déposez-en un nouveau.",
        view: "Voir le document",
        // Entreprise vérifiée au registre, à la place du Kbis déposé (ADR 0217).
        registry: {
          verified: (date: string) =>
            `Entreprise vérifiée automatiquement au registre des entreprises le ${date} : rien à déposer.`,
          view: "Voir la fiche de vérification",
          reasons: {
            introuvable:
              "Votre entreprise n'a pas été trouvée dans l'annuaire public des entreprises : déposez votre Kbis ou un extrait RNE.",
            inactive:
              "L'annuaire public des entreprises indique une entreprise fermée : déposez un Kbis ou un extrait RNE récent.",
            masque:
              "Les dirigeants de votre entreprise ne sont pas publiés dans l'annuaire public : déposez votre Kbis ou un extrait RNE.",
            dirigeant_absent:
              "Votre nom n'apparaît pas parmi les dirigeants publiés de l'entreprise : déposez votre Kbis ou un extrait RNE.",
          } as Record<string, string>,
          recheck: "Revérifier au registre",
        },
        replace: "Remplacer le document",
        send: "Déposer le document",
        dateEmission: "Date d'émission",
        dateFin: "Date de fin de validité",
        dateFinIdentite: "Date d'expiration (optionnel)",
        coverageLegend: "Votre attestation couvre-t-elle ces métiers ?",
        coverageHint: "Un métier non couvert passe en vérification manuelle par l'équipe MENAO.",
        exemptTitle: "Métiers non soumis à la décennale ?",
        exemptText:
          "Pour les rares métiers sans travaux sur le bâti (nettoyage, petit dépannage sans travaux…), la décennale n'est pas obligatoire. L'équipe MENAO vérifie votre déclaration.",
        exemptDeclare: "Mes métiers ne sont pas soumis à la décennale",
        exemptDeclared:
          "Vous avez déclaré vos métiers non soumis à la décennale : l'équipe MENAO vérifiera votre déclaration avec votre dossier.",
        exemptCancel: "Annuler : je dépose mon attestation décennale",
        securityCode: "Code de sécurité",
        securityCodeHint:
          "Le code inscrit sur l'attestation : l'équipe MENAO le vérifie sur le site de l'URSSAF.",
        urssafMissing:
          "Ajoutez votre attestation de vigilance URSSAF dans « Documents » : elle est désormais demandée à tous les artisans MENAO.",
        assureur: "Assureur",
        numero: "Numéro de contrat",
        couverture: "Couverture géographique",
        couverturePlaceholder: "France métropolitaine",
        refusedBecause: (motif: string) => `Motif du refus : ${motif}`,
        // Refonte « Nette » (ADR 0254) : à côté du dépôt d'une pièce.
        checksTitle: "Ce que l'équipe vérifie",
        checks: {
          kbis: ["Le nom de l'entreprise et le SIRET", "La date : moins de 3 mois", "Le dirigeant"],
          decennale: [
            "Le nom de l'entreprise et le SIRET",
            "Les dates de validité",
            "Les métiers couverts",
            "La couverture géographique",
          ],
          rc_pro: [
            "Le nom de l'entreprise",
            "Les dates de validité",
            "L'assureur et le numéro de contrat",
          ],
          identite: ["Le nom du dirigeant", "La date d'expiration", "Une photo nette et lisible"],
          urssaf: [
            "Le SIRET",
            "La date : moins de 6 mois",
            "Le code de sécurité, sur le site de l'URSSAF",
          ],
        },
        validUntil: (date: string) => `valable jusqu'au ${date}`,
        renew: "Déposer le document à jour",
        photo: "Prendre en photo",
        chooseFile: "Choisir un fichier",
        photoHint: "Une photo nette, à plat et bien éclairée, ou le PDF reçu de votre assureur.",
        chosen: (name: string) => `Fichier choisi : ${name}`,
        // Lecture automatique du document (ADR 0176).
        reading: {
          reading: "Lecture du document…",
          done: "Document lu automatiquement : vérifiez les informations ci-dessous avant de l'envoyer.",
          empty:
            "Nous n'avons pas trouvé ces informations sur le document : complétez les champs ci-dessous.",
          failed:
            "Le document n'a pas pu être lu automatiquement : complétez les champs ci-dessous.",
          otherDocument: (expected: string) =>
            `Ce document ne semble pas être le bon (attendu : ${expected}). Vérifiez le fichier avant de l'envoyer.`,
          warnings: {
            illisible:
              "Le document est difficile à lire : reprenez la photo à plat, bien éclairée et sans reflet. Un document illisible est refusé.",
            siren_different:
              "Le numéro SIREN inscrit sur ce document n'est pas celui de votre entreprise. Vérifiez que le document est bien à son nom.",
          },
        },
        backToDossier: "Retour à mon dossier",
        current: "Document en cours",
        renewal: "Renouvellement",
        expiry: {
          ok: null,
          bientot: (days: number) => `Expire dans ${days} jours`,
          urgent: (days: number) =>
            days === 0 ? "Expire aujourd'hui" : `Expire dans ${days} jour${days > 1 ? "s" : ""}`,
          expire: "Expiré",
        },
        expiringBanner: (docs: string) =>
          `Pensez à renouveler : ${docs}. Déposez les documents à jour dans « Documents ».`,
        issuedOn: (date: string) => `émis le ${date}`,
      },
      profile: {
        // Refonte « Nette » (ADR 0254) : aperçu de la fiche à côté du formulaire.
        previewTitle: "Ce que verront les clients",
        previewEmpty: "Votre présentation apparaîtra ici.",
        avatar: "Photo de profil",
        avatarHint: "Votre portrait ou votre logo. Elle apparaît sur votre fiche publique.",
        avatarAlt: "Photo de profil",
        avatarChange: "Changer la photo",
        avatarSend: "Envoyer la photo",
        presentation: "Présentation",
        presentationHint:
          "Votre parcours, votre savoir-faire, ce qui vous distingue (100 caractères minimum).",
        presentationCount: (n: number, min: number) =>
          n < min ? `${n} / ${min} caractères` : `${n} caractère${n > 1 ? "s" : ""}`,
        presentationDraft: "Proposer un texte",
        presentationSave: "Enregistrer la présentation",
        portfolio: "Photos de réalisations",
        portfolioHint:
          "Jusqu'à 12 photos de chantiers terminés (sans personne ni adresse visible). Vous pouvez en choisir plusieurs à la fois.",
        portfolioAlt: (n: number) => `Réalisation ${n}`,
        portfolioAdd: "Ajouter des photos",
        portfolioSending: (done: number, total: number) =>
          `Envoi de la photo ${done} sur ${total}…`,
        portfolioDone: (n: number) => (n > 1 ? `${n} photos ajoutées.` : "Photo ajoutée."),
        portfolioTooMany: (n: number) =>
          `Seules les ${n} premières photos ont été envoyées : 12 au plus.`,
        portfolioDelete: "Supprimer",
        portfolioEmpty: "Aucune photo pour le moment.",
      },
      zone: {
        legend: "Comment définir votre zone ?",
        modeRayon: "Autour de mon adresse",
        modeCommunes: "Une liste de communes",
        modeDepartements: "Un ou plusieurs départements",
        modeRegions: "Une ou plusieurs régions",
        modeFrance: "Toute la France",
        addressTerritoryHint: "Elle sert à indiquer votre distance aux clients.",
        departementSearch: "Ajouter un département",
        departementSearchHint: "Tapez un nom ou un numéro, par exemple 06.",
        regionSearch: "Ajouter une région",
        regionSearchHint: "Tapez le nom d'une région puis choisissez-la dans la liste.",
        territories: "Territoires choisis",
        franceNote: "Vous recevrez les demandes de toute la France.",
        wideNote:
          "Sur une région ou toute la France, vous passez après les artisans proches du chantier.",
        address: "Adresse de départ",
        addressHint: "Commencez à taper puis choisissez une adresse dans la liste.",
        radius: "Rayon d'intervention",
        radiusOption: (km: number) => `${km} km`,
        communes: "Communes",
        communeSearch: "Ajouter une commune",
        communeSearchHint: "Tapez le nom d'une commune puis choisissez-la dans la liste.",
        remove: (nom: string) => `Retirer ${nom}`,
        noResults: "Aucun résultat.",
        searching: "Recherche…",
      },
    },
  },
  ranking: {
    title: "Critères de classement des artisans",
    intro:
      "MENAO présente au particulier les artisans vérifiés qui peuvent réaliser son projet. Voici comment ils sont sélectionnés et classés.",
    selectionTitle: "Quels artisans sont proposés ?",
    selection: [
      "Artisans dont MENAO a vérifié l'entreprise (SIRET actif), l'identité et les assurances (décennale et responsabilité civile professionnelle en cours de validité).",
      "Artisans abonnés à MENAO et en mesure de recevoir des paiements.",
      "Artisans qui exercent le métier recherché et dont la zone d'intervention couvre l'adresse du chantier.",
      "Artisans qui ne se sont pas déclarés en pause ou en congés.",
    ],
    orderTitle: "Dans quel ordre ?",
    order: [
      "D'abord les artisans de proximité : ceux dont la zone est un rayon, une liste de communes ou des départements passent avant ceux qui couvrent une région entière ou toute la France.",
      "Dans chacun de ces groupes, les artisans disponibles immédiatement, puis les autres.",
      "Ensuite, le Score MENAO, sur 100, affiché sur la fiche de chaque artisan : badge « Assuré et vérifié » (20 points) ; expérience dans le métier, déclarée ou selon l'âge de l'entreprise (10) ; diplôme du métier déclaré et qualification vérifiée, comme RGE ou Qualibat (10) ; fiche complète, avec photo, réalisations, présentation et spécialités (10) ; réactivité, c'est-à-dire temps de réponse moyen aux demandes et devis envoyés dans les 72 h (10) ; avis des clients (40). Pour les avis, la note Google vérifiée par l'équipe MENAO sert de base, ou 3 sur 5 sans fiche Google ; les avis MENAO comptent de plus en plus avec leur nombre (la moitié du poids à 5 avis, 80 % à 20 avis). Un artisan sans demande part d'une réactivité neutre, remplacée par ses résultats réels.",
      "Ensuite, la date de disponibilité, puis les artisans les plus proches du chantier.",
      "Recommandations entre artisans : un artisan contacté par le particulier peut lui recommander un de ses partenaires MENAO (son parrain ou un de ses filleuls), à sa place ou pour un autre métier du chantier. Ces partenaires sont présentés à part, avec le nom de l'artisan qui les recommande, en dehors de ce classement. Une recommandation n'est jamais rémunérée et le particulier reste libre de ne pas les contacter.",
      "À égalité, un ordre aléatoire propre à chaque projet, pour ne favoriser aucun artisan.",
      "Place réservée aux nouveaux artisans : un artisan validé depuis moins de 90 jours, ou qui a mené moins de 3 chantiers à terme, n'a pas encore d'historique. Quand aucun d'eux ne figure parmi les 5 premiers, l'un d'eux est présenté en 3e position, choisi parmi ceux qui remplissent les conditions ci-dessus : d'abord parmi les disponibles immédiatement, puis par un tirage propre à chaque projet. Cette place ne dépend d'aucun paiement.",
      "Exceptions, à la demande du particulier : quand il redemande un devis à un artisan avec qui il a déjà réalisé un chantier (mention « Déjà venu chez vous »), ou quand il lance sa recherche depuis la fiche publique d'un artisan (lien ou carte de visite de l'artisan), sa demande est envoyée à cet artisan seul, s'il remplit les conditions ci-dessus. Aucun autre artisan ne lui est présenté pour ce métier tant que cet artisan n'a pas répondu ; s'il refuse ou ne répond pas dans les 72 h, le particulier peut choisir d'autres artisans selon le classement ci-dessus. Le particulier reste libre de lancer une recherche classique depuis l'accueil. Cette exception ne vaut que pour sa demande et ne dépend d'aucun paiement.",
    ],
    paidTitle: "Mise en avant payante",
    paid: "Aucune. Le classement ne dépend ni de la formule d'abonnement ni d'un paiement de l'artisan. Si cela devait changer, les artisans concernés seraient signalés par la mention « Mis en avant ».",
    limit: "Nous présentons au plus 5 artisans par recherche.",
    reviewsTitle: "Avis",
    reviews:
      "Seuls les clients ayant réalisé un chantier avec l'artisan via MENAO peuvent laisser un avis (« Avis vérifié »), une fois le procès-verbal de réception signé, et un seul par chantier. Chaque avis indique sa date de publication et la date de réception du chantier ; ils sont affichés du plus récent au plus ancien. L'artisan peut répondre publiquement une fois. Tout compte peut signaler un avis : l'équipe MENAO peut alors le masquer s'il enfreint la loi ou nos conditions d'utilisation, jamais pour la seule raison qu'il est négatif.",
    updated:
      "Dernière mise à jour : 31 octobre 2026 (version provisoire, en cours de validation juridique).",
  },
  admin: {
    title: "Back-office MENAO",
    badge: "Back-office",
    // Fiches consultées par le support (ADR 0286).
    readOnly:
      "Lecture seule : votre accès Support permet de consulter cette fiche, pas de la modifier.",
    nav: {
      overview: "Vue d'ensemble",
      launch: "Lancement",
      market: "Marché",
      leads: "Objectifs de demandes",
      requests: "Demandes",
      chantiers: "Chantiers",
      people: "Comptes",
      artisans: "Dossiers artisans",
      // Rangement du back-office (ADR 0283).
      compliance: "Conformité",
      contributors: "Apporteurs",
      technical: "Suivi technique",
      tickets: "Boîte de réception",
      payments: "Paiements des chantiers",
      subscriptions: "Abonnements",
      settings: "Réglages",
      references: "Métiers et travaux",
      journal: "Journal d'audit",
      signOut: "Me déconnecter",
    },
    // Rubriques à onglets (ADR 0283) : en-tête commun, onglets en pilule.
    tabs: {
      overview: { summary: "À traiter et chiffres", activity: "Toute l'activité" },
      compliance: {
        title: "Conformité",
        intro:
          "Les artisans déjà validés doivent le rester : documents renouvelés, échéances à venir et contrôle aléatoire du mois.",
        renewals: "Renouvellements",
        expiring: "Échéances",
        spotChecks: "Contrôles du mois",
        figuresLabel: "Conformité des artisans validés",
        renewalsLabel: "Renouvellements à vérifier",
        renewalsHint: "documents déposés par les artisans",
        expiringHint: (expired: number) =>
          expired === 0
            ? "dans les 30 jours"
            : `dans les 30 jours, dont ${expired} expiré${expired > 1 ? "s" : ""}`,
        spotChecksLabel: "Contrôles restants",
        spotChecksHint: (total: number) =>
          total === 0 ? "tirage du mois pas encore lancé" : `sur ${total} tirés au sort ce mois-ci`,
      },
      contributors: {
        title: "Apporteurs",
        intro:
          "Ceux qui font venir des artisans et des clients à MENAO : commerciaux de terrain, partenaires et artisans qui parrainent un confrère.",
        commercials: "Commerciaux",
        partners: "Partenaires",
        referrals: "Parrainages",
      },
      subscriptions: { subscriptions: "Abonnements", topUps: "Recharges de minutes" },
      technical: {
        title: "Suivi technique",
        ai: "IA",
        webhooks: "Notifications Stripe et DocuSeal",
      },
    },
    // Réglages et équipe MENAO (F-133, ADR 0284).
    settingsPage: {
      title: "Réglages",
      intro:
        "Les réglages de toute la plateforme et l'équipe MENAO. Chaque modification est inscrite au journal d'audit.",
      tabs: { settings: "Réglages", team: "Équipe MENAO" },
      onThisPage: "Sur cette page",
      sections: {
        plateforme: "Plateforme",
        demandes: "Demandes",
        accueil: "Accueil du support",
        partenaires: "Programme Partenaires",
        commerciaux: "Primes des commerciaux",
        lancement: "Lancement : réglages des chiffres",
      },
      menu: {
        plateforme: "Plateforme",
        demandes: "Demandes",
        accueil: "Accueil du support",
        partenaires: "Partenaires",
        commerciaux: "Commerciaux",
        lancement: "Lancement",
      },
      platformLead: "Décisions [À VALIDER] réglables par un admin.",
      changed: (date: string, who: string) => `Modifié le ${date} par ${who}`,
      changedNoName: (date: string) => `Modifié le ${date}`,
      never: "Jamais modifié",
      someone: "un membre de l'équipe",
      edit: "Modifier dans Réglages",
      saved: "Réglages enregistrés.",
      summaries: {
        leads: (n: number) => `${n} demande${n > 1 ? "s" : ""} par mois`,
        commercials: (validation: string, subscription: string, days: number) =>
          `${validation} à la validation · ${subscription} à l'abonnement · après ${days} jours`,
        partners: (request: string, subscriber: string, days: number) =>
          `${request} par demande qualifiée · ${subscriber} par abonné · après ${days} jours`,
        notSet: "montants non fixés",
        launch: (from: string, to: string) => `Recrutement du ${from} au ${to}`,
        launchDefault: "Les 12 dernières semaines (aucune période réglée)",
        ratings: (on: boolean) =>
          on ? "Notes des clients visibles : activé" : "Notes des clients visibles : désactivé",
        holidaysClosed: "fermé les jours fériés",
      },
      team: {
        figuresLabel: "Équipe MENAO",
        members: "Membres",
        membersHint: (admins: number, support: number, verification: number) =>
          `${admins} admin${admins > 1 ? "s" : ""}, ${support} support, ${verification} vérification`,
        mfa: "Double authentification",
        mfaValue: (on: number, total: number) => `${on} sur ${total}`,
        mfaHint: (missing: number) =>
          missing === 0
            ? "activée par tous"
            : `${missing} membre${missing > 1 ? "s ne l'ont" : " ne l'a"} pas encore activée`,
        pending: "Invitations en attente",
        pendingHint: (n: number) => (n === 0 ? "aucune" : "pas encore de première connexion"),
        listLabel: "Membres de l'équipe",
        columns: {
          member: "Membre",
          access: "Accès",
          mfa: "Double auth.",
          lastSeen: "Dernière connexion",
        },
        mfaOn: "Activée",
        mfaOff: "À activer",
        you: "Vous",
        neverSeen: (date: string) => `invité le ${date}`,
        actions: (name: string) => `Actions pour ${name}`,
        changeAccess: "Changer l'accès",
        makeRole: {
          admin: "Passer en Admin",
          support: "Passer en Support",
          verification: "Passer en Vérification",
        },
        remove: "Retirer l'accès",
        removeConfirm: (name: string) =>
          `Retirer l'accès de ${name} ? Sa connexion sera bloquée et ses sessions fermées. Son nom reste dans le journal et sur les tickets traités.`,
        removeYes: "Oui, retirer l'accès",
        roleChanged: "Accès modifié. Le changement s'applique à sa prochaine connexion.",
        removed: "Accès retiré.",
        rolesTitle: "Ce que voit chaque accès",
        roles: {
          admin:
            "Tout le back-office, dont la validation des dossiers, l'argent, le lancement et les réglages.",
          support:
            "La boîte de réception (tickets, modération, litiges), et la consultation des demandes, chantiers, comptes et fiches artisans, sans les modifier.",
          verification:
            "Les dossiers artisans et la conformité : documents, décisions, renouvellements et contrôles.",
        },
        empty: "Aucun membre.",
      },
    },
    // Objectif de demandes par artisan (F-131, ADR 0282).
    // Demandes du mois face à la limite de la formule (F-139, ADR 0290).
    planLimit: (plan: string, received: number, limit: number) =>
      `Formule ${plan} : ${received} / ${limit} demandes`,
    leads: {
      title: "Objectifs de demandes",
      intro:
        "Chaque artisan validé doit recevoir un minimum de demandes de devis par mois. Demandes des particuliers via MENAO, hors demandes directes (fiche, carte de visite, nouvelle demande d'un client).",
      monthsLabel: "Mois",
      month: (date: string) => {
        const label = new Intl.DateTimeFormat("fr-FR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${date}T00:00:00Z`));
        return label.charAt(0).toUpperCase() + label.slice(1);
      },
      monthShort: (date: string) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
          .format(new Date(`${date}T00:00:00Z`))
          .replace(".", ""),
      current: "Ce mois-ci",
      summary: {
        followed: "Artisans suivis",
        followedHint: (target: number) =>
          `Objectif par défaut : ${target} demande${target > 1 ? "s" : ""} par mois`,
        reached: "Objectif atteint",
        onTrack: "Dans les temps",
        late: "En retard",
        lateHint: "Sous le rythme attendu à date",
        missed: "Objectif manqué",
        zero: "Aucune demande",
        twoMonths: "2 mois de suite sous l'objectif",
        twoMonthsHint: "Seuil de sortie sans frais de la garantie",
        rate: "Taux d'atteinte",
        noSearch: "Sans recherche dans leur zone",
        noSearchHint: "Personne n'a cherché leur métier dans leur zone : il manque des clients",
        requests: "Demandes reçues",
        requestsHint: (direct: number) =>
          `${direct.toLocaleString("fr-FR")} demande${direct > 1 ? "s" : ""} directe${direct > 1 ? "s" : ""} en plus`,
      },
      filtersLabel: "Afficher",
      filters: {
        tous: "Tous",
        alertes: "En alerte",
        en_retard: "En retard",
        manque: "Manqué",
        dans_les_temps: "Dans les temps",
        atteint: "Atteint",
        hors_suivi: "Hors suivi",
      },
      searchLabel: "Rechercher un artisan",
      searchPlaceholder: "Nom de l'entreprise",
      columns: {
        artisan: "Artisan",
        progress: "Demandes / objectif",
        status: "Situation",
        cause: "Cause probable",
        history: "6 derniers mois",
      },
      statuses: {
        manque: "Manqué",
        en_retard: "En retard",
        dans_les_temps: "Dans les temps",
        atteint: "Atteint",
        hors_suivi: "Hors suivi",
      },
      alerts: {
        deux_mois: "2 mois sous l'objectif",
        en_retard: "En retard",
      },
      causes: {
        en_pause: "Profil en pause : il ne reçoit aucune demande.",
        absent: "Absent aujourd'hui (agenda) : il ne reçoit aucune demande.",
        invisible:
          "Profil invisible des particuliers (abonnement, documents ou paiements à régulariser).",
        aucune_recherche:
          "Aucune recherche de son métier dans sa zone ce mois-ci : il manque des clients, pas de la visibilité.",
        peu_choisi: (n: number) =>
          `${n.toLocaleString("fr-FR")} recherche${n > 1 ? "s" : ""} de son métier dans sa zone, mais peu de demandes : voir sa fiche, ses prix et son classement.`,
      },
      progress: (received: number, target: number) =>
        `${received.toLocaleString("fr-FR")} sur ${target.toLocaleString("fr-FR")}`,
      expected: (n: number) => `${n.toLocaleString("fr-FR")} attendue${n > 1 ? "s" : ""} à date`,
      missing: (n: number) => `encore ${n.toLocaleString("fr-FR")} demande${n > 1 ? "s" : ""}`,
      direct: (n: number) => `+ ${n.toLocaleString("fr-FR")} directe${n > 1 ? "s" : ""}`,
      searches: (n: number) =>
        `${n.toLocaleString("fr-FR")} recherche${n > 1 ? "s" : ""} dans sa zone`,
      ownTarget: "objectif propre",
      validatedOn: (date: string) => `validé le ${date}`,
      historyBar: (month: string, received: number, target: number | null) =>
        target === null
          ? `${month} : ${received} demande${received > 1 ? "s" : ""}, hors suivi`
          : `${month} : ${received} demande${received > 1 ? "s" : ""} sur ${target}`,
      empty: "Aucun artisan dans cette sélection.",
      results: (n: number) => `${n.toLocaleString("fr-FR")} artisan${n > 1 ? "s" : ""}`,
      unavailable: "Le suivi des objectifs est momentanément indisponible.",
      settings: {
        title: "Objectif par défaut",
        lead: "Nombre de demandes que chaque artisan validé doit recevoir par mois. Un artisan validé en cours de mois a un objectif au prorata des jours restants. Un objectif propre se règle sur la fiche de l'artisan.",
        label: "Demandes par mois",
        save: "Enregistrer",
        saved: "Objectif enregistré.",
      },
      // Fiche d'un artisan.
      detail: {
        title: "Objectif de demandes",
        thisMonth: "Ce mois-ci",
        ownLabel: "Objectif propre à cet artisan (demandes par mois)",
        ownHint: (target: number) =>
          `Vide : objectif par défaut (${target}). 0 : artisan hors suivi.`,
        save: "Enregistrer",
        seeAll: "Voir tous les artisans",
      },
      errors: {
        invalid: "Indiquez un nombre de demandes entre 0 et 100.",
        generic: "L'objectif n'a pas pu être enregistré. Réessayez.",
      },
    },
    // Carte du marché (ADR 0181).
    market: {
      title: "Marché",
      intro:
        "Les artisans de MENAO sur la carte, la demande des particuliers par commune et l'entonnoir des recherches, pour voir le réseau grandir et où recruter.",
      periodLabel: "Période de la demande",
      periods: { 30: "30 jours", 90: "90 jours", 365: "1 an" },
      figures: {
        valides: "Artisans validés",
        enCours: "Inscriptions en cours",
        recherches: (days: number) => `Recherches (${days} j)`,
        demandes: "Demandes envoyées",
        taux: "Recherches qui aboutissent",
        aRecruter: "Communes et métiers à recruter",
      },
      map: {
        label: "Carte des artisans et de la demande",
        layers: "Afficher",
        artisans: "Artisans",
        zones: "Zones d'intervention",
        demand: "Demande des particuliers",
        trade: "Métier",
        allTrades: "Tous les métiers",
        zoomIn: "Zoomer",
        zoomOut: "Dézoomer",
        recenter: "Recentrer sur tout le réseau",
        grow: "Voir grandir",
        pause: "Pause",
        timeline: "Date affichée sur la carte",
        today: "Aujourd'hui",
        at: (date: string) => `Au ${date}`,
        unnamed: "Artisan sans nom",
        stages: {
          valide: "Validé",
          en_cours: "Inscription en cours",
          suspendu: "Suspendu",
          refuse: "Refusé",
        },
        joined: (date: string) => `Inscrit le ${date}`,
        zoneRadius: (km: number) => `Rayon de ${km} km`,
        zoneList: (labels: string[]) =>
          labels.length > 3
            ? `${labels.slice(0, 3).join(", ")} +${labels.length - 3}`
            : labels.join(", "),
        zonesNotDrawn: (n: number) =>
          n > 1
            ? `${n} artisans validés ont une zone sans cercle (communes, départements, régions ou France) : survolez leur point pour la lire.`
            : "1 artisan validé a une zone sans cercle (communes, départements, régions ou France) : survolez son point pour la lire.",
        searches: (n: number) => `${n} recherche${n > 1 ? "s" : ""}`,
        results: (n: number) => `${n} jusqu'aux résultats`,
        requests: (n: number) => `${n} demande${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""}`,
        demandTip: (ville: string, searches: number, results: number, requests: number) =>
          `${ville} : ${searches} recherche${searches > 1 ? "s" : ""}, ${results} jusqu'aux résultats, ${requests} demande${requests > 1 ? "s" : ""} envoyée${requests > 1 ? "s" : ""}`,
        noPosition: (n: number) =>
          `${n} artisan${n > 1 ? "s" : ""} sans position (zone pas encore choisie).`,
        credit: "© IGN – Plan IGN",
      },
      funnel: {
        title: "Entonnoir par commune et par métier",
        intro:
          "Recherches lancées, menées jusqu'aux résultats, puis demandes envoyées. « À recruter » : des particuliers cherchent, mais aucun artisan validé du métier ne couvre la commune.",
        commune: "Commune",
        trade: "Métier",
        searches: "Recherches",
        results: "Résultats",
        requests: "Demandes",
        coverage: "Artisans qui couvrent",
        toRecruit: "À recruter",
        covered: (n: number, large: number) =>
          large === 0
            ? `${n}`
            : large === n
              ? `${n} (région ou France)`
              : `${n} (dont ${large} région ou France)`,
        unknownTrade: "Métier non déterminé",
        empty: "Aucune recherche sur la période.",
        unplaced: (n: number) => `${n} recherche${n > 1 ? "s" : ""} sans commune.`,
      },
    },
    // Toute l'activité, page par page et par catégorie (ADR 0146).
    activityLog: {
      title: "Toute l'activité",
      intro:
        "Tout ce qui se passe sur MENAO, du plus récent au plus ancien : recherches, demandes, chantiers, dossiers, support, avis et abonnements.",
      filtersLabel: "Filtrer l'activité",
      categories: {
        tout: "Tout",
        recherches: "Recherches",
        demandes: "Demandes",
        chantiers: "Chantiers",
        dossiers: "Artisans",
        support: "Support",
        avis: "Avis",
        abonnements: "Abonnements",
      } as Record<
        | "tout"
        | "recherches"
        | "demandes"
        | "chantiers"
        | "dossiers"
        | "support"
        | "avis"
        | "abonnements",
        string
      >,
      limit: "Les 5 000 derniers événements sont consultables.",
    },
    // Contrôle aléatoire des dossiers (ADR 0121).
    spotChecks: {
      title: "Contrôles aléatoires",
      intro: (rate: number) =>
        `Chaque mois, ${rate}\u00a0% des artisans validés sont tirés au sort pour une nouvelle vérification de leur dossier. En cas de doute sur une assurance, appelez l'assureur.`,
      month: (label: string) => `Contrôles de ${label}`,
      target: (done: number, total: number, target: number) =>
        `${done} fait${done > 1 ? "s" : ""} sur ${total} tiré${total > 1 ? "s" : ""} (objectif du mois : ${target})`,
      empty:
        "Aucun dossier tiré ce mois-ci pour l'instant. Le tirage a lieu automatiquement le 1er du mois.",
      draw: "Lancer le tirage du mois",
      drawn: (n: number) =>
        n === 0
          ? "L'objectif du mois est déjà atteint : aucun nouveau dossier tiré."
          : n > 1
            ? `${n} dossiers tirés au sort.`
            : "1 dossier tiré au sort.",
      checklist: [
        "Décennale (ou métiers non soumis), RC Pro et attestation URSSAF en vigueur et cohérentes",
        "Entreprise toujours active (SIRET) et dirigeant inchangé",
        "Assurance douteuse : appeler l'assureur pour confirmer le contrat",
      ],
      drawnOn: (date: string) => `Tiré le ${date}`,
      open: (name: string) => `Ouvrir le dossier de ${name}`,
      pending: "À faire",
      results: { conforme: "Conforme", non_conforme: "Non conforme" } as Record<string, string>,
      checkedBy: (date: string, name: string | null) =>
        name ? `Contrôlé le ${date} par ${name}` : `Contrôlé le ${date}`,
      insurerCalled: "Assureur appelé",
      note: "Note",
      noteHint: "Obligatoire si le dossier n'est pas conforme.",
      markConforme: "Conforme",
      markNonConforme: "Non conforme",
      saved: "Résultat enregistré.",
      error: "Résultat non enregistré : une note est obligatoire pour un contrôle non conforme.",
      previous: "Mois précédents",
      noPrevious: "Aucun contrôle les mois précédents.",
      artisanSection: "Contrôles aléatoires",
      artisanPending: "Ce dossier a été tiré au sort ce mois-ci : contrôle à faire.",
      artisanAction: "Faire le contrôle",
      artisanNone: "Jamais tiré au sort.",
    },
    overview: {
      title: "Vue d'ensemble",
      intro:
        "Tout MENAO en un coup d'œil : ce qui demande votre attention, l'activité du moment et les chiffres clés.",
      // Bandeau de chiffres (refonte « Nette », ADR 0252).
      band: {
        label: "MENAO en chiffres",
        visible: "Artisans visibles",
        visibleShort: "visibles",
        visibleHint: (n: number) => `${n} inscrit${n > 1 ? "s" : ""} sur 30 jours`,
        requests: "Demandes sur 7 jours",
        requestsShort: "demandes 7 j",
        requestsHint: (n: number) => `dont ${n} aujourd'hui`,
        urgent: "Urgent",
        urgentShort: "urgent",
        signed: "Devis signés sur 30 jours",
        signedHint: (amount: string) => `${amount} signés`,
        paying: "Abonnés payants",
        payingHint: (n: number) => `${n} en essai`,
      },
      live: "En direct",
      auto: "Actualisation automatique",
      updatedAt: (time: string) => `mis à jour à ${time}`,
      todo: {
        title: "À traiter maintenant",
        empty: "Rien à traiter : tout est à jour.",
        // File triée par urgence, filtres par pôle (ADR 0133).
        severities: { urgent: "Urgent", important: "Important", a_faire: "À faire" },
        poles: {
          all: "Tout",
          verification: "Artisans",
          support: "Support",
          activite: "Clients et chantiers",
          argent: "Argent",
          technique: "Système",
        },
        filters: "Filtrer par pôle",
        emptyPole: "Rien à traiter dans ce pôle.",
        before: (date: string) => `avant le ${date}`,
        dossiers: (n: number) => (n > 1 ? `${n} dossiers à vérifier` : "1 dossier à vérifier"),
        oldest: (ago: string) => `Le plus ancien a été envoyé ${ago}.`,
        open: (name: string) => `Ouvrir le dossier de ${name}`,
        dossiersAction: "Voir tous les dossiers",
        spotChecks: (n: number) =>
          n > 1 ? `${n} contrôles aléatoires à faire` : "1 contrôle aléatoire à faire",
        spotChecksHint: "Dossiers tirés au sort ce mois-ci : revérifier les documents en vigueur.",
        spotChecksAction: "Faire les contrôles",
        late: (n: number) => (n > 1 ? `${n} tickets en retard` : "1 ticket en retard"),
        lateHint: "Réponse promise sous 7 jours, délai dépassé.",
        lateAction: "Répondre",
        disputes: (n: number) => (n > 1 ? `${n} litiges ouverts` : "1 litige ouvert"),
        disputesHint: "Chantiers bloqués en attendant la décision de l'équipe.",
        disputesAction: "Traiter les litiges",
        renewals: (n: number) =>
          n > 1 ? `${n} documents renouvelés à vérifier` : "1 document renouvelé à vérifier",
        renewalsHint: "Nouvelles attestations déposées par des artisans validés.",
        insurances: (n: number) =>
          n > 1 ? `${n} assurances expirent sous 7 jours` : "1 assurance expire sous 7 jours",
        insurancesHint:
          "Artisans déjà relancés ; sans renouvellement, leur profil sera suspendu à l'échéance.",
        watchAction: "Voir les échéances",
        renewalsAction: "Vérifier les renouvellements",
        expiring: (n: number) =>
          n > 1
            ? `${n} demandes sans réponse expirent sous 12 h`
            : "1 demande sans réponse expire sous 12 h",
        expiringHint: "Un appel à l'artisan peut éviter qu'un client reste sans réponse.",
        expiringAction: "Voir ces demandes",
        expiresIn: (h: number, m: number) =>
          `expire dans ${h}\u00a0h\u00a0${String(m).padStart(2, "0")}`,
        failed: (n: number) =>
          n > 1 ? `${n} paiements échoués cette semaine` : "1 paiement échoué cette semaine",
        failedHint: "Le client doit relancer le paiement depuis son espace.",
        failedAction: "Voir les paiements échoués",
        unpaid: (n: number) => (n > 1 ? `${n} abonnements impayés` : "1 abonnement impayé"),
        unpaidHint:
          "Stripe relance l'artisan. Sans paiement à la fin des relances, son profil n'est plus visible.",
        unpaidAction: "Voir les impayés",
        // Nouveaux artisans jamais choisis (ADR 0160).
        support: (n: number) =>
          n > 1 ? `${n} nouveaux artisans à accompagner` : "1 nouvel artisan à accompagner",
        supportHint: (requests: number, days: number) =>
          `Au moins ${requests} demandes en ${days} jours sans être choisi : l'appeler pour l'aider (profil, photos, prix, délai d'envoi des devis).`,
        supportAction: "Voir les tickets",
        // Objectif de demandes (ADR 0282).
        leads: (n: number) =>
          n > 1 ? `${n} artisans en manque de demandes` : "1 artisan en manque de demandes",
        leadsHint:
          "En retard sur l'objectif du mois, ou deux mois de suite sous l'objectif : voir la cause probable et agir (zone, fiche, recrutement de clients).",
        leadsAction: "Voir les objectifs",
        webhooks: (n: number) =>
          n > 1
            ? `${n} notifications Stripe ou DocuSeal en échec`
            : "1 notification Stripe ou DocuSeal en échec",
        webhooksHint: "Des paiements, abonnements ou signatures peuvent ne pas être à jour.",
        webhooksAction: "Voir les notifications",
        deletions: (n: number) =>
          n > 1 ? `${n} demandes de suppression de compte` : "1 demande de suppression de compte",
        deletionsHint: (date: string) => `Réponse sous un mois : la plus proche avant le ${date}.`,
        deletionsAction: "Traiter les demandes",
      },
      activity: {
        title: "Activité en direct",
        seeAll: "Voir toute l'activité",
        empty: "Aucune activité pour le moment.",
        recherche: "Nouvelle recherche",
        demande_envoyee: (artisan: string) => `Demande envoyée à ${artisan}`,
        demande_acceptee: (artisan: string) => `${artisan} a accepté une demande`,
        demande_refusee: (artisan: string) => `${artisan} a refusé une demande`,
        demande_expiree: (artisan: string) => `Demande expirée sans réponse de ${artisan}`,
        demande_annulee: (artisan: string) => `Demande à ${artisan} annulée par le client`,
        chantier: {
          rdv_fixe: "Rendez-vous fixé",
          devis_envoye: "Devis envoyé",
          revision_demandee: "Modification du devis demandée",
          devis_refuse: "Devis refusé",
          devis_signe: "Devis signé",
          acompte_paye: "Acompte payé",
          date_confirmee: "Date de démarrage confirmée",
          demarrage: "Travaux démarrés",
          fin_declaree: "Fin des travaux déclarée",
          pv_sans_reserves: "Réception sans réserves",
          pv_avec_reserves: "Réception avec réserves",
          reserves_levees: "Réserves levées",
          solde_paye: "Solde payé",
          litige_ouvert: "Litige ouvert",
          litige_resolu: "Litige clos, chantier repris",
          litige_annule: "Litige clos, chantier annulé",
          annulation: "Chantier annulé",
        },
        dossier_envoye: (company: string) => `Dossier envoyé par ${company}`,
        dossier_decision: {
          valide: (company: string) => `Dossier de ${company} validé`,
          refuse: (company: string) => `Dossier de ${company} refusé`,
          complement: (company: string) => `Complément demandé à ${company}`,
        },
        ticket: (type: string) => `Nouveau ticket : ${type}`,
        avis: (artisan: string, score: string) => `Avis publié pour ${artisan} : ${score}`,
        abonnement: (company: string) => `Abonnement souscrit par ${company}`,
        unknownArtisan: "un artisan",
      },
      figures: {
        title: "Chiffres clés",
        intro: "Sur les 30 derniers jours, sauf mention contraire.",
        requests: {
          title: "Demandes",
          today: "Envoyées aujourd'hui",
          week: "Envoyées en 7 jours",
          month: "Envoyées en 30 jours",
          pending: "En attente de réponse",
          responseRate: "Taux de réponse des artisans",
          acceptanceRate: "Taux d'acceptation",
          searches: "Recherches lancées",
          conversion: "Recherches suivies d'une demande",
          drafts: "Recherches non envoyées (7 jours)",
        },
        chantiers: {
          title: "Chantiers (en cours aujourd'hui)",
          stages: {
            demande: "Rendez-vous à faire",
            devis: "Devis en discussion",
            travaux: "Travaux",
            reception: "Réception",
            termine: "Terminés",
            litige: "En litige",
            abandonne: "Abandonnés",
          },
          quotesSent: "Devis envoyés",
          quotesSigned: "Devis signés",
          signedAmount: "Montant des devis signés",
        },
        artisans: {
          title: "Artisans",
          visible: "Visibles des particuliers",
          pending: "Dossiers à vérifier",
          suspended: "Suspendus",
          signups: "Inscriptions",
        },
        // Nouveaux artisans (ADR 0160) : indicateur clé de fidélisation.
        newArtisans: {
          title: "Nouveaux artisans",
          note: (firstDays: number, from: number, to: number) =>
            `Part des artisans validés il y a ${from} à ${to} jours dont un premier devis a été signé sous ${firstDays} jours.`,
          firstChantier: (days: number) => `Premier chantier sous ${days} jours`,
          firstChantierValue: (rate: string, n: number, total: number) =>
            `${rate} (${n} sur ${total})`,
          toSupport: "À accompagner",
          starterMonths: "Mois offerts de démarrage",
        },
        subscriptions: {
          title: "Abonnements des artisans",
          mrr: "Revenu mensuel récurrent (HT)",
          paying: "Abonnements payants",
          trials: "En période d'essai",
          unpaid: "Impayés",
          cancelled: "Résiliations",
          churn: "Taux de désabonnement",
          note: "Seul revenu de MENAO, au tarif des formules, hors remises.",
        },
        payments: {
          title: "Paiements des chantiers",
          paid: "Payé aux artisans",
          count: "Paiements réussis",
          failed: "Paiements échoués (7 jours)",
          note: "Versés directement sur les comptes Stripe des artisans : MENAO n'encaisse rien.",
        },
        support: {
          title: "Avis et support",
          reviews: "Avis publiés",
          average: "Note moyenne des avis",
          open: "Tickets ouverts",
          late: "Tickets en retard",
        },
      },
    },
    people: {
      title: "Comptes",
      intro: "Tous les comptes : particuliers, artisans et équipe MENAO.",
      searchLabel: "Rechercher une personne",
      searchPlaceholder: "Nom, e-mail ou téléphone",
      filtersLabel: "Filtrer par rôle",
      filters: {
        tous: "Tous",
        particuliers: "Particuliers",
        artisans: "Artisans",
        equipe: "Équipe MENAO",
      },
      // Invitation d'un membre de l'équipe : trois accès (F-67, ADR 0210, 0286).
      invite: {
        link: "Inviter un membre de l'équipe",
        title: "Inviter un membre de l'équipe",
        lead: "Il reçoit un e-mail pour choisir son mot de passe (lien valable une heure ; ensuite, « Mot de passe oublié » sur la page de connexion). À sa première visite du back-office, il active la double authentification.",
        fields: {
          firstName: "Prénom",
          lastName: "Nom",
          email: "Adresse e-mail",
          role: "Accès",
          roleHint:
            "Admin : tout le back-office. Support : la boîte de réception, et la consultation des demandes, chantiers, comptes et fiches artisans. Vérification : les dossiers artisans et la conformité.",
        },
        roles: { admin: "Admin", support: "Support", verification: "Vérification" } as Record<
          string,
          string
        >,
        submit: "Envoyer l'invitation",
        invited: (email: string) => `Invitation envoyée à ${email}.`,
        errors: {
          invalid: "Vérifiez le prénom, le nom, l'adresse e-mail et l'accès.",
          email_taken:
            "Un compte existe déjà avec cette adresse. Pour la sécurité, une invitation ne donne jamais l'accès admin à un compte existant : utilisez une autre adresse (par exemple son adresse @menao.fr).",
          forbidden: "Réservé aux administrateurs, avec la double authentification.",
          rate_limited: "Trop d'invitations en peu de temps. Réessayez dans une heure.",
          unavailable:
            "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
        } as Record<string, string>,
      },
      columns: {
        name: "Nom",
        email: "E-mail",
        role: "Rôle",
        created: "Inscription",
        lastSignIn: "Dernière connexion",
      },
      unnamed: "Sans nom",
      never: "Jamais",
      open: (name: string) => `Ouvrir la fiche de ${name}`,
      back: "Toutes les personnes",
      account: "Compte",
      createdOn: "Inscription",
      lastSignIn: "Dernière connexion",
      emailConfirmed: "E-mail confirmé",
      marketing: "Communications MENAO",
      yes: "Oui",
      no: "Non",
      suspended: "Connexion bloquée",
      artisanFile: "Fiche artisan",
      openArtisanFile: "Ouvrir la fiche artisan",
      requests: "Demandes",
      noRequests: "Aucune demande.",
      chantiers: "Chantiers",
      noChantiers: "Aucun chantier.",
      reviews: "Avis rédigés",
      noReviews: "Aucun avis.",
      reviewOf: (artisan: string, score: string) => `${artisan} : ${score}`,
    },
    accountActions: {
      title: "Actions sur le compte",
      staff: "Les comptes de l'équipe MENAO ne se gèrent pas ici.",
      reset: "Réinitialiser le mot de passe",
      resetHint:
        "La personne reçoit le même e-mail que « Mot de passe oublié » et choisit elle-même son nouveau mot de passe.",
      resetSent: (email: string) => `Lien envoyé à ${email}.`,
      noEmail: "Ce compte n'a pas d'adresse e-mail.",
      export: "Exporter ses données (RGPD)",
      exportHint:
        "Fichier JSON des données du compte, sans les messages privés entre client et artisan. L'export est journalisé.",
      // « Bloquer la connexion » (ADR 0285).
      effect: "il ne peut plus se connecter ; ses sessions sont fermées. Il reçoit le motif.",
      keeps: "sa fiche et ses données restent ; ses clients voient toujours leurs chantiers.",
      reasonLabel: "Motif du blocage (transmis à la personne)",
      reasonHint:
        "La personne ne peut plus se connecter et ses sessions sont fermées (au plus une heure pour une page déjà ouverte). Ses données ne changent pas.",
      artisanHint:
        "Pour un artisan, cela bloque aussi son espace pro et ses chantiers. Pour seulement le retirer des recherches : « Retirer des recherches », onglet Compte de sa fiche artisan.",
      reasonRequired: "Indiquez le motif du blocage.",
      suspend: "Bloquer la connexion",
      suspended: "Connexion bloquée : la personne ne peut plus se connecter.",
      reactivate: "Débloquer la connexion",
      reactivated: "Connexion débloquée.",
    },
    deletion: {
      title: "Demande de suppression du compte",
      received: (date: string) => `Reçue le ${date}.`,
      due: (date: string) => `Réponse attendue avant le ${date} (RGPD, un mois).`,
      steps: [
        "Exporter ses données si la personne les demande.",
        "Bloquer la connexion.",
        "Effacer ou anonymiser les données qui ne doivent pas être conservées.",
        "Répondre à la personne et clore la demande dans la « Boîte de réception ».",
      ],
      legal:
        "Durées de conservation à faire valider par l'avocat (devis, factures et PV restent chez l'artisan au titre de ses obligations ; avis publiés) : l'effacement reste manuel pour l'instant.",
      open: "Ouvrir la demande",
    },
    search: {
      title: "Recherche",
      intro: "Une personne, un artisan, un chantier, un devis ou une facture.",
      label: "Rechercher dans le back-office",
      refine: "Affiner la recherche",
      placeholder: "Nom, e-mail, SIRET, n° de devis ou de facture…",
      short: "Lancer la recherche",
      prompt: "Saisissez un nom, un e-mail, un SIRET, un numéro de devis ou de facture.",
      empty: (query: string) => `Aucun résultat pour « ${query} ».`,
      groups: {
        personne: "Personnes",
        artisan: "Artisans",
        chantier: "Chantiers",
        devis: "Devis",
        facture: "Factures",
      } as Record<string, string>,
      artisanStatus: {
        brouillon: "Inscription en cours",
        en_verification: "Dossier en vérification",
        valide: "Validé",
        refuse: "Refusé",
        suspendu: "Suspendu",
        radie: "Radié",
      } as Record<string, string>,
    },
    activity: {
      title: "Activité",
      requests: "Demandes reçues",
      pending: "En attente de réponse",
      accepted: "Acceptées",
      refused: "Refusées",
      expired: "Expirées sans réponse",
      responseRate: "Taux de réponse",
      chantiers: "Chantiers en cours",
      finished: "Chantiers terminés",
      reviews: "Avis publiés",
      average: "Note moyenne",
      seeChantiers: "Voir ses chantiers",
      account: "Voir son compte",
    },
    suspension: {
      // « Retirer des recherches » (ADR 0285) : statut « Suspendu » de l'artisan.
      title: "Retirer des recherches",
      effect:
        "il n'apparaît plus dans les recherches ni sur sa fiche publique, et ne reçoit plus de demandes. Il reçoit le motif par e-mail (statut « Suspendu »).",
      keeps: "il se connecte, termine ses chantiers en cours et garde ses factures.",
      active: "Validé et actif.",
      notApplicable: "La suspension ne concerne que les artisans validés.",
      reasonLabel: "Motif (transmis à l'artisan)",
      reasonRequired: "Indiquez le motif.",
      reasonHint:
        "L'artisan reçoit ce motif par e-mail et peut écrire à l'équipe pour en parler. Ses chantiers en cours ne changent pas.",
      suspend: "Retirer des recherches",
      suspended:
        "Artisan retiré des recherches : il n'apparaît plus et ne reçoit plus de demandes.",
      reactivate: "Le remettre dans les recherches",
      reactivated: "Artisan de nouveau dans les recherches.",
      automatic:
        "Suspension automatique pour assurance expirée : elle sera levée dès qu'un nouveau document sera validé.",
    },
    /** Radiation : exclusion définitive (ADR 0114). */
    radiation: {
      title: "Radiation",
      intro:
        "Exclusion définitive du réseau MENAO (fraude, manquement grave à la charte). Le profil n'apparaît plus jamais ; l'artisan garde l'accès à ses chantiers en cours et à ses factures.",
      reasonLabel: "Motif de la radiation (transmis à l'artisan)",
      reasonRequired: "Indiquez le motif de la radiation.",
      confirm: "Je confirme : la radiation est définitive et ne pourra pas être annulée.",
      confirmRequired: "Cochez la confirmation : la radiation est définitive.",
      submit: "Radier définitivement",
      done: "Artisan radié.",
      radiated: (date: string, reason: string | null) =>
        `Radié le ${date}${reason ? ` : ${reason}` : ""}.`,
    },
    followUp: {
      // Lien croisé vers le compte du client (ADR 0285).
      seeAccount: "Voir son compte",
      search: "Rechercher",
      clear: "Effacer la recherche",
      results: (n: number) =>
        n === 0
          ? "Aucun résultat"
          : n === 1
            ? "1 résultat"
            : `${n.toLocaleString("fr-FR")} résultats`,
      empty: "Aucun résultat pour ces critères.",
      // Tableaux affichés par lots (ADR 0146).
      showMore: (next: number, remaining: number) =>
        `Afficher ${next} de plus (${remaining.toLocaleString("fr-FR")} restant${remaining > 1 ? "s" : ""})`,
      pagination: {
        label: "Pagination",
        previous: "Précédents",
        next: "Suivants",
        page: (n: number, total: number) => `Page ${n} sur ${total}`,
        // Pages sans total (activité, ADR 0146).
        pageOnly: (n: number) => `Page ${n}`,
        newer: "Plus récentes",
        older: "Plus anciennes",
      },
      none: "—",
      name: "Nom",
      email: "E-mail",
      phone: "Téléphone",
      visitor: "Visiteur sans compte",
      tickets: "Tickets",
      noTickets: "Aucun ticket.",
      openTickets: "Ouvrir la boîte de réception",
      requests: {
        title: "Demandes",
        intro: "Toutes les demandes des particuliers, de la recherche jusqu'au rendez-vous.",
        searchLabel: "Rechercher une demande",
        searchPlaceholder: "Client, e-mail, artisan, ville, métier ou mot de la description",
        filtersLabel: "Filtrer les demandes",
        filters: {
          toutes: "Toutes",
          en_attente: "En attente de réponse",
          expirent: "Expirent sous 12 h",
          chantier: "Rendez-vous fixé",
          sans_suite: "Sans suite",
          non_envoyee: "Recherches non envoyées",
        },
        columns: {
          request: "Demande",
          client: "Client",
          artisans: "Artisans",
          stage: "Étape",
          created: "Créée",
        },
        stages: {
          non_envoyee: "Non envoyée",
          en_attente: "En attente de réponse",
          chantier: "Rendez-vous fixé",
          sans_suite: "Sans suite",
        } as Record<string, string>,
        tradeUnknown: "Métier à préciser",
        cityUnknown: "Ville à préciser",
        artisansNone: "Aucun artisan",
        artisansCount: (n: number) => (n > 1 ? `${n} artisans` : "1 artisan"),
        pendingCount: (n: number) => (n > 1 ? `${n} en attente` : "1 en attente"),
        open: (label: string) => `Ouvrir la demande : ${label}`,
        back: "Toutes les demandes",
        createdOn: (date: string) => `Créée le ${date}`,
        ai: (confidence: string) => `Analyse IA : confiance ${confidence}`,
        noAi: "Description non analysée par l'IA",
        description: "Description du client",
        message: "Message joint à la demande",
        criteria: "Critères",
        criteriaLabels: {
          lieu: "Lieu",
          rooms: "Pièces",
          works: "Travaux",
          surface: "Surface",
          address: "Adresse",
          date: "Début souhaité",
          urgency: "Urgence signalée",
        },
        yes: "Oui",
        no: "Non",
        photos: "Photos",
        noPhotos: "Aucune photo.",
        photoAlt: (n: number) => `Photo ${n} du projet`,
        artisans: "Artisans contactés",
        noArtisans: "La recherche n'a pas encore été envoyée à un artisan.",
        requestStatus: {
          envoyee: "En attente de réponse",
          acceptee: "Acceptée",
          refusee: "Refusée",
          expiree: "Expirée sans réponse",
          annulee: "Annulée par le client",
        } as Record<string, string>,
        sentOn: (date: string) => `Envoyée le ${date}`,
        answeredOn: (date: string) => `Réponse le ${date}`,
        cancelledOn: (date: string) => `Annulée le ${date}`,
        refusal: (reason: string) => `Motif : ${reason}`,
        refusalReasons: {
          planning_complet: "planning complet",
          hors_expertise: "hors de son expertise",
          hors_zone: "hors de sa zone",
          autre: "autre",
        } as Record<string, string>,
        openArtisan: (name: string) => `Ouvrir la fiche de ${name}`,
        openChantier: "Voir le chantier",
        client: "Client",
        chantier: "Chantier",
        noChantier: "Pas encore de rendez-vous.",
      },
      chantiers: {
        title: "Chantiers",
        intro: "Tous les chantiers, du rendez-vous à la clôture.",
        searchLabel: "Rechercher un chantier",
        searchPlaceholder: "Titre, ville, artisan, client ou e-mail",
        filtersLabel: "Filtrer les chantiers par étape",
        all: "Tous",
        columns: {
          chantier: "Chantier",
          artisan: "Artisan",
          client: "Client",
          status: "Étape",
          amounts: "Devis · payé",
          activity: "Dernière activité",
        },
        open: (title: string) => `Ouvrir le chantier : ${title}`,
        back: "Tous les chantiers",
        startOn: (date: string) => `Démarrage le ${date}`,
        history: "Historique",
        noHistory: "Aucun événement pour le moment.",
        by: {
          artisan: "artisan",
          particulier: "client",
          admin: "équipe MENAO",
          support: "équipe MENAO",
          systeme: "automatique",
        } as Record<string, string>,
        created: "Demande reçue par l'artisan",
        quotes: "Devis",
        noQuotes: "Aucun devis pour le moment.",
        quoteDraft: "Brouillon",
        quoteLabel: (numero: string | null, version: number) =>
          numero ? `Devis n° ${numero}` : `Devis, version ${version}`,
        quoteStatus: {
          brouillon: "Brouillon",
          envoye: "Envoyé au client",
          signe: "Signé",
          refuse: "Refusé",
          revision_demandee: "Modification demandée",
          remplace: "Remplacé par une nouvelle version",
        } as Record<string, string>,
        sentOn: (date: string) => `envoyé le ${date}`,
        signedOn: (date: string) => `signé le ${date}`,
        pdf: (label: string) => `PDF : ${label}`,
        payments: "Paiements",
        noPayments: "Aucun paiement pour le moment.",
        paymentKinds: { acompte: "Acompte", demarrage: "Démarrage", solde: "Solde" } as Record<
          string,
          string
        >,
        paymentStatus: {
          en_attente: "En attente",
          en_cours: "En cours",
          paye: "Payé",
          echoue: "Échoué",
          annule: "Annulé",
        } as Record<string, string>,
        paidOn: (date: string) => `payé le ${date}`,
        paymentsNote:
          "Payés par le client directement sur le compte Stripe de l'artisan : MENAO n'encaisse rien.",
        documents: "Documents",
        noDocuments: "Aucune facture ni PV pour le moment.",
        invoice: (kind: string, numero: string) => `Facture ${kind} n° ${numero}`,
        reception: (numero: string, reserves: boolean) =>
          `PV de réception n° ${numero}${reserves ? " (avec réserves)" : ""}`,
        artisan: "Artisan",
        client: "Client",
        origin: "Demande d'origine",
        openRequest: "Voir la demande",
        privacy:
          "Les messages entre le client et l'artisan restent privés : l'équipe n'y accède que sur un litige ou un signalement.",
      },
    },
    payments: {
      title: "Paiements des chantiers",
      intro:
        "Payés par les clients directement sur le compte Stripe de l'artisan : MENAO n'encaisse rien et suit seulement ces paiements.",
      searchLabel: "Rechercher un paiement",
      searchPlaceholder: "Chantier, artisan, client, e-mail ou n° de devis",
      filtersLabel: "Filtrer les paiements",
      filters: {
        tous: "Tous",
        payes: "Reçus",
        en_cours: "En cours",
        echoues: "Échoués",
        annules: "Annulés",
      } as Record<string, string>,
      summary: {
        paid: "Versé aux artisans (30 jours)",
        paidCount: (n: number) =>
          n === 0 ? "Aucun paiement" : n === 1 ? "1 paiement" : `${n} paiements`,
        paidTotal: "Versé depuis le lancement",
        paidTotalHint: "Acomptes et soldes reçus par les artisans.",
        pending: "En cours",
        pendingHint: (n: number) =>
          n === 0
            ? "Aucun paiement en attente de confirmation."
            : n === 1
              ? "1 paiement commencé, pas encore confirmé."
              : `${n} paiements commencés, pas encore confirmés.`,
        failed: "Échoués (7 jours)",
        failedHint: "Le client relance le paiement depuis son espace.",
      },
      columns: {
        chantier: "Chantier",
        artisan: "Artisan",
        payment: "Paiement",
        amount: "Montant",
        status: "Statut",
      },
      kinds: { acompte: "Acompte", demarrage: "Démarrage", solde: "Solde" } as Record<
        string,
        string
      >,
      statuses: {
        en_attente: "Commencé",
        en_cours: "En cours",
        paye: "Reçu",
        echoue: "Échoué",
        annule: "Annulé",
      } as Record<string, string>,
      paidOn: (date: string) => `payé le ${date}`,
      startedOn: (date: string) => `commencé le ${date}`,
      webhooksAlert: (n: number) =>
        n > 1
          ? `${n} notifications Stripe ou DocuSeal sont en échec : des paiements ou abonnements peuvent ne pas être à jour.`
          : "1 notification Stripe ou DocuSeal est en échec : des paiements ou abonnements peuvent ne pas être à jour.",
      webhooksLink: "Notifications Stripe et DocuSeal",
    },
    /** Programme Partenaires (F-59, ADR 0136). */
    // Base des prospects des commerciaux (F-65, lot 2, ADR 0206).
    prospects: {
      title: "Base de prospects",
      lead: "Les entreprises du bâtiment actives d'un département, depuis l'API publique « Recherche d'entreprises » (registre Sirene), sans celles qui refusent la diffusion de leurs données ni celles qui ont demandé à ne plus être contactées.",
      total: (n: number) => `${n.toLocaleString("fr-FR")} entreprises dans la base`,
      followed: (n: number) => `${n.toLocaleString("fr-FR")} suivies par un commercial`,
      optOuts: (n: number) => `${n.toLocaleString("fr-FR")} à ne plus contacter`,
      lastImport: (date: string) => `Dernière mise à jour : ${date}`,
      never: "Aucun import pour l'instant.",
      byDepartement: "Par département",
      departementLabel: "Département",
      departementHint: "Code du département, par exemple 06.",
      start: "Importer ou mettre à jour",
      stop: "Arrêter",
      running: (code: string, page: number, pages: number) =>
        `Activité ${code} : page ${page} sur ${pages}`,
      progress: (n: number) => `${n.toLocaleString("fr-FR")} établissements enregistrés`,
      done: (n: number) =>
        `Import terminé : ${n.toLocaleString("fr-FR")} établissements enregistrés.`,
      stopped: (n: number) =>
        `Import arrêté : ${n.toLocaleString("fr-FR")} établissements enregistrés.`,
      keepOpen: "Gardez cette page ouverte pendant l'import (quelques minutes).",
      errors: {
        departement: "Code de département invalide.",
        api: "L'API « Recherche d'entreprises » ne répond pas. Réessayez plus tard.",
        save: "L'enregistrement a échoué. Réessayez.",
      },
    },
    // Résultats et primes des commerciaux (F-65, lot 3, ADR 0207).
    commercialResults: {
      columns: {
        signups: "Inscrits",
        validated: "Validés",
        subscribed: "Abonnés",
        followed: "Prospects suivis",
        toPay: "Primes à payer",
      },
      open: (name: string) => `Ouvrir la fiche de ${name}`,
      export: "Exporter les primes à payer (CSV)",
      settings: {
        title: "Primes des commerciaux",
        lead: "Montants décidés par les associés. Vides : aucune prime n'est calculée. Une prime est vérifiée après le délai (dossier toujours validé, abonnement toujours actif) avant d'être à payer.",
        validation: "Prime par artisan validé (€)",
        subscription: "Prime par artisan abonné (€)",
        delay: "Délai de vérification (jours)",
        objective: "Objectif mensuel d'artisans validés par commercial",
        objectiveHint: "Facultatif : affiché au commercial dans « Mes résultats ».",
        save: "Enregistrer les réglages",
        saved: "Réglages enregistrés.",
        notSet: "Montants des primes non fixés : aucune prime n'est calculée.",
      },
      detail: {
        back: "Commerciaux",
        zone: "Zone",
        zoneLabel: "Codes postaux de la zone",
        zoneHint:
          "Séparés par des virgules ; un début de code vaut pour tous ceux qui commencent ainsi (par exemple 061 pour 06100 à 06199). Vide : aucune zone, le commercial voit tout le département.",
        zoneSave: "Enregistrer la zone",
        zoneSaved: "Zone enregistrée.",
        zoneInvalid: (codes: string) => `Codes invalides : ${codes}`,
        transfer: "Ses prospects",
        transferLead: (n: number) =>
          `${n.toLocaleString("fr-FR")} prospect${n > 1 ? "s" : ""} suivi${n > 1 ? "s" : ""}. À transférer à un autre commercial, ou à libérer, s'il quitte MENAO.`,
        transferTo: "Transférer à",
        choose: "Choisir un commercial",
        releaseButton: "Libérer ses prospects",
        releaseHint: "Ils redeviennent libres : leurs suivis et leurs notes sont effacés.",
        releaseConfirm: "Confirmer : libérer tous ses prospects",
        releaseCancel: "Annuler",
        released: (n: number) =>
          `${n.toLocaleString("fr-FR")} prospect${n > 1 ? "s" : ""} libéré${n > 1 ? "s" : ""}.`,
        release: "Les libérer (plus suivis par personne)",
        transferSubmit: "Transférer",
        transferred: (n: number) =>
          `${n.toLocaleString("fr-FR")} prospect${n > 1 ? "s" : ""} transféré${n > 1 ? "s" : ""}.`,
        artisans: "Artisans inscrits avec son code",
        artisansEmpty: "Aucun artisan inscrit avec son code.",
        bonuses: "Primes",
        bonusesEmpty: "Aucune prime.",
        markPaid: "Marquer comme payées",
        reference: "Référence du virement",
        paid: (n: number) =>
          `${n.toLocaleString("fr-FR")} prime${n > 1 ? "s" : ""} marquée${n > 1 ? "s" : ""} payée${n > 1 ? "s" : ""}.`,
        cancel: "Annuler",
        cancelReason: "Motif de l'annulation",
        cancelled: "Prime annulée.",
        select: (label: string) => `Sélectionner : ${label}`,
      },
      errors: {
        amount: "Montant invalide.",
        delay: "Délai : entre 0 et 180 jours.",
        objective: "Objectif : entre 1 et 1 000.",
        generic: "L'opération a échoué. Réessayez.",
      },
    },
    // Tableaux de lancement (F-66, ADR 0208) : l'équipe et le planning de chacun.
    launch: {
      title: "Lancement",
      intro:
        "L'équipe de lancement et le planning de chacun : tâches datées, dates clés et rendez-vous réguliers. Chaque commercial voit ses tâches dans son espace, avec celles partagées avec toute l'équipe.",
      myPlanning: "Mon planning",
      milestones: "Prochaines dates clés de l'équipe",
      milestonesEmpty: "Aucune date clé à venir.",
      phases: "Les étapes du lancement",
      today: "Aujourd'hui",
      phaseDates: (from: string, to: string) => `${from} → ${to}`,
      phaseNoDates: "Pas encore de date",
      phasePercent: (percent: number) => `${percent} % fait`,
      phaseProgress: (phase: string, done: number, total: number) =>
        `${phase} : ${done} tâche${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total}`,
      team: "L'équipe",
      teamEmpty:
        "Personne dans l'équipe pour l'instant : ajoutez un membre ou importez le plan ci-dessous.",
      linked: "Compte relié",
      notLinked: "Sans compte",
      inactive: "Inactif",
      objective: (n: number) =>
        `Objectif : ${n.toLocaleString("fr-FR")} artisan${n > 1 ? "s" : ""} validé${n > 1 ? "s" : ""}`,
      late: (n: number) => `${n} en retard`,
      thisWeek: (n: number) => `${n} cette semaine`,
      openBoard: (name: string) => `Ouvrir le tableau de ${name}`,
      teamTasks: "Jalons et tâches de toute l'équipe",
      teamTasksEmpty: "Aucune tâche commune pour l'instant.",
      teamLate: "En retard dans l'équipe",
      teamLateEmpty: "Rien en retard dans l'équipe.",
      teamLateAll: (n: number) => `Voir les ${n} tâches en retard`,
      teamLateLess: "Voir seulement les 10 premières",
      owner: (name: string | null) => name ?? "Toute l'équipe",
      tools: "Outils",
      done: {
        membreSupprime: "Membre retiré de l'équipe. Ses tâches restent, pour toute l'équipe.",
        tache: "Tâche enregistrée.",
        tacheSupprimee: "Tâche supprimée.",
      },
      import: {
        title: "Importer le plan",
        lead: "Fichier .json préparé à part, hors du site (membres, tâches, et s'il y en a, cibles et réglages des chiffres). Une tâche déjà importée est mise à jour sans perdre ce qui a été coché. Les cibles du fichier remplacent toutes les cibles en place.",
        file: "Fichier du plan (.json)",
        // Cibles et réglages des chiffres (lot 2, ADR 0209) : mentionnés seulement s'il y en a.
        preview: (members: number, tasks: number, targets: number, settings: boolean) =>
          `Fichier prêt : ${[
            `${members} membre${members > 1 ? "s" : ""}`,
            `${tasks} tâche${tasks > 1 ? "s" : ""}`,
            targets > 0 ? `${targets} cible${targets > 1 ? "s" : ""}` : null,
            settings ? "réglages des chiffres" : null,
          ]
            .filter(Boolean)
            .join(", ")}.`,
        submit: "Importer",
        done: (r: {
          members_created: number;
          members_updated: number;
          tasks_created: number;
          tasks_updated: number;
          targets_created: number;
          targets_updated: number;
          targets_deleted: number;
          settings_updated: boolean;
          skipped: number;
        }) =>
          [
            `Import terminé : ${r.members_created} membre${r.members_created > 1 ? "s" : ""} ajouté${r.members_created > 1 ? "s" : ""}, ${r.members_updated} mis à jour`,
            `${r.tasks_created} tâche${r.tasks_created > 1 ? "s" : ""} ajoutée${r.tasks_created > 1 ? "s" : ""}, ${r.tasks_updated} mise${r.tasks_updated > 1 ? "s" : ""} à jour`,
            r.targets_created + r.targets_updated > 0
              ? `${r.targets_created} cible${r.targets_created > 1 ? "s" : ""} ajoutée${r.targets_created > 1 ? "s" : ""}, ${r.targets_updated} mise${r.targets_updated > 1 ? "s" : ""} à jour`
              : null,
            r.targets_deleted > 0
              ? `${r.targets_deleted} ancienne${r.targets_deleted > 1 ? "s" : ""} cible${r.targets_deleted > 1 ? "s" : ""} retirée${r.targets_deleted > 1 ? "s" : ""}`
              : null,
            r.settings_updated ? "réglages mis à jour" : null,
            r.skipped > 0
              ? `${r.skipped} ligne${r.skipped > 1 ? "s" : ""} ignorée${r.skipped > 1 ? "s" : ""} (invalide${r.skipped > 1 ? "s" : ""})`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") + ".",
        errors: {
          choose: "Choisissez d'abord le fichier du plan.",
          read: "Fichier illisible : choisissez un fichier .json.",
          invalid: (detail: string) => `Fichier refusé. ${detail}`,
          task: (n: number) => `Tâche n° ${n}`,
          member: (n: number) => `Membre n° ${n}`,
          target: (n: number) => `Cible n° ${n}`,
          settings: "Réglages",
          field: (row: string, key: string) => `${row}, champ « ${key} »`,
          tooBig:
            "Fichier trop lourd pour un seul import (900 Ko au plus). Séparez les tâches en deux fichiers, chacun avec la liste des membres, et importez-les l'un après l'autre.",
          save: "L'import a échoué. Réessayez.",
        },
      },
      newMember: {
        title: "Ajouter un membre",
        lead: "Un associé, un commercial ou la personne qui valide les dossiers. Relié à un compte, il voit son planning dans son espace.",
      },
      copy: {
        title: "Copier un planning",
        lead: "Les tâches d'un membre, remises à faire, ajoutées au planning d'un autre : pratique pour un nouveau commercial. Les tâches partagées ne sont pas copiées : toute l'équipe les voit déjà.",
        from: "Copier le planning de",
        to: "Vers le planning de",
        choose: "Choisir un membre",
        submit: "Copier",
        confirm: (from: string, to: string) =>
          `Les tâches de ${from} (hors tâches partagées) seront ajoutées au planning de ${to}, à faire. Ses tâches actuelles restent.`,
        confirmButton: "Confirmer la copie",
        cancel: "Annuler",
        same: "Choisissez deux membres différents.",
        copied: (n: number) =>
          `${n} tâche${n > 1 ? "s" : ""} copiée${n > 1 ? "s" : ""} dans ce planning.`,
      },
      member: {
        back: "Lancement",
        addTask: "Ajouter une tâche",
        edit: "Le membre",
        saved: "Membre enregistré.",
        fields: {
          nom: "Nom",
          mission: "Mission",
          missionHint: "Une phrase, affichée en haut de son planning.",
          kind: "Rôle dans l'équipe",
          account: "Compte relié",
          accountNone: "Aucun compte",
          accountHint:
            "Le membre voit son planning dans son espace. Un commercial se relie à un compte commercial ; les autres, à un compte administrateur.",
          accountTaken: (name: string) => `${name} (déjà dans l'équipe)`,
          objective: "Objectif d'artisans validés",
          objectiveHint: "Facultatif. Interne : visible seulement dans le back-office.",
          ordre: "Ordre d'affichage",
          ordreHint: "Les plus petits d'abord.",
        },
        roles: { admin: "admin", commercial: "commercial" } as Record<string, string>,
        save: "Enregistrer",
        create: "Ajouter le membre",
        delete: "Retirer de l'équipe",
        deleteHint: "Ses tâches restent, pour toute l'équipe.",
        deleteConfirm: "Confirmer : retirer de l'équipe",
        cancel: "Annuler",
      },
      task: {
        newTitle: "Nouvelle tâche",
        editTitle: "Modifier la tâche",
        backTo: (name: string) => `Tableau de ${name}`,
        backTeam: "Lancement",
        fields: {
          titre: "Titre",
          detail: "Détail",
          member: "Responsable",
          team: "Toute l'équipe",
          phase: "Étape",
          categorie: "Catégorie",
          debut: "Début",
          echeance: "Échéance",
          echeanceHint: "Obligatoire, sauf pour un rendez-vous régulier.",
          recurrence: "Rendez-vous régulier",
          recurrenceHint:
            "Par exemple « Chaque lundi à 9 h ». Vide pour une tâche ponctuelle. Il ne compte pas dans l'avancement.",
          jalon: "Jalon : date clé, affichée en compte à rebours",
          partage: "Partagée avec toute l'équipe",
          partageHint:
            "Tous les membres la verront dans leur planning, y compris les commerciaux. Sinon : seulement le responsable et les administrateurs.",
          statut: "Où en est-elle ?",
        },
        save: "Enregistrer la tâche",
        delete: "Supprimer la tâche",
        deleteHint: "Elle disparaît du planning, définitivement.",
        deleteConfirm: "Confirmer : supprimer la tâche",
        cancel: "Annuler",
      },
      // Onglets des pages Lancement (F-66, lot 2, ADR 0209) : une seule entrée dans le menu.
      tabs: {
        label: "Pages du lancement",
        planning: "Planning",
        figures: "Chiffres",
        codes: "Codes de suivi",
      },
      /** Canal d'arrivée d'une inscription d'artisan (LAUNCH_CHANNELS). */
      channels: {
        commercial: "Commerciaux",
        partenaire: "Partenaires",
        terrain: "Terrain",
        meta: "Publicité Facebook et Instagram",
        google: "Publicité Google",
        flyer: "Flyers",
        salon: "Salons",
        presse: "Presse",
        radio: "Radio",
        autre: "Autre",
        parrainage: "Parrainage",
        invitation: "Invitations",
        direct: "Sans code",
      } satisfies Record<LaunchChannel, string>,
      /** Indicateurs des cibles importées avec le plan (LAUNCH_INDICATORS). */
      indicators: {
        valides_cumul: "Artisans validés",
        inscrits_cumul: "Artisans inscrits",
        valides_semaine: "Validés dans la semaine",
        cases_sous_seuil: "Cases sous le seuil",
        dossiers_48h_pct: "Dossiers traités sous 48 h",
        fiches_completes_pct: "Fiches complètes",
        app_installee_pct: "Application installée",
        premier_devis_perso_pct: "Premier devis à ses propres clients",
        demandes_semaine: "Demandes cette semaine",
        demandes_par_artisan: "Demandes par artisan (médiane)",
        reponse_72h_pct: "Réponse sous 72 h",
        devis_envoye_pct: "Artisans avec un devis envoyé",
        abonnes_pct: "Abonnés après l'essai",
      } satisfies Record<LaunchIndicator, string>,
      // Chiffres du lancement en direct (F-66, lot 2, ADR 0209).
      figures: {
        title: "Chiffres",
        intro:
          "Les chiffres du lancement en direct, calculés sur les vraies données de MENAO, face aux cibles importées avec le plan.",
        error: "Les chiffres n'ont pas pu être chargés. Réessayez dans un instant.",
        none: "—",
        target: (value: string) => `Cible : ${value}`,
        status: { atteint: "Atteint", proche: "Proche", loin: "Loin" },
        hero: {
          title: "Artisans validés",
          count: (n: number) => `artisan${n > 1 ? "s" : ""} validé${n > 1 ? "s" : ""}`,
          objective: (n: number) => `Objectif d'équipe : ${n.toLocaleString("fr-FR")}`,
          noObjective: "Pas encore d'objectif d'équipe : il arrive avec les cibles du plan.",
          ring: "Part de l'objectif d'équipe atteinte",
          ringValue: (n: number, target: number) =>
            `${n.toLocaleString("fr-FR")} sur ${target.toLocaleString("fr-FR")}`,
          ahead: (n: number) => `${n.toLocaleString("fr-FR")} d'avance`,
          behind: (n: number) => `${n.toLocaleString("fr-FR")} de retard`,
          onTarget: "Pile sur la cible",
          gap: (done: number, target: number) =>
            `${done.toLocaleString("fr-FR")} validé${done > 1 ? "s" : ""} à ce jour pour une cible de ${target.toLocaleString("fr-FR")} cette semaine`,
          thisWeek: (n: number) => `${n.toLocaleString("fr-FR")} cette semaine`,
          daysLeft: (n: number) =>
            n === 0
              ? "Dernier jour du recrutement"
              : `${n.toLocaleString("fr-FR")} jour${n > 1 ? "s" : ""} avant la fin du recrutement`,
          ended: "Recrutement terminé",
        },
        curve: {
          title: "Validations semaine par semaine",
          lead: "Artisans validés en cumul, à la date de leur première validation (suspendus ou radiés depuis compris), face à la cible.",
          actual: "Validés en cumul",
          target: "Cible",
          empty: "Pas encore de semaine à montrer.",
          caption: "Artisans validés par semaine, en cumul, face à la cible",
          week: "Semaine du",
          validated: "Validés dans la semaine",
          cumul: "Validés en cumul",
          targetCumul: "Cible en cumul",
          signups: "Inscrits en cumul",
        },
        funnel: {
          title: "Entonnoir",
          lead: "De l'inscription à l'abonnement, avec la part qui passe d'une étape à la suivante.",
          steps: {
            inscrits: "Inscrits",
            dossiers_envoyes: "Dossiers envoyés",
            valides: "Validés",
            fiches_completes: "Fiches complètes",
            en_essai: "Essais commencés",
            abonnes: "Abonnés",
          },
          rate: (percent: string) => `${percent} de l'étape précédente`,
          caption: "Entonnoir, de l'inscription à l'abonnement",
          step: "Étape",
          count: "Artisans",
          rateColumn: "Part de l'étape précédente",
        },
        members: {
          title: "Par membre de l'équipe",
          lead: "Artisans validés grâce aux codes de chacun (code commercial et codes de suivi), face à son objectif.",
          empty: "Personne d'actif dans l'équipe pour l'instant.",
          objective: (n: number) => `Objectif : ${n.toLocaleString("fr-FR")}`,
          noObjective: "Sans objectif",
          validated: (n: number) => `${n.toLocaleString("fr-FR")} validé${n > 1 ? "s" : ""}`,
          signups: (n: number) => `${n.toLocaleString("fr-FR")} inscrit${n > 1 ? "s" : ""}`,
          thisWeek: (n: number) => `${n.toLocaleString("fr-FR")} cette semaine`,
          progress: (name: string, n: number, target: number) =>
            `${name} : ${n.toLocaleString("fr-FR")} validé${n > 1 ? "s" : ""} sur un objectif de ${target.toLocaleString("fr-FR")}`,
          weeks: "Validés par semaine, sur les 8 dernières semaines",
          week: (week: string, n: number) =>
            `Semaine du ${week} : ${n.toLocaleString("fr-FR")} validé${n > 1 ? "s" : ""}`,
          reviews: (n: number) =>
            `${n.toLocaleString("fr-FR")} dossier${n > 1 ? "s" : ""} traité${n > 1 ? "s" : ""}`,
          reviews48: (percent: string) => `${percent} sous 48 h (dossiers non renvoyés depuis)`,
          open: (name: string) => `Ouvrir le tableau de ${name}`,
        },
        channels: {
          title: "Canaux d'arrivée",
          lead: "D'où viennent les inscriptions : codes des commerciaux et des partenaires, codes de suivi, parrainage, invitations, ou sans code.",
          empty: "Aucune inscription pour l'instant.",
          share: (percent: string) => `${percent} des inscrits`,
          detail: (signups: number, validated: number) =>
            `${signups.toLocaleString("fr-FR")} inscrit${signups > 1 ? "s" : ""} · ${validated.toLocaleString("fr-FR")} validé${validated > 1 ? "s" : ""}`,
          thisWeek: (n: number) =>
            `+${n.toLocaleString("fr-FR")} validé${n > 1 ? "s" : ""} cette semaine`,
          caption: "Inscriptions par canal d'arrivée",
          channel: "Canal",
          signups: "Inscrits",
          shareColumn: "Part des inscrits",
          validated: "Validés",
          thisWeekColumn: "Validés cette semaine",
        },
        coverage: {
          title: "Couverture métier × zone",
          lead: (seuil: number) =>
            `Artisans validés qui interviennent dans chaque commune pilote, par métier. Seuil : ${seuil} par case.`,
          under: (n: number, total: number) =>
            `${n.toLocaleString("fr-FR")} case${n > 1 ? "s" : ""} sous le seuil, sur ${total.toLocaleString("fr-FR")}`,
          caption: "Artisans validés par métier et par commune pilote",
          trade: "Métier",
          legend: { vide: "Aucun artisan", faible: "Sous le seuil", ok: "Seuil atteint" },
          level: { vide: "aucun artisan", faible: "sous le seuil", ok: "seuil atteint" },
          cell: (trade: string, commune: string, n: number) =>
            `${trade} à ${commune} : ${n.toLocaleString("fr-FR")} artisan${n > 1 ? "s" : ""}`,
          empty: "Pas de commune pilote ou de métier actif pour l'instant.",
        },
        quality: {
          title: "Qualité",
          reviews48: (n: number, total: number) =>
            `${n.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} décision${total > 1 ? "s" : ""}`,
          waiting: "En attente depuis plus de 48 h",
          waitingHint: (n: number) =>
            `${n.toLocaleString("fr-FR")} dossier${n > 1 ? "s" : ""} en attente en tout`,
          ofValidated: (n: number, total: number) =>
            `${n.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} validé${total > 1 ? "s" : ""}`,
          complete: (n: number, total: number, seuil: number) =>
            `${n.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} validé${total > 1 ? "s" : ""}, jauge à ${seuil} %${seuil < 100 ? " ou plus" : ""}`,
        },
        activity: {
          title: "Activité",
          lead: "Demandes des particuliers, réponses et devis, sur les 30 derniers jours sauf mention contraire. Les demandes directes à un artisan sont à part.",
          lastWeek: (n: number) => `${n.toLocaleString("fr-FR")} la semaine dernière`,
          fourPlus: "Artisans à 4 demandes ou plus",
          ofActive: (n: number) =>
            `sur ${n.toLocaleString("fr-FR")} artisan${n > 1 ? "s" : ""} validé${n > 1 ? "s" : ""}`,
          median: (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
          medianHint: "Sur les artisans validés : un artisan sans demande compte pour 0",
          replies: (n: number, total: number) =>
            `${n.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} demande${total > 1 ? "s" : ""}`,
          quotes: (n: number, total: number) =>
            `${n.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} validé${total > 1 ? "s" : ""}`,
          subscribers: (n: number, ended: number, trials: number) =>
            `${n.toLocaleString("fr-FR")} abonné${n > 1 ? "s" : ""} sur ${ended.toLocaleString("fr-FR")} essai${ended > 1 ? "s" : ""} terminé${ended > 1 ? "s" : ""} · ${trials.toLocaleString("fr-FR")} en essai en ce moment`,
        },
        settings: {
          title: "Réglages des chiffres",
          lead: "Période du recrutement (semaines de la courbe, jours restants) et seuils. Le fichier du plan peut aussi les apporter.",
          debut: "Début du recrutement",
          fin: "Fin du recrutement",
          datesHint: "Vides : les 12 dernières semaines, jusqu'à la semaine en cours.",
          seuilCouverture: "Seuil de couverture (artisans par case)",
          seuilCouvertureHint: "De 1 à 20. Vide : 3.",
          seuilFiche: "Seuil d'une fiche complète (%)",
          seuilFicheHint: "Jauge de « Mon profil », de 50 à 100. Vide : 100.",
          save: "Enregistrer les réglages",
          saved: "Réglages enregistrés.",
        },
        // Carte « Résultats » du tableau d'un membre.
        results: {
          title: "Résultats",
          inactive: "Membre inactif : ses résultats ne sont plus suivis.",
          codes: "Ses codes de suivi",
          noCodes: "Aucun code de suivi à son nom.",
        },
      },
      // Codes de suivi /p/<code> (F-66, lot 2, ADR 0209).
      codes: {
        title: "Codes de suivi",
        intro:
          "Un code par support (publicité, flyers, salon, code personnel d'un associé) pour savoir d'où viennent les inscriptions d'artisans.",
        help: "Les liens /p/<code>/pro mènent à l'inscription artisan : l'artisan inscrit par ce lien, ou en saisissant le code, est compté pour ce code.",
        listLabel: "Codes de suivi",
        empty: "Aucun code de suivi pour l'instant.",
        noMember: "Sans responsable",
        active: "Actif",
        inactive: "Inactif",
        counts: (signups: number, validated: number) =>
          `${signups.toLocaleString("fr-FR")} inscrit${signups > 1 ? "s" : ""} · ${validated.toLocaleString("fr-FR")} validé${validated > 1 ? "s" : ""}`,
        link: (code: string) => `Lien d'inscription du code ${code}`,
        copy: "Copier le lien",
        copied: "Lien copié",
        qr: (code: string) => `QR code du code ${code}`,
        qrButton: "QR code",
        qrOpen: (code: string) => `Agrandir le QR code du code ${code}`,
        close: "Fermer",
        edit: (code: string) => `Modifier le code ${code}`,
        editShort: "Modifier",
        newTitle: "Nouveau code de suivi",
        newLead: "Le code ne pourra plus changer : il est imprimé sur les supports.",
        editTitle: (code: string) => `Code ${code}`,
        editLead: "Le code lui-même ne change plus ; le reste se modifie.",
        back: "Codes de suivi",
        fields: {
          code: "Code",
          codeHint:
            "3 à 32 caractères : minuscules, chiffres et tirets, par exemple salon-nice. Il ne pourra plus changer.",
          libelle: "Libellé",
          libelleHint:
            "Pour s'y retrouver : « Flyers boulangeries de Nice », « Salon de l'habitat ».",
          canal: "Canal",
          member: "Responsable",
          memberNone: "Aucun",
          active: "Actif : les nouvelles inscriptions avec ce code lui sont comptées",
        },
        create: "Créer le code",
        save: "Enregistrer",
        done: { cree: "Code de suivi créé.", modifie: "Code de suivi enregistré." },
      },
      errors: {
        generic: "L'opération a échoué. Réessayez.",
        invalid: "Vérifiez les champs signalés.",
      },
    },
    // Commerciaux de terrain (F-65, ADR 0205).
    commercials: {
      title: "Commerciaux",
      intro:
        "Les commerciaux de terrain : leur code d'inscription rattache à leur nom les artisans qu'ils inscrivent. Ils ne voient que leurs inscrits, jamais le back-office.",
      empty: "Aucun commercial pour l'instant.",
      listLabel: "Commerciaux",
      columns: {
        name: "Commercial",
        code: "Code",
        status: "Statut",
        signups: "Inscrits",
        validated: "Validés",
      },
      signups: (signups: number, validated: number) =>
        `${signups} inscrit${signups > 1 ? "s" : ""}, ${validated} validé${validated > 1 ? "s" : ""}`,
      status: { actif: "Actif", suspendu: "Suspendu" } as Record<string, string>,
      suspend: "Suspendre",
      reactivate: "Réactiver",
      statusError: "Le statut n'a pas pu être modifié. Réessayez.",
      newTitle: "Inviter un commercial",
      newLead:
        "Il reçoit un e-mail pour choisir son mot de passe. Le lien est valable une heure ; ensuite, « Mot de passe oublié » sur la page de connexion.",
      fields: {
        firstName: "Prénom",
        lastName: "Nom",
        email: "Adresse e-mail",
        code: "Code",
        codeHint:
          "3 à 32 caractères : minuscules, chiffres et tirets, par exemple julien-06. Il ne pourra plus changer : il est imprimé sur ses cartes.",
      },
      submit: "Envoyer l'invitation",
      invited: (email: string) => `Invitation envoyée à ${email}.`,
      errors: {
        invalid: "Vérifiez le prénom, le nom, l'adresse e-mail et le code.",
        code_taken: "Ce code est déjà utilisé : choisissez-en un autre.",
        email_taken:
          "Un compte existe déjà avec cette adresse. Commercial déjà invité : il choisit son mot de passe avec « Mot de passe oublié » sur la page de connexion. Sinon, utilisez une autre adresse.",
        forbidden: "Réservé aux administrateurs, avec la double authentification.",
        rate_limited: "Trop d'invitations en peu de temps. Réessayez dans une heure.",
        unavailable: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
      } as Record<string, string>,
    },
    partners: {
      title: "Partenaires",
      intro:
        "Professionnels qui recommandent MENAO : demandes de travaux qualifiées et artisans devenus abonnés payants, rémunérés par une prime fixe après un délai anti-fraude.",
      empty: "Aucun partenaire pour l'instant.",
      newTitle: "Nouveau partenaire",
      newLead:
        "Réservé aux professionnels (SIRET) : le partenaire facture MENAO pour ses commissions.",
      editTitle: "Fiche du partenaire",
      fields: {
        code: "Code du lien",
        codeHint: "3 à 32 caractères : minuscules, chiffres et tirets. Il ne pourra plus changer.",
        nom: "Nom de l'entreprise",
        siret: "SIRET",
        email: "E-mail de contact",
        status: "Statut",
        montantDemande: "Prime par demande qualifiée (€)",
        montantAbonne: "Prime par abonné payant (€)",
        montantHint: "Vide : montant par défaut du programme.",
        // Garde-fous (ADR 0145).
        phone: "Téléphone du partenaire",
        phoneHint: "Facultatif. Repère les demandes qu'il déposerait lui-même.",
        plafond: "Plafond de demandes rémunérées par mois",
        plafondHint:
          "Facultatif. Vide : plafond des réglages. Conseillé pour un nouveau partenaire.",
        notes: "Notes internes",
      },
      status: { actif: "Actif", suspendu: "Suspendu" } as Record<"actif" | "suspendu", string>,
      save: "Enregistrer",
      create: "Créer le partenaire",
      created: "Partenaire créé.",
      saved: "Modifications enregistrées.",
      columns: {
        partner: "Partenaire",
        projects: "Demandes attribuées",
        qualified: "Qualifiées",
        artisans: "Artisans inscrits",
        paying: "Abonnés payants",
        pending: "En attente",
        validated: "À payer",
        paid: "Payé",
      },
      links: {
        title: "Liens à donner au partenaire",
        clients: "Particuliers (demande de travaux)",
        pros: "Artisans (inscription)",
        note: "Le code suit l'adresse jusqu'à la demande ou l'inscription : aucun cookie, aucun traceur.",
      },
      settings: {
        title: "Réglages du programme",
        lead: "Montants par défaut, à décider par les fondateurs. Un montant négocié sur la fiche d'un partenaire passe avant.",
        montantDemande: "Prime par défaut par demande qualifiée (€)",
        montantAbonne: "Prime par défaut par abonné payant (€)",
        delai: "Délai de validation (jours)",
        delaiHint:
          "Une demande qualifiée devient payable après ce délai s'il y a eu une visite ou un devis, et si rien ne l'annule.",
        plafond: "Plafond de demandes rémunérées par partenaire et par mois",
        plafondHint:
          "Vide : sans plafond. Un plafond peut aussi être fixé sur la fiche d'un partenaire.",
        notSet: "Montants par défaut non réglés : les commissions sont enregistrées à 0 €.",
        save: "Enregistrer les réglages",
        saved: "Réglages enregistrés.",
      },
      // Qualité des demandes (ADR 0145) : entonnoir et primes « à vérifier ».
      quality: {
        title: "Qualité des demandes",
        lead: "Une prime n'est validée qu'avec un vrai contact : visite passée sans annulation, ou devis envoyé.",
        steps: {
          demandes: "Demandes attribuées",
          envoyees: "Envoyées à un artisan",
          acceptees: "Rendez-vous fixé",
          contact: "Visite passée ou devis envoyé",
          signees: "Devis signé",
        },
        rate: (n: number) => `${n} %`,
        empty: "Aucune demande attribuée pour l'instant.",
        toReview: (n: number) =>
          n === 1
            ? "1 prime à vérifier : elle ne sera pas validée sans votre décision."
            : `${n} primes à vérifier : elles ne seront pas validées sans votre décision.`,
        listToReview: (n: number) =>
          n === 1
            ? "1 prime à vérifier chez vos partenaires (fiche du partenaire, « Commissions »)."
            : `${n} primes à vérifier chez vos partenaires (fiche du partenaire, « Commissions »).`,
      },
      review: {
        badge: "À vérifier",
        clear: "Valider quand même",
        cleared: "Signal levé : la prime suit la validation normale (délai, visite ou devis).",
      },
      commissions: {
        title: "Commissions",
        empty: "Aucune commission pour l'instant.",
        kind: {
          demande_qualifiee: "Demande qualifiée",
          abonne_payant: "Abonné payant",
        } as Record<"demande_qualifiee" | "abonne_payant", string>,
        status: {
          en_attente: "En attente",
          validee: "À payer",
          payee: "Payée",
          annulee: "Annulée",
        } as Record<"en_attente" | "validee" | "payee" | "annulee", string>,
        columns: {
          date: "Date",
          kind: "Type",
          amount: "Montant",
          status: "Statut",
          detail: "Détail",
        },
        validateAfter: (date: string) => `Payable à partir du ${date}`,
        validatedOn: (date: string) => `Validée le ${date}`,
        paidOn: (date: string, reference: string) => `Payée le ${date} (${reference})`,
        cancelled: (reason: string) => `Annulée : ${reason}`,
        payTitle: "Enregistrer un virement",
        payLead: (count: number, amount: string) =>
          `${count} commission${count > 1 ? "s" : ""} à payer, ${amount} au total.`,
        reference: "Référence (facture du partenaire, virement)",
        pay: "Marquer comme payées",
        paid: (count: number) =>
          `${count} commission${count > 1 ? "s" : ""} marquée${count > 1 ? "s" : ""} payée${count > 1 ? "s" : ""}.`,
        cancel: "Annuler",
        cancelReason: "Motif de l'annulation",
        cancelDone: "Commission annulée.",
        export: "Exporter les commissions à payer (CSV)",
      },
      errors: {
        reference: "Indiquez la référence du paiement.",
        reason: "Indiquez le motif de l'annulation.",
        amount: "Montant invalide.",
        days: "Délai de validation : entre 0 et 180 jours.",
        cap: "Plafond : un nombre entier positif, ou vide.",
      },
      page: {
        title: "Page de recommandation",
        lead: "Une page « <Partenaire> vous recommande MENAO » avec son message et le formulaire de demande. Les demandes lui sont attribuées. Non indexée par Google.",
        publique: "Page en ligne",
        message: "Message de recommandation (facultatif, 400 caractères au plus)",
        messageHint:
          "Affiché sur la page, signé du nom du partenaire. Ex. : « Nous travaillons avec MENAO pour vous trouver des artisans vérifiés. »",
        link: "Adresse de la page",
        offline: "Page hors ligne : elle répond « introuvable ».",
        save: "Enregistrer la page",
        saved: "Page enregistrée.",
      },
      space: {
        title: "Espace partenaire",
        lead: "Lien privé à transmettre au partenaire : ses chiffres, ses montants, ses liens et son kit, sans compte à créer.",
        none: "Aucun lien pour l'instant.",
        link: "Lien de l'espace partenaire",
        create: "Créer le lien",
        renew: "Renouveler le lien",
        renewHint: "Renouveler désactive l'ancien lien.",
        renewed: "Nouveau lien créé.",
      },
      kit: {
        title: "Kit partenaire",
        lead: "Extraits à transmettre au partenaire, à coller sur son site. Aucun cookie, aucun traceur.",
        link: "Lien texte",
        button: "Bouton",
        widget: "Widget (formulaire intégré, hauteur automatique)",
        iframe: "Widget sans script (iframe seule)",
        copy: "Copier",
        copied: "Copié",
        disclosure:
          "Un créateur de contenu doit signaler le partenariat (« Publicité » ou « Collaboration commerciale »), loi du 9 juin 2023.",
      },
      back: "Tous les partenaires",
    },
    // Parrainages entre artisans dans le back-office (F-60, ADR 0137 et 0143).
    referrals: {
      title: "Parrainages",
      intro:
        "Artisans inscrits avec le code d'un confrère. Au premier paiement du filleul, le parrain gagne un mois offert (12 par an au plus). Le filleul reçoit un cadeau de bienvenue à la validation de son dossier : sa demande arrive dans les tickets (« Récompense »).",
      how: "Chaque artisan validé reçoit un code de 8 caractères à sa première visite de « Mon profil », avec le lien menao.fr/p/<code>/pro. Le confrère qui s'inscrit par ce lien, ou en saisissant le code, devient son filleul.",
      summary: {
        pending: "En attente",
        pendingHint: "Filleul inscrit, pas encore de paiement",
        rewarded: "Récompensés",
        rewardedHint: "Premier paiement du filleul reçu",
        months: "Mois offerts posés",
        monthsHint: (n: number) =>
          n === 0 ? "Aucun mois en attente de pose" : `${n} en attente de la prochaine facture`,
        gifts: "Cadeaux à envoyer",
        giftsHint: (n: number) =>
          n === 0 ? "Aucun cadeau à choisir" : `${n} à choisir par les filleuls`,
      },
      filtersLabel: "Filtrer les parrainages",
      filters: {
        tous: "Tous",
        en_attente: "En attente",
        recompense: "Récompensés",
        annule: "Annulés",
      } as Record<"tous" | "en_attente" | "recompense" | "annule", string>,
      status: {
        en_attente: "En attente",
        recompense: "Récompensé",
        annule: "Annulé",
      } as Record<"en_attente" | "recompense" | "annule", string>,
      columns: {
        date: "Inscription",
        referrer: "Parrain",
        referred: "Filleul",
        status: "Statut",
        months: "Récompenses",
        action: "Action",
      },
      month: {
        applique: "posé",
        a_appliquer: "en attente",
      } as Record<"applique" | "a_appliquer", string>,
      monthOf: (who: string, state: string) => `${who} : mois ${state}`,
      gift: {
        a_choisir: "cadeau à choisir",
        a_envoyer: "cadeau à envoyer",
        envoye: "cadeau envoyé",
      } as Record<"a_choisir" | "a_envoyer" | "envoye", string>,
      capped: "plafond de 12 mois atteint",
      referrerShort: "Parrain",
      referredShort: "Filleul",
      noMonth: "Aucune pour l'instant",
      rewardedOn: (date: string) => `Récompensé le ${date}`,
      cancelled: (reason: string) => `Annulé : ${reason}`,
      empty: "Aucun parrainage pour l'instant.",
      cancelReason: "Motif de l'annulation",
      cancel: "Annuler",
      cancelHint:
        "Seulement avant la récompense ; aucun mois ne sera offert et le cadeau pas encore choisi est retiré.",
      cancelDone: "Parrainage annulé.",
      errors: { reason: "Indiquez le motif de l'annulation." },
    },
    subscriptions: {
      title: "Abonnements des artisans",
      intro:
        "L'abonnement des artisans est le seul revenu de MENAO, encaissé par Stripe. Montants HT au tarif des formules, hors remises et coupons.",
      searchLabel: "Rechercher un abonnement",
      searchPlaceholder: "Entreprise, SIRET, e-mail ou formule",
      filtersLabel: "Filtrer les abonnements",
      filters: {
        tous: "Tous",
        actifs: "Actifs",
        essais: "En essai",
        impayes: "Impayés",
        fin_programmee: "Fin programmée",
        resilies: "Résiliés",
      } as Record<string, string>,
      summary: {
        mrr: "Revenu mensuel récurrent",
        mrrHint: (n: number) =>
          n === 0
            ? "Aucun abonnement payant pour le moment."
            : n === 1
              ? "1 abonnement payant, HT par mois."
              : `${n} abonnements payants, HT par mois.`,
        trials: "En période d'essai",
        trialsHint: (amount: string) => `${amount} HT par mois à la fin des essais.`,
        unpaid: "Impayés",
        unpaidHint: (amount: string) => `${amount} HT par mois en jeu ; Stripe relance l'artisan.`,
        cancelled: "Résiliations (30 jours)",
        churn: (rate: string) => `Taux de désabonnement : ${rate}.`,
        churnHint:
          "Abonnements en cours il y a 30 jours et résiliés depuis, parmi tous ceux en cours il y a 30 jours.",
        scheduled: "Fins programmées",
        scheduledHint: "Résiliation demandée pour la fin de la période en cours.",
      },
      plans: {
        title: "Par formule",
        plan: "Formule",
        price: "Prix HT par mois",
        paying: "Payants",
        trials: "En essai",
        mrr: "Revenu mensuel",
      },
      noPlan: (n: number) =>
        n > 1
          ? `${n} abonnements payants n'ont pas de formule reconnue : ils ne sont pas comptés dans le revenu.`
          : "1 abonnement payant n'a pas de formule reconnue : il n'est pas compté dans le revenu.",
      columns: {
        artisan: "Artisan",
        plan: "Formule",
        situation: "Situation",
        next: "Échéance",
        since: "Depuis",
      },
      situations: {
        actifs: "Actif",
        essais: "En essai",
        impayes: "Impayé",
        fin_programmee: "Fin programmée",
        resilies: "Résilié",
        autres: "Autre",
      } as Record<string, string>,
      unknownPlan: "Formule inconnue",
      perMonth: (amount: string) => `${amount} HT par mois`,
      trialUntil: (date: string) => `Essai jusqu'au ${date}`,
      renewsOn: (date: string) => `Prochaine échéance le ${date}`,
      endsOn: (date: string) => `Se termine le ${date}`,
      endedOn: (date: string) => `Terminé le ${date}`,
    },
    webhooks: {
      title: "Notifications Stripe et DocuSeal",
      intro:
        "Stripe et DocuSeal préviennent MENAO à chaque paiement, abonnement, compte d'artisan ou signature. Si le traitement échoue, le service renvoie la notification (pendant 3 jours pour Stripe, 48 heures pour DocuSeal) : en attendant, les données concernées peuvent être en retard.",
      help: "Une notification reste en échec ? Vérifiez l'état de Supabase et du service concerné. Une fois le problème réglé, renvoyez-la depuis le tableau de bord du service (Stripe : Développeurs, puis Événements) ou attendez la tentative suivante.",
      filtersLabel: "Filtrer les notifications",
      filters: {
        echecs: "En échec",
        retablies: "Rétablies",
        toutes: "Toutes",
      } as Record<string, string>,
      columns: {
        received: "Reçue",
        event: "Notification",
        state: "État",
        failures: "Échecs",
        error: "Dernière erreur",
      },
      sources: { stripe: "Stripe", docuseal: "DocuSeal" } as Record<string, string>,
      states: {
        en_echec: "En échec",
        bloquee: "Bloquée",
        retablie: "Rétablie",
        traitee: "Traitée",
        en_cours: "En cours",
      } as Record<string, string>,
      events: {
        "customer.subscription.created": "Abonnement créé",
        "customer.subscription.updated": "Abonnement modifié",
        "customer.subscription.deleted": "Abonnement terminé",
        "customer.subscription.paused": "Abonnement mis en pause",
        "customer.subscription.resumed": "Abonnement repris",
        "checkout.session.completed": "Paiement validé",
        "checkout.session.async_payment_succeeded": "Paiement différé réussi",
        "checkout.session.async_payment_failed": "Paiement différé échoué",
        "checkout.session.expired": "Paiement abandonné",
        "account.updated": "Compte Stripe d'un artisan mis à jour",
        "form.completed": "Signature terminée",
        "form.declined": "Signature refusée",
      } as Record<string, string>,
      lastFailure: (date: string) => `dernier échec le ${date}`,
      blockedHint: "Ni traitée ni en échec un quart d'heure après sa réception.",
      empty: "Aucune notification dans cette catégorie.",
      emptyFailures: "Aucune notification en échec : tout est à jour.",
    },
    /** Paramètres de la plateforme : décisions [À VALIDER] réglables par un admin. */
    settings: {
      title: "Paramètres de la plateforme",
      on: "Activé",
      off: "Désactivé",
      enable: "Activer",
      disable: "Désactiver",
      clientRatingsVisible: "Notes des clients visibles des artisans (F-23)",
      clientRatingsVisibleHelp:
        "Les artisans validés qui reçoivent une demande voient la moyenne des notes du client par les autres artisans (jamais les commentaires). À activer seulement après validation juridique (décision D11) et mise à jour de la politique de confidentialité.",
    },
    clientRatings: {
      title: "Notes des artisans sur ce client",
      empty: "Aucune note pour le moment.",
      item: (artisan: string, date: string) => `${artisan} · ${date}`,
      values: (welcome: number, clarity: number, payment: number) =>
        `Accueil ${welcome}\u00a0% · Clarté ${clarity}\u00a0% · Paiements ${payment}\u00a0%`,
    },
    references: {
      title: "Métiers et travaux",
      intro:
        "Ces listes servent à l'inscription des artisans, aux demandes des particuliers et à leur analyse par l'IA. Une entrée désactivée n'est plus proposée ; les dossiers et demandes qui la citent ne changent pas. Chaque modification est inscrite au journal d'audit.",
      sections: { metier: "Métiers", travail: "Travaux", piece: "Pièces" } as Record<
        string,
        string
      >,
      hints: {
        metier: "Corps de métier choisis par les artisans et reconnus dans les demandes.",
        travail: "Spécialités de chaque métier.",
        piece: "Pièces concernées par une demande.",
      } as Record<string, string>,
      newLabel: {
        metier: "Nouveau métier",
        travail: "Nouveau travail",
        piece: "Nouvelle pièce",
      } as Record<string, string>,
      tradeLabel: "Métier",
      add: "Ajouter",
      codeHint:
        "Le code est tiré du libellé et ne change plus : il est repris par les dossiers, les demandes et l'IA.",
      code: (code: string) => `code ${code}`,
      artisans: (n: number) => (n === 0 ? null : n === 1 ? "1 artisan" : `${n} artisans`),
      demandes: (n: number) => (n === 0 ? null : n === 1 ? "1 demande" : `${n} demandes`),
      inactive: "Désactivée",
      renameShort: "Renommer",
      rename: (label: string) => `Renommer ${label}`,
      works: (n: number) => (n === 0 ? "aucun travail" : n === 1 ? "1 travail" : `${n} travaux`),
      renameLabel: "Libellé",
      save: "Enregistrer",
      deactivate: "Désactiver",
      activate: "Réactiver",
      up: (label: string) => `Monter ${label}`,
      down: (label: string) => `Descendre ${label}`,
      added: (label: string) => `« ${label} » est ajouté en fin de liste.`,
      renamed: "Libellé enregistré.",
      noWork: "Aucun travail pour ce métier.",
      errors: {
        label:
          "Indiquez un libellé de 100 caractères au plus, avec au moins une lettre ou un chiffre.",
        duplicate: "Une entrée porte déjà ce code : choisissez un autre libellé.",
        trade: "Choisissez le métier de ce travail.",
      },
    },
    journal: {
      title: "Journal d'audit",
      intro:
        "Les actions de l'équipe MENAO et les actions automatiques : qui a fait quoi, quand et sur quoi.",
      searchLabel: "Rechercher dans le journal",
      searchPlaceholder: "Auteur, entreprise, personne, motif…",
      filtersLabel: "Filtrer le journal",
      filters: {
        tous: "Tout",
        artisans: "Artisans",
        comptes: "Comptes",
        moderation: "Modération",
        litiges: "Litiges",
        listes: "Listes",
        automatique: "Automatique",
      } as Record<string, string>,
      columns: { when: "Date", action: "Action", target: "Concerne", actor: "Par" },
      automatic: "MENAO (automatique)",
      unknownActor: "Compte supprimé",
      open: "Ouvrir la fiche",
      actions: {
        "artisan.valide": "Dossier validé",
        "artisan.refuse": "Dossier refusé",
        "artisan.complement": "Complément demandé",
        "artisan.suspendu": "Fiche artisan suspendue",
        "artisan.reactive": "Fiche artisan réactivée",
        "artisan.suspendu_auto": "Fiche suspendue : document obligatoire expiré",
        "artisan.reactive_auto": "Fiche réactivée : documents obligatoires à jour",
        "artisan.radie": "Artisan radié",
        "artisan.controle_tire": "Contrôle aléatoire : dossier tiré au sort",
        "artisan.controle_conforme": "Contrôle aléatoire : conforme",
        "artisan.controle_non_conforme": "Contrôle aléatoire : non conforme",
        "document.valide": "Document validé",
        "document.refuse": "Document refusé",
        "certification.verifiee": "Certification vérifiée",
        "certification.annulee": "Vérification d'une certification annulée",
        "avis.masque": "Avis masqué",
        "avis.republie": "Avis republié",
        "message.masque": "Message masqué",
        "message.republie": "Message republié",
        "litige.clos": "Litige clos",
        "compte.suspendu": "Accès au compte suspendu",
        "compte.retabli": "Accès au compte rétabli",
        "compte.lien_mot_de_passe": "Lien de réinitialisation du mot de passe envoyé",
        "compte.export": "Données du compte exportées (RGPD)",
        "referentiel.ajoute": "Entrée ajoutée",
        "referentiel.renomme": "Libellé modifié",
        "referentiel.active": "Entrée réactivée",
        "referentiel.desactive": "Entrée désactivée",
        "referentiel.deplace": "Entrée déplacée",
      } as Record<string, string>,
      kinds: { metier: "Métier", travail: "Travail", piece: "Pièce" } as Record<string, string>,
      details: {
        motif: (value: string) => `Motif : ${value}`,
        message: (value: string) => `Message : ${value}`,
        before: (value: string) => `Ancien libellé : ${value}`,
        up: "monté dans la liste",
        down: "descendu dans la liste",
      },
    },
    ai: {
      // Minutes de voix des agents IA des artisans (F-82, ADR 0231).
      // Recharges de minutes vendues (ADR 0233).
      topUps: {
        title: "Recharges de minutes, ce mois-ci",
        empty: "Aucune recharge vendue ce mois-ci.",
        sold: "Recharges vendues",
        revenue: "Encaissé HT",
        minutes: "Minutes vendues",
        margin: "Marge estimée",
        marginHint: "Si toutes les minutes sont utilisées, à 0,09 € la minute.",
      },
      voice: {
        title: "Minutes de voix des artisans, ce mois-ci",
        intro:
          "Secrétaires dédiées, devis dictés en conversation et rappels : minutes comptées pour chaque artisan. Coût estimé à 0,09 € la minute.",
        empty: "Aucune minute utilisée ce mois-ci.",
        company: "Entreprise",
        plan: "Formule",
        calls: "Appels",
        minutes: "Minutes",
        cost: "Coût estimé",
        error: "Le suivi des minutes est momentanément indisponible.",
      },
      title: "Suivi de l'IA",
      intro:
        "Appels aux modèles d'IA : analyse des demandes, transcription de la voix et dictée des devis. Ce suivi ne garde aucune donnée personnelle. Le coût exact se lit dans les consoles des fournisseurs.",
      periodsLabel: "Choisir la période",
      periods: { "1": "24 heures", "7": "7 jours", "30": "30 jours" } as Record<string, string>,
      summary: {
        calls: "Appels aux modèles",
        callsHint: (n: number) =>
          n === 0
            ? "Aucun appel sur la période."
            : "Un second appel compte quand le premier est peu sûr.",
        failures: "Échecs",
        failuresHint: (n: number) =>
          n === 0
            ? "Aucun échec sur la période."
            : n === 1
              ? "1 réponse illisible, refusée ou en erreur."
              : `${n} réponses illisibles, refusées ou en erreur.`,
        unsure: "Réponses peu sûres",
        unsureHint: "Le modèle de repli, plus puissant, reprend alors la demande.",
        audio: "Audio transcrit",
        audioHint: "Dictées des particuliers et des artisans.",
      },
      functions: {
        title: "Par fonction",
        name: "Fonction",
        calls: "Appels",
        ok: "Réussis",
        unsure: "Peu sûrs",
        invalid: "Illisibles",
        refused: "Refus",
        errors: "Erreurs",
        latency: "Latence médiane",
        latencyHint: (p95: string) => `95 % sous ${p95}`,
        volume: "Volume",
      },
      functionNames: {
        "analyze-need": "Analyse des demandes",
        transcribe: "Transcription de la voix",
        "quote-from-voice": "Dictée des devis",
        "read-document": "Lecture des documents",
        "suggest-need": "Suggestions de saisie",
        "describe-photo": "Description des photos",
        "read-expense": "Lecture des factures fournisseurs",
        "pro-assistant": "Assistant des pages Pro",
      } as Record<string, string>,
      models: { title: "Par modèle", model: "Modèle", calls: "Appels", failures: "Échecs" },
      daily: {
        title: "Appels par jour",
        legendCalls: "Appels",
        legendFailures: "Échecs",
        day: (day: string, calls: number, failures: number) =>
          `${day} : ${calls} appel${calls > 1 ? "s" : ""}, ${failures} échec${failures > 1 ? "s" : ""}`,
      },
      recent: {
        title: "Derniers échecs",
        intro: "Les 20 derniers, toutes périodes confondues.",
        empty: "Aucun échec enregistré.",
        open: "Voir la demande",
      },
      outcomes: {
        ok: "Réussi",
        peu_sur: "Peu sûr",
        invalide: "Réponse illisible",
        refus: "Refus du modèle",
        erreur: "Erreur d'appel",
      } as Record<string, string>,
      tokens: (input: string, output: string) => `${input} jetons en entrée, ${output} en sortie`,
      audioMinutes: (minutes: string) => `${minutes} min d'audio`,
      empty: "Aucun appel sur cette période.",
    },
    tickets: {
      // Horaires d'accueil de l'équipe (F-81, ADR 0230).
      reception: {
        title: "Horaires d'accueil",
        intro:
          "Manon s'en sert pour dire quand l'équipe rappelle. Plus tard, ils aiguilleront la ligne téléphonique : l'équipe aux heures d'accueil, Manon le reste du temps.",
        openNow: (time: string) => `Ouvert maintenant, jusqu'à ${time}`,
        closedNow: (when: string) => `Fermé, réouverture ${when}`,
        closedUnknown: "Fermé, aucune plage d'ouverture dans les deux semaines",
        hoursTitle: "Plages de la semaine",
        hoursText: "Heure de Paris. Plusieurs plages par jour pour une pause.",
        hoursSave: "Enregistrer les horaires",
        hoursNone: "Aucune plage : l'accueil est toujours fermé.",
        closuresTitle: "Fermetures",
        closures: "Fermetures exceptionnelles",
        closuresHint: "Une date par ligne, par exemple 24/12/2026.",
        holidays: "Fermé les jours fériés (France métropolitaine)",
        closuresSave: "Enregistrer les fermetures",
        saved: "Enregistré.",
        readOnly: "Seuls les administrateurs modifient les horaires.",
        summaryDays: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
      },
      title: "Boîte de réception",
      types: {
        dossier_recherche: "Dossier de recherche",
        contact: "Message de la page Contact",
        suppression_compte: "Demande de suppression de compte (RGPD, réponse sous un mois)",
        expertise: "Expertise d'un autre corps de métier (signalée par un artisan)",
        reserves: "Levée des réserves non confirmée (30 jours après le signalement)",
        avis: "Avis signalé",
        message: "Message signalé",
        litige: "Litige sur un chantier",
        recompense: "Récompense à expédier (tenue de niveau ou cadeau de bienvenue)",
        demande_sans_reponse:
          "Demande sans réponse : aucun artisan n'a accepté (72 h écoulées ou refus)",
        particulier_a_verifier:
          "Demande retenue : correspondance avec un artisan inscrit (recoupement automatique)",
        faux_particulier: "Faux particulier signalé par un artisan",
        accompagnement:
          "Nouvel artisan à accompagner : demandes reçues sans être choisi (alerte automatique)",
        invitation_artisan:
          "Invitation d'un artisan par un client : le rappeler (« Un de vos clients vous recommande »)",
        rappel_pro: "Artisan à rappeler (demande faite depuis l'assistant des pages Pro)",
      },
      dispute: {
        chantier: (title: string, status: string) => `Chantier : ${title} (${status})`,
        category: (label: string) => `Nature : ${label}`,
        thread: "Échanges avec le déclarant",
        reporter: "Déclarant",
        support: "Équipe MENAO",
        replyLabel: "Réponse au déclarant",
        replyToAccount:
          "Le déclarant reçoit votre réponse dans son espace (« Mes échanges avec MENAO »), avec une notification.",
        replyByEmail: (email: string) =>
          `Le déclarant n'a pas de compte : votre réponse lui est envoyée par e-mail à ${email}.`,
        replySubmit: "Répondre",
        decisionLegend: "Décision",
        outcomes: {
          reprise: "Reprise du chantier (retour à l'état d'avant le litige)",
          annulation: "Annulation du chantier",
        },
        decisionLabel: "Explication de la décision (envoyée aux deux parties)",
        decide: "Clore le litige",
      },
      // Réponses types du SAV (ADR 0159) : préremplissent la réponse, toujours relue avant l'envoi.
      templates: {
        label: "Réponse type",
        choose: "Choisir une réponse type (facultatif)",
        common: [
          {
            label: "Accusé de réception",
            body: "Bonjour,\n\nMerci pour votre message : l'équipe MENAO l'a bien reçu et revient vers vous très vite.\n\nBonne journée,\nL'équipe MENAO",
          },
          {
            label: "Demande réglée",
            body: "Bonjour,\n\nNous espérons que votre demande est réglée. Si besoin, répondez simplement à ce message.\n\nBonne journée,\nL'équipe MENAO",
          },
        ],
        byType: {
          demande_sans_reponse: [
            {
              label: "Proposer d'autres artisans",
              body: "Bonjour,\n\nLes artisans contactés n'ont pas pu donner suite à votre demande. D'autres artisans vérifiés de votre secteur peuvent la recevoir : choisissez-les depuis votre projet, sans tout ressaisir. Si aucun ne vous convient, répondez-nous et nous chercherons avec vous, y compris un peu plus loin.\n\nL'équipe MENAO",
            },
          ],
          litige: [
            {
              label: "Prise en charge du signalement",
              body: "Bonjour,\n\nNous avons bien reçu votre signalement. L'équipe qualité contacte l'autre partie sous 48 h pour recueillir sa version, puis revient vers vous pour chercher une solution amiable.\n\nL'équipe MENAO",
            },
          ],
          faux_particulier: [
            {
              label: "Remercier l'artisan",
              body: "Bonjour,\n\nMerci pour votre signalement. L'équipe MENAO vérifie cette demande en toute discrétion et prendra les mesures nécessaires si elle se confirme.\n\nL'équipe MENAO",
            },
          ],
          suppression_compte: [
            {
              label: "Suppression en cours",
              body: "Bonjour,\n\nNous avons bien reçu votre demande de suppression de compte. Elle sera traitée dans un délai d'un mois au plus, et nous vous confirmerons ici sa réalisation. Certaines données, comme les factures, sont conservées pendant la durée prévue par la loi.\n\nL'équipe MENAO",
            },
          ],
          recompense: [
            {
              label: "Envoi en préparation",
              body: "Bonjour,\n\nVotre envoi est en préparation : nous l'expédions à l'adresse indiquée et vous prévenons dès son départ.\n\nL'équipe MENAO",
            },
          ],
          invitation_artisan: [
            {
              label: "Artisan contacté",
              body: "Bonjour,\n\nMerci pour votre recommandation ! Nous avons contacté l'artisan de votre part pour lui présenter MENAO. Nous vous tiendrons au courant s'il nous rejoint.\n\nL'équipe MENAO",
            },
          ],
          dossier_recherche: [
            {
              label: "Recherche en cours",
              body: "Bonjour,\n\nNous avons bien reçu votre dossier. Nous recherchons un artisan vérifié pour votre projet et revenons vers vous dans les meilleurs délais.\n\nL'équipe MENAO",
            },
          ],
        } as Record<string, readonly { label: string; body: string }[]>,
      },
      // Demandes retenues par le recoupement automatique (ADR 0157).
      heldRequests: {
        title: "Demandes retenues",
        intro:
          "Le recoupement automatique a trouvé une correspondance avec un artisan inscrit : le détail est dans les notes internes. Vérifiez avant de transmettre.",
        release: "Transmettre aux artisans",
        block: "Bloquer la demande",
        reasonLabel: "Motif du blocage (interne)",
        released: (n: number) =>
          n > 1 ? `${n} demandes transmises aux artisans.` : "Demande transmise à l'artisan.",
        blocked: "Demande bloquée.",
      },
      // Conversation du chantier, consultée depuis un litige ou un message signalé (ADR 0277).
      conversation: {
        title: "Conversation du chantier",
        intro:
          "Les messages entre le client et l'artisan sont privés. Ouvrez-les seulement si le dossier l'exige : chaque consultation est inscrite au journal du back-office.",
        open: "Voir la conversation",
        back: "Retour au ticket",
        notice:
          "Lecture seule. Cette consultation est inscrite au journal du back-office (qui, quand, quel chantier).",
        empty: "Aucun message dans cette conversation.",
        client: "Client",
        artisan: "Artisan",
        deleted: "Compte supprimé",
        reported: "Message signalé",
        hidden: (reason: string) => `Masqué : ${reason}`,
        photo: "Ouvrir la photo",
        file: "Ouvrir le document",
        read: "Lu",
        count: (n: number) => (n === 1 ? "1 message" : `${n} messages`),
        // Maquette du lot 38 : en-tête du chantier, jours, repères à droite.
        readOnly: "Lecture seule",
        between: (artisan: string) => `avec ${artisan}`,
        legendTitle: "Repères",
        legend: {
          client: "Client, à gauche",
          artisan: "Artisan, à droite",
          reported: "Message signalé",
          hidden: "Message masqué, avec son motif",
        },
      },
      reportedMessage: {
        title: "Message concerné",
        hidden: (reason: string) => `Masqué : ${reason}`,
        attachment: "Pièce jointe (photo ou document)",
        reasonLabel: "Motif du masquage (communiqué en interne)",
        hide: "Masquer le message",
        restore: "Rétablir le message",
      },
      review: {
        title: "Avis concerné",
        meta: (author: string, score: number) => `${author} · ${score}\u00a0%`,
        hidden: (reason: string) => `Masqué : ${reason}`,
        reasonLabel: "Motif du masquage (communiqué en interne)",
        hide: "Masquer l'avis",
        republish: "Republier l'avis",
        rule: "Un avis n'est jamais masqué pour la seule raison qu'il est négatif.",
      },
      empty: "Aucun ticket.",
      open: "À traiter",
      closed: "Résolus",
      due: (date: string) => `Réponse attendue le ${date}`,
      late: "En retard",
      contact: "Contact",
      project: "Projet",
      message: "Message",
      noMessage: "Pas de message.",
      status: { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu" },
      markInProgress: "Passer en cours",
      markResolved: "Marquer résolu",
      reopen: "Rouvrir",
      // Boîte de réception (ADR 0049).
      intro: "Messages, signalements et litiges à traiter, les plus urgents d'abord.",
      searchLabel: "Rechercher un ticket",
      searchPlaceholder: "Objet, message, e-mail, déclarant ou chantier",
      filtersLabel: "Filtrer les tickets",
      // Chiffres de la boîte de réception (refonte « Nette », ADR 0252).
      figuresLabel: "Boîte de réception en chiffres",
      figuresTodoHint: (disputes: number) =>
        disputes === 0
          ? "aucun litige"
          : disputes === 1
            ? "dont 1 litige"
            : `dont ${disputes} litiges`,
      figuresLateHint: "réponse promise sous 7 jours",
      figuresMineHint: "dont vous êtes responsable",
      filters: {
        a_traiter: "À traiter",
        en_retard: "En retard",
        mes_tickets: "Mes tickets",
        litiges: "Litiges",
        signalements: "Signalements",
        messages: "Messages",
        suppressions: "Suppressions de compte",
        clos: "Clos",
        tous: "Tous",
      } as Record<string, string>,
      columns: {
        ticket: "Ticket",
        declarant: "Déclarant",
        status: "Statut",
        handler: "Pris en charge par",
        due: "Échéance",
      },
      noSubject: "Sans objet",
      nobody: "Personne",
      notesCount: (n: number) => (n > 1 ? `${n} notes internes` : "1 note interne"),
      openTicket: (label: string) => `Ouvrir le ticket : ${label}`,
      back: "Tous les tickets",
      createdOn: (date: string) => `Reçu le ${date}`,
      dueOn: (date: string) => `réponse attendue le ${date}`,
      lateSince: (date: string) => `en retard depuis le ${date}`,
      resolvedOn: (date: string) => `clos le ${date}`,
      declarant: "Déclarant",
      openPerson: "Voir sa fiche",
      linked: "Lié à",
      linkedRequest: "Demande",
      linkedChantier: "Chantier",
      originalMessage: "Message d'origine",
      handling: "Prise en charge",
      handledBy: (name: string) => `Pris en charge par ${name}.`,
      notHandled: "Personne ne s'en occupe pour l'instant.",
      take: "Je m'en occupe",
      release: "Rendre la main",
      notes: "Notes internes",
      notesHint: "Visibles de l'équipe seulement, jamais du déclarant.",
      noNotes: "Aucune note pour le moment.",
      noteLabel: "Nouvelle note",
      addNote: "Ajouter la note",
      noteRequired: "Écrivez la note.",
      noteBy: (name: string, date: string) => `${name} · ${date}`,
      someone: "Un membre de l'équipe",
      statusTitle: "Statut",
    },
    watch: {
      title: "À surveiller",
      renewals: "Renouvellements à vérifier",
      noRenewals: "Aucun renouvellement en attente.",
      expiring: "Documents et certifications arrivant à échéance (30 jours) ou expirés",
      noExpiring: "Aucune échéance proche.",
      columns: {
        artisan: "Artisan",
        document: "Document",
        date: "Fin de validité",
        status: "Échéance",
      },
      certification: (type: string) => `Certification ${type}`,
    },
    mfa: {
      enrollTitle: "Activer la double authentification",
      enrollIntro:
        "L'accès au back-office exige une double authentification. Scannez ce QR code avec une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password…), puis saisissez le code à 6 chiffres affiché.",
      secretLabel: "Clé à saisir manuellement si vous ne pouvez pas scanner le code",
      qrAlt: "QR code d'activation de la double authentification",
      verifyTitle: "Double authentification",
      verifyIntro:
        "Saisissez le code à 6 chiffres affiché par votre application d'authentification.",
      code: "Code à 6 chiffres",
      submit: "Vérifier",
      invalidCode: "Code incorrect ou expiré. Réessayez.",
      error: "La double authentification n'a pas pu être initialisée. Réessayez.",
    },
    list: {
      title: "Dossiers artisans",
      empty: "Aucun dossier dans cette catégorie.",
      // Nombre de dossiers par statut (onglets) et renvoi depuis un onglet vide.
      tab: (status: string, n: number) =>
        n === 0 ? `${status}, aucun dossier` : `${status}, ${n} dossier${n > 1 ? "s" : ""}`,
      elsewhere: "Des dossiers attendent ailleurs :",
      elsewhereItem: (status: string, n: number) => `${status.toLowerCase()} (${n})`,
      filters: "Filtrer par statut",
      columns: {
        company: "Entreprise",
        siret: "SIRET",
        trades: "Métiers",
        submitted: "Envoyé le",
        alerts: "Points d'attention",
      },
      apeWarning: "APE hors bâtiment",
      open: (name: string) => `Ouvrir le dossier de ${name}`,
      // Refonte « Nette » (ADR 0252) : chiffres par statut et état de chaque document.
      intro:
        "Vérifiez les documents, l'entreprise et la charte avant de rendre un artisan visible.",
      figuresLabel: "Dossiers par statut",
      stalledHint: "pas encore terminées",
      pendingHint: "les plus anciens en premier",
      validHint: "visibles ou bientôt visibles",
      refusedHint: "SIRET fermé, document absent…",
      suspendedHint: "documents expirés ou impayés",
      documents: "Documents",
      docShort: {
        kbis: "Kbis",
        decennale: "Décennale",
        rc_pro: "RC Pro",
        identite: "Identité",
        urssaf: "URSSAF",
      } as Record<string, string>,
      docState: {
        valide: "vérifié",
        en_attente: "à vérifier",
        refuse: "refusé",
        manquant: "manquant",
      } as Record<string, string>,
    },
    /** Inscriptions bloquées et relances automatiques (ADR 0219). */
    stalled: {
      title: "Inscriptions en cours",
      intro:
        "Artisans qui n'ont pas terminé : dossier pas encore envoyé, compléments attendus, ou dossier validé mais profil pas encore visible. MENAO les relance automatiquement trois fois ; au-delà, un appel aide souvent.",
      empty: "Aucune inscription bloquée.",
      count: (n: number) => (n === 1 ? "1 inscription en cours" : `${n} inscriptions en cours`),
      columns: {
        company: "Entreprise",
        state: "Où il en est",
        missing: "Il manque",
        since: "Depuis",
        reminders: "Relances",
      },
      states: {
        dossier: "Dossier en cours",
        complement: "Compléments demandés",
        activation: "Validé, pas encore visible",
      } as Record<string, string>,
      steps: {
        entreprise: "entreprise",
        metiers: "métiers",
        zone: "zone",
        charte: "charte",
        documents: "documents",
        profil: "présentation",
        paiements: "paiements",
        formule: "formule",
      } as Record<string, string>,
      readyToSend: "prêt à envoyer",
      days: (n: number) => (n <= 0 ? "aujourd'hui" : n === 1 ? "1 jour" : `${n} jours`),
      reminders: (n: number, last: string | null) =>
        n === 0 ? "aucune" : last ? `${n} sur 3 (dernière le ${last})` : `${n} sur 3`,
    },
    statuses: {
      brouillon: "Brouillon",
      en_verification: "En vérification",
      valide: "Validés",
      refuse: "Refusés",
      suspendu: "Suspendus",
      radie: "Radiés",
    },
    /** Statut d'un dossier, au singulier (badge de la fiche). */
    status: {
      brouillon: "Brouillon",
      en_verification: "En vérification",
      valide: "Validé",
      refuse: "Refusé",
      suspendu: "Suspendu",
      radie: "Radié",
    },
    detail: {
      // Fiche publique et choix de l'artisan pour Google (F-61, ADR 0144).
      publicPage: {
        link: "Fiche publique",
        none: "Pas encore d'adresse (fixée à la validation du dossier)",
        googleLabel: "Moteurs de recherche",
        google: (on: boolean) => (on ? "Dans Google" : "Retirée de Google par l'artisan"),
      },
      // Parrainage de l'artisan sur sa fiche (F-60, ADR 0143).
      referral: {
        title: "Parrainage",
        code: "Code de parrainage",
        noCode:
          "Pas encore de code : il est créé à sa première visite de « Mon profil », une fois le dossier validé.",
        link: "Lien",
        referrer: "Parrainé par",
        noReferrer: "Inscrit sans parrain",
        referred: (n: number) => `Filleul${n > 1 ? "s" : ""} (${n})`,
        noReferred: "Aucun filleul pour l'instant",
        months: "Mois offerts",
        monthsValue: (applied: number, pending: number, thisYear: number) =>
          `${applied} posé${applied > 1 ? "s" : ""}, ${pending} en attente (${thisYear} sur 12 cette année)`,
        gift: "Cadeau de bienvenue",
        giftValue: (state: string, item: string | null) => (item ? `${item} : ${state}` : state),
        giftTicket: "Voir la demande",
        since: (date: string) => `inscrit le ${date}`,
        seeAll: "Tous les parrainages",
      },
      coverage: (trades: string) => `Métiers couverts selon l'artisan : ${trades}`,
      uncovered: (trades: string) => `Non couverts : ${trades} (à vérifier)`,
      decennaleExempt:
        "Décennale : l'artisan déclare ses métiers non soumis. À vérifier avant de valider le dossier.",
      back: "Retour aux dossiers",
      suspensionReasons: {
        documents_expires: "Suspendu automatiquement : assurance expirée",
        decision_admin: "Suspendu par décision MENAO",
        plaintes: "Suspendu automatiquement : 2 plaintes de clients en 12 mois (enquête en cours)",
      },
      company: "Entreprise",
      contact: "Dirigeant",
      phone: "Téléphone",
      tva: "TVA",
      tvaNo: "Non assujetti (art. 293 B du CGI)",
      trades: "Métiers et spécialités",
      experience: (n: number | null) =>
        n === null ? "Expérience non renseignée" : `${n} ans d'expérience`,
      diploma: (label: string | null) =>
        label ? `Diplôme déclaré : ${label}` : "Aucun diplôme déclaré",
      // Score MENAO de l'artisan et avis Google relevés par l'équipe (ADR 0155).
      menaoScore: {
        title: "Score MENAO",
        googleTitle: "Avis Google",
        googleIntro:
          "Relevez sur la fiche Google de l'entreprise sa note et son nombre d'avis : ils servent de base au critère « Avis des clients » et s'affichent sur la fiche avec un lien vers leur source.",
        url: "Lien de la fiche Google",
        rating: "Note sur 5",
        count: "Nombre d'avis",
        save: "Enregistrer",
        clear: "Retirer les avis Google",
        saved: "Avis Google enregistrés.",
        cleared: "Avis Google retirés.",
        current: (rating: string, count: number, date: string) =>
          `${rating}/5, ${count} avis, relevés le ${date}`,
        none: "Aucun avis Google saisi.",
      },
      zone: "Zone d'intervention",
      zoneFrance: "Toute la France",
      zoneRayon: (label: string | null, km: number | null) =>
        `${km ?? "?"} km autour de ${label ?? "?"}`,
      certifications: "Certifications",
      certVerified: "Vérifiée",
      certRgeConfirmed: (organisme: string, date: string) =>
        `Confirmée par l'annuaire RGE (${organisme}, jusqu'au ${date})`,
      certRgeUnknown: "Absente de l'annuaire RGE : à vérifier sur le site de l'organisme.",
      rge: "Qualifications RGE (annuaire officiel de l'ADEME)",
      rgeNone: "Aucune qualification RGE pour ce SIRET.",
      rgeNever: "Annuaire pas encore consulté.",
      rgeCheckedOn: (date: string) => `Annuaire consulté le ${date}.`,
      rgeExpired: "expirée",
      rgeCertificate: "Certificat",
      rgeRefresh: "Revérifier le RGE",
      rgeStatus: {
        ok: "Annuaire RGE consulté.",
        rate_limited: "Trop de demandes : réessayez dans une heure.",
        siret_missing: "SIRET absent ou invalide.",
        unavailable: "L'annuaire RGE ne répond pas pour l'instant.",
      },
      certVerify: "Marquer comme vérifiée",
      certUnverify: "Annuler la vérification",
      charter: "Charte qualité",
      charterSigned: (date: string, version: string, name: string) =>
        `Signée le ${date} (version ${version}) par ${name}.`,
      charterIdentity: (company: string, siret: string) => `${company} · SIRET ${siret}`,
      engagementSigned: (version: string | null) =>
        version
          ? `Engagement de l'artisan certifié avec la charte (version ${version}).`
          : "Engagement de l'artisan non signé : signature antérieure à l'engagement.",
      charterSignature: "Tracé de la signature",
      charterMissing: "Charte qualité non signée.",
      documents: "Documents",
      docMissing: "Non déposé",
      docValidate: "Valider le document",
      docRefuse: "Refuser le document",
      docReason: "Motif du refus",
      docReasonChoose: "Choisir un motif",
      docDetail: "Précision pour l'artisan",
      docDetailHint: "Facultative, sauf pour « Autre ». Ajoutée au motif dans le message.",
      // Motifs de refus (ADR 0120) : libellés envoyés tels quels à l'artisan.
      refusalReasons: {
        illisible: "Document illisible : reprenez la photo à plat, bien éclairée, sans reflet.",
        incomplet:
          "Document incomplet : toutes les pages ou le recto et le verso sont nécessaires.",
        expire: "Document expiré ou trop ancien : envoyez une version à jour.",
        mauvais_document: "Ce n'est pas le document demandé.",
        nom_different: "Le nom ou l'entreprise ne correspond pas à votre dossier.",
        siret_different: "Le SIRET ne correspond pas à celui de votre entreprise.",
        dates_differentes: "Les dates saisies ne correspondent pas à celles du document.",
        couverture_insuffisante: "L'assurance ne couvre pas les métiers que vous avez déclarés.",
        code_securite_invalide:
          "Le code de sécurité de l'attestation n'a pas pu être vérifié sur le site de l'URSSAF.",
        autre: "Autre motif",
      },
      // Vue côte à côte (ADR 0120).
      docPreview: (label: string) => `Aperçu : ${label}`,
      docOpen: "Ouvrir dans un nouvel onglet",
      docNoPreview: "Aperçu impossible pour ce format : ouvrez le document.",
      docReplaced: "Remplacé",
      docEntered: "Saisi par l'artisan",
      docDeposited: (date: string) => `Déposé le ${date}`,
      // Kbis remplacé par la vérification au registre (ADR 0217).
      docRegistry: (date: string) =>
        `Entreprise vérifiée automatiquement au registre le ${date}, inscrit trouvé parmi les dirigeants`,
      docChecks: "À contrôler",
      docCompany: "Fiche de l'entreprise",
      docCompanyName: "Raison sociale",
      docCompanySiret: "SIRET",
      docCompanySigner: "Signataire de la charte",
      docCompanyAddress: "Adresse",
      docEmission: "Date d'émission",
      docEnd: "Fin de validité",
      docNumber: "Numéro",
      docSecurityCode: "Code de sécurité",
      docInsurer: "Assureur",
      docCoverage: "Couverture",
      checks: {
        kbis: [
          "Raison sociale et SIRET identiques à la fiche de l'entreprise",
          "Extrait de moins de 3 mois",
          "Le dirigeant est bien le signataire de la charte",
        ],
        decennale: [
          "Raison sociale ou nom identiques à la fiche",
          "Période de validité conforme aux dates saisies",
          "Activités couvertes : les métiers déclarés (ci-dessous)",
        ],
        rc_pro: [
          "Raison sociale ou nom identiques à la fiche",
          "Période de validité conforme aux dates saisies",
        ],
        identite: [
          "Nom identique à celui du dirigeant et du signataire de la charte",
          "Document en cours de validité, recto et verso lisibles",
        ],
        urssaf: [
          "Code de sécurité vérifié sur le site de l'URSSAF",
          "Raison sociale et SIRET identiques à la fiche",
          "Date d'émission conforme (moins de 6 mois)",
        ],
      },
      docHistory: (count: number) =>
        count === 1
          ? "Historique : 1 version précédente"
          : `Historique : ${count} versions précédentes`,
      docDecidedBy: (date: string, name: string | null) =>
        name ? `Décision le ${date} par ${name}` : `Décision le ${date}`,
      decidedBy: (name: string) => `par ${name}`,
      profile: "Profil public",
      visibility: "Visibilité",
      visible: "Visible des particuliers",
      hiddenBecause: (missing: string) => `Invisible — manque : ${missing}`,
      connect: (charges: boolean, payouts: boolean) =>
        `Stripe Connect : encaissements ${charges ? "actifs" : "inactifs"}, virements ${payouts ? "actifs" : "inactifs"}`,
      subscription: "Abonnement",
      noSubscription: "Aucun abonnement.",
      subscriptionStatus: {
        trialing: "Période d'essai",
        active: "Actif",
        past_due: "Paiement en échec, Stripe réessaie",
        unpaid: "Impayé",
        canceled: "Résilié",
        incomplete: "Paiement initial non finalisé",
        incomplete_expired: "Expiré avant le premier paiement",
        paused: "En pause",
      } as Record<string, string>,
      trialUntil: (date: string) => `essai jusqu'au ${date}`,
      cancelAt: (date: string) => `résiliation programmée le ${date}`,
      // Mois offert de démarrage (ADR 0160) : aucun devis signé pendant les 2 premiers mois payants.
      starterMonth: (applied: string | null, granted: string) =>
        applied
          ? `Mois offert de démarrage (aucun chantier sur les 2 premiers mois payants) : posé dans Stripe le ${applied}.`
          : `Mois offert de démarrage (aucun chantier sur les 2 premiers mois payants) : accordé le ${granted}, posé dans Stripe à la prochaine facture.`,
      history: "Historique des décisions",
      noHistory: "Aucune décision pour le moment.",
      decision: "Décision sur le dossier",
      decisionNotPending: "Ce dossier n'est pas en attente de vérification.",
      // Fiche réorganisée (ADR 0133) : en-tête fixe, navigation, ce qui reste à vérifier.
      // Fiche en quatre onglets (ADR 0285).
      tabs: {
        label: "Onglets de la fiche",
        verification: "Vérification",
        entreprise: "Entreprise et profil",
        activite: "Activité",
        compte: "Compte",
      },
      summary: {
        score: "Score MENAO",
        leads: "Demandes ce mois",
        leadsValue: (received: number, target: number) => `${received} sur ${target}`,
        subscription: "Abonnement",
        signedUp: "Inscrit le",
      },
      accountTitle: "Bloquer la connexion",
      openAccount: "Voir son compte (connexion, mot de passe, données)",
      effectLabel: "Ce que ça fait :",
      keepsLabel: "Ce qui ne change pas :",
      decide: "Décider",
      checklist: {
        title: "Ce qui reste à vérifier",
        ready: "Tout est vérifié : le dossier peut être validé.",
        readyValidated: "Rien à vérifier pour le moment.",
        pendingDocuments: (n: number) =>
          n > 1 ? `${n} documents déposés à vérifier` : "1 document déposé à vérifier",
        missingDocuments: (n: number) =>
          n > 1 ? `${n} documents manquants ou à refaire` : "1 document manquant ou à refaire",
        refusedDocuments: (n: number) =>
          n > 1
            ? `${n} documents refusés, en attente d'un nouveau dépôt`
            : "1 document refusé, en attente d'un nouveau dépôt",
        pendingCertifications: (n: number) =>
          n > 1 ? `${n} certifications à vérifier` : "1 certification à vérifier",
        siretUnchecked: "SIRET pas encore vérifié auprès de l'INSEE",
        siretInactive: "Entreprise inactive dans Sirene",
        charterMissing: "Charte qualité pas encore signée",
      },
      validate: "Valider le dossier",
      validateHint:
        "Possible quand les documents obligatoires sont validés et en cours de validité.",
      refuse: "Refuser le dossier",
      complement: "Demander un complément",
      message: "Message à l'artisan",
      messageHint:
        "Obligatoire pour un refus ou une demande de complément. L'artisan le verra dans son espace.",
      decisions: {
        valide: "Dossier validé",
        refuse: "Dossier refusé",
        complement: "Complément demandé",
      },
      done: "Décision enregistrée.",
      error:
        "Action impossible : vérifiez que les conditions sont remplies (documents validés, message renseigné).",
    },
  },
  /** Diplômes du métier (ADR 0155). */
  diplomesMetier: {
    cap: "CAP",
    bep: "BEP",
    bac_pro: "Bac pro",
    bp: "Brevet professionnel (BP)",
    bts: "BTS",
    brevet_maitrise: "Brevet de maîtrise",
    titre_pro: "Titre professionnel",
    autre: "Autre diplôme du bâtiment",
  } as Record<DiplomeMetier, string>,
  certificationTypes: {
    rge: "RGE",
    qualifelec: "Qualifelec",
    qualibat: "Qualibat",
    qualipac: "QualiPAC",
    qualipv: "QualiPV",
    qualisol: "Qualisol",
    qualibois: "Qualibois",
    autre: "Autre",
  },
  /** Catégories juridiques INSEE les plus fréquentes chez les artisans. */
  formesJuridiques: FORMES_JURIDIQUES as Record<string, string>,
  zoneErrors: {
    addressRequired: "Choisissez une adresse dans la liste proposée.",
  },
  errors: {
    siretTaken:
      "Ce SIRET est déjà associé à un compte MENAO. Contactez-nous si vous pensez qu'il s'agit d'une erreur.",
    generic: "Une erreur est survenue. Réessayez dans quelques instants.",
    invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
    emailNotConfirmed: "Confirmez d'abord votre adresse e-mail grâce au lien reçu par e-mail.",
    rateLimited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
    weakPassword: "Ce mot de passe est trop faible. Choisissez-en un plus long ou moins courant.",
  },
} as const;
