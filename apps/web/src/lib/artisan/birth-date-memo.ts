/**
 * Date de naissance lue sur la pièce d'identité (ADR 0375), gardée dans le navigateur de l'artisan
 * entre le dépôt de la pièce et l'étape « Paiements », où elle pré-remplit le champ. MENAO ne
 * l'enregistre pas : elle part chez Stripe depuis le navigateur, puis elle est effacée. Rangée par
 * compte : un autre compte sur le même navigateur ne la voit pas.
 */
const key = (userId: string) => `menao:naissance:${userId}`;

export function rememberBirthDate(userId: string, date: string): void {
  try {
    window.localStorage.setItem(key(userId), date);
  } catch {
    // Stockage refusé (navigation privée stricte) : le champ restera à saisir.
  }
}

export function recallBirthDate(userId: string): string | null {
  try {
    const value = window.localStorage.getItem(key(userId));
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function forgetBirthDate(userId: string): void {
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    // Rien à effacer.
  }
}
