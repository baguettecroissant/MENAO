import { renderToStaticMarkup } from "react-dom/server";
import {
  EMAIL_FOOTER,
  EMAIL_PREFERENCES_LABEL,
  notificationContent,
  plainText,
  type EmailContent,
  type EmailContext,
  type NotificationType,
} from "./content.ts";
import { NotificationEmail } from "./notification-email.tsx";
import {
  accountantExportContent,
  accountantFooter,
  type AccountantExportEmail,
} from "./accountant.ts";
import {
  VOICE_EMAIL_FOOTER,
  voiceAppointmentContent,
  voiceDossierContent,
  voiceSignupLinkContent,
  type VoiceAppointment,
  type VoiceDossier,
} from "./voice-assistant.ts";

export type RenderedEmail = { subject: string; html: string; text: string };

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/** E-mail prêt à envoyer (objet, HTML, texte) pour une notification (F-41). */
export function renderNotification(
  type: NotificationType,
  data: Record<string, unknown>,
  ctx: EmailContext,
): RenderedEmail {
  const content = notificationContent(type, data, ctx);
  const preferencesUrl = `${ctx.siteUrl.replace(/\/+$/, "")}/notifications`;
  return {
    subject: content.subject,
    html:
      DOCTYPE +
      renderToStaticMarkup(
        <NotificationEmail
          content={content}
          siteUrl={ctx.siteUrl}
          preferencesUrl={preferencesUrl}
        />,
      ),
    text: plainText(content, `${EMAIL_FOOTER}\n${EMAIL_PREFERENCES_LABEL} : ${preferencesUrl}`),
  };
}

/** E-mail du comptable : export d'une période (F-63), avec le pied de page propre au comptable. */
export function renderAccountantExport(
  email: AccountantExportEmail,
  siteUrl: string,
): RenderedEmail {
  const content = accountantExportContent(email);
  const footer = accountantFooter(email.company);
  return {
    subject: content.subject,
    html:
      DOCTYPE +
      renderToStaticMarkup(
        <NotificationEmail content={content} siteUrl={siteUrl} footer={footer} />,
      ),
    text: plainText(content, footer),
  };
}

function renderContent(content: EmailContent, siteUrl: string, footer: string): RenderedEmail {
  return {
    subject: content.subject,
    html:
      DOCTYPE +
      renderToStaticMarkup(
        <NotificationEmail content={content} siteUrl={siteUrl} footer={footer} />,
      ),
    text: plainText(content, footer),
  };
}

/** Secrétaire vocale (ADR 0225) : lien d'inscription demandé au téléphone. */
export function renderVoiceSignupLink(firstName: string | null, siteUrl: string): RenderedEmail {
  return renderContent(voiceSignupLinkContent({ firstName, siteUrl }), siteUrl, VOICE_EMAIL_FOOTER);
}

/** Secrétaire vocale (ADR 0225) : état du dossier, envoyé à l'adresse du compte. */
export function renderVoiceDossier(dossier: VoiceDossier, siteUrl: string): RenderedEmail {
  return renderContent(voiceDossierContent(dossier, siteUrl), siteUrl, VOICE_EMAIL_FOOTER);
}

/** Secrétaire vocale (ADR 0226) : confirmation du rendez-vous avec le conseiller du secteur. */
export function renderVoiceAppointment(rdv: VoiceAppointment, siteUrl: string): RenderedEmail {
  return renderContent(voiceAppointmentContent(rdv, siteUrl), siteUrl, VOICE_EMAIL_FOOTER);
}
