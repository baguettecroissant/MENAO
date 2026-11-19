import { COMPANY, COMPANY_LINE, LEGAL_UPDATED_AT } from "./company";
import type { LegalDocument } from "./types";

// TODO(legal) : texte à faire valider par l'avocat avant l'ouverture. Points en attente : médiateur
// de la consommation à désigner (article 14), procédure de signalement à aligner sur le règlement
// européen sur les services numériques (article 10), lecture d'une conversation par l'équipe
// (article 10, ADR 0277), note du client par l'artisan (article 8), rappel des obligations de
// l'artisan envers le particulier dans le parcours de devis (article 7).
export const cgu: LegalDocument = {
  title: "Conditions générales d'utilisation",
  updatedAt: LEGAL_UPDATED_AT,
  blocks: [
    { type: "h2", id: "objet", text: "Article 1. Objet" },
    {
      type: "p",
      text: "Les présentes conditions fixent les règles d'utilisation du site menao.fr et de l'application MENAO. Elles s'appliquent à toute personne qui crée un compte ou utilise le service, particulier ou artisan.",
    },
    {
      type: "p",
      text: "L'abonnement payant des artisans est régi, en plus, par les [conditions générales de vente artisans](/cgv-artisans). En cas de contradiction sur l'abonnement, ces dernières l'emportent.",
    },

    { type: "h2", id: "definitions", text: "Article 2. Qui est qui" },
    {
      type: "list",
      items: [
        `**MENAO** : la société ${COMPANY_LINE}.`,
        "**Le Particulier** : la personne qui décrit un projet de travaux pour son logement, en dehors de toute activité professionnelle.",
        "**L'Artisan** : le professionnel du bâtiment inscrit sur MENAO, dont le dossier a été vérifié.",
        "**Le Service** : la mise en relation entre Particuliers et Artisans, et les outils qui l'accompagnent (messagerie, rendez-vous, devis, signature, paiement, suivi de chantier, avis).",
      ],
    },

    { type: "h2", id: "compte", text: "Article 3. Compte et inscription" },
    {
      type: "p",
      text: "Le Service est gratuit pour le Particulier. Aucune somme ne lui est demandée par MENAO, à aucun moment.",
    },
    {
      type: "p",
      text: "Pour créer un compte, il faut être majeur et capable de contracter. Le compte se crée avec une adresse e-mail et un mot de passe, ou avec un compte Google ou Apple. L'utilisateur donne des informations exactes et les tient à jour.",
    },
    {
      type: "p",
      text: "Le compte est personnel. L'utilisateur garde ses identifiants secrets et prévient MENAO sans délai s'il pense qu'un tiers y a eu accès.",
    },
    {
      type: "p",
      text: `L'utilisateur peut supprimer son compte à tout moment depuis son espace ou en écrivant à ${COMPANY.email}.`,
    },

    { type: "h2", id: "role", text: "Article 4. Rôle de MENAO" },
    {
      type: "p",
      text: "MENAO est un intermédiaire. MENAO met en relation, fournit des outils et vérifie le dossier des Artisans. MENAO ne réalise pas les travaux, ne rédige pas les devis et n'est pas partie au contrat conclu entre le Particulier et l'Artisan.",
    },
    {
      type: "p",
      text: "Avant sa mise en ligne, chaque Artisan dépose les pièces suivantes, que MENAO contrôle : extrait d'immatriculation, pièce d'identité du dirigeant, attestation d'assurance décennale lorsque son métier y est soumis, attestation de responsabilité civile professionnelle, attestation de vigilance de l'Urssaf. L'Artisan signe aussi la charte qualité MENAO.",
    },
    {
      type: "p",
      text: "Ce contrôle porte sur l'existence et la validité apparente des pièces à la date du dépôt. MENAO ne garantit ni la qualité des travaux, ni la solvabilité de l'Artisan, ni que son assurance couvre un chantier donné. Le Particulier reste libre de demander à l'Artisan son attestation d'assurance avant de signer.",
    },
    {
      type: "p",
      text: "MENAO relance les Artisans avant l'expiration de leurs pièces et retire de la recherche ceux dont une pièce obligatoire a expiré.",
    },

    { type: "h2", id: "demande", text: "Article 5. Demande de travaux" },
    {
      type: "p",
      text: "Le Particulier décrit son projet par écrit, à la voix, avec des photos ou au téléphone avec l'assistante de MENAO. Une demande préparée au téléphone n'est envoyée aux Artisans qu'après validation par le Particulier.",
    },
    {
      type: "p",
      text: "Des outils automatiques aident à comprendre la demande : métier concerné, urgence, questions à poser. Le Particulier relit et corrige avant l'envoi ; il reste responsable de ce qu'il déclare.",
    },
    {
      type: "p",
      text: "Le Particulier s'engage à décrire un projet réel, pour un bien dont il a la charge, et à répondre aux Artisans qu'il a sollicités, même pour décliner.",
    },
    {
      type: "p",
      text: "En envoyant sa demande, le Particulier accepte que sa description, ses photos, le lieu du chantier et les coordonnées nécessaires pour le joindre soient transmis aux Artisans concernés, pour ce projet seulement.",
    },

    { type: "h2", id: "classement", text: "Article 6. Mise en relation et classement" },
    {
      type: "p",
      text: "MENAO propose au Particulier des Artisans dont le métier et la zone correspondent à son projet. Le Particulier choisit ceux qu'il contacte. Il peut aussi adresser sa demande à un seul Artisan depuis la fiche de celui-ci.",
    },
    {
      type: "p",
      text: "Les Artisans sont classés ainsi : ceux de proximité passent avant ceux qui couvrent une région ou toute la France ; parmi eux, ceux qui sont disponibles tout de suite passent en premier ; viennent ensuite leur Score MENAO sur 100 (vérifications, expérience, diplômes, profil, réactivité et avis des clients) et leur distance. Une place est réservée à un nouvel Artisan, le temps qu'il se fasse connaître.",
    },
    {
      type: "p",
      text: "Le classement ne dépend ni de la formule d'abonnement de l'Artisan ni d'un paiement. Le détail figure sur la page [Critères de classement](/criteres-de-classement).",
    },
    {
      type: "p",
      text: "Les Artisans paient un abonnement à MENAO pour être présents sur le Service. Tous les Artisans présentés sont des professionnels.",
    },
    {
      type: "p",
      text: "MENAO ne garantit pas qu'un Artisan réponde à chaque demande, ni qu'un devis soit proposé.",
    },

    { type: "h2", id: "devis", text: "Article 7. Devis, signature et paiement" },
    {
      type: "p",
      text: "L'Artisan établit son devis sous sa seule responsabilité. Le contrat de travaux se forme entre le Particulier et l'Artisan, lorsque le Particulier signe le devis.",
    },
    {
      type: "p",
      text: "La signature se fait en ligne, par l'intermédiaire du prestataire DocuSeal. Le Particulier reçoit un exemplaire du devis signé et le retrouve dans son espace.",
    },
    {
      type: "p",
      text: "Les informations dues au Particulier avant la signature, et le droit de rétractation lorsqu'il s'applique, relèvent de l'Artisan.",
    },
    {
      type: "p",
      text: "Les paiements se font en ligne, par l'intermédiaire du prestataire Stripe, selon l'échéancier prévu au devis. Les sommes sont versées directement à l'Artisan. MENAO ne les encaisse pas, ne les conserve pas et ne prélève aucune commission.",
    },
    {
      type: "p",
      text: "Un désaccord sur les travaux, les délais ou le prix se règle entre le Particulier et l'Artisan. MENAO peut être saisie d'un signalement (article 10) et proposer son aide, sans être tenue à un résultat.",
    },

    { type: "h2", id: "avis", text: "Article 8. Avis" },
    {
      type: "p",
      text: "Seul un Particulier dont le chantier a été suivi sur MENAO peut déposer un avis sur l'Artisan. Un avis par chantier, sans contrepartie.",
    },
    {
      type: "p",
      text: "MENAO modère les avis. Un avis est refusé ou retiré s'il est injurieux, sans rapport avec le chantier, s'il contient des données personnelles ou s'il est contraire à la loi. Un avis n'est jamais retiré au seul motif qu'il est négatif.",
    },
    {
      type: "p",
      text: "L'Artisan peut répondre publiquement une fois à chaque avis, et signaler un avis qu'il estime irrégulier.",
    },
    {
      type: "p",
      text: "Après un chantier, l'Artisan note de son côté le déroulement avec son client (accueil, clarté du besoin, délai des paiements). Cette note n'est jamais publiée. Les Artisans qui reçoivent une demande du même Particulier en voient la moyenne, jamais le commentaire.",
    },

    { type: "h2", id: "conduite", text: "Article 9. Règles de conduite" },
    { type: "p", text: "Chaque utilisateur s'engage à :" },
    {
      type: "list",
      items: [
        "rester courtois dans la messagerie, au téléphone et sur le chantier ;",
        "ne publier que des contenus dont il a les droits : ses propres photos, ses propres réalisations ;",
        "ne pas déposer de fausse demande, de faux avis ou de faux document ;",
        "utiliser les coordonnées reçues pour le seul projet concerné, sans démarchage ni revente ;",
        "ne pas chercher à accéder aux données d'autres utilisateurs, ni à copier le contenu du Service par un moyen automatique ;",
        "ne publier aucun contenu illégal, haineux, discriminatoire ou trompeur.",
      ],
    },

    {
      type: "h2",
      id: "signalements",
      text: "Article 10. Messagerie, signalements et contenus illicites",
    },
    {
      type: "p",
      text: "Les messages échangés entre un Particulier et un Artisan sont privés. L'équipe MENAO ne lit une conversation que lorsqu'un litige est ouvert ou qu'un signalement la concerne. Chaque consultation est enregistrée.",
    },
    {
      type: "p",
      text: `Tout utilisateur peut signaler un contenu, une fiche, un avis ou un comportement depuis le Service ou à l'adresse ${COMPANY.email}. Le signalement précise le contenu visé et la raison.`,
    },
    {
      type: "p",
      text: "MENAO examine chaque signalement, répond à son auteur et, s'il est fondé, retire le contenu ou restreint le compte. La personne concernée est informée de la décision et de son motif, et peut la contester auprès de MENAO.",
    },

    { type: "h2", id: "propriete", text: "Article 11. Propriété et contenus" },
    {
      type: "p",
      text: "Le site, l'application, la marque MENAO et leurs contenus appartiennent à MENAO. L'utilisateur reçoit un droit d'usage personnel, pour la durée de son compte.",
    },
    {
      type: "p",
      text: "L'utilisateur reste propriétaire de ce qu'il publie. Il autorise MENAO à l'afficher sur le Service, pour le faire fonctionner : fiche et photos de l'Artisan, avis du Particulier. Les photos d'une demande de travaux ne sont montrées qu'aux Artisans concernés.",
    },

    { type: "h2", id: "responsabilite", text: "Article 12. Responsabilité" },
    {
      type: "p",
      text: "MENAO s'engage à fournir le Service avec soin et à le maintenir accessible, sauf maintenance, panne d'un prestataire ou force majeure.",
    },
    {
      type: "p",
      text: "MENAO répond de ses propres engagements : mise en relation, vérification des pièces décrite à l'article 4, fonctionnement des outils. MENAO ne répond pas des travaux, des retards, des malfaçons ni des paiements entre le Particulier et l'Artisan, qui relèvent de leur contrat et des assurances de l'Artisan.",
    },
    {
      type: "p",
      text: "Les estimations, résumés et suggestions produits par des outils automatiques sont indicatifs. Ils ne remplacent ni le devis de l'Artisan ni l'avis d'un professionnel sur place.",
    },
    {
      type: "p",
      text: "Rien dans les présentes conditions ne prive le Particulier des droits que la loi lui reconnaît en tant que consommateur.",
    },

    { type: "h2", id: "fin", text: "Article 13. Suspension et fin du compte" },
    {
      type: "p",
      text: "L'utilisateur peut fermer son compte à tout moment. Les devis signés et les chantiers en cours se poursuivent entre le Particulier et l'Artisan. Les documents que la loi impose de conserver le sont pour la durée prévue par la [politique de confidentialité](/confidentialite).",
    },
    {
      type: "p",
      text: "MENAO peut suspendre ou fermer un compte en cas de manquement aux présentes conditions. L'utilisateur en est informé par e-mail, avec le motif et le moyen de contester. Sauf fraude, danger ou obligation légale, MENAO prévient avant d'agir.",
    },

    { type: "h2", id: "litiges", text: "Article 14. Modification, droit applicable et litiges" },
    {
      type: "p",
      text: "MENAO peut modifier les présentes conditions. Les utilisateurs en sont prévenus par e-mail ou dans leur espace au moins trente jours avant, sauf changement imposé par la loi. Celui qui refuse la nouvelle version peut fermer son compte.",
    },
    {
      type: "p",
      text: `Une réclamation s'adresse d'abord à MENAO, depuis l'espace en ligne ou à ${COMPANY.email}.`,
    },
    {
      type: "p",
      text: "Un litige entre un Particulier et un Artisan relève du médiateur de la consommation de l'Artisan, indiqué sur son devis.",
    },
    {
      type: "p",
      text: "Les présentes conditions sont soumises au droit français. Le Particulier peut saisir le tribunal de son domicile.",
    },
  ],
};
