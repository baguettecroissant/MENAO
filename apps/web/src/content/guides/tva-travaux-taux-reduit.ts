import type { Guide } from "./types";

// TODO(legal): faire relire par l'expert-comptable avant publication (taux, conditions, mention).
export const tvaTravauxTauxReduit: Guide = {
  slug: "tva-travaux-taux-reduit",
  audience: "particuliers",
  title: "TVA à 5,5 % ou 10 % sur vos travaux : conditions et mention à signer",
  metaTitle: "TVA à 5,5 % ou 10 % sur les travaux : conditions et mention",
  description:
    "Travaux dans un logement de plus de 2 ans : quand s'appliquent les taux de TVA de 10 % et 5,5 %, ce qui reste à 20 %, et la mention à certifier sur le devis depuis le 1er mars 2025.",
  publishedAt: "2026-10-18",
  updatedAt: "2026-10-18",
  draft: true,
  essentials: [
    "10 % pour les travaux d'amélioration, de transformation, d'aménagement et d'entretien d'un logement achevé depuis plus de 2 ans.",
    "5,5 % pour les travaux de rénovation énergétique : isolation, chauffage aux énergies renouvelables, ventilation double flux…",
    "20 % pour la construction neuve, les travaux qui reviennent à refaire du neuf, et les équipements que vous achetez vous-même.",
    "Depuis le 1er mars 2025, plus d'attestation à remplir : vous certifiez les conditions par une mention sur le devis ou la facture.",
  ],
  body: [
    { type: "h2", id: "taux", text: "Quel taux pour quels travaux ?" },
    {
      type: "table",
      caption: "Taux de TVA des travaux dans un logement",
      head: ["Taux", "Travaux concernés"],
      rows: [
        [
          "10 %",
          "Amélioration, transformation, aménagement et entretien du logement, main-d'œuvre et matériaux fournis par l'entreprise compris, ainsi que certains équipements intégrés au bâti (cuisine, salle de bains, rangements, portes et fenêtres)",
        ],
        [
          "5,5 %",
          "Rénovation énergétique : isolation thermique, équipements de chauffage ou d'eau chaude utilisant une énergie renouvelable, ventilation double flux, régulation et individualisation des frais de chauffage…",
        ],
        [
          "20 %",
          "Construction neuve, travaux qui reviennent à produire un immeuble neuf, chaudières pouvant utiliser des combustibles fossiles (depuis le 1er mars 2025), équipements achetés directement par le client",
        ],
      ],
    },
    {
      type: "p",
      text: "L'entretien d'une chaudière reste au taux de 10 %, même lorsque sa fourniture et son installation relèvent désormais du taux de 20 %.",
    },
    { type: "h2", id: "conditions", text: "Les conditions à remplir" },
    {
      type: "list",
      items: [
        "Le logement est à usage d'habitation, résidence principale ou secondaire, occupé par son propriétaire, un locataire ou à titre gratuit.",
        "Il est achevé depuis plus de 2 ans.",
        "Les travaux sont facturés par l'entreprise. Un équipement que vous achetez vous-même reste à 20 % : seule sa pose par l'artisan bénéficie du taux réduit.",
      ],
    },
    { type: "h2", id: "neuf", text: "Quand les travaux reviennent à faire du neuf" },
    {
      type: "p",
      text: "Le taux réduit ne s'applique pas aux travaux qui, sur une période de 2 ans au plus, aboutissent à :",
    },
    {
      type: "list",
      items: [
        "une surélévation du bâtiment ;",
        "la remise à neuf de plus de la moitié du gros œuvre, ou de plus des deux tiers de certains éléments de second œuvre ;",
        "une augmentation de la surface de plancher de plus de 10 %.",
      ],
    },
    { type: "h2", id: "mention", text: "La mention à certifier sur le devis" },
    {
      type: "p",
      text: "Depuis le 1er mars 2025, vous n'avez plus d'attestation à remplir. Vous certifiez, par une **mention sur le devis ou sur la facture**, que les conditions du taux réduit sont remplies : logement affecté à l'habitation et achevé depuis plus de 2 ans, travaux qui ne reviennent pas à produire du neuf et, pour le taux de 5,5 %, travaux de rénovation énergétique. Vous et l'entreprise en conservez chacun un exemplaire.",
    },
    {
      type: "p",
      text: "Pour des travaux d'entretien ou de réparation de moins de 1 000 € TTC, cette mention n'est pas exigée. Le devis ou la facture doit tout de même indiquer votre nom et votre adresse, l'adresse du logement, la nature des travaux, et que le logement est achevé depuis plus de 2 ans.",
    },
    {
      type: "callout",
      tone: "warning",
      title: "À savoir",
      text: "Si la mention est inexacte de votre fait, vous pouvez être tenu de payer le complément de TVA, solidairement avec l'entreprise. Conservez le devis et la facture jusqu'au 31 décembre de la cinquième année qui suit la facturation.",
    },
  ],
  faq: [
    {
      q: "Le taux réduit s'applique-t-il dans un logement neuf ?",
      a: "Non : le logement doit être achevé depuis plus de 2 ans. Avant, c'est le taux normal de 20 % qui s'applique.",
    },
    {
      q: "Puis-je acheter le matériel moi-même et bénéficier du taux réduit ?",
      a: "Le matériel que vous achetez vous-même reste à 20 %. Seule la main-d'œuvre de l'artisan pour la pose bénéficie du taux réduit.",
    },
    {
      q: "Faut-il encore remplir une attestation de TVA (formulaire 1301-SD) ?",
      a: "Non. Depuis le 1er mars 2025, l'attestation n'est plus requise : une mention sur le devis ou sur la facture, par laquelle vous certifiez les conditions, la remplace.",
    },
    {
      q: "Une résidence secondaire est-elle concernée ?",
      a: "Oui. Le taux réduit concerne les logements d'habitation, résidence principale ou secondaire, achevés depuis plus de 2 ans.",
    },
  ],
  sources: [
    {
      label: "Quel taux de TVA appliquer pour les travaux réalisés dans les logements ?",
      publisher: "impots.gouv.fr",
      url: "https://www.impots.gouv.fr/professionnel/questions/quel-taux-de-tva-appliquer-pour-les-travaux-realises-dans-les-logements",
    },
    {
      label:
        "BOI-TVA-LIQ-30-20-90-40 : travaux dans les logements achevés depuis plus de deux ans, modalités d'application",
      publisher: "BOFiP",
      url: "https://bofip.impots.gouv.fr/bofip/1742-PGP.html/identifiant=BOI-TVA-LIQ-30-20-90-40-20251022",
    },
  ],
  related: [
    { href: "/guides/devis-travaux-mentions-obligatoires", label: "Les mentions d'un devis" },
    { href: "/recherche", label: "Décrire votre projet sur MENAO" },
  ],
};
