/**
 * Domaines qui ne reçoivent jamais de courrier (RFC 2606 et 6761) : comptes de démonstration
 * (@menao-demo.test), de test (@example.test) ou fictifs (@exemple.invalid). Un envoi vers eux
 * reviendrait en erreur et nuirait à la réputation du domaine d'envoi : notify ne l'essaie pas.
 */
const RESERVED_TLDS = new Set(["test", "example", "invalid", "localhost"]);
const RESERVED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);

export function isDeliverableAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (RESERVED_TLDS.has(tld)) return false;
  return ![...RESERVED_DOMAINS].some((d) => domain === d || domain.endsWith(`.${d}`));
}
