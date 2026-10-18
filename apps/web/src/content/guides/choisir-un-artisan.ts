import type { Guide } from "./types";

export const choisirUnArtisan: Guide = {
  slug: "choisir-un-artisan",
  audience: "particuliers",
  title: "Comment choisir un artisan du bâtiment : 8 vérifications avant de signer",
  metaTitle: "Choisir un artisan du bâtiment : 8 vérifications avant de signer",
  description:
    "Numéro SIRET, assurance décennale, devis détaillé, avis, acompte, paiement : les vérifications à faire avant de confier vos travaux à un artisan, avec les sources officielles.",
  publishedAt: "2026-10-18",
  updatedAt: "2026-10-18",
  draft: true,
  essentials: [
    "Vérifiez que l'entreprise existe et qu'elle est active grâce à son numéro SIRET, sur l'Annuaire des Entreprises, le service officiel et gratuit de l'État.",
    "Demandez l'attestation d'assurance décennale : elle doit être jointe au devis et couvrir l'activité qui correspond à vos travaux.",
    "Comparez plusieurs devis détaillés, et ne signez qu'un devis complet, daté et chiffré poste par poste.",
    "Pour une aide à la rénovation énergétique comme MaPrimeRénov', l'entreprise doit être RGE pour les travaux concernés.",
    "Payez de façon traçable : en espèces, un paiement d'un particulier à un professionnel est limité à 1 000 €.",
  ],
  body: [
    { type: "h2", id: "entreprise", text: "1. Vérifier que l'entreprise existe vraiment" },
    {
      type: "p",
      text: "Demandez le numéro SIRET de l'entreprise (14 chiffres). Saisissez-le, ou le nom de l'entreprise, sur l'[Annuaire des Entreprises](https://annuaire-entreprises.data.gouv.fr), le service officiel et gratuit de l'État : vous y verrez si l'entreprise est active, son activité déclarée, sa date de création et ses dirigeants.",
    },
    {
      type: "p",
      text: "Un artisan qui ne peut pas vous donner de numéro SIRET, ou dont l'entreprise apparaît comme fermée, ne doit pas réaliser vos travaux.",
    },
    { type: "h2", id: "assurances", text: "2. Contrôler l'assurance décennale et la RC Pro" },
    {
      type: "p",
      text: "Pour les travaux qui touchent à la solidité ou à l'usage du bâtiment, l'artisan doit être couvert par une **assurance de responsabilité décennale** avant d'ouvrir le chantier. Il doit joindre l'attestation à ses devis et à ses factures, et indiquer sur le devis les coordonnées de son assureur et la zone géographique couverte. Sur l'attestation, vérifiez :",
    },
    {
      type: "list",
      items: [
        "le nom de l'assureur et le numéro du contrat ;",
        "la période de validité, qui doit couvrir la date d'ouverture de votre chantier ;",
        "les activités couvertes, qui doivent correspondre à vos travaux : une attestation qui ne mentionne que la peinture ne couvre pas une toiture ;",
        "la zone géographique couverte.",
      ],
    },
    {
      type: "p",
      text: "La **responsabilité civile professionnelle** (RC Pro) couvre, elle, les dommages que l'artisan peut causer à d'autres personnes dans son activité. Pour aller plus loin : [notre guide sur l'assurance décennale](/guides/assurance-decennale).",
    },
    {
      type: "h2",
      id: "qualification",
      text: "3. Vérifier la qualification et, si besoin, le label RGE",
    },
    {
      type: "p",
      text: "Pour de nombreux métiers du bâtiment, la loi exige une qualification : un diplôme (CAP, brevet professionnel…) ou trois années d'expérience dans le métier. N'hésitez pas à demander à l'artisan sa formation et des exemples de chantiers comparables au vôtre.",
    },
    {
      type: "p",
      text: "Si vous visez une aide à la rénovation énergétique comme MaPrimeRénov', l'entreprise doit être **RGE** (« reconnu garant de l'environnement ») pour le domaine de travaux concerné. Vérifiez-le sur l'[annuaire France Rénov'](https://france-renov.gouv.fr/annuaires-professionnels/artisan-rge-architecte).",
    },
    { type: "h2", id: "devis", text: "4. Comparer plusieurs devis détaillés" },
    {
      type: "p",
      text: "Le devis est obligatoire pour les travaux et dépannages du bâtiment. Il doit être daté et détailler chaque prestation avec les quantités et les prix, le taux horaire de la main-d'œuvre, les éventuels frais de déplacement, les totaux hors taxes et toutes taxes comprises, le taux de TVA et sa durée de validité.",
    },
    {
      type: "p",
      text: "Demandez deux ou trois devis pour un même projet, décrit de la même façon : vous comparerez les prix, mais aussi les solutions proposées et les délais. Le détail des mentions est dans [notre guide du devis de travaux](/guides/devis-travaux-mentions-obligatoires).",
    },
    { type: "h2", id: "avis", text: "5. Lire les avis, et savoir d'où ils viennent" },
    {
      type: "p",
      text: "Un avis n'a de valeur que s'il vient d'un vrai client. Préférez les sites qui expliquent comment ils collectent et contrôlent les avis, et regardez leur date et les réponses de l'artisan.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "Seuls les clients ayant réalisé un chantier via MENAO peuvent laisser un avis, une fois le procès-verbal de réception signé, et un seul par chantier. Un avis n'est jamais masqué parce qu'il est négatif.",
    },
    { type: "h2", id: "paiement", text: "6. Encadrer l'acompte et le paiement" },
    {
      type: "p",
      text: "Le montant de l'acompte se discute avant de signer et figure sur le devis. Le devis doit aussi préciser s'il s'agit d'un acompte ou d'arrhes : sans précision, la somme versée est considérée comme des arrhes.",
    },
    {
      type: "p",
      text: "Méfiez-vous d'une demande de paiement de la totalité avant le début des travaux, et préférez un moyen de paiement traçable : en espèces, un paiement d'un particulier à un professionnel est limité à 1 000 €.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "L'acompte et le solde se paient en ligne par carte, directement sur le compte de l'artisan, via Stripe. Le solde se règle une fois les travaux réceptionnés. MENAO ne prend aucune commission sur votre chantier.",
    },
    { type: "h2", id: "demarchage", text: "7. Se méfier du démarchage et de l'urgence" },
    {
      type: "p",
      text: "Soyez prudent face aux offres reçues par démarchage, à domicile ou par téléphone, surtout quand elles promettent des aides ou des travaux « gratuits ». Prenez le temps de vérifier l'entreprise et de comparer. Après un démarchage, vous disposez de 14 jours pour vous rétracter, sauf pour des travaux d'urgence comme une fuite d'eau.",
    },
    { type: "h2", id: "ecrit", text: "8. Tout garder par écrit, jusqu'à la réception" },
    {
      type: "p",
      text: "Conservez le devis signé (avec la mention « bon pour travaux » ou « bon pour accord »), les factures, les attestations d'assurance et vos échanges. À la fin, la **réception des travaux**, avec ou sans réserves, fait démarrer les garanties : parfait achèvement (1 an), bon fonctionnement (2 ans) et décennale (10 ans).",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "Devis, signature, messages et procès-verbal de réception restent dans votre espace, consultables à tout moment.",
    },
  ],
  faq: [
    {
      q: "Comment vérifier le numéro SIRET d'un artisan ?",
      a: "Saisissez-le, ou le nom de l'entreprise, sur l'Annuaire des Entreprises (annuaire-entreprises.data.gouv.fr), le service officiel et gratuit de l'État. Vérifiez que l'entreprise est active et que son activité correspond à vos travaux.",
    },
    {
      q: "Un artisan peut-il commencer sans assurance décennale ?",
      a: "Non, pour les travaux qui relèvent de la garantie décennale : il doit avoir souscrit l'assurance avant d'ouvrir le chantier. Sans elle, il s'expose à des sanctions pénales, jusqu'à 75 000 € d'amende et 6 mois d'emprisonnement.",
    },
    {
      q: "Combien de devis faut-il demander ?",
      a: "Aucune règle n'impose un nombre de devis. En comparer deux ou trois pour un même projet, décrit de la même façon, aide à juger le prix, la solution proposée et le délai.",
    },
    {
      q: "Comment MENAO vérifie-t-il les artisans ?",
      a: "Avant de rendre un artisan visible, l'équipe MENAO contrôle son entreprise auprès de l'INSEE, puis ses documents un par un : Kbis, attestations d'assurance décennale et de RC Pro, pièce d'identité du dirigeant et attestation de vigilance URSSAF.",
    },
  ],
  sources: [
    {
      label: "Devis obligatoire : activités concernées",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F31144",
    },
    {
      label: "Maçon : conditions d'accès et d'exercice en France (assurances, qualification)",
      publisher: "Service Public Entreprendre",
      url: "https://entreprendre.service-public.gouv.fr/vosdroits/F39037",
    },
    {
      label: "Garanties après la réception des travaux",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2958",
    },
    {
      label: "Paiement en espèces",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10999",
    },
    {
      label: "Trouver un professionnel RGE",
      publisher: "France Rénov'",
      url: "https://france-renov.gouv.fr/annuaires-professionnels/artisan-rge-architecte",
    },
    {
      label: "Annuaire des Entreprises",
      publisher: "État (data.gouv.fr)",
      url: "https://annuaire-entreprises.data.gouv.fr",
    },
  ],
  related: [
    { href: "/garanties", label: "Les garanties MENAO" },
    { href: "/comment-ca-marche", label: "Comment fonctionne MENAO" },
    { href: "/criteres-de-classement", label: "Comment les artisans sont classés" },
  ],
};
