import { expect, type APIRequestContext } from "@playwright/test";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type SearchResult = { messages: { ID: string }[] };
type Message = { HTML: string; Text: string };

/**
 * Récupère dans Mailpit (Supabase local) le dernier lien /auth/confirm envoyé à `email`. Avec
 * `type` (ex. « email_change »), attend un e-mail dont le lien porte ce type : utile quand l'adresse
 * a déjà reçu d'autres e-mails.
 */
export async function authLinkFor(
  request: APIRequestContext,
  email: string,
  type?: string,
): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const body = (await res.json()) as SearchResult;
        for (const { ID } of body.messages) {
          const message = (await (
            await request.get(`${MAILPIT_URL}/api/v1/message/${ID}`)
          ).json()) as Message;
          const href = /href="([^"]*\/auth\/confirm[^"]*)"/
            .exec(message.HTML)?.[1]
            ?.replaceAll("&amp;", "&");
          if (href && (!type || new URL(href).searchParams.get("type") === type)) {
            link = href;
            return link;
          }
          // Sans type demandé : le plus récent seulement.
          if (!type) break;
        }
        return undefined;
      },
      { message: `e-mail reçu par ${email}`, timeout: 15_000 },
    )
    .toBeTruthy();
  if (!link) throw new Error("Lien de confirmation introuvable dans l'e-mail");
  return link;
}

/** Code à 6 chiffres du dernier e-mail de confirmation envoyé à `email` (ADR 0110). */
export async function authCodeFor(request: APIRequestContext, email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const body = (await res.json()) as SearchResult;
        const latest = body.messages[0];
        if (!latest) return undefined;
        const message = (await (
          await request.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)
        ).json()) as Message;
        code = />\s*(\d{6})\s*</.exec(message.HTML)?.[1];
        return code;
      },
      { message: `code reçu par ${email}`, timeout: 15_000 },
    )
    .toBeTruthy();
  if (!code) throw new Error("Code introuvable dans l'e-mail");
  return code;
}
