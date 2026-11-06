/**
 * E-mails de la secrétaire vocale « Camille » (F-75, ADR 0225), envoyés pendant un appel à la
 * demande de l'appelant : le lien d'inscription d'un artisan, l'état du dossier d'un artisan
 * inscrit (envoyé à l'adresse de son compte : rien n'est dit au téléphone), et la demande de
 * travaux préparée pour un particulier (F-77, ADR 0227), l'état des demandes d'un particulier
 * (F-79, ADR 0229), envoyé à l'adresse de son compte.
 */
import { SIGNUP_STEP_LABELS, type EmailContent } from "./content.ts";

/** Pied de page : l'appelant a demandé l'e-mail ; aucune inscription à une liste. */
export const VOICE_EMAIL_FOOTER =
  "Vous recevez cet e-mail car vous l'avez demandé à Camille, l'assistante téléphonique de MENAO. Message envoyé automatiquement : merci de ne pas y répondre.";

const hello = (firstName: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,");

const listing = (items: readonly string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

export function voiceSignupLinkContent(input: {
  firstName: string | null;
  siteUrl: string;
}): EmailContent {
  const site = input.siteUrl.replace(/\/+$/, "");
  return {
    subject: "Votre lien pour vous inscrire sur MENAO",
    preview: "Créez votre compte artisan en une dizaine de minutes.",
    title: "Inscrivez-vous sur MENAO",
    paragraphs: [
      hello(input.firstName),
      "Comme convenu au téléphone, voici le lien pour créer votre compte artisan MENAO. L'inscription prend une dizaine de minutes, sur le site ou dans l'application.",
      "Préparez une photo de votre Kbis ou extrait INSEE de moins de 3 mois, de vos attestations décennale et RC Pro, de votre attestation URSSAF de moins de 6 mois et de votre pièce d'identité.",
      "Une question ? Rappelez Camille, ou demandez à être rappelé par un conseiller.",
    ],
    quote: null,
    cta: { label: "Créer mon compte artisan", url: `${site}/pro/inscription` },
  };
}

export type VoiceDossier = {
  firstName: string | null;
  /** Statut de la fiche artisan (public.artisan_status). */
  status: string;
  /** Étapes de l'inscription encore à faire (app.onboarding_missing_steps). */
  signupMissing: string[];
  /** Ce qui manque pour être visible une fois validé (app.activation_missing_steps). */
  activationMissing: string[];
};

const labels = (steps: readonly string[]) =>
  steps.map((s) => SIGNUP_STEP_LABELS[s]).filter((l): l is string => typeof l === "string");

export function voiceDossierContent(dossier: VoiceDossier, siteUrl: string): EmailContent {
  const site = siteUrl.replace(/\/+$/, "");
  const base = {
    quote: null,
    preview: "L'état de votre dossier MENAO, comme demandé au téléphone.",
  };
  const signup = labels(dossier.signupMissing);
  const activation = labels(dossier.activationMissing);
  if (dossier.status === "valide") {
    return {
      ...base,
      subject: "Votre dossier MENAO est validé",
      title: "Votre dossier est validé",
      paragraphs: [
        hello(dossier.firstName),
        "Votre dossier est validé par l'équipe MENAO.",
        activation.length
          ? `Pour recevoir des demandes, il vous reste : ${listing(activation)}. Ces deux étapes se font sur le site, depuis votre espace pro.`
          : "Tout est prêt : vous êtes visible des clients de votre zone.",
      ],
      cta: { label: "Ouvrir mon espace pro", url: `${site}/pro` },
    };
  }
  if (dossier.status === "en_verification") {
    return {
      ...base,
      subject: "Votre dossier MENAO est en cours de vérification",
      title: "Votre dossier est en cours de vérification",
      paragraphs: [
        hello(dossier.firstName),
        "Votre dossier est bien arrivé : l'équipe MENAO vérifie votre entreprise et chacun de vos documents. Vous recevrez un e-mail dès qu'il est validé, ou si un document doit être remplacé.",
      ],
      cta: { label: "Suivre mon dossier", url: `${site}/pro` },
    };
  }
  if (dossier.status === "brouillon") {
    return {
      ...base,
      subject: "Votre inscription MENAO n'est pas terminée",
      title: "Votre inscription n'est pas terminée",
      paragraphs: [
        hello(dossier.firstName),
        signup.length
          ? `Pour envoyer votre dossier, il vous reste : ${listing(signup)}.`
          : "Votre dossier est presque prêt : il ne reste plus qu'à l'envoyer.",
        "Tout est enregistré au fur et à mesure : vous reprenez là où vous en étiez.",
      ],
      cta: { label: "Terminer mon inscription", url: `${site}/pro/onboarding` },
    };
  }
  // Refusé, suspendu ou radié : l'équipe explique la situation elle-même.
  return {
    ...base,
    subject: "Votre dossier MENAO",
    title: "Votre dossier MENAO",
    paragraphs: [
      hello(dossier.firstName),
      "La situation de votre dossier demande un échange avec l'équipe MENAO : vous trouverez le détail dans votre espace pro, et vous pouvez nous écrire depuis la page contact.",
    ],
    cta: { label: "Contacter l'équipe", url: `${site}/contact` },
  };
}

export type VoiceAppointment = {
  firstName: string;
  /** Prénom du conseiller MENAO du secteur. */
  advisor: string;
  /** « mardi 10 novembre à 10 h » (heure de Paris). */
  when: string;
  kind: "appel" | "visite";
  /** Numéro au format affiché, pour un appel. */
  phone: string | null;
  address: string | null;
};

/** Confirmation du rendez-vous avec le conseiller, envoyée à l'artisan (ADR 0226). */
export function voiceAppointmentContent(rdv: VoiceAppointment, siteUrl: string): EmailContent {
  const site = siteUrl.replace(/\/+$/, "");
  const visit = rdv.kind === "visite";
  return {
    subject: `Votre rendez-vous MENAO le ${rdv.when}`,
    preview: `${rdv.advisor}, conseiller MENAO, ${visit ? "passe vous voir" : "vous appelle"} le ${rdv.when}.`,
    title: "Votre rendez-vous est confirmé",
    paragraphs: [
      hello(rdv.firstName),
      visit
        ? `${rdv.advisor}, conseiller MENAO de votre secteur, passe vous voir le ${rdv.when}${rdv.address ? `, ${rdv.address}` : ""}.`
        : `${rdv.advisor}, conseiller MENAO de votre secteur, vous appelle le ${rdv.when}${rdv.phone ? ` au ${rdv.phone}` : ""}.`,
      "Pour l'inscription, préparez une photo de votre Kbis ou extrait INSEE de moins de 3 mois, de vos attestations décennale et RC Pro, de votre attestation URSSAF de moins de 6 mois et de votre pièce d'identité.",
      "Un empêchement ? Rappelez Camille, l'assistante de MENAO, pour prévenir votre conseiller.",
    ],
    quote: null,
    cta: { label: "Découvrir l'espace pro", url: `${site}/pro` },
  };
}

export type VoiceWorkRequest = {
  firstName: string;
  /** Résumé du besoin par l'analyse (projects.summary), s'il existe. */
  summary: string | null;
  city: string | null;
  /** Artisans disponibles proposés (au plus 3). */
  available: number;
  /** Lien à usage unique vers la demande préparée (jeton de transfert). */
  url: string;
};

/**
 * Demande de travaux préparée au téléphone (ADR 0227) : rien n'est parti chez les artisans ; le
 * particulier vérifie et envoie lui-même depuis le lien.
 */
export function voiceWorkRequestContent(request: VoiceWorkRequest): EmailContent {
  const near = request.city ? ` près de ${request.city}` : "";
  return {
    subject: "Votre demande de travaux est prête",
    preview: "Vérifiez-la, puis envoyez-la vous-même aux artisans.",
    title: "Votre demande est prête",
    paragraphs: [
      hello(request.firstName),
      "Comme convenu au téléphone avec Camille, voici votre demande de travaux. Elle n'est pas encore partie : rien n'est envoyé aux artisans tant que vous ne l'avez pas vérifiée.",
      request.available > 0
        ? `${request.available === 1 ? "Un artisan vérifié disponible" : `${request.available} artisans vérifiés disponibles`}${near} ${request.available === 1 ? "vous est proposé" : "vous sont proposés"} ; vous pourrez changer ce choix.`
        : `Aucun artisan n'est encore disponible pour ces travaux${near} : depuis le lien, vous pourrez demander à l'équipe MENAO de chercher pour vous.`,
      "Ouvrez le lien, créez votre espace MENAO gratuit ou connectez-vous, vérifiez les informations, puis envoyez votre demande. Le lien est valable 7 jours.",
    ],
    quote: request.summary,
    cta: { label: "Vérifier et envoyer ma demande", url: request.url },
  };
}

export type VoiceRequestsStatus = {
  firstName: string | null;
  /** L'adresse correspond à un compte particulier. */
  account: boolean;
  /** Demandes préparées au téléphone qui attendent encore la vérification (ADR 0227). */
  pendingPrepared: number;
  projects: {
    summary: string | null;
    trade: string | null;
    city: string | null;
    /** Date d'envoi (ISO). */
    sentAt: string;
    /** Statut de chaque demande (public.request_status). */
    artisans: { name: string | null; status: string }[];
  }[];
};

const REQUEST_STATUS_PHRASES: Record<string, string> = {
  envoyee: "n'a pas encore répondu",
  acceptee: "a accepté, ses coordonnées sont dans votre espace",
  refusee: "n'est pas disponible",
  expiree: "n'a pas répondu à temps",
  annulee: "demande annulée",
  a_verifier: "demande en cours de vérification par l'équipe MENAO",
};
const STILL_OPEN = ["envoyee", "acceptee", "a_verifier"];

const sentDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

/** « Où en est ma demande ? » (ADR 0229) : l'état des demandes, rien n'a été dit au téléphone. */
export function voiceRequestsStatusContent(
  state: VoiceRequestsStatus,
  siteUrl: string,
): EmailContent {
  const site = siteUrl.replace(/\/+$/, "");
  const paragraphs = [hello(state.firstName)];
  for (const project of state.projects) {
    const place = [project.trade, project.city].filter(Boolean).join(", ");
    const answers = project.artisans
      .map((a) => `${a.name ?? "un artisan"} ${REQUEST_STATUS_PHRASES[a.status] ?? "sans réponse"}`)
      .join(" ; ");
    paragraphs.push(
      `« ${project.summary ?? "Votre demande"} »${place ? ` (${place})` : ""}, envoyée le ${sentDay(project.sentAt)} : ${answers}.`,
    );
  }
  if (state.projects.some((p) => !p.artisans.some((a) => STILL_OPEN.includes(a.status)))) {
    paragraphs.push(
      "Quand aucun artisan n'a donné suite, vous pouvez choisir un autre artisan depuis votre espace, en quelques secondes.",
    );
  }
  if (state.account && state.projects.length === 0) {
    paragraphs.push("Vous n'avez envoyé aucune demande de travaux ces quatre derniers mois.");
  }
  if (state.pendingPrepared > 0) {
    paragraphs.push(
      `${state.pendingPrepared > 1 ? "Des demandes préparées" : "Une demande préparée"} au téléphone ${state.pendingPrepared > 1 ? "attendent" : "attend"} encore votre vérification : ouvrez l'e-mail « Votre demande de travaux est prête » et suivez son lien, valable 7 jours. Rien ne part chez les artisans avant.`,
    );
  }
  return {
    subject: "Où en est votre demande de travaux",
    preview: "L'état de vos demandes, comme demandé au téléphone.",
    title: "L'état de vos demandes",
    paragraphs,
    quote: null,
    cta: state.account
      ? { label: "Ouvrir mon espace", url: `${site}/mon-espace` }
      : { label: "Aller sur MENAO", url: site },
  };
}
