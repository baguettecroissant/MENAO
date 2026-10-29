import type { GuideBlock } from "@/content/guides/types";

/**
 * Guide terrain des commerciaux (F-65, ADR 0205) : rubriques à lire sur téléphone, tirées du plan
 * marketing et vérifiées dans le produit (prix, pièces, délais). Ni budget, ni objectif chiffré.
 */
export type CommercialGuideSection = {
  /** Adresse : /commercial/guide/<slug>. */
  slug: string;
  title: string;
  /** Une phrase, affichée dans la liste des rubriques. */
  summary: string;
  body: readonly GuideBlock[];
};

export const COMMERCIAL_GUIDE: readonly CommercialGuideSection[] = [
  {
    slug: "parcours",
    title: "Du premier contact à l'abonnement",
    summary:
      "Le chemin d'un artisan jusqu'à l'abonnement, les rattrapages, et ce que vous faites à chaque étape et chaque mois.",
    body: [
      { type: "h2", id: "chemin", text: "Le chemin, et un humain à chaque décrochage" },
      {
        type: "p",
        text: "Un artisan continue après l'essai surtout s'il a signé un chantier grâce à MENAO. Tout le parcours sert à l'amener là : inscrit, prêt avant l'ouverture, puis un premier devis envoyé vite.",
      },
      {
        type: "flow",
        caption:
          "Le chemin normal, en deux temps, puis les rattrapages : à chaque décrochage, un humain reprend contact.",
        rows: [
          {
            label: "Avant l'ouverture",
            steps: [
              "Premier contact",
              "Inscription accompagnée",
              "Dossier vérifié",
              "Prêt pour l'ouverture",
            ],
          },
          {
            label: "Pendant l'essai",
            steps: [
              "Début de l'essai",
              "Premier devis envoyé",
              "Bilan de mi-mai",
              "Abonné au 1er juin",
            ],
          },
          {
            label: "Rattrapage : dossier incomplet",
            steps: [
              "Dossier incomplet",
              "Rappels automatiques de MENAO",
              "Votre appel, une semaine après",
            ],
          },
          {
            label: "Rattrapage : peu de demandes",
            steps: [
              "Peu de demandes après 3 semaines d'essai",
              "Appel de sauvetage",
              "Zone, métiers et disponibilités revus",
            ],
          },
          {
            label: "Rattrapage : aucun devis",
            steps: ["Aucun devis envoyé", "Rendez-vous d'aide au devis"],
          },
          {
            label: "Rattrapage : pas abonné",
            steps: ["Pas abonné après l'essai", "Appel en juin", "Raison notée"],
          },
        ],
      },
      {
        type: "p",
        text: "Un artisan qui décroche est repéré tôt et appelé par un humain, jamais seulement relancé par un message automatique.",
      },
      {
        type: "p",
        text: "**Dates de l'essai** : pour les artisans validés avant l'ouverture, l'essai de 2 mois est prévu du 1er avril au 31 mai 2027, et la formule continue le 1er juin. Ces dates restent à confirmer : parlez d'ouverture « prévue le 1er avril ».",
      },
      {
        type: "callout",
        tone: "warning",
        title: "L'essai commence quand il choisit sa formule",
        text: "Aujourd'hui, dans MENAO, les 2 mois d'essai commencent le jour où l'artisan choisit sa formule sur le site. Tant que les dates de l'essai ne sont pas confirmées, ne lui faites pas choisir sa formule : attendez la consigne de l'équipe.",
      },
      { type: "h2", id: "a-chaque-etape", text: "Ce que vous faites à chaque étape" },
      {
        type: "table",
        caption: "Les étapes du parcours et le rôle du commercial à chacune",
        head: ["Étape", "Ce que vous faites"],
        rows: [
          [
            "1. Premier contact",
            "Accroche, démo de 2 minutes sur votre téléphone dans l'espace d'exemples, puis proposition d'inscription accompagnée. Un contact venu de la publicité est rappelé dans l'heure.",
          ],
          [
            "2. Inscription accompagnée",
            "Une dizaine de minutes ensemble, avec **votre code**. Les pièces manquantes sont notées dans le suivi. Voir [la liste à cocher](/commercial/guide/demo#inscription-accompagnee).",
          ],
          [
            "3. Dossier vérifié",
            "L'équipe MENAO contrôle l'entreprise et chaque document. Dossier pas encore envoyé : vous rappelez l'artisan environ une semaine après l'inscription ([appel 3](/commercial/guide/scripts#relance-dossier)).",
          ],
          [
            "4. Prêt pour l'ouverture",
            "Fiche complète (photo, présentation, réalisations, zone), compte de paiement Stripe ouvert (étape « Paiements »), application installée, notifications activées. Un appel ou un passage pour finir ce qui manque. Pour recevoir des demandes, il lui faudra aussi une formule : voir les dates de l'essai, plus haut.",
          ],
          [
            "5. Début de l'essai",
            "L'équipe vous signale les artisans à appeler : le jour de l'ouverture, ceux qui n'ont pas mis à jour leurs disponibilités ; la première semaine, ceux qui n'ont pas répondu à leur première demande au bout de 48 h.",
          ],
          [
            "6. Premier devis envoyé",
            "Visite d'accompagnement. Toujours aucun devis : rendez-vous d'aide au devis (dictée, catalogue de prestations).",
          ],
          [
            "7. Bilan de mi-mai",
            "[Appel du bilan](/commercial/guide/scripts#appel-bilan) avec chaque artisan que vous avez inscrit. Date exacte à confirmer.",
          ],
          [
            "8. Abonné au 1er juin",
            "Sa formule continue, il n'a rien à faire. Sinon, appel en juin pour comprendre ([appel 6](/commercial/guide/scripts#appel-non-abonne)).",
          ],
        ],
      },
      { type: "h2", id: "mois-par-mois", text: "Le terrain, mois par mois" },
      {
        type: "table",
        caption: "Le travail des commerciaux de janvier à septembre 2027",
        head: ["Mois", "Sur le terrain"],
        rows: [
          [
            "Janvier 2027",
            "Semaine du 4 : formation (démo, objections, inscription accompagnée). Tournées dès le 11. Petits-déjeuners en négoce, réunion avec la CMA 06 (à confirmer). Les contacts venus de la publicité sont rappelés dans l'heure.",
          ],
          [
            "Février 2027",
            "Tournées et inscriptions accompagnées. Petits-déjeuners en négoce, réunion avec la CAPEB 06 (à confirmer).",
          ],
          [
            "Mars 2027",
            "Finir les dossiers et les fiches avant l'ouverture. Foire de Nice (dates à confirmer) : visite des artisans exposants. Petits-déjeuners en négoce.",
          ],
          [
            "Avril 2027",
            "Ouverture prévue le 1er avril : appels du premier jour et de la première semaine. Visites d'accompagnement pour le premier devis. Les inscriptions continuent.",
          ],
          [
            "Mai 2027",
            "Rendez-vous avec les artisans peu actifs. Bilan de mi-mai. Premiers contacts avec des prescripteurs (agences immobilières, syndics).",
          ],
          [
            "Juin 2027",
            "Appel de chaque artisan qui n'a pas continué après l'essai. Parlez du parrainage aux artisans contents.",
          ],
          [
            "Juillet 2027",
            "Les inscriptions continuent. Rappelez le parrainage aux artisans contents de votre secteur.",
          ],
          ["Août 2027", "Moins de visites (congés). Préparation de la rentrée."],
          ["Septembre 2027", "Rentrée : chauffage et rénovation."],
        ],
      },
    ],
  },
  {
    slug: "journee",
    title: "La journée type",
    summary:
      "Où aller et quoi faire, du comptoir du matin aux appels de fin de journée, et la permanence de la semaine.",
    body: [
      { type: "h2", id: "creneaux", text: "Les créneaux de la journée" },
      {
        type: "table",
        caption: "La journée type d'un commercial MENAO",
        head: ["Créneau", "Où", "Ce qu'on y fait"],
        rows: [
          [
            "7 h à 9 h",
            "Comptoirs des négoces de matériaux, de plomberie et d'électricité",
            "Conversations au comptoir, démos de 2 minutes, un prospectus remis après chaque conversation",
          ],
          [
            "9 h à 12 h",
            "Chantiers en cours et zones artisanales de la zone du jour",
            "Démos et inscriptions accompagnées sur place",
          ],
          [
            "12 h à 13 h",
            "Au téléphone",
            "Appels de prospection pour la zone du lendemain, prise de rendez-vous",
          ],
          ["13 h à 14 h", "Pause", "Aucun appel de prospection"],
          [
            "14 h à 17 h",
            "Rendez-vous pris le matin, ateliers d'artisans",
            "Inscriptions accompagnées",
          ],
          [
            "17 h à 18 h",
            "Au téléphone",
            "Relance des dossiers incomplets, rappel des contacts du jour, mise à jour du suivi",
          ],
        ],
      },
      {
        type: "p",
        text: "Les appels restent toujours **en semaine, de 10 h à 13 h et de 14 h à 20 h**. Voir [les règles de prospection](/commercial/guide/regles#prospection).",
      },
      { type: "h2", id: "permanence", text: "La permanence" },
      {
        type: "p",
        text: "Chaque commercial tient une demi-journée de permanence par semaine, à tour de rôle. Ce jour-là, vous rappelez dans l'heure les contacts venus de la publicité ([appel 2](/commercial/guide/scripts#rappel-publicite)), toujours dans la plage d'appel.",
      },
      {
        type: "callout",
        tone: "menao",
        title: "Rien sans suite",
        text: "Chaque visite et chaque appel se termine par une prochaine action notée dans le suivi : rappel, rendez-vous, pièce attendue ou « ne plus contacter ».",
      },
    ],
  },
  {
    slug: "demo",
    title: "L'accroche et la démo",
    summary:
      "L'accroche en 30 secondes, la démo de 2 minutes et la liste à cocher de l'inscription accompagnée.",
    body: [
      { type: "h2", id: "accroche", text: "L'accroche en 30 secondes" },
      {
        type: "p",
        text: "Au comptoir d'un négoce : « Bonjour, je suis {votre prénom}, de MENAO, une plateforme qui ouvre d'abord dans le 06. On envoie aux artisans des demandes de chantier près de chez eux, sans commission, avec l'outil pour faire le devis, le faire signer et être payé. L'ouverture est prévue le 1er avril et les 2 premiers mois sont gratuits. Je vous montre en 2 minutes ? »",
      },
      { type: "h2", id: "demo-2-minutes", text: "La démo en 2 minutes" },
      {
        type: "callout",
        tone: "warning",
        title: "Toujours l'espace d'exemples",
        text: "La démo se fait dans [l'espace d'exemples](/pro/decouvrir/tableau-de-bord) (« Démo » dans votre menu) : des données fictives, rien n'est lu ni écrit, et les boutons sont désactivés. On montre, on ne fait pas. Jamais les données d'un vrai client.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "**La demande** : une demande d'exemple, avec la description du client, son budget, sa commune et le temps qui reste pour répondre.",
          "**Le devis** : un devis d'exemple. Expliquez qu'il se dicte à voix haute et que MENAO le met en forme.",
          "**La signature et le paiement** : un chantier en cours, avec le devis signé par le client (avec un code de vérification) et l'acompte payé directement sur le compte de l'artisan, sans commission.",
          "**Sa fiche** : ses réalisations et ses avis. Avec sa carte de visite, ses propres clients lui envoient leurs demandes, à lui seul.",
        ],
      },
      {
        type: "p",
        text: "Pas le temps d'une démo ? Montrez le film artisans de 74 secondes et laissez le prospectus avec votre QR code, ou votre carte : il pourra s'inscrire le soir.",
      },
      { type: "h2", id: "inscription-accompagnee", text: "L'inscription accompagnée" },
      {
        type: "p",
        text: "Une dizaine de minutes, sur son téléphone, avec lui. La liste à cocher :",
      },
      {
        type: "list",
        items: [
          "**Créer le compte**, dans l'application MENAO ou sur le site avec votre lien : métiers, entreprise (nom ou SIRET), zone, e-mail professionnel et téléphone portable, puis le code à 6 chiffres reçu par e-mail.",
          "**Votre code** : dans l'application, à l'étape « Créez votre compte », il touche « J'ai un code (parrain ou conseiller MENAO) », sous le téléphone portable, et saisit votre code dans ce champ. Sur le site, votre QR code ou votre lien (menao.fr/p/{votre code}/pro) l'apporte tout seul. Sans code, l'inscription ne vous est pas rattachée, et le code ne s'ajoute pas après la création du compte.",
          "**Vérifier le rattachement** : l'artisan apparaît dans « Vos inscriptions », sur votre page [Mon code](/commercial).",
          "**Signer la charte qualité MENAO** : les règles à cocher, puis la signature.",
          "**Photographier les documents** : Kbis ou extrait INSEE/RNE de moins de 3 mois, attestation d'assurance décennale en cours de validité (sauf métiers non soumis), attestation de RC Pro en cours de validité, pièce d'identité du dirigeant, attestation de vigilance URSSAF de moins de 6 mois. MENAO lit chaque document et pré-remplit les champs ; l'artisan vérifie avant l'envoi.",
          "**Ajouter sa photo et sa présentation** (100 caractères au moins), et si possible des photos de réalisations.",
          "**Envoyer le dossier en vérification** : il est prévenu par e-mail dès qu'il est validé.",
          "**Lui montrer l'espace d'exemples** : il découvre son espace pendant la vérification.",
        ],
      },
      {
        type: "p",
        text: "Le choix de la formule n'est pas nécessaire pour envoyer le dossier. Il se fait sur le site, depuis l'espace pro : rien ne s'achète dans l'application. L'essai de 2 mois commence le jour où il la choisit : attendez la consigne de l'équipe ([dates de l'essai](/commercial/guide/parcours#chemin)).",
      },
      { type: "h2", id: "piece-manquante", text: "Si un document manque" },
      {
        type: "list",
        items: [
          "Faites envoyer tout le reste : chaque élément est enregistré au fur et à mesure, dans l'ordre qu'il veut.",
          "Notez dans le suivi la pièce qui manque et la date promise.",
          "MENAO lui envoie des rappels automatiques les premiers jours. Vous, vous le rappelez environ une semaine après l'inscription ([appel 3](/commercial/guide/scripts#relance-dossier)).",
          "Les motifs de refus à éviter : Kbis de plus de 3 mois, attestation URSSAF de plus de 6 mois, décennale expirée ou qui ne couvre pas les métiers déclarés.",
        ],
      },
    ],
  },
  {
    slug: "scripts",
    title: "Les 6 appels types",
    summary:
      "Prospection, rappel de la publicité, dossier incomplet, sauvetage, bilan et non-abonné : les trames d'appel.",
    body: [
      {
        type: "p",
        text: "Ce sont des trames, pas un texte à réciter : l'artisan doit parler plus que vous. Chaque appel se termine par une prochaine action notée dans le suivi. Toujours **en semaine, de 10 h à 13 h et de 14 h à 20 h**.",
      },
      // TODO(legal): prospection téléphonique entre professionnels (micro-entrepreneurs, numéros
      // d'appel) : trame à revoir selon la réponse de l'avocat.
      { type: "h2", id: "appel-prospection", text: "1. L'appel de prospection" },
      {
        type: "p",
        text: "**Pour commencer** : « Bonjour, {prénom} {nom} ? Je suis {votre prénom}, de MENAO, une plateforme pour les artisans qui ouvre d'abord dans le 06. Je vous prends deux minutes, c'est un bon moment ? » Si ce n'est pas le moment : « Quand puis-je vous rappeler ? »",
      },
      { type: "p", text: "**Trois questions** :" },
      {
        type: "list",
        ordered: true,
        items: [
          "« Vous êtes bien {métier} à {commune} ? Vous intervenez jusqu'où, à peu près ? »",
          "« En ce moment, votre carnet est plutôt plein, ou vous prendriez des chantiers en plus ? »",
          "« Vos devis, vous les faites comment aujourd'hui ? »",
        ],
      },
      {
        type: "p",
        text: "**La présentation** : « Dès l'ouverture, prévue le 1er avril, MENAO envoie aux artisans du 06 des demandes de chantier près de chez eux. Ce n'est pas un site qui revend des contacts : 3 artisans au plus par demande, un abonnement fixe, aucune commission sur vos chantiers. Et vous avez l'outil pour faire le devis à la voix, le faire signer et être payé directement sur votre compte. Les 2 premiers mois sont gratuits. »",
      },
      {
        type: "p",
        text: "**La proposition** : « Le plus simple : je vous envoie un lien par SMS et on fait l'inscription ensemble au téléphone, en dix minutes. Ou je passe vous la montrer cette semaine. Qu'est-ce qui vous arrange ? »",
      },
      {
        type: "p",
        text: "**Pour conclure** : « Parfait. Préparez votre Kbis ou votre extrait INSEE de moins de 3 mois, vos attestations décennale et RC Pro, votre attestation URSSAF de moins de 6 mois et votre pièce d'identité : une photo de chaque suffit. »",
      },
      {
        type: "p",
        text: "**En cas de refus** : « Je comprends. Je note de ne plus vous appeler ? » Dès qu'il refuse d'être recontacté : statut « ne plus contacter » dans le suivi, immédiatement.",
      },
      {
        type: "h2",
        id: "rappel-publicite",
        text: "2. Le rappel d'un contact venu de la publicité",
      },
      {
        type: "p",
        text: "Dans l'heure, dans la plage d'appel : « Bonjour {prénom}, {votre prénom} de MENAO. Vous avez laissé vos coordonnées sur notre publicité pour recevoir des chantiers dans le 06 : je vous rappelle. Vous avez deux minutes ? »",
      },
      {
        type: "p",
        text: "Ensuite : confirmez son métier et sa commune ; posez la question 2 ; faites la présentation courte ; proposez tout de suite l'inscription accompagnée, avec votre lien envoyé par SMS.",
      },
      {
        type: "p",
        text: "**La règle numéro un** : un contact rappelé dans l'heure s'inscrit bien plus souvent qu'un contact rappelé le lendemain.",
      },
      { type: "h2", id: "relance-dossier", text: "3. La relance d'un dossier incomplet" },
      {
        type: "p",
        text: "Environ une semaine après l'inscription, si le dossier n'est pas encore envoyé. MENAO lui envoie aussi des rappels automatiques les premiers jours : votre appel vient en plus.",
      },
      {
        type: "p",
        text: "« Bonjour {prénom}, {votre prénom} de MENAO, on s'est vus {lieu ou date}. Votre inscription est presque finie, il manque juste {pièce}. Vous l'avez sous la main ? Je reste en ligne pendant que vous la prenez en photo dans l'application. »",
      },
      {
        type: "p",
        text: "Si la pièce n'existe pas encore (décennale expirée, attestation URSSAF à demander, Kbis trop ancien) : notez la date promise dans le suivi et rappelez ce jour-là.",
      },
      { type: "h2", id: "appel-sauvetage", text: "4. L'appel de sauvetage" },
      {
        type: "p",
        text: "Pendant l'essai, pour un artisan que l'équipe vous signale parce qu'il a reçu peu de demandes au bout de 3 semaines : « Bonjour {prénom}, {votre prénom} de l'équipe MENAO. Je fais le point avec les artisans qui ont reçu peu de demandes depuis le début de l'essai, et c'est votre cas. Je voudrais vérifier trois choses avec vous. »",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "**La zone** : « Votre zone va jusqu'à {rayon ou communes}. Vous accepteriez d'aller un peu plus loin ? »",
          "**Les métiers et les travaux** : « Vous faites aussi {travaux voisins} ? On peut les ajouter. »",
          "**Les disponibilités et les notifications** : « Vos congés sont à jour ? Les notifications sont bien activées ? »",
        ],
      },
      {
        type: "p",
        text: "Pour finir : « Je note tout ça, et je vous rappelle dans dix jours pour voir si ça change. »",
      },
      { type: "h2", id: "appel-bilan", text: "5. L'appel du bilan" },
      {
        type: "p",
        text: "À la mi-mai (date exacte à confirmer, comme [les dates de l'essai](/commercial/guide/parcours#chemin)), avec chaque artisan que vous avez inscrit : « Bonjour {prénom}, {votre prénom} de MENAO. Je vous appelle pour faire le bilan de votre essai. Combien de demandes avez-vous reçues, et combien de chantiers signés ? Qu'est-ce que vous en pensez ? »",
      },
      { type: "p", text: "Écoutez, puis selon sa réponse :" },
      {
        type: "list",
        items: [
          "**Il est content** : « Votre formule {formule} continue le 1er juin, vous n'avez rien à faire. »",
          "**Il reçoit plus de demandes que sa formule n'en prévoit, ou veut plus de métiers** : montrez-lui le [comparatif des formules](/pro#formules) (Premium : jusqu'à 25 demandes par mois, métiers illimités), sans insister.",
          "**Il hésite** : demandez ce qui lui manque ; proposez un rendez-vous d'aide au devis, ou revoyez avec lui sa zone, ses métiers et ses disponibilités.",
          "**Il veut arrêter** : « C'est votre choix : si vous arrêtez avant la fin de l'essai, il n'y a rien à payer. Qu'est-ce qui vous a manqué ? » Notez la raison.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Pas d'offre à l'année pendant l'essai",
        text: "Ne proposez pas l'abonnement à l'année pendant l'essai, ni à cet appel. Si l'artisan pose la question, répondez simplement avec [l'offre](/commercial/guide/offre#formules).",
      },
      { type: "h2", id: "appel-non-abonne", text: "6. L'appel d'un artisan non abonné" },
      {
        type: "p",
        text: "En juin, avec chaque artisan qui n'a pas continué après l'essai : « Bonjour {prénom}, {votre prénom} de MENAO. Vous n'avez pas continué après l'essai, et c'est tout à fait votre droit. Je vous appelle pour comprendre : qu'est-ce qui ne vous a pas convaincu ? »",
      },
      { type: "p", text: "Notez la raison dans une des cases du suivi :" },
      {
        type: "list",
        items: [
          "pas assez de demandes ;",
          "demandes hors de ma zone ou de mon métier ;",
          "trop cher ;",
          "pas le temps ;",
          "outil pas adapté ;",
          "autre.",
        ],
      },
      {
        type: "p",
        text: "Pour finir : « Je peux vous recontacter quand on aura avancé sur ce point ? » S'il refuse : « ne plus contacter ». L'équipe relit ces raisons chaque mois.",
      },
    ],
  },
  {
    slug: "objections",
    title: "Répondre aux objections",
    summary: "Ce que disent les artisans, la réponse en une phrase et ce qu'on leur montre.",
    body: [
      { type: "h2", id: "fiche-objections", text: "La fiche d'objections" },
      // TODO(legal): promesses sur le nombre de demandes (« 4 demandes par mois ») et sur les 72 h :
      // réponses à revoir selon l'avocat.
      {
        type: "table",
        caption: "Les objections des artisans, la réponse et la preuve à montrer",
        head: ["Il dit", "On répond", "Ce qu'on montre"],
        rows: [
          [
            "« Encore une plateforme qui revend mes contacts »",
            "Ici, rien n'est revendu : abonnement fixe, 3 artisans au plus par demande, et les demandes de vos propres clients n'arrivent qu'à vous.",
            "La page [Critères de classement](/criteres-de-classement), la demande directe depuis la fiche",
          ],
          [
            "« 150 € par mois, c'est cher »",
            "Exemple : une commission de 15 % sur un chantier de 8 000 €, c'est 1 200 €. Ici, 150 € HT par mois, sans commission, et 2 mois gratuits pour juger.",
            "Le simulateur de commission de la page [Espace Pro](/pro)",
          ],
          [
            "« Je n'ai pas le temps »",
            "On fait l'inscription ensemble en une dizaine de minutes, et un devis se dicte à voix haute.",
            "Le film artisans, ou un devis dans l'espace d'exemples",
          ],
          [
            "« Je ne veux pas m'engager »",
            "Au mois, c'est sans engagement : vous arrêtez quand vous voulez, depuis votre espace pro.",
            "Les [formules](/pro#formules) de la page Espace Pro",
          ],
          [
            "« Et si je ne reçois rien ? »",
            "Personne ne peut promettre un nombre de demandes. Pendant les 2 mois d'essai, vous pouvez arrêter sans rien payer. Et si vous en recevez peu, on vous appelle pour revoir votre zone, vos métiers et vos disponibilités.",
            "Une place réservée à un nouvel artisan : la page [Critères de classement](/criteres-de-classement)",
          ],
          [
            "« Je ne suis pas à l'aise avec les applis »",
            "Tout se fait au téléphone, même le devis, à la voix. On installe l'application et on fait l'inscription ensemble.",
            "L'application, l'inscription accompagnée",
          ],
          [
            "« Mes clients, je les ai déjà »",
            "Justement : avec votre carte de visite, ils vous envoient leur demande depuis votre fiche, à vous seul, et devis, signature, paiement et suivi passent par MENAO.",
            "La carte de visite avec QR code",
          ],
        ],
      },
      { type: "h2", id: "conseils", text: "Quelques conseils" },
      {
        type: "list",
        items: [
          "Écoutez l'objection jusqu'au bout, répondez en une phrase, puis montrez la preuve sur le téléphone.",
          "Ne promettez jamais un nombre de demandes ou de chantiers, même comme un objectif.",
          "Ne citez aucun concurrent par son nom : l'exemple de commission reste un simple calcul.",
          "Si la réponse n'est pas dans ce guide, ne l'inventez pas : notez la question et rappelez l'artisan avec la bonne réponse.",
        ],
      },
    ],
  },
  {
    slug: "supports",
    title: "Le kit terrain",
    summary:
      "Les supports à emporter, les textes du prospectus et de votre carte, les rendez-vous collectifs et les partenaires.",
    body: [
      { type: "h2", id: "supports", text: "Les supports" },
      {
        type: "table",
        caption: "Les supports du commercial et leur usage",
        head: ["Support", "À quoi il sert"],
        rows: [
          [
            "Prospectus A5 avec votre QR code",
            "Remis après chaque conversation : l'inscription faite avec ce QR code vous est rattachée.",
          ],
          ["Votre carte avec votre code", "Pour l'artisan qui préfère s'inscrire le soir."],
          ["Kakemono", "Comptoirs de négoce et petits-déjeuners."],
          ["Tenue MENAO", "Être reconnu sur les chantiers et aux comptoirs."],
          [
            "Film artisans de 74 secondes",
            "Sur votre téléphone, pour celui qui n'a pas le temps d'une démo.",
          ],
          ["Espace d'exemples", "La démo, toujours avec des données fictives."],
          [
            "Page Critères de classement",
            "Prouver que rien n'est revendu ni acheté : [criteres-de-classement](/criteres-de-classement).",
          ],
        ],
      },
      { type: "h2", id: "prospectus-artisans", text: "Le prospectus A5 des artisans" },
      // TODO(legal): textes imprimés (« prévue le 1er avril », « 72 h », « 2 mois d'essai gratuits »)
      // relus par l'avocat avant impression (promesses affichées).
      {
        type: "document",
        caption: "Le recto du prospectus A5 des artisans, zone par zone",
        title: "Prospectus A5 · recto",
        zones: [
          {
            title: "Titre",
            items: ["Des chantiers près de chez vous. Sans commission."],
            shape: "header",
          },
          {
            title: "Sous-titre",
            items: [
              "Dès l'ouverture, prévue le 1er avril, MENAO envoie aux artisans du 06 des demandes de chantier, avec l'outil pour les mener du devis au paiement.",
            ],
          },
          {
            title: "Trois blocs",
            items: [
              "Des demandes dans votre zone : 3 artisans au plus par demande, 72 h pour répondre.",
              "L'outil complet : devis à la voix, signature en ligne, paiement directement sur votre compte.",
              "Un prix fixe : dès 150 € HT par mois, aucune commission, 2 mois d'essai gratuits.",
            ],
          },
          {
            title: "Appel à l'action",
            items: [
              "Inscrivez-vous en quelques minutes avec votre conseiller.",
              "Votre QR code personnel et « Code : {votre code} ».",
            ],
          },
        ],
      },
      {
        type: "document",
        caption: "Le verso du prospectus A5 des artisans, zone par zone",
        title: "Prospectus A5 · verso",
        zones: [
          {
            title: "Comment ça marche",
            items: [
              "1. Inscription : SIRET, Kbis, décennale, RC Pro, URSSAF et pièce d'identité, en photo depuis votre téléphone.",
              "2. Dossier vérifié par l'équipe MENAO.",
              "3. À l'ouverture, les demandes de chantier de votre zone vous sont envoyées.",
              "4. Devis, signature et paiement depuis votre téléphone.",
            ],
          },
          {
            title: "Ce que vous payez",
            items: [
              "Base 150 € HT par mois, Premium 500 € HT, Entreprise 1 500 € HT.",
              "Au mois sans engagement, ou à l'année avec 2 mois offerts.",
              "Frais de paiement Stripe à votre charge sur les sommes encaissées.",
            ],
          },
          {
            title: "Ce que vous ne payez jamais",
            items: ["Aucune commission sur vos chantiers, aucun contact facturé à l'unité."],
          },
          {
            title: "Contact",
            items: ["{votre prénom}, {votre téléphone} · menao.fr/pro"],
          },
          {
            title: "Mentions",
            items: [
              "{raison sociale de MENAO}, {adresse}, {RCS}.",
              "Ne pas jeter sur la voie publique.",
            ],
          },
        ],
      },
      { type: "h2", id: "carte-commercial", text: "Votre carte (85 × 55 mm)" },
      {
        type: "document",
        caption: "Votre carte de conseiller, telle qu'elle s'imprime depuis votre espace",
        title: "Carte · conseiller MENAO",
        zones: [
          {
            title: "À gauche",
            items: [
              "Logo MENAO",
              "{votre prénom} {votre nom}",
              "Conseiller MENAO",
              "Code : {votre code}",
              "{votre téléphone}",
            ],
            shape: "header",
          },
          {
            title: "À droite",
            items: ["QR code de votre lien d'inscription", "Inscription des artisans", "menao.fr"],
          },
        ],
      },
      {
        type: "p",
        text: "Imprimez-la depuis [Cartes à imprimer](/commercial/cartes) : 10 cartes par feuille A4, à imprimer à 100 %.",
      },
      { type: "h2", id: "rendez-vous-collectifs", text: "Les rendez-vous collectifs" },
      {
        type: "table",
        caption: "Les événements collectifs et ce qu'on y fait",
        head: ["Événement", "Ce qu'on y fait"],
        rows: [
          ["Petits-déjeuners en négoce", "Démo collective, inscriptions sur place."],
          [
            "Réunions de la CMA 06 et de la CAPEB 06",
            "Présentation aux artisans qu'elles réunissent, une fois les dates confirmées.",
          ],
          [
            "Ateliers MENAO (en négoce ou en visio)",
            "Chaque mois : « Un devis en quelques minutes », « Être payé sans relancer ».",
          ],
          [
            "Foire de Nice",
            "Visite des artisans exposants : ils paient pour trouver des clients, ce sont de très bons prospects. Passez sur les stands en semaine, le matin, quand les allées sont calmes. Dates à confirmer.",
          ],
        ],
      },
      { type: "h2", id: "partenaires-terrain", text: "Les partenaires de terrain" },
      {
        type: "table",
        caption: "Les partenaires de terrain, ce qu'on leur propose et ce qu'on leur demande",
        head: ["Partenaire", "Ce qu'on leur propose", "Ce qu'on leur demande"],
        rows: [
          [
            "CMA 06 et CAPEB 06",
            "Un atelier gratuit « devis, signature et paiement » pour leurs artisans",
            "Une réunion d'artisans, un mot dans leur lettre d'information",
          ],
          [
            "Négoces de matériaux, de plomberie et d'électricité",
            "Un petit-déjeuner de démo, un kakemono au comptoir",
            "L'accès au comptoir, et qu'ils invitent eux-mêmes leurs clients artisans",
          ],
          [
            "Experts-comptables",
            "L'envoi automatique des pièces au comptable, déjà dans MENAO",
            "Recommander MENAO à leurs clients artisans",
          ],
          [
            "Écoles et CFA du bâtiment",
            "Un module « devis, signature, paiement » fait avec MENAO",
            "Présenter MENAO aux jeunes qui s'installent",
          ],
        ],
      },
    ],
  },
  {
    slug: "regles",
    title: "Les règles à respecter",
    summary:
      "Les règles du terrain, ce qu'on ne dit jamais, le ton, et les règles de prospection à appliquer sans exception.",
    body: [
      {
        type: "callout",
        tone: "warning",
        title: "Certaines règles attendent l'avocat",
        text: "La prospection téléphonique des artisans (notamment des micro-entrepreneurs), les promesses chiffrées (72 h, nombre de demandes) et les conditions de l'engagement à l'année attendent l'avis de l'avocat. D'ici là, appliquez cette page telle qu'elle est écrite : c'est la version la plus prudente.",
      },
      { type: "h2", id: "regles-terrain", text: "Les règles du terrain" },
      // TODO(legal): prospection entre professionnels et « 4 demandes par mois » : à faire valider
      // par l'avocat.
      {
        type: "list",
        items: [
          "**Ne jamais promettre un nombre de chantiers ni de demandes**, même comme un objectif. Le seul nombre de demandes écrit est celui de la garantie de l'engagement à l'année, tel qu'il figure sur la page Espace Pro.",
          "**Aucune donnée réelle en démo** : l'espace d'exemples, toujours.",
          "**Respecter la prospection entre professionnels** : se présenter, respecter le refus, tenir à jour la liste « ne plus contacter » du suivi.",
          "**Une inscription = un code** : c'est ce qui vous rattache l'artisan. Vérifiez que votre code est saisi, ou que l'artisan est passé par votre QR code ou votre lien.",
          "**Rien sans suite** : chaque visite et chaque appel se termine par une prochaine action notée dans le suivi.",
        ],
      },
      { type: "h2", id: "a-ne-jamais-dire", text: "À ne jamais dire" },
      {
        type: "table",
        caption: "Les formules interdites, selon l'interlocuteur",
        head: ["À qui", "À ne jamais dire"],
        rows: [
          [
            "Aux artisans",
            "« Clients garantis », un nombre de chantiers ou de demandes promis, « les meilleurs artisans »",
          ],
          [
            "Aux particuliers et aux prescripteurs",
            "« Travaux de qualité garantis », « trois devis garantis », tout vocabulaire d'urgence",
          ],
        ],
      },
      {
        type: "p",
        text: "Et jamais de nom de concurrent : on compare un abonnement fixe à une commission, sans nommer personne.",
      },
      { type: "h2", id: "ton", text: "Le ton" },
      // TODO(legal): exemples de chantiers (réels avec accord, ou présentés comme des exemples).
      {
        type: "list",
        items: [
          "**Direct et chiffré** : « 150 € HT par mois, aucune commission » plutôt que « une offre avantageuse ».",
          "**Les mots du métier** : chantier, devis, acompte, réception, décennale.",
          "**Vouvoiement** avec les artisans, toujours.",
          "**MENAO toujours en majuscules.**",
          "**Jamais de chiffre ni de témoignage inventé** : un exemple de chantier est réel, avec l'accord des intéressés, ou présenté comme un exemple.",
        ],
      },
      { type: "h2", id: "prospection", text: "La prospection" },
      // TODO(legal): régime de la prospection téléphonique entre professionnels (micro-entrepreneurs,
      // numéros d'appel, fichiers utilisés), question posée à l'avocat ; horaires retenus par prudence.
      {
        type: "list",
        items: [
          "**Appels aux artisans : en semaine, de 10 h à 13 h et de 14 h à 20 h**, par prudence. Même pour un rappel.",
          "**Présentez-vous dès le début** : votre prénom, MENAO, et l'objet de l'appel.",
          "**Au premier refus d'être recontacté** : statut « ne plus contacter » dans le suivi, immédiatement. Plus aucun appel, SMS ni visite de prospection.",
          "**SMS et e-mails** : dites toujours qui vous êtes et que vous êtes de MENAO. S'il demande à ne plus rien recevoir : « ne plus contacter ».",
          "**Aucun appel de prospection vers un particulier** : c'est interdit sans son accord préalable depuis le 11 août 2026.",
        ],
      },
      { type: "h2", id: "rue-et-imprimes", text: "La rue et les imprimés" },
      {
        type: "list",
        items: [
          "Aucune distribution dans la rue sans l'accord de la mairie.",
          "Aucun affichage sauvage.",
          "Le prospectus se remet en main propre, après une conversation.",
        ],
      },
    ],
  },
  {
    slug: "offre",
    title: "Ce que vous pouvez dire de l'offre",
    summary:
      "Les formules, les prix, l'essai, la mise en relation et le parrainage, tels qu'ils sont dans MENAO, et ce qu'on ne promet jamais.",
    body: [
      {
        type: "p",
        text: "Tout ce qui est sur cette page est vrai aujourd'hui dans MENAO. Ce qui n'y est pas, vous ne le promettez pas.",
      },
      { type: "h2", id: "formules", text: "Les formules et les prix" },
      {
        type: "table",
        caption: "Les formules MENAO et leurs conditions",
        head: ["Ce que vous dites", "Le détail"],
        rows: [
          ["Trois formules", "Base 150 € HT par mois, Premium 500 € HT, Entreprise 1 500 € HT."],
          ["Au mois", "Sans engagement : l'artisan arrête quand il veut, depuis son espace pro."],
          [
            "À l'année",
            "Payée d'avance, 2 mois offerts : 1 500 €, 5 000 € ou 15 000 € HT par an, soit 125 €, 417 € ou 1 250 € HT par mois. Engagement de 12 mois à partir du premier paiement, après l'essai.",
          ],
          [
            "Essai gratuit",
            "2 mois gratuits, qui commencent le jour où il choisit sa formule sur le site. Aucun prélèvement avant la fin de l'essai, et il peut arrêter à tout moment pendant l'essai, sans rien payer.",
          ],
          [
            "Aucune commission",
            "Ni commission ni marge sur ses chantiers, aucun contact acheté à l'unité. Ses clients le paient directement, sur son compte Stripe. Seuls les frais de paiement de Stripe restent à sa charge, comme pour tout paiement par carte.",
          ],
        ],
      },
      {
        type: "table",
        caption: "Les limites de chaque formule, comme sur la page Espace Pro",
        head: ["Formule", "Demandes par mois", "Métiers"],
        rows: [
          ["Base", "Jusqu'à 10", "2"],
          ["Premium", "Jusqu'à 25", "Illimités"],
          ["Entreprise", "Illimitées", "Illimités"],
        ],
      },
      {
        type: "p",
        text: "Le reste du détail est dans le [comparatif des formules](/pro#formules) : montrez-le plutôt que de le réciter. Certaines fonctions propres à Premium et Entreprise (comptes d'équipe, par exemple) sont encore en construction : ne les promettez pas. Dans l'application, rien ne s'achète : la formule se choisit et se paie sur le site, depuis l'espace pro.",
      },
      // TODO(legal): CGV artisans (engagement à l'année, garantie des 4 demandes, résiliation) chez
      // l'avocat ; la garantie figure déjà sur la page Espace Pro.
      {
        type: "p",
        text: "**L'année et sa garantie** : moins de 4 demandes 2 mois de suite, ou activité cessée, et l'abonné à l'année part sans frais. Les demandes qu'il apporte lui-même (depuis sa fiche ou sa carte de visite) ne comptent pas. Ne poussez pas l'année pendant l'essai ni au bilan : répondez seulement si l'artisan pose la question.",
      },
      { type: "h2", id: "mise-en-relation", text: "La mise en relation" },
      {
        type: "table",
        caption: "Le fonctionnement des demandes et du dossier",
        head: ["Ce que vous dites", "Le détail"],
        rows: [
          ["3 artisans au plus", "Chaque demande est envoyée à 3 artisans au plus."],
          [
            "72 h pour répondre",
            "Il accepte ou refuse la demande dans les 72 h ; passé ce délai, elle expire. L'adresse et les coordonnées du client lui sont transmises dès qu'il accepte. La charte qualité lui demande aussi d'envoyer son devis dans les 72 h.",
          ],
          [
            "Ses propres clients",
            "Une demande faite depuis sa fiche ou sa carte de visite n'est envoyée qu'à lui.",
          ],
          [
            "Aucune place ne s'achète",
            "Disponibilité, puis Score MENAO, puis distance ; une place réservée à un nouvel artisan. Le classement ne dépend ni de la formule ni d'un paiement : [critères de classement](/criteres-de-classement).",
          ],
          [
            "Sa zone",
            "Un rayon autour de son adresse, ou une liste de communes. MENAO ouvre d'abord dans les Alpes-Maritimes.",
          ],
          [
            "Dossier vérifié",
            "L'équipe MENAO contrôle l'entreprise auprès de l'INSEE, puis chaque document. Aucun délai n'est promis : l'artisan suit son dossier depuis son espace pro et reçoit un e-mail dès qu'il est validé.",
          ],
          [
            "Visible des clients",
            "Pour recevoir des demandes, il faut trois choses : dossier validé, formule choisie (essai compris) et compte de paiement Stripe ouvert.",
          ],
        ],
      },
      { type: "h2", id: "parrainage", text: "Le parrainage entre artisans" },
      {
        type: "p",
        text: "Un artisan MENAO qui parraine un confrère gagne **un mois offert** au premier paiement de son filleul, 12 par an au plus. Le filleul reçoit **un cadeau de bienvenue** à la validation de son dossier : un t-shirt ou une casquette MENAO. Le parrain trouve son code et son QR code dans son espace.",
      },
      {
        type: "p",
        text: "Une inscription ne porte qu'un seul code : si l'artisan s'inscrit avec le vôtre, aucun parrain ne lui est rattaché, et il ne reçoit pas le cadeau de bienvenue.",
      },
      { type: "h2", id: "jamais-promettre", text: "Ce qu'on ne promet jamais" },
      // TODO(legal): « 72 h » et « 4 demandes par mois » (promesses affichées) chez l'avocat.
      {
        type: "list",
        items: [
          "Un nombre de demandes ou de chantiers, ni des « clients garantis ».",
          "Un délai de vérification du dossier.",
          "Une date d'ouverture ou d'essai autrement que « prévue ».",
          "Une fonction qui n'est pas encore dans MENAO, ni sa date de sortie.",
          "Un cadeau de bienvenue pour une inscription faite avec votre code : il est réservé aux artisans parrainés par un confrère.",
          "Une remise, un geste ou une offre qui n'est pas sur cette page.",
          "Un usage de l'outil avant le début de l'essai : en attente de décision.",
        ],
      },
    ],
  },
];
