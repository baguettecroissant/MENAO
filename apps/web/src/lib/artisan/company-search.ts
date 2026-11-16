import {
  COMPANY_SEARCH_ATTEMPTS,
  COMPANY_SEARCH_MIN_LENGTH,
  companySearchRetryable,
  companySearchUrl,
  parseCompanySearch,
  type CompanySuggestion,
} from "@menao/validation";

export type { CompanySuggestion };

/** Recherches déjà faites pendant la visite : retaper le même nom ne rappelle pas l'API. */
const cache = new Map<string, CompanySuggestion[]>();
const CACHE_SIZE = 50;

class RetryableFailure extends Error {}
class TimedOut extends Error {}

/**
 * Signal annulé par l'écran ou au bout de `ms` ; sans AbortSignal.any ni AbortSignal.timeout,
 * absents des iPhone sous iOS 17.4.
 */
function deadline(ms: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimedOut()), ms);
  const stop = () => controller.abort(signal?.reason);
  if (signal?.aborted) stop();
  else signal?.addEventListener("abort", stop, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => controller.signal.reason instanceof TimedOut,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
    },
  };
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms === 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/**
 * Recherche de l'entreprise de l'artisan dans l'Annuaire des entreprises (ADR 0110), appelée
 * depuis le navigateur. L'API est parfois lente : chaque essai a un délai maximum, et un délai
 * dépassé, une coupure, un 429 ou une erreur du serveur donnent un nouvel essai (`onRetry`
 * prévient l'écran). Après le dernier essai, une exception : le parcours propose la saisie du SIRET.
 */
export async function searchCompanies(
  query: string,
  signal?: AbortSignal,
  onRetry?: (attempt: number) => void,
): Promise<CompanySuggestion[]> {
  const q = query.trim();
  if (q.length < COMPANY_SEARCH_MIN_LENGTH) return [];
  const key = q.toLowerCase();
  const known = cache.get(key);
  if (known) return known;

  let lastError: unknown = null;
  for (const [index, attempt] of COMPANY_SEARCH_ATTEMPTS.entries()) {
    if (index > 0) onRetry?.(index + 1);
    await wait(attempt.waitMs, signal);
    const limit = deadline(attempt.timeoutMs, signal);
    try {
      const res = await fetch(companySearchUrl(q), { signal: limit.signal });
      if (!res.ok) {
        if (companySearchRetryable(res.status)) throw new RetryableFailure(String(res.status));
        throw new Error(`Recherche d'entreprises indisponible (${res.status})`);
      }
      const results = parseCompanySearch(await res.json());
      if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value as string);
      cache.set(key, results);
      return results;
    } catch (error) {
      // Recherche abandonnée par l'écran (nouvelle saisie) : rien à réessayer.
      if (signal?.aborted) throw error;
      const retryable =
        error instanceof RetryableFailure || limit.timedOut() || error instanceof TypeError;
      if (!retryable) throw error;
      lastError = error;
    } finally {
      limit.done();
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Recherche d'entreprises indisponible");
}
