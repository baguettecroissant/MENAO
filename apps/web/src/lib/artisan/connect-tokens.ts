import {
  type ConnectAccountTokenData,
  type ConnectBankAccountTokenData,
  type ConnectPersonTokenData,
  type ConnectTokenData,
  type ConnectTokenKind,
  type ConnectTokens,
  connectTokenId,
  connectTokenRequest,
} from "@menao/core";

async function createToken(
  publishableKey: string,
  kind: ConnectTokenKind,
  data: ConnectAccountTokenData | ConnectPersonTokenData | ConnectBankAccountTokenData | null,
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
 * Jetons Stripe du pré-remplissage, créés par le navigateur avec la clé publique (ADR 0204,
 * ADR 0215) : identité et IBAN vont directement à Stripe, sans passer par MENAO. Un échec laisse
 * l'artisan les saisir chez Stripe.
 */
export async function createConnectTokens(
  publishableKey: string,
  data: ConnectTokenData,
): Promise<ConnectTokens> {
  const [accountToken, personToken, bankToken] = await Promise.all([
    createToken(publishableKey, "account", data.account),
    createToken(publishableKey, "person", data.person),
    createToken(publishableKey, "bank_account", data.bankAccount),
  ]);
  return { accountToken, personToken, bankToken };
}
