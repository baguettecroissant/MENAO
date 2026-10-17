/**
 * Contenu des e-mails de notification (F-41), en français. Les données viennent de la table
 * `notifications` (remplie par la base) : chaque champ est facultatif et le texte s'adapte.
 * Les imports portent leur extension : ce paquet est aussi chargé par Deno (fonction notify).
 */

export const NOTIFICATION_TYPES = [
  "nouvelle_demande",
  "rdv_fixe",
  "rdv_modifie",
  "rdv_rappel",
  "chantier_annule",
  "devis_recu",
  "devis_refuse",
  "devis_modification",
  "devis_signe",
  "acompte_paye",
  "chantier_planifie",
  "demarrage_modifie",
  "travaux_termines",
  "chantier_nouveautes",
  "pv_signe",
  "reserves_emises",
  "levee_signalee",
  "levee_confirmee",
  "levee_relance",
  "solde_paye",
  "avis_recu",
  "avis_relance",
  "nouveaux_messages",
  "litige_ouvert",
  "litige_clos",
  "reponse_support",
  "dossier_valide",
  "dossier_refuse",
  "dossier_complement",
  "document_refuse",
  "document_a_renouveler",
  "document_a_renouveler_equipe",
  "compte_suspendu",
  "compte_reactive",
  "demande_annulee",
  "acces_suspendu",
  "acces_retabli",
  "equipe_nouveau_ticket",
  "equipe_dossier_a_verifier",
  "equipe_ticket_en_retard",
  "acompte_relance",
  "badge_debloque",
  "niveau_atteint",
  "planning_relance",
  "inscription_relance",
  "compte_radie",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type EmailContent = {
  subject: string;
  /** Aperçu affiché par les messageries à côté de l'objet. */
  preview: string;
  title: string;
  paragraphs: string[];
  /** Message libre d'un utilisateur (motif d'annulation), affiché en citation. */
  quote: string | null;
  cta: { label: string; url: string };
};

export type EmailContext = {
  /** Adresse du site, sans barre finale (ex. https://menao.fr). */
  siteUrl: string;
  /** Prénom du destinataire. */
  firstName: string | null;
};

export const EMAIL_FOOTER =
  "Vous recevez cet e-mail car vous avez un compte MENAO. Message envoyé automatiquement : merci de ne pas y répondre.";

const PARIS = "Europe/Paris";
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: PARIS,
});
const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PARIS,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Nature d'un problème signalé (enum public.dispute_category). */
const DISPUTE_CATEGORIES: Record<string, string> = {
  retard: "retard",
  malfacon: "malfaçon",
  comportement: "comportement",
  paiement: "paiement",
  autre: "autre",
};

/** Motifs de refus d'un devis par le client (enum public.quote_refusal_reason), vus par l'artisan. */
const REFUSAL_REASONS: Record<string, string> = {
  trop_cher: "prix trop élevé",
  autre_artisan: "un autre artisan a été choisi",
  projet_reporte: "projet reporté",
  autre: "autre raison",
};

/** Motifs d'annulation par le client (enum public.client_cancel_reason), vus par l'artisan. */
const CLIENT_CANCEL_REASONS: Record<string, string> = {
  plus_besoin: "les travaux ne sont plus nécessaires",
  autre_artisan: "un autre artisan a été choisi",
  delai: "le délai ne convient pas",
  budget: "le budget ne convient pas",
  autre: "autre raison",
};

/** Documents du dossier (enum public.document_type), au fil d'une phrase. */
const DOCUMENTS: Record<string, string> = {
  kbis: "extrait Kbis",
  decennale: "attestation d'assurance décennale",
  rc_pro: "attestation de responsabilité civile professionnelle",
  identite: "pièce d'identité du dirigeant",
};
/** Assurances obligatoires : leur expiration suspend l'artisan (F-51). */
const INSURANCES = ["decennale", "rc_pro"];
/** Types de tickets, dans les alertes de l'équipe (ADR 0050). */
const TICKET_TYPES: Record<string, string> = {
  contact: "message de la page Contact",
  dossier_recherche: "dossier de recherche",
  suppression_compte: "demande de suppression de compte",
  expertise: "expertise signalée par un artisan",
  reserves: "levée des réserves non confirmée",
  avis: "avis signalé",
  message: "message signalé",
  litige: "litige sur un chantier",
  recompense: "récompense à expédier",
};

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Montant en centimes → « 330,00 € ». */
function amount(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? euros.format(value / 100)
    : null;
}

