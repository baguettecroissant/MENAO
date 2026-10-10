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
  /** Adresse du site, sans barre finale (ex. https://menao-web.vercel.app). */
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

/** Motifs de refus d'un devis par le client (enum public.quote_refusal_reason), vus par l'artisan. */
const REFUSAL_REASONS: Record<string, string> = {
  trop_cher: "prix trop élevé",
  autre_artisan: "un autre artisan a été choisi",
  projet_reporte: "projet reporté",
  autre: "autre raison",
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
        cta: { label: "Voir mon espace", url: link("/mon-espace") },
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
        cta: { label: "Voir mon espace", url: link("/mon-espace") },
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
          : { label: "Voir mon espace", url: link("/mon-espace") },
      };
    }
    case "chantier_annule":
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
    case "acompte_paye": {
      const montant = amount(data, "montant");
      if (text(data, "destinataire") === "artisan") {
        const client = text(data, "client") ?? "Le client";
        return {
          subject: `Acompte reçu pour ${quoted(titre)}`,
          preview: `${client} a payé l'acompte${montant ? ` de ${montant}` : ""}.`,
          title: "Acompte payé",
          paragraphs: [
            hello(ctx.firstName),
            `${client} a payé l'acompte${montant ? ` de ${montant}` : ""} pour ${quoted(titre)}, directement sur votre compte Stripe.`,
            "Confirmez maintenant la date de démarrage du chantier depuis votre espace pro.",
          ],
          quote: null,
          cta: {
            label: "Voir le chantier",
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
        cta: { label: "Voir mon espace", url: link("/mon-espace") },
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
