import {
  EXAMPLE_HOURS,
  EXAMPLE_IDS,
  artisanTodo,
  availabilityStatus,
  clientsAwaitingQuote,
  exampleActivityInput,
  exampleAgendaItems,
  exampleChantier,
  exampleChantierRows,
  exampleConversations,
  exampleFollowUp,
  exampleGrade,
  exampleHubFacts,
  exampleInbox,
  exampleInvoices,
  exampleMessages,
  examplePayments,
  examplePhotoKey,
  exampleProfile,
  exampleQuoteDraftLines,
  exampleQuoteRows,
  exampleRequest,
  exampleReviews,
  exampleScore,
  exampleSentQuote,
  addDays,
  journalSummary,
  laterAppointments,
  monthToDateRevenue,
  parisLocalToDate,
  parisToday,
  paymentProgress,
  profileStrength,
  requestsAwaitingAnswer,
  revenueTrend,
  upcomingAgenda,
  type ExamplePhoto,
} from "@menao/core";
import type { ArtisanProfile, Grade } from "@menao/validation";
import { env } from "./env";
import { formatDayLabel, formatTime } from "./format";
import type { GradeView } from "./grade";
import type { Conversation, ConversationItem } from "./messages";
import type { Dashboard } from "./pro-dashboard";
import type { AgendaWeek } from "./pro-agenda";
import type { ArtisanChantier, ArtisanChantierRow, ArtisanFollowUp } from "./pro-chantiers";
import type { ArtisanInvoice, ArtisanQuote } from "./pro-documents";
import type { QuoteDraft } from "./pro-quotes";
import type { InboxItem, Opportunity } from "./pro-requests";
import type { MyReviews } from "./pro-reviews";
import type { ProfileHub } from "./profile-hub";
import { hubStatuses } from "./profile-hub-status";
import type { ArtisanPage } from "./requests";

/**
 * Données d'exemple de l'application (ADR 0184), au format de chaque écran : mêmes demandes,
 * chantiers, devis, messages et avis fictifs que les pages d'exemples du site (`@menao/core`).
 * Les photos sont celles du site public (images de métiers, sans données personnelles).
 */

const PHOTOS: Record<ExamplePhoto, string> = {
  carrelage: "carreleur-400.webp",
  plomberie: "plombier-400.webp",
  chauffage: "chauffagiste-400.webp",
};
const photoUrl = (path: string) => {
  const key = examplePhotoKey(path);
  return key ? `${env.siteUrl}/images/metiers/${PHOTOS[key]}` : null;
};
const photoUrls = (paths: readonly (string | null)[]) =>
  paths.flatMap((p) => {
    const url = p ? photoUrl(p) : null;
    return url ? [url] : [];
  });

// Les lignes des fonctions de la base sont typées sans null par la génération ; les exemples
// gardent leurs null (comme les vraies réponses), d'où les conversions ci-dessous.
export function exampleInboxItems(now = new Date()): InboxItem[] {
  return exampleInbox(now).map((r) => ({ ...r, photoUrl: null })) as unknown as InboxItem[];
}

export function exampleChantierList(now = new Date()): ArtisanChantierRow[] {
  return exampleChantierRows(now) as unknown as ArtisanChantierRow[];
}

export function exampleOpportunity(id: string, now = new Date()): Opportunity | null {
  const detail = exampleRequest(id, now);
  return detail ? { detail, photoUrls: [], reputation: null, partners: [] } : null;
}

export function exampleArtisanChantier(id: string, now = new Date()): ArtisanChantier | null {
  const detail = exampleChantier(id, now);
  if (!detail) return null;
  return {
    detail,
    photoUrls: [],
    sentQuote: detail.chantier.status === "devis_envoye" ? exampleSentQuote(now) : null,
    deposit: null,
    depositInvoice: null,
    hasDraft: id === EXAMPLE_IDS.chantierChauffeEau,
  };
}

