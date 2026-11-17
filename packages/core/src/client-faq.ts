/**
 * Questions fréquentes des particuliers (F-03, ADR 0361) : un seul texte pour la page « Questions
 * fréquentes » du site et l'écran « Aide » de l'application. Les questions des artisans restent
 * dans les textes du site. Fichier autonome (aucun import).
 */
export const CLIENT_FAQ = {
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
} as const;

/** Thèmes dans l'ordre d'affichage. */
export const CLIENT_FAQ_THEMES = ["project", "payments", "trust"] as const;
export type ClientFaqTheme = (typeof CLIENT_FAQ_THEMES)[number];
