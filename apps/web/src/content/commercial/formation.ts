import type { FormationModule } from "@menao/core";

/**
 * Formation des conseillers (F-194, lot 83, ADR 0394) : 5 modules courts, chacun une leçon tirée du
 * guide terrain (rien de plus que ce que dit le guide) et un quiz de 5 questions. Les bonnes
 * réponses ne quittent jamais le serveur : la page envoie au navigateur les questions seules.
 * Dans les textes, `**texte**` met en gras.
 */
export type FormationQuestion = {
  question: string;
  choices: readonly string[];
  /** Index de la bonne réponse dans `choices`. */
  answer: number;
  explanation: string;
};

export type FormationContent = {
  key: FormationModule;
  title: string;
  minutes: number;
  /** Rubrique du guide terrain qui va plus loin. */
  guideSlug: string;
  lesson: readonly string[];
  questions: readonly FormationQuestion[];
};

export const COMMERCIAL_FORMATION: readonly FormationContent[] = [
  {
    key: "menao",
    title: "MENAO en 10 minutes",
    minutes: 10,
    guideSlug: "offre",
    lesson: [
      "MENAO met en relation les particuliers et les artisans du bâtiment, d'abord dans les Alpes-Maritimes, et donne à l'artisan l'outil pour faire son devis, le faire signer et être payé.",
      "Chaque demande est envoyée à **3 artisans au plus**. Une demande faite depuis la fiche ou la carte de visite d'un artisan n'est envoyée **qu'à lui**.",
      "**Ni commission ni marge** sur ses chantiers, aucun contact acheté à l'unité : ses clients le paient directement, sur son compte Stripe.",
      "Le classement : disponibilité, puis Score MENAO, puis distance, avec une place réservée à un nouvel artisan. Il ne dépend **ni de la formule ni d'un paiement**.",
      "Pour recevoir des demandes, il faut trois choses : dossier validé, formule choisie (essai compris) et compte de paiement Stripe ouvert.",
    ],
    questions: [
      {
        question: "À combien d'artisans au plus une demande est-elle envoyée ?",
        choices: ["Un seul", "3 au plus", "5 au plus", "Tous les artisans de la zone"],
        answer: 1,
        explanation:
          "3 artisans au plus. Et une demande faite depuis la fiche d'un artisan ne va qu'à lui.",
      },
      {
        question: "Que prend MENAO sur les chantiers de l'artisan ?",
        choices: [
          "Une commission de 10 %",
          "Rien : seul l'abonnement est payé, à prix fixe",
          "Des frais pour chaque contact transmis",
        ],
        answer: 1,
        explanation:
          "Ni commission ni marge : ses clients le paient directement, sur son compte Stripe.",
      },
      {
        question:
          "Un client envoie sa demande depuis la carte de visite de l'artisan. Qui la reçoit ?",
        choices: ["L'artisan seul", "3 artisans de la zone", "L'équipe MENAO, qui choisit"],
        answer: 0,
        explanation:
          "Une demande faite depuis sa fiche ou sa carte de visite n'est envoyée qu'à lui.",
      },
      {
        question: "Une formule plus chère fait-elle passer l'artisan devant les autres ?",
        choices: [
          "Oui, Ultimate passe en premier",
          "Non : disponibilité, Score MENAO puis distance",
          "Oui, mais seulement en Premium",
        ],
        answer: 1,
        explanation: "Le classement ne dépend ni de la formule ni d'un paiement.",
      },
      {
        question: "Que faut-il à un artisan pour recevoir des demandes ?",
        choices: [
          "S'être inscrit, rien de plus",
          "Dossier validé, formule choisie et compte Stripe ouvert",
          "Avoir payé une première mensualité",
        ],
        answer: 1,
        explanation:
          "Les trois à la fois : dossier validé, formule choisie (essai compris), Stripe ouvert.",
      },
    ],
  },
  {
    key: "parcours",
    title: "Le parcours de l'artisan",
    minutes: 8,
    guideSlug: "parcours",
    lesson: [
      "Le chemin : le premier contact, la démo dans l'espace d'exemples, l'inscription accompagnée **avec votre code**, la vérification par l'équipe, la fiche complète, puis l'essai.",
      "**Votre code** se saisit à l'étape « Créez votre compte » (« J'ai un code ») ; votre QR code ou votre lien l'apportent tout seuls. Sans code, l'inscription ne vous est pas rattachée, et le code ne s'ajoute pas après.",
      "Les documents : Kbis ou extrait de **moins de 3 mois**, décennale en cours de validité (sauf métiers non soumis), RC Pro en cours, pièce d'identité du dirigeant, attestation Urssaf de **moins de 6 mois**.",
      "Dossier incomplet : MENAO envoie des rappels automatiques les premiers jours, et vous rappelez l'artisan **environ une semaine après** l'inscription.",
      "Aucun délai de vérification n'est promis : l'artisan reçoit un e-mail dès que son dossier est validé.",
    ],
    questions: [
      {
        question: "L'artisan a créé son compte sans votre code. Que se passe-t-il ?",
        choices: [
          "Vous ajoutez votre code ensuite dans son espace",
          "L'inscription ne vous est pas rattachée : le code ne s'ajoute pas après",
          "L'équipe la rattache automatiquement à vous",
        ],
        answer: 1,
        explanation:
          "C'est pourquoi on vérifie le code pendant l'inscription, ou qu'on passe par votre QR code ou votre lien.",
      },
      {
        question: "Quelle attestation de vigilance Urssaf est acceptée ?",
        choices: ["Moins de 6 mois", "Moins d'un an", "N'importe laquelle"],
        answer: 0,
        explanation:
          "Une attestation Urssaf de plus de 6 mois fait partie des motifs de refus à éviter.",
      },
      {
        question: "Le Kbis ou l'extrait doit dater de…",
        choices: ["Moins de 3 mois", "Moins d'un an", "Peu importe la date"],
        answer: 0,
        explanation: "Moins de 3 mois : un Kbis plus ancien est refusé.",
      },
      {
        question: "Le dossier reste incomplet. Quand rappelez-vous l'artisan ?",
        choices: [
          "Le soir même",
          "Environ une semaine après l'inscription",
          "Jamais : MENAO s'en charge",
        ],
        answer: 1,
        explanation:
          "MENAO envoie des rappels automatiques les premiers jours ; vous appelez environ une semaine après.",
      },
      {
        question: "L'artisan demande combien de temps prend la vérification.",
        choices: [
          "48 heures, c'est garanti",
          "Aucun délai n'est promis : il est prévenu par e-mail dès que c'est validé",
          "Une semaine exactement",
        ],
        answer: 1,
        explanation: "On ne promet jamais de délai de vérification.",
      },
    ],
  },
  {
    key: "objections",
    title: "Répondre aux objections",
    minutes: 8,
    guideSlug: "objections",
    lesson: [
      "Écoutez l'objection **jusqu'au bout**, répondez en une phrase, puis montrez la preuve sur votre téléphone.",
      "« C'est trop cher » : comparez à une commission (exemple : 15 % sur un chantier de 8 000 €, c'est 1 200 €) et faites le calcul avec lui dans « Montrer à l'artisan ». Vous ne négociez jamais le prix.",
      "« Et si je ne reçois rien ? » : personne ne peut promettre un nombre de demandes ; pendant les 2 mois d'essai, il peut arrêter sans rien payer.",
      "« Encore une plateforme qui revend mes contacts » : ici, rien n'est revendu ; abonnement fixe, 3 artisans au plus par demande.",
      "Ne citez **aucun concurrent** par son nom. Si la réponse n'est pas dans le guide, ne l'inventez pas : notez la question et rappelez l'artisan avec la bonne réponse.",
    ],
    questions: [
      {
        question:
          "Un plombier vous dit : « 150 € par mois, c'est trop cher. » Que répondez-vous en premier ?",
        choices: [
          "« On peut vous faire un prix si vous signez aujourd'hui. »",
          "« Combien vous rapporte un chantier moyen ? Faisons le calcul ensemble sur mon téléphone. »",
          "« Les autres plateformes sont bien plus chères. »",
        ],
        answer: 1,
        explanation:
          "On ne négocie pas le prix et on ne dénigre personne : on montre le calcul, dans « Montrer à l'artisan ».",
      },
      {
        question: "« Combien de demandes je vais recevoir ? »",
        choices: [
          "« Au moins 4 par mois. »",
          "« Personne ne peut le promettre. Pendant l'essai, vous pouvez arrêter sans rien payer. »",
          "« Autant que les autres artisans. »",
        ],
        answer: 1,
        explanation: "Ne promettez jamais un nombre de demandes, même comme un objectif.",
      },
      {
        question: "Pouvez-vous citer un concurrent par son nom pour comparer ?",
        choices: [
          "Oui, s'il est moins bien",
          "Non : on compare un abonnement fixe à une commission, sans nommer personne",
          "Oui, mais seulement à l'oral",
        ],
        answer: 1,
        explanation: "L'exemple de commission reste un simple calcul.",
      },
      {
        question: "L'artisan pose une question dont la réponse n'est pas dans le guide.",
        choices: [
          "Vous répondez au mieux pour ne pas perdre la vente",
          "Vous notez la question et le rappelez avec la bonne réponse",
          "Vous dites que c'est prévu pour bientôt",
        ],
        answer: 1,
        explanation: "On n'invente jamais une réponse, ni une fonction à venir.",
      },
      {
        question: "« Encore une plateforme qui revend mes contacts. »",
        choices: [
          "« Ici, rien n'est revendu : abonnement fixe, 3 artisans au plus par demande. »",
          "« On en revend très peu. »",
          "« Seulement aux meilleurs artisans. »",
        ],
        answer: 0,
        explanation: "Et les demandes de ses propres clients n'arrivent qu'à lui.",
      },
    ],
  },
  {
    key: "offre",
    title: "L'offre et les formules",
    minutes: 6,
    guideSlug: "offre",
    lesson: [
      "**Base 150 € HT par mois, Premium 350 € HT, Ultimate 950 € HT.** Payée d'avance, 2 mois offerts : 1 500 €, 3 500 € ou 9 500 € HT par an.",
      "**2 mois d'essai gratuits** : aucun prélèvement avant la fin de l'essai, et l'artisan peut arrêter à tout moment pendant l'essai, sans rien payer.",
      "Ensuite, un an à partir du premier paiement, renouvelé chaque année. L'artisan arrête au plus tard **3 mois avant l'échéance** ; pas d'arrêt en cours d'année.",
      "La formule se choisit et se paie **sur le site**, depuis l'espace pro : rien ne s'achète dans l'application. Vous ne saisissez jamais sa carte et ne lui faites rien signer.",
      "Ne promettez aucune fonction qui n'est pas encore dans MENAO, ni une remise, un geste ou une offre qui n'est pas dans le guide.",
    ],
    questions: [
      {
        question: "Quel est le prix de la formule Premium ?",
        choices: ["150 € HT par mois", "350 € HT par mois", "950 € HT par mois"],
        answer: 1,
        explanation: "Base 150 €, Premium 350 €, Ultimate 950 € HT par mois.",
      },
      {
        question: "Pendant l'essai, l'artisan peut-il arrêter ?",
        choices: [
          "Oui, à tout moment, sans rien payer",
          "Non, il est engagé pour un an",
          "Oui, avec des frais d'arrêt",
        ],
        answer: 0,
        explanation: "Aucun prélèvement avant la fin de l'essai.",
      },
      {
        question: "Où l'artisan choisit-il et paie-t-il sa formule ?",
        choices: [
          "Dans l'application MENAO",
          "Sur le site, depuis son espace pro",
          "Auprès de vous, sur votre téléphone",
        ],
        answer: 1,
        explanation: "Rien ne s'achète dans l'application, et vous ne saisissez jamais sa carte.",
      },
      {
        question: "Un artisan hésite. Pouvez-vous lui offrir un mois pour le décider ?",
        choices: [
          "Oui, s'il s'inscrit aujourd'hui",
          "Non : aucune remise ni offre qui n'est pas dans le guide",
          "Oui, avec l'accord oral de l'équipe",
        ],
        answer: 1,
        explanation: "Vous n'avez pas le pouvoir de changer les prix ni les conditions.",
      },
      {
        question: "Après l'essai, combien de temps dure l'abonnement ?",
        choices: [
          "Il est sans engagement",
          "Un an, renouvelé, à arrêter au plus tard 3 mois avant l'échéance",
          "6 mois",
        ],
        answer: 1,
        explanation: "Montrez-lui la case d'engagement et la date limite pour arrêter.",
      },
    ],
  },
  {
    key: "regles",
    title: "Les règles à respecter",
    minutes: 7,
    guideSlug: "regles",
    lesson: [
      "**Ne jamais promettre un nombre de chantiers ni de demandes**, même comme un objectif.",
      "La démo se fait toujours dans **l'espace d'exemples** : jamais les données d'un vrai client.",
      "Présentez-vous dès le début : votre prénom, MENAO, l'objet. Au premier refus d'être recontacté : « ne plus contacter » dans le suivi, **immédiatement**.",
      "**Aucun appel de prospection vers un particulier** : c'est interdit sans son accord préalable. Par prudence, les appels aux artisans restent en semaine, de 10 h à 13 h et de 14 h à 20 h.",
      "Aucune distribution dans la rue sans l'accord de la mairie : le prospectus se remet **en main propre**, après une conversation.",
    ],
    questions: [
      {
        question: "Un artisan vous dit : « Ne me rappelez plus. »",
        choices: [
          "Vous le rappelez dans un mois",
          "Vous le passez en « ne plus contacter » tout de suite",
          "Vous lui envoyez plutôt un SMS",
        ],
        answer: 1,
        explanation: "Plus aucun appel, SMS ni visite de prospection après un refus.",
      },
      {
        question: "Pour la démo, que montrez-vous ?",
        choices: [
          "L'espace d'exemples, avec des données fictives",
          "La fiche d'un vrai artisan inscrit",
          "Votre propre compte",
        ],
        answer: 0,
        explanation: "Jamais les données d'un vrai client.",
      },
      {
        question: "Pouvez-vous dire « 4 demandes par mois garanties » ?",
        choices: ["Oui, si vous êtes prudent", "Non, jamais", "Seulement par écrit"],
        answer: 1,
        explanation: "MENAO ne garantit aucun nombre de demandes.",
      },
      {
        question: "Pouvez-vous appeler un particulier pour lui présenter MENAO ?",
        choices: [
          "Oui, en semaine",
          "Non : c'est interdit sans son accord préalable",
          "Oui, le samedi matin",
        ],
        answer: 1,
        explanation: "La prospection se fait auprès des professionnels.",
      },
      {
        question: "Comment se distribue le prospectus ?",
        choices: [
          "Dans la rue, à la sortie des négoces",
          "En main propre, après une conversation",
          "Dans les boîtes aux lettres",
        ],
        answer: 1,
        explanation: "Aucune distribution dans la rue sans l'accord de la mairie.",
      },
    ],
  },
];

export function formationModule(key: string): FormationContent | null {
  return COMMERCIAL_FORMATION.find((m) => m.key === key) ?? null;
}