export function exampleArtisanFollowUp(now = new Date()): ArtisanFollowUp {
  const f = exampleFollowUp(now);
  const journal = journalSummary(
    f.updates.map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
  const invoice = f.invoices[0];
  return {
    coverUrl: null,
    depositPaid: true,
    journal,
    photoUrls: photoUrls(journal.photos),
    documents: [
      {
        kind: "devis",
        numero: f.quote.numero,
        date: f.quote.signed_at,
        id: f.quote.id,
        signed: true,
      },
      ...(invoice
        ? [
            {
              kind: "acompte" as const,
              numero: invoice.numero,
              date: invoice.issued_on,
              id: invoice.id,
              signed: false,
            },
          ]
        : []),
    ],
    quote: { totalTtcCents: f.quote.total_ttc_cents, startDate: f.quote.start_date },
    progress: paymentProgress(
      f.quote.total_ttc_cents,
      f.payments.map((p) => ({ status: p.status, amountCents: p.amount_cents })),
    ),
    finishedAt: null,
    receivedAt: null,
    balancePaidAt: null,
    balanceCents: null,
    reception: null,
    review: null,
    openTicketId: null,
    clientRating: null,
    ratingsVisible: false,
  };
}

export function exampleQuoteDraft(id: string, now = new Date()): QuoteDraft | null {
  if (id !== EXAMPLE_IDS.chantierChauffeEau) return null;
  return {
    lines: exampleQuoteDraftLines(),
    appointmentAt: exampleChantier(id, now)?.appointment?.starts_at ?? null,
    saved: true,
    assujettiTva: true,
  };
}

export function exampleQuoteList(now = new Date()): ArtisanQuote[] {
  return exampleQuoteRows(now) as unknown as ArtisanQuote[];
}

export function exampleConversationList(now = new Date()): ConversationItem[] {
  return exampleConversations(now).map((c) => ({ ...c, avatarUrl: null }));
}

export function exampleConversation(id: string, now = new Date()): Conversation | null {
  const c = exampleChantier(id, now);
  if (!c) return null;
  return {
    title: c.chantier.title,
    otherName: [c.client.first_name, c.client.last_name].filter(Boolean).join(" "),
    avatarUrl: null,
    chantierPath: `/pro-chantier/${id}`,
    closed: false,
    messages: exampleMessages(id, now).map((m) => ({
      id: m.id,
      mine: m.mine,
      kind: "texte",
      body: m.body,
      url: null,
      hidden: false,
      read: m.read,
      day: formatDayLabel(m.created_at, now),
      time: formatTime(m.created_at),
    })),
  };
}

export function exampleAgendaWeek(monday: string, now = new Date()): AgendaWeek {
  const today = parisToday(now);
  return {
    monday,
    today,
    availability: availabilityStatus({ paused: false, availableFrom: null, absences: [], today }),
    hours: [...EXAMPLE_HOURS],
    items: exampleAgendaItems(
      parisLocalToDate(monday, "00:00"),
      parisLocalToDate(addDays(monday, 7), "00:00"),
      now,
    ),
    absences: [],
  };
}

export function exampleInvoiceList(now = new Date()): ArtisanInvoice[] {
  return exampleInvoices(now).map((i) => ({
    id: i.id,
    numero: i.numero,
    kind: i.kind,
    issuedOn: i.issued_on,
    totalTtcCents: i.total_ttc_cents,
    client: [i.document.client.first_name, i.document.client.last_name].join(" "),
    chantier: i.document.chantier.title,
  }));
}

export function exampleMyReviews(now = new Date()): MyReviews {
  const score = exampleScore();
  return {
    reviews: exampleReviews(now).map((r) => ({
      id: r.id,
      chantierId: r.chantier_id,
      authorName: r.author_name,
      score: r.score,
      quality: r.quality,
      delays: r.delays,
      communication: r.communication,
      cleanliness: r.cleanliness,
      valueForMoney: r.value_for_money,
      comment: r.comment,
      experienceOn: r.experience_on,
      status: r.status,
      moderationReason: r.moderation_reason,
      reply: r.reply,
      createdAt: r.created_at,
    })),
    score: {
      review_count: score.review_count,
      quality: score.quality,
      delays: score.delays,
      communication: score.communication,
      value_for_money: score.value_for_money,
      global: score.global_score,
    },
    chantierTitles: new Map(),
  };
}

/** Grade d'exemple : le vrai barème lu en base, avec une progression fictive de niveau 2. */
export function exampleGradeView(grade: Grade, now = new Date()): GradeView {
  const g = exampleGrade(grade, now);
  return {
    xp: g.xp,
    level: g.level,
    levels: g.levels.map((l) => ({
      level: l.level,
      xpMin: l.xp_min,
      reward: l.reward,
      rewardDetail: l.reward_detail,
    })),
    objectives: g.objectives,
    badges: g.badges,
    claimedLevels: [],
  };
}

function exampleArtisanProfile(name: string | null, now: Date): ArtisanProfile {
  return exampleProfile(name, now);
}

export function exampleMyPage(
  name: string | null,
  avatarUrl: string | null,
  now = new Date(),
): ArtisanPage {
  const profile = exampleArtisanProfile(name, now);
  return {
    profile,
    avatarUrl,
    photoUrls: photoUrls(profile.photos),
    reviews: exampleReviews(now).map((r) => ({
      id: r.id,
      author: r.author_name,
      createdAt: r.created_at,
      experienceOn: r.experience_on,
      score: r.score,
      comment: r.comment,
      reply: r.reply,
    })),
  };
}

export function exampleProfileHub(
  account: { firstName: string; lastName: string; email: string | null; avatarUrl: string | null },
  now = new Date(),
): ProfileHub {
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || null;
  const profile = exampleArtisanProfile(name, now);
  const score = exampleScore();
  return {
    name: profile.display_name,
    initials:
      (account.firstName.charAt(0) + account.lastName.charAt(0)).toUpperCase() ||
      profile.display_name.charAt(0).toUpperCase(),
    company: profile.company_name,
    city: profile.zone.city,
    avatarUrl: account.avatarUrl,
    email: account.email,
    status: "valide",
    verified: true,
    score: { percent: score.global_score, count: score.review_count },
    strength: profileStrength({
      hasAvatar: true,
      presentationLength: profile.presentation?.length ?? 0,
      photoCount: profile.photos.length,
      workTypeCount: profile.work_types.length,
      certificationCount: 0,
      verified: true,
    }),
    itemsLeft: 0,
    statuses: hubStatuses(exampleHubFacts(now), now),
    pageUrl: null,
    referral: null,
    referrals: [],
    welcomeGift: null,
  };
}

/** Tableau de bord d'exemple : mêmes calculs que pour un vrai artisan, sur les exemples. */
export function exampleDashboard(firstName: string | null, now = new Date()): Dashboard {
  const inbox = exampleInboxItems(now);
  const rows = exampleChantierRows(now).map((c) => ({
    ...c,
    appointmentAt: c.appointment_at,
    startAt: c.start_at,
    particulierId: c.particulier_id,
  }));
  const appointments = upcomingAgenda(rows, now, 8).map(({ kind, at, row }) => ({
    kind,
    chantierId: row.chantier_id,
    startsAt: at,
    title: row.title,
    place: [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
  }));
  const awaiting = requestsAwaitingAnswer(inbox, now);
  const revenue = monthToDateRevenue(examplePayments(now), now);
  return {
    firstName,
    suspended: false,
    radiated: null,
    urssafMissing: false,
    documentsToRenew: [],
    visibility: { visible: true, missing: [] },
    awaitingClients: clientsAwaitingQuote(rows),
    revenue: {
      cents: revenue.currentCents,
      trend: revenueTrend(revenue.currentCents, revenue.previousCents),
      previousMonth: revenue.previousMonth,
    },
    responseTime: { minutes: 38, responses: 6 },
    appointments: appointments.slice(0, 4),
    requests: awaiting.slice(0, 3),
    reviewsToAnswer: 1,
    todo: artisanTodo(
      {
        requests: awaiting.map((r) => ({
          id: r.request_id,
          expiresAt: r.expires_at,
          title: r.summary || r.trade_label,
          place: [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
        })),
        appointments: appointments.map((a) => ({ ...a, at: a.startsAt })),
        quotesToSend: [],
        documentsToRenew: [],
        urssafMissing: false,
        paymentsMissing: false,
        reviewsToAnswer: 0,
        welcomeGiftToChoose: false,
      },
      now,
    ),
    later: laterAppointments(
      appointments.map((a) => ({ ...a, at: a.startsAt })),
      now,
    ).slice(0, 4),
    activityInput: exampleActivityInput(now),
    quoteChantierId: EXAMPLE_IDS.chantierChauffeEau,
    examplesShown: false,
  };
}
