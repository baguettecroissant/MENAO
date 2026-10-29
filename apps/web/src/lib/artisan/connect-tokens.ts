import {
  type ConnectAccountTokenData,
  type ConnectPersonTokenData,
  type ConnectTokenPrefill,
  type ConnectTokens,
  connectTokenId,
  connectTokenRequest,
} from "@menao/core";

async function createToken(
  publishableKey: string,
  kind: "account" | "person",
  data: ConnectAccountTokenData | ConnectPersonTokenData | null,
): Promise<string | undefined> {
  if (!data) return undefined;
  try {
    const { url, init } = connectTokenRequest(publishableKey, kind, data);
    const response = await fetch(url, init);
    return connectTokenId(kind, await response.json()) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Jetons Stripe du pré-remplissage, créés par le navigateur avec la clé publique (ADR 0204) : les
 * données d'identité vont directement à Stripe. Un échec laisse l'artisan les saisir chez Stripe.
 */
export async function createConnectTokens(
  prefill: ConnectTokenPrefill | null,
): Promise<ConnectTokens> {
  if (!prefill) return {};
  const [accountToken, personToken] = await Promise.all([
    createToken(prefill.publishableKey, "account", prefill.account),
    createToken(prefill.publishableKey, "person", prefill.person),
  ]);
  return { accountToken, personToken };
}
