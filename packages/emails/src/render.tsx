import { renderToStaticMarkup } from "react-dom/server";
import {
  notificationContent,
  plainText,
  type EmailContext,
  type NotificationType,
} from "./content.ts";
import { NotificationEmail } from "./notification-email.tsx";

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
  return {
    subject: content.subject,
    html:
      DOCTYPE + renderToStaticMarkup(<NotificationEmail content={content} siteUrl={ctx.siteUrl} />),
    text: plainText(content),
  };
}