/** Nombre entier positif (compteurs des nouveautés), sinon 0. */
function count(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

/** Entier positif ou nul (jours restants), sinon null. */
function integer(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Date AAAA-MM-JJ → « jeudi 29 octobre ». */
function dateDay(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : dayFormat.format(date);
}

/** Échéance d'un document : « aujourd'hui », « demain », « le jeudi 29 octobre (dans 20 jours) ». */
function deadline(data: Record<string, unknown>): string {
  const days = integer(data, "jours");
  const day = dateDay(text(data, "date_fin"));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (day) return days === null ? `le ${day}` : `le ${day} (dans ${days}\u00a0jours)`;
  return days === null ? "bientôt" : `dans ${days}\u00a0jours`;
}

function uuid(data: Record<string, unknown>, key: string): string | null {
  const value = text(data, key);
  return value && UUID.test(value) ? value : null;
}

/** « jeudi 20 février » et « 16h30 », à l'heure de Paris. */
function moment(iso: string | null): { day: string; time: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { day: dayFormat.format(date), time: timeFormat.format(date).replace(":", "h") };
}

const hello = (firstName: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,");

/** Guillemets français avec espaces insécables (jamais de « » » seul en début de ligne). */
export const quoted = (value: string) => `«\u00a0${value}\u00a0»`;

export function notificationContent(
  type: NotificationType,
  data: Record<string, unknown>,
  ctx: EmailContext,
): EmailContent {
  const link = (path: string) => `${ctx.siteUrl.replace(/\/+$/, "")}${path}`;
  const titre = text(data, "titre") ?? "votre projet";
  const artisan = text(data, "artisan") ?? "L'artisan";
  const rdv = moment(text(data, "rendez_vous"));
  const chantierId = uuid(data, "chantier_id");
  // Vue du chantier du client (F-12), sinon son espace.
  const myChantier = (label: string) => ({
    label,
    url: link(chantierId ? `/mon-espace/chantiers/${chantierId}` : "/mon-espace"),
  });
  // Avis sur l'artisan (F-28) : « Comment s'est passée votre expérience ? ».
  const artisanName = text(data, "artisan");
  const reviewCta = {
    label: artisanName ? `Noter ${artisanName}` : "Donner mon avis",
    url: link(chantierId ? `/mon-espace/chantiers/${chantierId}/avis` : "/mon-espace"),
  };

  switch (type) {
    case "nouvelle_demande": {
      const client = text(data, "client") ?? "Un particulier";
      const ville = text(data, "ville");
      const deadline = moment(text(data, "expire_le"));
      const requestId = uuid(data, "request_id");
      return {
        subject: `Nouvelle demande de chantier${ville ? ` à ${ville}` : ""}`,
        preview: `${client} vous a choisi pour ${quoted(titre)}.`,
        title: "Nouvelle demande de chantier",
        paragraphs: [
          hello(ctx.firstName),
          `${client} vous a choisi pour son projet ${quoted(titre)}${ville ? ` à ${ville}` : ""}.`,
          ...(data.urgence === true ? ["Le client indique que les travaux sont urgents."] : []),
          deadline
            ? `Répondez avant le ${deadline.day} à ${deadline.time} : fixez un rendez-vous ou refusez la demande.`
            : "Fixez un rendez-vous ou refusez la demande depuis votre espace pro.",
        ],
        quote: null,
        cta: {
          label: "Voir la demande",
          url: link(requestId ? `/pro/demandes/${requestId}` : "/pro/demandes"),
        },
      };
    }
    case "rdv_fixe":
      return {
        subject: rdv ? `Rendez-vous fixé le ${rdv.day} à ${rdv.time}` : "Rendez-vous fixé",
        preview: `${artisan} vient voir votre projet ${quoted(titre)}.`,
        title: "Votre rendez-vous est fixé",
        paragraphs: [
          hello(ctx.firstName),
          rdv
            ? `${artisan} a fixé un rendez-vous pour votre projet ${quoted(titre)} : le ${rdv.day} à ${rdv.time}.`
            : `${artisan} a fixé un rendez-vous pour votre projet ${quoted(titre)}.`,
          "Ses coordonnées sont maintenant disponibles dans votre espace, si vous devez le joindre.",
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    case "rdv_modifie":
      return {
        subject: rdv
          ? `Rendez-vous déplacé au ${rdv.day} à ${rdv.time}`
          : "Votre rendez-vous a été déplacé",
        preview: `${artisan} a modifié la date du rendez-vous.`,
        title: "Votre rendez-vous a été déplacé",
        paragraphs: [
          hello(ctx.firstName),
          rdv
            ? `${artisan} a déplacé le rendez-vous pour votre projet ${quoted(titre)} au ${rdv.day} à ${rdv.time}.`
            : `${artisan} a déplacé le rendez-vous pour votre projet ${quoted(titre)}.`,
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    case "rdv_rappel": {
      const forArtisan = text(data, "destinataire") === "artisan";
      const client = text(data, "client");
      const adresse = text(data, "adresse");
      const when = rdv ? `demain, ${rdv.day} à ${rdv.time}` : "demain";
      return {
        subject: rdv ? `Rappel : rendez-vous demain à ${rdv.time}` : "Rappel : rendez-vous demain",
        preview: `Rendez-vous ${when} pour ${quoted(titre)}.`,
        title: "Rendez-vous demain",
        paragraphs: forArtisan
          ? [
              hello(ctx.firstName),
              `Vous avez rendez-vous ${when}${client ? ` chez ${client}` : ""} pour ${quoted(titre)}.`,
              ...(adresse ? [`Adresse : ${adresse}.`] : []),
            ]
          : [hello(ctx.firstName), `${artisan} vient ${when} pour votre projet ${quoted(titre)}.`],
        quote: null,
        cta: forArtisan
          ? {
              label: "Voir le rendez-vous",
              url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
            }
          : myChantier("Voir mon chantier"),
      };
    }
    case "chantier_annule": {
      // Annulation par le client (F-12) : l'artisan est prévenu.
      if (text(data, "destinataire") === "artisan") {
        const client = text(data, "client") ?? "Le client";
        const raison = CLIENT_CANCEL_REASONS[text(data, "raison") ?? ""];
        return {
          subject: `${client} a annulé le chantier`,
          preview: `Le chantier ${quoted(titre)} est annulé.`,
          title: "Chantier annulé par le client",
          paragraphs: [
            hello(ctx.firstName),
            `${client} a annulé le chantier ${quoted(titre)} : le rendez-vous est annulé.`,
            ...(raison ? [`Motif : ${raison}.`] : []),
          ],
          quote: text(data, "message"),
          cta: {
            label: "Voir le chantier",
            url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
          },
        };
      }
      return {
        subject: `${artisan} a annulé le rendez-vous`,
        preview: `Votre projet ${quoted(titre)} : vous pouvez choisir un autre artisan.`,
        title: "Rendez-vous annulé",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} a annulé le rendez-vous prévu pour votre projet ${quoted(titre)}.`,
          "Vous pouvez choisir un autre artisan depuis votre espace.",
        ],
        quote: text(data, "motif"),
        cta: { label: "Choisir un autre artisan", url: link("/mon-espace") },
      };
    }
    case "demande_annulee": {
      const client = text(data, "client") ?? "Le client";
      const details = [text(data, "metier"), text(data, "ville") && `à ${text(data, "ville")}`]
        .filter(Boolean)
        .join(", ");
      const raison = CLIENT_CANCEL_REASONS[text(data, "raison") ?? ""];
      return {
        subject: `${client} a annulé sa demande`,
        preview: "Une demande de chantier a été annulée avant votre réponse.",
        title: "Demande annulée par le client",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a annulé sa demande de chantier${details ? ` (${details})` : ""} : vous n'avez plus à y répondre.`,
          ...(raison ? [`Motif : ${raison}.`] : []),
        ],
        quote: text(data, "message"),
        cta: { label: "Voir mes demandes", url: link("/pro/demandes") },
      };
    }
    case "devis_recu": {
      const numero = text(data, "numero");
      const montant = amount(data, "montant_ttc");
      const quoteId = uuid(data, "quote_id");
      return {
        subject: "Nouveau devis disponible pour votre chantier !",
        preview: `${artisan} vous a envoyé son devis pour ${quoted(titre)}.`,
        title: "Nouveau devis disponible pour votre chantier !",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} vous a envoyé son devis${numero ? ` n° ${numero}` : ""} pour votre projet ${quoted(titre)}${montant ? `, d'un montant de ${montant} TTC` : ""}.`,
          "Consultez-le dans votre espace pour y répondre.",
        ],
        quote: null,
        cta: {
          label: "Voir le devis",
          url: link(quoteId ? `/mon-espace/devis/${quoteId}` : "/mon-espace"),
        },
      };
    }
    case "devis_refuse": {
      const client = text(data, "client") ?? "Le client";
      const numero = text(data, "numero");
      const motif = REFUSAL_REASONS[text(data, "motif") ?? ""];
      return {
        subject: `${client} a refusé votre devis`,
        preview: `Votre devis pour ${quoted(titre)} a été refusé.`,
        title: "Devis refusé",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a refusé votre devis${numero ? ` n° ${numero}` : ""} pour ${quoted(titre)}.`,
          ...(motif ? [`Motif indiqué : ${motif}.`] : []),
        ],
        quote: text(data, "message"),
        cta: {
          label: "Voir le chantier",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "devis_modification": {
      const client = text(data, "client") ?? "Le client";
      const numero = text(data, "numero");
      return {
        subject: `${client} demande une modification de votre devis`,
        preview: `Modification demandée pour ${quoted(titre)}.`,
        title: "Modification du devis demandée",
        paragraphs: [
          hello(ctx.firstName),
          `${client} souhaite une modification de votre devis${numero ? ` n° ${numero}` : ""} pour ${quoted(titre)} :`,
          "Une nouvelle version reprenant vos lignes vous attend : modifiez-la, puis envoyez-la.",
        ],
        quote: text(data, "message"),
        cta: {
          label: "Modifier le devis",
          url: link(chantierId ? `/pro/chantiers/${chantierId}/devis` : "/pro/devis"),
        },
      };
    }
    case "devis_signe": {
      const client = text(data, "client") ?? "Le client";
      const numero = text(data, "numero");
      const montant = amount(data, "montant_ttc");
      return {
        subject: `${client} a signé votre devis`,
        preview: `Votre devis pour ${quoted(titre)} est signé.`,
        title: "Devis signé",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a signé votre devis${numero ? ` n° ${numero}` : ""} pour ${quoted(titre)}${montant ? `, d'un montant de ${montant} TTC` : ""}.`,
          "Le devis signé est disponible depuis le chantier, dans votre espace pro.",
        ],
        quote: null,
        cta: {
          label: "Voir le chantier",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "badge_debloque": {
      // F-24 : notification push seulement (jamais d'e-mail), maquette « Nouveau badge débloqué ».
      const badge = text(data, "badge");
      return {
        subject: "Nouveau badge débloqué !",
        preview: badge
          ? `Votre travail de qualité est récompensé : vous avez débloqué le badge ${quoted(badge)}.`
          : "Votre travail de qualité est récompensé : vous avez débloqué un nouveau badge MENAO.",
        title: "Nouveau badge MENAO débloqué !",
        paragraphs: [
          hello(ctx.firstName),
          badge
            ? `Félicitations : vous avez débloqué le badge ${quoted(badge)}.`
            : "Félicitations : vous avez débloqué un nouveau badge MENAO.",
          "Retrouvez votre collection de badges et vos prochains objectifs dans « Mon grade MENAO ».",
        ],
        quote: null,
        cta: { label: "Voir mes badges", url: link("/pro/grade") },
      };
    }
    case "planning_relance": {
      // Charte qualité : « un rappel chaque semaine pour mettre ton planning à jour » (ADR 0107),
      // envoyé seulement si le planning n'a ni changé ni été confirmé depuis 7 jours.
      const jours = integer(data, "jours");
      const since =
        jours === null
          ? "Vous n'avez pas encore confirmé votre planning sur MENAO."
          : `Votre planning n'a pas été mis à jour depuis ${jours}\u00a0jours.`;
      return {
        subject: "Votre planning est-il à jour ?",
        preview: since,
        title: "Votre planning est-il à jour ?",
        paragraphs: [
          hello(ctx.firstName),
          since,
          `Vérifiez vos horaires, vos absences et votre date de disponibilité : MENAO vous envoie en priorité les demandes qui tombent quand vous êtes libre. Sans changement, un appui sur ${quoted("Mon planning est à jour")} suffit.`,
          "Un planning tenu à jour compte dans votre score MENAO, qui détermine votre place quand un client cherche un artisan.",
        ],
        quote: null,
        cta: { label: "Mettre à jour mon planning", url: link("/pro/agenda/disponibilites") },
      };
    }
    case "inscription_relance": {
      // Inscription artisan abandonnée (ADR 0112) : trois relances au plus (J+1, J+3, J+7), vers
      // « Faire vérifier mon entreprise ». Le texte suit l'état du dossier.
      const etape = integer(data, "etape") ?? 1;
      const cta = { label: "Reprendre mon inscription", url: link("/pro/onboarding") };
      if (data.complement === true) {
        return {
          subject: "Votre dossier MENAO attend vos compléments",
          preview: "Ajoutez les éléments demandés pour que l'équipe vérifie votre entreprise.",
          title: "Votre dossier attend vos compléments",
          paragraphs: [
            hello(ctx.firstName),
            "L'équipe MENAO vous a demandé des compléments pour vérifier votre entreprise. Le détail est indiqué dans votre dossier.",
            "Ajoutez-les, puis renvoyez votre dossier : nous le vérifions dès sa réception.",
          ],
          quote: null,
          cta: { label: "Compléter mon dossier", url: link("/pro/onboarding") },
        };
      }
      if (data.pret === true) {
        return {
          subject: "Votre dossier MENAO est prêt : envoyez-le",
          preview: "Tout est prêt : il ne reste qu'à envoyer votre dossier à l'équipe MENAO.",
          title: "Il ne reste qu'à envoyer votre dossier",
          paragraphs: [
            hello(ctx.firstName),
            "Votre dossier est complet. Il ne reste qu'à l'envoyer à l'équipe MENAO pour qu'elle vérifie votre entreprise.",
            "Une fois votre entreprise vérifiée, votre profil peut apparaître auprès des clients de votre secteur.",
          ],
          quote: null,
          cta: { label: "Envoyer mon dossier", url: link("/pro/onboarding") },
        };
      }
      if (etape >= 3) {
        return {
          subject: "Dernier rappel : votre profil MENAO attend sa vérification",
          preview: "Les clients ne voient que les artisans vérifiés.",
          title: "Votre profil attend sa vérification",
          paragraphs: [
            hello(ctx.firstName),
            "Votre profil MENAO est créé, mais votre entreprise n'est pas encore vérifiée : les clients de votre secteur ne le voient pas.",
            "Ajoutez vos documents et signez la charte qualité : tout est enregistré au fur et à mesure, vous reprenez là où vous en étiez.",
            "C'est notre dernier rappel. Votre inscription reste accessible depuis votre espace pro.",
          ],
          quote: null,
          cta,
        };
      }
      if (etape === 2) {
        return {
          subject: "Vos documents en photo, depuis votre téléphone",
          preview: "Kbis, assurances, pièce d'identité : une photo suffit.",
          title: "Vos documents en photo",
          paragraphs: [
            hello(ctx.firstName),
            "Pour faire vérifier votre entreprise, une photo de chaque document suffit : Kbis, attestations d'assurance décennale et de responsabilité civile, pièce d'identité.",
            "Prenez-les depuis votre téléphone, un document à la fois. Vous pouvez vous arrêter et reprendre plus tard.",
          ],
          quote: null,
          cta,
        };
      }
      return {
        subject: "Votre inscription MENAO n'est pas terminée",
        preview: "Votre profil est créé : faites vérifier votre entreprise.",
        title: "Votre inscription n'est pas terminée",
        paragraphs: [
          hello(ctx.firstName),
          "Votre profil MENAO est créé. Il reste à faire vérifier votre entreprise : vos documents en photo et la charte qualité, en quelques minutes.",
          "Tout est enregistré au fur et à mesure : vous reprenez là où vous en étiez.",
        ],
        quote: null,
        cta,
      };
    }
    case "niveau_atteint": {
      // F-24 : notification push seulement ; au niveau 5, la tenue MENAO est à réclamer.
      const niveau = count(data, "niveau");
      const recompense = text(data, "recompense");
      return {
        subject: niveau
          ? `Vous avez atteint le niveau ${niveau} !`
          : "Vous avez atteint un nouveau niveau !",
        preview: recompense
          ? `Votre récompense vous attend : ${recompense}.`
          : "Découvrez vos prochains objectifs dans « Mon grade MENAO ».",
        title: niveau ? `Niveau ${niveau} atteint !` : "Nouveau niveau atteint !",
        paragraphs: [
          hello(ctx.firstName),
          niveau
            ? `Bravo : vous avez atteint le niveau ${niveau} sur MENAO.`
            : "Bravo : vous avez atteint un nouveau niveau sur MENAO.",
          recompense
            ? `Votre récompense vous attend : ${recompense}. Réclamez-la depuis « Mon grade MENAO ».`
            : "Continuez vos objectifs pour débloquer les prochaines récompenses.",
        ],
        quote: null,
        cta: {
          label: recompense ? "Réclamer ma récompense" : "Voir mon grade",
          url: link("/pro/grade"),
        },
      };
    }
    case "acompte_relance":
      // Maquette « Paiement en attente » : relance unique, acompte non réglé 2 jours après la
      // signature. Le paiement va directement à l'artisan (règle 12).
      return {
        subject: "Paiement en attente",
        preview: `L'acompte de votre chantier ${quoted(titre)} reste à régler.`,
        title: "Paiement en attente",
        paragraphs: [
          hello(ctx.firstName),
          `Vous avez signé le devis de ${artisan} pour ${quoted(titre)} : il reste à régler l'acompte pour que ${artisan} puisse confirmer la date de démarrage.`,
          "Le paiement se fait en ligne, de façon sécurisée, directement sur le compte de l'artisan.",
        ],
        quote: null,
        cta: myChantier("Payer l'acompte"),
      };
    case "acompte_paye": {
      const montant = amount(data, "montant");
      if (text(data, "destinataire") === "artisan") {
        const client = text(data, "client") ?? "Le client";
        // F-22 : « Chantier validé ! Confirmez la date de démarrage ».
        return {
          subject: "Chantier validé ! Confirmez la date de démarrage",
          preview: `${client} a payé l'acompte${montant ? ` de ${montant}` : ""} pour ${quoted(titre)}.`,
          title: "Chantier validé !",
          paragraphs: [
            hello(ctx.firstName),
            `${client} a payé l'acompte${montant ? ` de ${montant}` : ""} pour ${quoted(titre)}, directement sur votre compte Stripe.`,
            "Confirmez maintenant la date et l'heure de démarrage des travaux : votre client en sera informé.",
          ],
          quote: null,
          cta: {
            label: "Confirmer la date de démarrage",
            url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
          },
        };
      }
      return {
        subject: "Votre acompte est bien payé",
        preview: `Paiement reçu pour ${quoted(titre)}.`,
        title: "Acompte payé",
        paragraphs: [
          hello(ctx.firstName),
          `Votre acompte${montant ? ` de ${montant}` : ""} pour ${quoted(titre)} a bien été payé à ${text(data, "artisan") ?? "l'artisan"}.`,
          "L'artisan va vous confirmer la date de démarrage des travaux.",
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    }
    case "chantier_planifie": {
      const start = moment(text(data, "demarrage"));
      return {
        subject: start
          ? `Démarrage des travaux le ${start.day} à ${start.time}`
          : "Votre chantier est planifié",
        preview: `${artisan} a confirmé la date de démarrage de ${quoted(titre)}.`,
        title: "Chantier planifié",
        paragraphs: [
          hello(ctx.firstName),
          start
            ? `${artisan} a confirmé le démarrage des travaux pour ${quoted(titre)} : le ${start.day} à ${start.time}.`
            : `${artisan} a confirmé la date de démarrage des travaux pour ${quoted(titre)}.`,
          "Vous pourrez suivre l'avancement du chantier depuis votre espace.",
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    }
    case "demarrage_modifie": {
      const start = moment(text(data, "demarrage"));
      return {
        subject: start
          ? `Démarrage des travaux déplacé au ${start.day} à ${start.time}`
          : "La date de démarrage des travaux a changé",
        preview: `${artisan} a modifié la date de démarrage de ${quoted(titre)}.`,
        title: "Date de démarrage modifiée",
        paragraphs: [
          hello(ctx.firstName),
          start
            ? `${artisan} a déplacé le démarrage des travaux pour ${quoted(titre)} au ${start.day} à ${start.time}.`
            : `${artisan} a modifié la date de démarrage des travaux pour ${quoted(titre)}.`,
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    }
    case "travaux_termines":
      return {
        subject: `Travaux terminés pour ${quoted(titre)}`,
        preview: `${artisan} a déclaré les travaux terminés : validez la réception.`,
        title: "Travaux terminés !",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} a déclaré terminés les travaux de votre chantier ${quoted(titre)}.`,
          "Consultez le suivi du chantier, puis validez la réception des travaux en signant le procès-verbal, avec ou sans réserves.",
        ],
        quote: null,
        cta: myChantier("Valider la réception"),
      };
    case "chantier_nouveautes": {
      // Nouveautés du journal regroupées (F-12) : « Jean a ajouté 6 nouvelles photos ».
      const photos = count(data, "photos");
      const messages = count(data, "messages");
      const parts = [
        photos ? (photos === 1 ? "1 nouvelle photo" : `${photos} nouvelles photos`) : null,
        messages ? (messages === 1 ? "1 nouveau message" : `${messages} nouveaux messages`) : null,
      ].filter((part): part is string => part !== null);
      const added = parts.length ? `a ajouté ${parts.join(" et ")}` : "a publié des nouveautés";
      return {
        subject: `Du nouveau sur votre chantier ${quoted(titre)}`,
        preview: `${artisan} ${added}.`,
        title: "Du nouveau sur votre chantier !",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} ${added} dans le suivi de votre chantier ${quoted(titre)}.`,
        ],
        quote: null,
        cta: myChantier("Voir le suivi du chantier"),
      };
    }
    case "pv_signe": {
      // F-25 : PV signé sans réserves, à l'artisan.
      const client = text(data, "client") ?? "Votre client";
      return {
        subject: `Réception validée pour ${quoted(titre)}`,
        preview: `${client} a signé le procès-verbal de réception sans réserves.`,
        title: "Réception validée",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a signé le procès-verbal de réception de ${quoted(titre)}, sans réserves.`,
          "Prochaine étape : le paiement du solde par votre client.",
        ],
        quote: null,
        cta: {
          label: "Voir le chantier",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "reserves_emises": {
      // F-26 : PV signé avec réserves, à l'artisan.
      const client = text(data, "client") ?? "Votre client";
      return {
        subject: `Réserves émises par ${client}`,
        preview: `${client} a signé le procès-verbal de réception avec des réserves.`,
        title: "Réserves émises",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a signé le procès-verbal de réception de ${quoted(titre)} avec les réserves suivantes :`,
          "Intervenez rapidement pour les lever : votre client confirmera ensuite leur levée, puis réglera le solde.",
        ],
        quote: text(data, "reserves"),
        cta: {
          label: "Voir les réserves",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "levee_signalee":
      // F-26 : l'artisan signale la levée des réserves, au client.
      return {
        subject: `${artisan} a levé les réserves : confirmez`,
        preview: `Vérifiez les reprises de ${quoted(titre)}, puis confirmez la levée des réserves.`,
        title: "Réserves levées",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} indique avoir levé les réserves de votre chantier ${quoted(titre)}.`,
          "Vérifiez les reprises, puis confirmez la levée des réserves depuis votre espace : le solde vous sera ensuite demandé.",
        ],
        quote: text(data, "message"),
        cta: myChantier("Confirmer la levée"),
      };
    case "levee_confirmee": {
      // F-26 : le client confirme la levée des réserves, à l'artisan.
      const client = text(data, "client") ?? "Votre client";
      return {
        subject: `Levée des réserves confirmée pour ${quoted(titre)}`,
        preview: `${client} a confirmé la levée des réserves : chantier réceptionné.`,
        title: "Réserves levées",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a confirmé la levée des réserves de ${quoted(titre)} : le chantier est réceptionné.`,
          "Prochaine étape : le paiement du solde par votre client.",
        ],
        quote: null,
        cta: {
          label: "Voir le chantier",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "levee_relance":
      // F-26 : relance du client 7 jours après le signalement, sans confirmation.
      return {
        subject: "Rappel : confirmez la levée des réserves",
        preview: `${artisan} a signalé la levée des réserves de ${quoted(titre)}.`,
        title: "Confirmez la levée des réserves",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} a signalé il y a une semaine la levée des réserves de votre chantier ${quoted(titre)}.`,
          "Si les reprises vous conviennent, confirmez la levée depuis votre espace. Un problème ? Signalez-le depuis la page du chantier.",
        ],
        quote: null,
        cta: myChantier("Voir mon chantier"),
      };
    case "solde_paye": {
      // F-32 : solde payé, chantier clôturé (artisan et client).
      const montant = amount(data, "montant");
      if (text(data, "destinataire") === "artisan") {
        const client = text(data, "client") ?? "Votre client";
        return {
          subject: `Solde reçu pour ${quoted(titre)}`,
          preview: `${client} a payé le solde${montant ? ` de ${montant}` : ""} : chantier clôturé.`,
          title: "Chantier clôturé",
          paragraphs: [
            hello(ctx.firstName),
            `${client} a payé le solde${montant ? ` de ${montant}` : ""} pour ${quoted(titre)}, directement sur votre compte Stripe.`,
            "Le chantier est clôturé : la facture de solde est disponible dans le dossier du chantier.",
          ],
          quote: null,
          cta: {
            label: "Voir le chantier",
            url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
          },
        };
      }
      return {
        subject: "Votre chantier est terminé",
        preview: `Solde payé pour ${quoted(titre)}.`,
        title: "Solde payé",
        paragraphs: [
          hello(ctx.firstName),
          `Votre solde${montant ? ` de ${montant}` : ""} pour ${quoted(titre)} a bien été payé à ${artisan}.`,
          "Le chantier est clôturé : la facture de solde est disponible dans le dossier du chantier. Merci de votre confiance !",
          "Votre avis est précieux : prenez un court instant pour noter l'intervention et aider la communauté MENAO à choisir les meilleurs artisans.",
        ],
        quote: null,
        cta: reviewCta,
      };
    }
    case "avis_recu": {
      // F-28 : avis publié sur la fiche de l'artisan.
      const client = text(data, "client") ?? "Votre client";
      return {
        subject: `Nouvel avis de ${client}`,
        preview: `${client} a laissé un avis sur ${quoted(titre)}.`,
        title: "Nouvel avis client",
        paragraphs: [
          hello(ctx.firstName),
          `${client} a laissé un avis sur le chantier ${quoted(titre)}. Il est publié sur votre fiche MENAO, avec la mention ${quoted("Avis vérifié")}.`,
          "Vous pouvez y répondre publiquement, une seule fois, depuis la page du chantier.",
        ],
        quote: null,
        cta: {
          label: "Voir l'avis",
          url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
        },
      };
    }
    case "avis_relance":
      // F-28 : relance unique du client, 3 jours après la clôture, sans avis (maquette « Rappel de
      // laisser un avis »).
      return {
        subject: "MENAO a besoin de vous !",
        preview: `En partageant votre expérience avec ${artisan}, vous aidez à mettre en avant les meilleurs artisans.`,
        title: "MENAO a besoin de vous !",
        paragraphs: [
          hello(ctx.firstName),
          `${artisan} a terminé votre chantier ${quoted(titre)}. Partagez votre expérience pour aider la communauté MENAO à faire le bon choix pour leurs chantiers.`,
          "Cela ne prend qu'une minute : trois curseurs, le rapport qualité/prix et quelques mots.",
        ],
        quote: null,
        cta: reviewCta,
      };
    case "nouveaux_messages": {
      // F-40 : messages non lus, regroupés par fenêtre de 10 minutes ; le contenu n'est pas repris.
      const forArtisan = text(data, "destinataire") === "artisan";
      const auteur = text(data, "auteur") ?? (forArtisan ? "Votre client" : "L'artisan");
      const n = count(data, "messages") || 1;
      const base = forArtisan ? "/pro/messages" : "/mon-espace/messages";
      return {
        subject: n > 1 ? `${n} nouveaux messages de ${auteur}` : `Nouveau message de ${auteur}`,
        preview: `À propos de ${quoted(titre)}.`,
        title: n > 1 ? `${n} nouveaux messages` : "Nouveau message",
        paragraphs: [
          hello(ctx.firstName),
          n > 1
            ? `${auteur} vous a envoyé ${n} messages à propos du chantier ${quoted(titre)}.`
            : `${auteur} vous a envoyé un message à propos du chantier ${quoted(titre)}.`,
          "Lisez-le et répondez depuis la messagerie de votre espace MENAO.",
        ],
        quote: null,
        cta: { label: "Lire les messages", url: link(chantierId ? `${base}/${chantierId}` : base) },
      };
    }
    case "litige_ouvert": {
      // F-42 : l'autre partie est informée du signalement (sans sa description).
      const forArtisan = text(data, "destinataire") === "artisan";
      const categorie = DISPUTE_CATEGORIES[text(data, "categorie") ?? ""] ?? null;
      const who = forArtisan ? "Votre client" : artisan;
      return {
        subject: `Problème signalé sur ${quoted(titre)}`,
        preview: `${who} a signalé un problème${categorie ? ` (${categorie})` : ""}.`,
        title: "Un problème a été signalé",
        paragraphs: [
          hello(ctx.firstName),
          `${who} a signalé un problème${categorie ? ` (${categorie})` : ""} sur le chantier ${quoted(titre)}.`,
          "L'équipe MENAO examine la situation et vous contactera si nécessaire. Les étapes d'un chantier en cours sont suspendues jusqu'à sa décision.",
        ],
        quote: null,
        cta: forArtisan
          ? {
              label: "Voir le chantier",
              url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
            }
          : myChantier("Voir mon chantier"),
      };
    }
    case "litige_clos": {
      // F-42 : décision de l'équipe, aux deux parties ; lien vers le ticket pour le déclarant.
      const forArtisan = text(data, "destinataire") === "artisan";
      const ticketId = uuid(data, "ticket_id");
      const cancelled = text(data, "decision") === "annulation";
      return {
        subject: `Litige clos : ${quoted(titre)}`,
        preview: cancelled ? "Le chantier est annulé." : "Le chantier reprend.",
        title: "Litige clos",
        paragraphs: [
          hello(ctx.firstName),
          cancelled
            ? `L'équipe MENAO a clos le litige du chantier ${quoted(titre)} : le chantier est annulé.`
            : `L'équipe MENAO a clos le litige du chantier ${quoted(titre)} : le chantier reprend là où il en était.`,
          "Le détail de la décision est disponible dans votre espace MENAO.",
        ],
        quote: null,
        cta: ticketId
          ? { label: "Voir la décision", url: link(`/signalements/${ticketId}`) }
          : forArtisan
            ? {
                label: "Voir le chantier",
                url: link(chantierId ? `/pro/chantiers/${chantierId}` : "/pro/chantiers"),
              }
            : myChantier("Voir mon chantier"),
      };
    }
    case "reponse_support": {
      // Réponse de l'équipe dans un ticket : litige (F-42) ou autre échange (contact, dossier de
      // recherche, suppression du compte), suivi dans « Mes échanges avec MENAO » (ADR 0041).
      const ticketId = uuid(data, "ticket_id");
      const dispute = (text(data, "type") ?? "litige") === "litige";
      const what = dispute ? "signalement" : "message";
      return {
        subject: `Réponse de l'équipe MENAO à votre ${what}`,
        preview: `À propos de ${quoted(titre)}.`,
        title: "L'équipe MENAO vous a répondu",
        paragraphs: [
          hello(ctx.firstName),
          `L'équipe MENAO a répondu à votre ${what} ${quoted(titre)}.`,
          dispute
            ? "Vous pouvez lui répondre depuis la page du signalement."
            : "Vous pouvez lui répondre depuis « Mes échanges avec MENAO ».",
        ],
        quote: null,
        cta: {
          label: "Lire la réponse",
          url: link(
            ticketId ? `/${dispute ? "signalements" : "echanges"}/${ticketId}` : "/mon-espace",
          ),
        },
      };
    }
    case "dossier_valide": {
      // F-50 : dossier validé ; visible seulement avec un abonnement et des paiements actifs (F-14).
      const missing = [
        data.abonnement === false && "choisir votre formule d'abonnement",
        data.paiements === false && "activer vos paiements",
      ].filter((step): step is string => typeof step === "string");
      return {
        subject: "Votre dossier MENAO est validé",
        preview:
          missing.length > 0
            ? "Plus qu'une étape pour apparaître dans les recherches."
            : "Votre profil est visible des particuliers de votre zone.",
        title: "Bienvenue chez MENAO, votre dossier est validé !",
        paragraphs: [
          hello(ctx.firstName),
          "Bonne nouvelle : l'équipe MENAO a vérifié votre dossier et l'a validé.",
          missing.length > 0
            ? `Pour apparaître dans les recherches des particuliers, il vous reste à ${missing.join(" et à ")}.`
            : "Votre profil est maintenant visible : les particuliers de votre zone peuvent vous envoyer leurs demandes de chantier.",
        ],
        quote: text(data, "motif"),
        cta:
          missing.length > 0
            ? { label: "Terminer mon inscription", url: link("/pro/onboarding") }
            : { label: "Accéder à mon espace pro", url: link("/pro/tableau-de-bord") },
      };
    }
    case "dossier_refuse": {
      const motif = text(data, "motif");
      return {
        subject: "Votre dossier MENAO n'a pas été validé",
        preview: "Le motif et les étapes pour le corriger sont dans votre espace.",
        title: "Votre dossier n'a pas été validé",
        paragraphs: [
          hello(ctx.firstName),
          motif
            ? "L'équipe MENAO a examiné votre dossier et ne peut pas le valider en l'état. Voici son message :"
            : "L'équipe MENAO a examiné votre dossier et ne peut pas le valider en l'état. Le motif est indiqué dans votre espace.",
          "Vous pouvez corriger votre dossier et le renvoyer en vérification.",
        ],
        quote: motif,
        cta: { label: "Modifier mon dossier", url: link("/pro/onboarding") },
      };
    }
    case "dossier_complement": {
      const motif = text(data, "motif");
      return {
        subject: "Complément demandé pour votre dossier MENAO",
        preview: "Quelques éléments à compléter avant la validation.",
        title: "Votre dossier est presque complet",
        paragraphs: [
          hello(ctx.firstName),
          motif
            ? "L'équipe MENAO a besoin d'un complément pour valider votre dossier :"
            : "L'équipe MENAO a besoin d'un complément pour valider votre dossier. Le détail est indiqué dans votre espace.",
          "Complétez votre dossier, puis renvoyez-le en vérification.",
        ],
        quote: motif,
        cta: { label: "Compléter mon dossier", url: link("/pro/onboarding") },
      };
    }
    case "document_refuse": {
      // F-51 : document déposé pour un renouvellement, refusé par l'équipe.
      const doc = DOCUMENTS[text(data, "document") ?? ""] ?? "document";
      const motif = text(data, "motif");
      return {
        subject: `Document refusé : ${doc}`,
        preview: "Déposez un nouveau document depuis votre espace.",
        title: "Document refusé",
        paragraphs: [
          hello(ctx.firstName),
          motif
            ? `L'équipe MENAO n'a pas pu accepter le document déposé (${doc}). Voici son message :`
            : `L'équipe MENAO n'a pas pu accepter le document déposé (${doc}).`,
          "Déposez un nouveau document depuis votre espace pro : l'équipe le vérifiera rapidement.",
        ],
        quote: motif,
        cta: { label: "Déposer un nouveau document", url: link("/pro/onboarding/documents") },
      };
    }
    case "document_a_renouveler": {
      // F-51 : relances à J-30 puis J-7 (spec F-41).
      const type = text(data, "document") ?? "";
      const doc = DOCUMENTS[type] ?? "document";
      const insurance = INSURANCES.includes(type);
      const days = integer(data, "jours");
      const urgent = days !== null && days <= 7;
      return {
        subject: `${urgent ? "Urgent : votre" : "Votre"} ${doc} expire ${deadline(data)}`,
        preview: insurance
          ? "Déposez la nouvelle attestation pour rester visible des particuliers."
          : "Déposez un document en cours de validité.",
        title: urgent
          ? "Plus que quelques jours pour renouveler votre document"
          : "Pensez à renouveler votre document",
        paragraphs: [
          hello(ctx.firstName),
          `Votre ${doc} expire ${deadline(data)}.`,
          insurance
            ? "Déposez dès maintenant votre nouvelle attestation : sans document à jour à l'échéance, votre profil sera suspendu automatiquement et vous n'apparaîtrez plus dans les recherches des particuliers."
            : "Déposez dès maintenant un document en cours de validité pour que votre dossier reste à jour.",
          "L'équipe MENAO vérifie le nouveau document, qui remplace ensuite l'ancien.",
        ],
        quote: null,
        cta: { label: "Déposer le nouveau document", url: link("/pro/onboarding/documents") },
      };
    }
    case "document_a_renouveler_equipe": {
      // F-51 : copie à l'équipe (assurances seulement), pour le suivi des échéances.
      const doc = DOCUMENTS[text(data, "document") ?? ""] ?? "document";
      const entreprise = text(data, "entreprise") ?? "Un artisan";
      return {
        subject: `Assurance à renouveler : ${entreprise}`,
        preview: `${entreprise} : ${doc}, échéance ${deadline(data)}.`,
        title: "Assurance à renouveler",
        paragraphs: [
          hello(ctx.firstName),
          `${entreprise} doit renouveler son ${doc}, qui expire ${deadline(data)}.`,
          "L'artisan a été relancé par e-mail. Sans nouveau document validé à l'échéance, son profil sera suspendu automatiquement.",
        ],
        quote: null,
        cta: { label: "Voir les échéances", url: link("/admin/surveillance") },
      };
    }
    case "compte_radie": {
      // Radiation (ADR 0114) : exclusion définitive décidée par l'équipe, motif cité, contact.
      return {
        subject: "Votre compte MENAO a été radié",
        preview: "L'équipe MENAO a décidé de vous retirer du réseau.",
        title: "Votre compte a été radié",
        paragraphs: [
          hello(ctx.firstName),
          "L'équipe MENAO a décidé de vous retirer définitivement du réseau, pour ce motif :",
          "Votre profil n'apparaît plus auprès des particuliers. Vous gardez l'accès à vos chantiers en cours et à vos factures.",
          "Pour toute question, écrivez à l'équipe MENAO.",
        ],
        quote: text(data, "motif"),
        cta: { label: "Écrire à l'équipe MENAO", url: link("/contact") },
      };
    }
    case "compte_suspendu": {
      // Suspension décidée par l'équipe (ADR 0047) : motif cité, contact.
      if (text(data, "par") === "equipe") {
        return {
          subject: "Votre profil MENAO est suspendu",
          preview: "L'équipe MENAO a suspendu votre profil.",
          title: "Votre profil est suspendu",
          paragraphs: [
            hello(ctx.firstName),
            "L'équipe MENAO a suspendu votre profil, pour ce motif :",
            "Vous n'apparaissez plus dans les recherches des particuliers. Vos chantiers en cours ne changent pas.",
            "Pour en parler ou contester cette décision, écrivez à l'équipe MENAO.",
          ],
          quote: text(data, "motif"),
          cta: { label: "Écrire à l'équipe MENAO", url: link("/contact") },
        };
      }
      // F-51 : suspension automatique, assurance expirée sans renouvellement validé.
      const documents = Array.isArray(data.documents)
        ? data.documents.flatMap((d) =>
            typeof d === "string" && DOCUMENTS[d] ? [DOCUMENTS[d]] : [],
          )
        : [];
      return {
        subject: "Votre profil MENAO est suspendu",
        preview:
          "Assurance expirée : déposez votre attestation à jour pour être de nouveau visible.",
        title: "Votre profil est suspendu",
        paragraphs: [
          hello(ctx.firstName),
          documents.length > 0
            ? `Votre profil est suspendu car une assurance obligatoire n'est plus à jour : ${documents.join(", ")}.`
            : "Votre profil est suspendu car une assurance obligatoire n'est plus à jour.",
          "Vous n'apparaissez plus dans les recherches des particuliers. Vos chantiers en cours ne changent pas.",
          "Déposez votre attestation à jour : dès que l'équipe MENAO l'a validée, la suspension est levée automatiquement.",
        ],
        quote: null,
        cta: { label: "Déposer mon attestation à jour", url: link("/pro/onboarding/documents") },
      };
    }
    case "equipe_nouveau_ticket":
    case "equipe_ticket_en_retard": {
      // Alertes de l'équipe (ADR 0050) : objet du ticket cité, lien vers sa page du back-office.
      const ticketId = text(data, "ticket_id");
      const label = TICKET_TYPES[text(data, "type") ?? ""] ?? "ticket";
      const late = type === "equipe_ticket_en_retard";
      return {
        subject: `${late ? "Ticket en retard" : "Nouveau ticket"} : ${label}`,
        preview: late ? "Le délai de réponse est dépassé." : "Un nouveau ticket attend l'équipe.",
        title: late ? "Ticket en retard" : "Nouveau ticket",
        paragraphs: [
          hello(ctx.firstName),
          late
            ? `Le délai de réponse de ce ticket est dépassé : ${label}.`
            : `Un nouveau ticket attend l'équipe MENAO : ${label}.`,
        ],
        quote: text(data, "objet"),
        cta: {
          label: "Ouvrir le ticket",
          url: link(ticketId ? `/admin/tickets/${ticketId}` : "/admin/tickets"),
        },
      };
    }
    case "equipe_dossier_a_verifier": {
      const artisanId = text(data, "artisan_id");
      const entreprise = text(data, "entreprise") ?? "Un artisan";
      return {
        subject: `Dossier artisan à vérifier : ${entreprise}`,
        preview: `${entreprise} a envoyé son dossier en vérification.`,
        title: "Dossier artisan à vérifier",
        paragraphs: [
          hello(ctx.firstName),
          `${entreprise} a envoyé son dossier : documents, SIRET et assurances sont à vérifier.`,
        ],
        quote: null,
        cta: {
          label: "Vérifier le dossier",
          url: link(artisanId ? `/admin/artisans/${artisanId}` : "/admin/artisans"),
        },
      };
    }
    case "acces_suspendu":
      // Accès au compte suspendu par l'équipe (ADR 0048) : motif cité, contact.
      return {
        subject: "L'accès à votre compte MENAO est suspendu",
        preview: "L'équipe MENAO a suspendu l'accès à votre compte.",
        title: "Accès à votre compte suspendu",
        paragraphs: [
          hello(ctx.firstName),
          "L'équipe MENAO a suspendu l'accès à votre compte, pour ce motif :",
          "Vous ne pouvez plus vous connecter pour le moment. Vos données sont conservées.",
          "Pour en parler ou contester cette décision, écrivez à l'équipe MENAO.",
        ],
        quote: text(data, "motif"),
        cta: { label: "Écrire à l'équipe MENAO", url: link("/contact") },
      };
    case "acces_retabli":
      return {
        subject: "L'accès à votre compte MENAO est rétabli",
        preview: "Vous pouvez de nouveau vous connecter.",
        title: "Accès à votre compte rétabli",
        paragraphs: [
          hello(ctx.firstName),
          "L'équipe MENAO a rétabli l'accès à votre compte : vous pouvez de nouveau vous connecter.",
        ],
        quote: null,
        cta: { label: "Me connecter", url: link("/connexion") },
      };
    case "compte_reactive": {
      const visible = data.visible === true;
      return {
        subject: "Votre profil MENAO est de nouveau actif",
        preview: visible
          ? "Vous apparaissez de nouveau dans les recherches."
          : "Assurances à jour : la suspension de votre profil est levée.",
        title: "La suspension de votre profil est levée",
        paragraphs: [
          hello(ctx.firstName),
          text(data, "par") === "equipe"
            ? "L'équipe MENAO a levé la suspension de votre profil."
            : "Votre nouvelle attestation a été validée : vos assurances sont à jour et la suspension de votre profil est levée.",
          visible
            ? "Vous apparaissez de nouveau dans les recherches des particuliers de votre zone."
            : "Pour apparaître de nouveau dans les recherches, vérifiez votre formule et vos paiements dans votre espace pro.",
        ],
        quote: null,
        cta: { label: "Accéder à mon espace pro", url: link("/pro/tableau-de-bord") },
      };
    }
  }
}

/** Version texte de l'e-mail (messageries sans HTML). */
export function plainText(content: EmailContent): string {
  return [
    content.title,
    "",
    ...content.paragraphs.flatMap((p) => [p, ""]),
    ...(content.quote ? [quoted(content.quote), ""] : []),
    `${content.cta.label} : ${content.cta.url}`,
    "",
    "—",
    EMAIL_FOOTER,
  ].join("\n");
}
