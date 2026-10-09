import { expect, type APIRequestContext } from "@playwright/test";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type SearchResult = { messages: { ID: string }[] };
type Message = { HTML: string; Text: string };

/** Récupère dans Mailpit (Supabase local) le lien /auth/confirm envoyé à `email`. */
export async function authLinkFor(request: APIRequestContext, email: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const body = (await res.json()) as SearchResult;
        id = body.messages[0]?.ID;
        return id;
      },
      { message: `e-mail reçu par ${email}`, timeout: 15_000 },
    )
    .toBeTruthy();

  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);
  const message = (await res.json()) as Message;
  const href = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error("Lien de confirmation introuvable dans l'e-mail");
  return href.replaceAll("&amp;", "&");
}
