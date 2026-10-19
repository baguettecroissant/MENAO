import type { Guide } from "./types";

export const devisTravauxMentionsObligatoires: Guide = {
  slug: "devis-travaux-mentions-obligatoires",
  audience: "particuliers",
  title: "Devis de travaux : les mentions obligatoires et les points à vérifier",
  metaTitle: "Devis de travaux : mentions obligatoires et points à vérifier",
  description:
    "Ce que doit contenir un devis de travaux du bâtiment, à quel moment il vous engage, la différence entre acompte et arrhes, et les points à vérifier avant de signer.",
  publishedAt: "2026-10-19",
  updatedAt: "2026-10-19",
  draft: false,
  cover: {
    alt: "Des personnes examinent un dossier posé sur une table.",
    position: "50% 0%",
  },
  essentials: [
    "Le devis est obligatoire pour les travaux et dépannages du bâtiment : maçonnerie, plomberie, électricité, peinture, couverture, serrurerie…",
    "Il doit être daté, détaillé poste par poste, avec les totaux hors taxes et toutes taxes comprises, le taux de TVA et sa durée de validité.",
    "Vous n'êtes engagé qu'en signant le devis, avec la mention « bon pour travaux » ou « bon pour accord ».",
    "Sans précision sur le devis, une somme versée d'avance est considérée comme des arrhes.",
  ],
  body: [
    { type: "h2", id: "obligatoire", text: "Quand le devis est-il obligatoire ?" },
    {
      type: "p",
      text: "Pour les travaux et les dépannages du bâtiment et de l'équipement de la maison (maçonnerie, plomberie, électricité, peinture, isolation, couverture, serrurerie, entre autres), le professionnel doit établir un devis détaillé. Sans devis, il s'expose à une amende administrative pouvant atteindre 3 000 € pour un entrepreneur individuel et 15 000 € pour une société.",
    },
    {
      type: "p",
      text: "Le devis peut être gratuit ou payant. S'il est payant, son prix doit être indiqué.",
    },
    { type: "h2", id: "mentions", text: "Les mentions obligatoires" },
    {
      type: "list",
      items: [
        "la date de rédaction du devis ;",
        "le nom et l'adresse de l'entreprise, et votre nom ;",
        "le lieu d'intervention et la nature exacte des travaux ;",
        "le détail de chaque prestation : quantités et prix des produits et de la main-d'œuvre ;",
        "le taux horaire de la main-d'œuvre et la façon dont le temps est décompté ;",
        "les frais de déplacement, s'il y en a ;",
        "le total hors taxes et toutes taxes comprises, avec le taux de TVA ;",
        "la durée de validité de l'offre ;",
        "le caractère gratuit ou payant du devis ;",
        "la possibilité pour vous de conserver les pièces ou appareils remplacés.",
      ],
    },
    {
      type: "document",
      caption: "Les mentions obligatoires, zone par zone, sur un devis",
      title: "Devis",
      zones: [
        {
          title: "L'en-tête",
          shape: "header",
          items: ["Date de rédaction", "Nom et adresse de l'entreprise", "Votre nom"],
        },
        { title: "Le chantier", items: ["Lieu d'intervention", "Nature exacte des travaux"] },
        {
          title: "Le détail",
          shape: "table",
          items: [
            "Quantités et prix des produits et de la main-d'œuvre",
            "Taux horaire et décompte du temps",
            "Frais de déplacement, s'il y en a",
          ],
        },
        { title: "Les totaux", shape: "totals", items: ["Total HT et TTC", "Taux de TVA"] },
        {
          title: "Les conditions",
          items: [
            "Durée de validité de l'offre",
            "Devis gratuit ou payant",
            "Pièces ou appareils remplacés que vous pouvez conserver",
          ],
        },
        {
          title: "Votre signature",
          shape: "signature",
          items: ["« Bon pour travaux » ou « bon pour accord » : vous n'êtes engagé qu'en signant"],
        },
      ],
    },
    {
      type: "p",
      text: "Si l'entreprise est soumise à l'assurance décennale, le devis indique aussi les coordonnées de son assureur et la zone géographique couverte, et l'attestation d'assurance y est jointe. Vérifiez aussi que le numéro SIRET de l'entreprise y figure : il vous permet de contrôler qu'elle est active (voir [nos 8 vérifications avant de signer](/guides/choisir-un-artisan)).",
    },
    { type: "h2", id: "tva", text: "Le taux de TVA et la mention de taux réduit" },
    {
      type: "p",
      text: "Pour des travaux dans un logement achevé depuis plus de 2 ans, le devis peut appliquer un taux réduit de 10 % ou de 5,5 %. Vous certifiez alors, par une mention sur le devis ou sur la facture, que les conditions sont remplies. Tout est expliqué dans [notre guide sur la TVA des travaux](/guides/tva-travaux-taux-reduit).",
    },
    { type: "h2", id: "signature", text: "Signature : quand êtes-vous engagé ?" },
    {
      type: "p",
      text: "Vous n'êtes engagé qu'en signant le devis, avec la mention « bon pour travaux » ou « bon pour accord ». Avant de signer, relisez la description des travaux, les quantités, les matériaux et les délais : ce qui n'est pas écrit sur le devis n'est pas prévu.",
    },
    // TODO(legal): préciser le droit de rétractation pour un devis signé en ligne (contrat à distance).
    {
      type: "p",
      text: "Après un démarchage à domicile, vous disposez de 14 jours pour vous rétracter, sauf pour des travaux d'urgence comme une fuite d'eau.",
    },
    { type: "h2", id: "acompte", text: "Acompte ou arrhes : ce qui change" },
    {
      type: "p",
      text: "Le devis doit préciser si la somme versée à la commande est un acompte ou des arrhes. Sans précision, elle est considérée comme des arrhes.",
    },
    {
      type: "list",
      items: [
        "**Des arrhes** permettent à chacun de renoncer : vous perdez la somme versée, ou le professionnel vous rembourse le double.",
        "**Un acompte** est un premier paiement sur le prix : il engage définitivement les deux parties.",
      ],
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "Vous recevez les devis des artisans dans votre espace, vous les comparez et vous signez en ligne. L'acompte prévu au devis, puis le solde, se paient par carte, directement à l'artisan.",
    },
  ],
  faq: [
    {
      q: "Un devis est-il obligatoire pour une petite réparation ?",
      a: "Oui pour les dépannages et réparations du bâtiment et de l'équipement de la maison : le professionnel doit établir un devis détaillé, quel que soit le montant.",
    },
    {
      q: "Combien de temps un devis est-il valable ?",
      a: "Aucune durée n'est fixée par la loi : c'est le devis qui l'indique, et cette durée de validité fait partie des mentions obligatoires.",
    },
    // TODO(legal): faire valider la réponse sur les travaux supplémentaires.
    {
      q: "Que faire si des travaux supplémentaires sont nécessaires ?",
      a: "Demandez un nouveau devis, ou un avenant au devis signé, et ne l'acceptez qu'après l'avoir lu : les travaux qui n'y figurent pas ne sont pas prévus.",
    },
    {
      q: "Quelle différence entre acompte et arrhes ?",
      a: "Avec des arrhes, chacun peut renoncer : le client perd la somme versée, ou le professionnel rembourse le double. Un acompte engage les deux parties. Sans précision sur le devis, la somme versée est considérée comme des arrhes.",
    },
  ],
  sources: [
    {
      label: "Devis obligatoire : activités concernées",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F31144",
    },
    {
      label:
        "Arrêté du 24 janvier 2017 sur la publicité des prix des prestations de dépannage, de réparation et d'entretien dans le bâtiment",
      publisher: "Légifrance",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033935513/",
    },
    {
      label: "Démarchage à domicile : règles à respecter",
      publisher: "Service Public Entreprendre",
      url: "https://entreprendre.service-public.gouv.fr/vosdroits/F23224",
    },
    {
      label: "Maçon : conditions d'accès et d'exercice en France (mentions du devis)",
      publisher: "Service Public Entreprendre",
      url: "https://entreprendre.service-public.gouv.fr/vosdroits/F39037",
    },
  ],
  related: [
    { href: "/comment-ca-marche", label: "Devis et signature en ligne sur MENAO" },
    { href: "/garanties", label: "Les garanties MENAO" },
  ],
};
