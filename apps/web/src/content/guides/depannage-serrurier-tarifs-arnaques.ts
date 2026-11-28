import type { Guide } from "./types";

/*
 * Guide « prix des travaux » (lot du 9 novembre 2026). Règle : aucune fourchette de prix sans
 * source fiable et datée. Pour l'ouverture de porte ou le changement de cylindre, ni la DGCCRF, ni
 * l'INC, ni Service Public n'en publient (recherche du 10/11/2026) : le guide n'avance aucun montant.
 *
 * TODO(legal): faire relire avant publication :
 * - seuil de la note : « au-delà de 25 € TTC » (DGCCRF, Service Public) ou « à partir de 25 € » (INC) ;
 * - portée de l'exception d'urgence (L221-28, 8° et L221-10, 4°) : ne pas trancher au cas par cas
 *   (par exemple, changer le cylindre après une porte claquée est-il « strictement nécessaire » ?) ;
 * - qui paie une porte claquée ou une serrure cassée en location : seule la clé perdue est tranchée.
 */
export const depannageSerrurierTarifsArnaques: Guide = {
  slug: "depannage-serrurier-tarifs-arnaques",
  audience: "particuliers",
  title: "Dépannage serrurier : tarifs et arnaques à éviter",
  metaTitle: "Dépannage serrurier : tarifs, devis et arnaques à éviter",
  description:
    "Porte claquée, clé perdue, serrure cassée : ce que le serrurier doit vous dire avant de venir, le devis dès le premier euro, vos droits en urgence et les arnaques relevées par la DGCCRF.",
  publishedAt: "2026-11-10",
  updatedAt: "2026-11-10",
  draft: true,
  essentials: [
    "Les prix sont libres, mais le serrurier doit vous communiquer son taux horaire TTC, ses frais de déplacement et le prix du devis avant de se déplacer.",
    "Un devis détaillé est obligatoire dès le premier euro, même en urgence, avant toute intervention.",
    "En urgence, pas de droit de rétractation et paiement immédiat possible, mais seulement pour les pièces et travaux strictement nécessaires. Le reste peut attendre.",
    "Les contrôles de la DGCCRF trouvent des anomalies chez environ 64 % des professionnels du dépannage à domicile. Évitez les prospectus et les numéros trouvés au hasard.",
  ],
  body: [
    { type: "h2", id: "prix", text: "Combien coûte un serrurier ?" },
    {
      type: "p",
      text: "Dans le dépannage, les prix sont libres, et aucun organisme public ne publie de tarif de référence pour une ouverture de porte ou un changement de cylindre. Les montants affichés en ligne viennent de sites commerciaux : nous ne les reprenons pas.",
    },
    {
      type: "p",
      text: "En revanche, la loi oblige le serrurier à vous dire comment il calcule son prix **avant de conclure** : son ou ses taux horaires de main-d'œuvre TTC, la façon dont il décompte le temps, le prix TTC de ses forfaits s'il en a, ses frais de déplacement, et si le devis est gratuit ou payant. Exigez ces informations au téléphone, avant qu'il se déplace.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Le bon réflexe",
      text: "Demandez le prix total estimé au téléphone, déplacement compris, et notez-le. Si le professionnel refuse de répondre ou reste vague, appelez-en un autre.",
    },
    { type: "h2", id: "devis", text: "Le devis, dès le premier euro" },
    {
      type: "p",
      text: "Depuis le 1er avril 2017, le professionnel du dépannage doit vous remettre un **devis détaillé avant toute intervention**, quel que soit le montant. L'ancien seuil de 150 € n'existe plus, et l'urgence ne dispense plus du devis. Le devis indique notamment :",
    },
    {
      type: "list",
      items: [
        "la date, le nom et l'adresse de l'entreprise, votre nom et le lieu de l'intervention ;",
        "la nature exacte des réparations à faire ;",
        "le décompte détaillé : taux horaire et temps estimé ou forfait, pièces avec leur prix unitaire, frais de déplacement ;",
        "le total HT et TTC, avec le taux de TVA ;",
        "sa durée de validité, et s'il est gratuit ou payant.",
      ],
    },
    {
      type: "p",
      text: "Vous pouvez conserver les pièces remplacées. Sans devis, le professionnel risque une amende administrative jusqu'à 3 000 € (entrepreneur individuel) ou 15 000 € (société). Pour le reste des mentions, voir notre guide sur le [devis de travaux](/guides/devis-travaux-mentions-obligatoires).",
    },
    {
      type: "flow",
      caption: "Les étapes d'un dépannage sans mauvaise surprise",
      rows: [
        {
          label: "Au téléphone",
          steps: [
            "Taux horaire TTC et déplacement",
            "Devis gratuit ou payant",
            "Prix total estimé",
          ],
        },
        {
          label: "Sur place",
          steps: [
            "Devis détaillé lu, puis signé",
            "Seulement les travaux urgents",
            "Pièces remplacées gardées",
          ],
        },
        {
          label: "Avant de payer",
          steps: ["Note détaillée remise", "Montant vérifié sur le terminal", "Paiement traçable"],
        },
      ],
    },
    { type: "h2", id: "urgence", text: "En urgence : ce que vous pouvez refuser" },
    {
      type: "p",
      text: "Quand vous faites venir un professionnel chez vous, vous disposez en principe de **14 jours pour vous rétracter**, et il ne peut pas être payé avant 7 jours. Il existe une exception pour les travaux d'entretien ou de réparation **urgents**, faits à votre domicile et expressément demandés par vous : pas de rétractation, et paiement immédiat possible.",
    },
    {
      type: "p",
      text: "Mais cette exception est limitée aux **pièces et travaux strictement nécessaires** pour répondre à l'urgence. Le remplacement ou l'installation de matériel sans rapport avec la panne reste soumis au droit de rétractation de 14 jours. Le professionnel doit vous informer que vous ne bénéficiez pas du droit de rétractation pour l'intervention d'urgence.",
    },
    {
      type: "callout",
      tone: "warning",
      title: "Refusez ce qui peut attendre",
      text: "On vous propose de changer toute la serrure, d'installer une porte blindée ou un verrou supplémentaire ? Ne vous décidez pas sur place : pour ces travaux en plus de l'urgence, prenez le temps de réfléchir et de comparer.",
    },
    { type: "h2", id: "arnaques", text: "Les arnaques relevées par la DGCCRF" },
    {
      type: "p",
      text: "Lors de son enquête de 2023 sur le dépannage à domicile, la DGCCRF a contrôlé 548 professionnels : 350 étaient en anomalie, soit 64 %. La serrurerie est l'un des secteurs qui suscitent le plus de plaintes. Les pratiques les plus souvent relevées :",
    },
    {
      type: "list",
      items: [
        "**Les prospectus faussement officiels**, glissés dans les boîtes aux lettres ou collés dans les halls : couleurs, logo de la Marianne, symboles de la mairie, drapeau, faux label, fausse implantation locale.",
        "**Les annonces sponsorisées et les faux annuaires** qui renvoient vers des numéros surtaxés (commençant par 081, 082 ou 089, ou numéros courts).",
        "**Les prix facturés très au-dessus des prix annoncés**, et l'absence d'informations avant l'intervention.",
        "**La pression** : discours alarmiste sur la panne, exigence de paiement immédiat.",
        "**Le paiement par carte débité plusieurs fois**, ou du double de la somme prévue.",
        "**Un numéro SIRET** emprunté à une autre société ou à un établissement fermé.",
      ],
    },
    {
      type: "p",
      text: "La DGCCRF conseille aussi de se méfier des entreprises qui affichent « tous types de travaux » et une disponibilité 7 j/7, 24 h/24, et de vérifier l'immatriculation de l'entreprise avant toute intervention. Notre guide [choisir un artisan](/guides/choisir-un-artisan) explique comment faire.",
    },
    { type: "h2", id: "payer", text: "Au moment de payer" },
    {
      type: "list",
      items: [
        "Le professionnel doit vous remettre une **note détaillée** dès la fin de l'intervention et avant le paiement. Elle est obligatoire au-delà de 25 € TTC, et due sur simple demande en dessous.",
        "Comparez-la au devis signé avant de payer.",
        "Par carte, vérifiez le montant affiché sur le terminal avant de valider.",
        "En espèces, un paiement d'un particulier à un professionnel est limité à 1 000 €. Ne payez jamais sans facture.",
      ],
    },
    { type: "h2", id: "qui-paie", text: "Locataire, assurance : qui paie ?" },
    {
      type: "p",
      text: "**En location**, refaire une clé perdue ou abîmée et remplacer les petites pièces d'une serrure sont des réparations locatives, à la charge du locataire. Les réparations dues à la vétusté ou à un vice de construction reviennent au propriétaire.",
    },
    {
      type: "p",
      text: "**Votre assurance habitation** peut comprendre une garantie d'assistance ou de dépannage d'urgence, avec des plafonds et des franchises. Appelez votre assureur avant le serrurier : il peut vous orienter vers un professionnel. N'acceptez pas des travaux au seul motif que « l'assurance paiera ».",
    },
    {
      type: "p",
      text: "**Après un cambriolage**, appelez le 17 et ne touchez à rien. Déclarez le sinistre à votre assureur dans les 2 jours ouvrés. Seules les mesures d'urgence pour sécuriser le logement peuvent être faites sans son accord. Gardez le récépissé de plainte, des photos et les devis.",
    },
    { type: "h2", id: "prevenir", text: "Avant d'en avoir besoin" },
    {
      type: "list",
      items: [
        "Confiez un double de vos clés à un voisin ou à un proche.",
        "Notez dès maintenant le numéro d'un serrurier vérifié, recommandé par votre entourage, votre assureur ou votre syndic.",
        "Jetez les prospectus d'urgence faussement officiels.",
        "Porte claquée en pleine nuit : une solution provisoire, comme dormir chez un proche, peut coûter moins cher qu'une intervention de nuit.",
      ],
    },
    { type: "h2", id: "recours", text: "En cas d'abus : vos recours" },
    {
      type: "list",
      ordered: true,
      items: [
        "Une réclamation écrite à l'entreprise, en gardant une copie.",
        "Un signalement sur [SignalConso](https://signal.conso.gouv.fr), le service gratuit de la DGCCRF : l'entreprise est prévenue et le signalement alimente les contrôles.",
        "Le médiateur de la consommation désigné par l'entreprise, gratuit pour vous, dans l'année qui suit votre réclamation écrite.",
        "Le conciliateur de justice, puis le tribunal.",
        "Une plainte au commissariat, à la gendarmerie ou auprès du procureur en cas de pratique trompeuse, agressive ou d'abus de faiblesse.",
      ],
    },
    {
      type: "h2",
      id: "trouver",
      text: "Trouver un serrurier vérifié dans les Alpes-Maritimes",
    },
    {
      type: "p",
      text: "Sur MENAO, les [serruriers](/serrurier) sont vérifiés avant d'être visibles. Repérez dès aujourd'hui celui qui intervient près de chez vous, pour ne pas chercher au hasard le jour où vous en aurez besoin.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "Avant de rendre un artisan visible, l'équipe MENAO contrôle son entreprise auprès de l'INSEE, puis ses documents un par un : Kbis, attestations d'assurance, pièce d'identité du dirigeant et attestation de vigilance URSSAF.",
    },
  ],
  faq: [
    {
      q: "Combien coûte l'ouverture d'une porte claquée ?",
      a: "Les prix sont libres et aucun barème officiel n'existe. Le serrurier doit vous indiquer avant de se déplacer son taux horaire TTC, ses frais de déplacement et le prix du devis. Demandez le prix total estimé au téléphone.",
    },
    {
      q: "Un serrurier doit-il faire un devis en urgence ?",
      a: "Oui. Depuis le 1er avril 2017, le devis détaillé est obligatoire avant toute intervention de dépannage, dès le premier euro, y compris en urgence.",
    },
    {
      q: "Peut-on se rétracter après l'intervention d'un serrurier ?",
      a: "Pas pour une intervention urgente demandée par vous, dans la limite des pièces et travaux strictement nécessaires. Pour du matériel ou des travaux sans rapport avec l'urgence, vous disposez de 14 jours pour vous rétracter.",
    },
    {
      q: "Qui paie le serrurier quand on est locataire ?",
      a: "Refaire une clé perdue ou abîmée et remplacer les petites pièces d'une serrure sont à la charge du locataire. Les réparations dues à la vétusté ou à un vice de construction reviennent au propriétaire.",
    },
    {
      q: "Comment signaler un serrurier abusif ?",
      a: "Sur SignalConso, le service gratuit de la DGCCRF. Vous pouvez aussi saisir le médiateur de la consommation de l'entreprise après une réclamation écrite, et porter plainte en cas de pratique trompeuse ou d'abus de faiblesse.",
    },
  ],
  sources: [
    {
      label:
        "Arrêté du 24 janvier 2017 relatif à l'information des consommateurs sur les prestations de dépannage",
      publisher: "Légifrance",
      url: "https://www.legifrance.gouv.fr/jorf/id/JORFSCTA000033935539",
    },
    {
      label: "Plomberie, serrurerie, chauffage… choisir le bon professionnel pour un dépannage",
      publisher: "DGCCRF",
      url: "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile",
    },
    {
      label: "Dépannage à domicile : gare aux arnaques",
      publisher: "DGCCRF",
      url: "https://www.economie.gouv.fr/dgccrf/laction-de-la-dgccrf/les-enquetes/depannage-domicile-gare-aux-arnaques",
    },
    {
      label: "Dépannage à domicile",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F38350",
    },
    {
      label: "Code de la consommation, article L221-28 (exceptions au droit de rétractation)",
      publisher: "Légifrance",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563170",
    },
    {
      label: "Achat à distance : droit de rétractation du consommateur",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10485",
    },
    {
      label: "Décret n° 87-712 du 26 août 1987 relatif aux réparations locatives",
      publisher: "Légifrance",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006491868",
    },
    {
      label:
        "Entretien et réparations locatives à la charge du locataire ou du propriétaire bailleur",
      publisher: "ANIL",
      url: "https://www.anil.org/parole-expert-logement-locataire-qui-paie-les-reparations/",
    },
    {
      label: "Assurance habitation et vol : conditions de prise en charge",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2028",
    },
    {
      label: "Paiement en espèces",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10999",
    },
    {
      label: "La médiation de la consommation : ce que vous devez savoir",
      publisher: "DGCCRF",
      url: "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/la-mediation-de-la-consommation-ce-que-vous-devez-savoir",
    },
    {
      label: "Comment ça marche ?",
      publisher: "SignalConso",
      url: "https://signal.conso.gouv.fr/fr/comment-ca-marche",
    },
  ],
  related: [
    { href: "/guides/choisir-un-artisan", label: "Choisir un artisan : 8 vérifications" },
    {
      href: "/guides/devis-travaux-mentions-obligatoires",
      label: "Devis de travaux : les mentions obligatoires",
    },
  ],
};
