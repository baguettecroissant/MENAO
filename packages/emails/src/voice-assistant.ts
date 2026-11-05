/**
 * E-mails de la secrétaire vocale « Camille » (F-75, ADR 0225), envoyés pendant un appel à la
 * demande de l'appelant : le lien d'inscription d'un artisan, l'état du dossier d'un artisan
 * inscrit (envoyé à l'adresse de son compte : rien n'est dit au téléphone).
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
