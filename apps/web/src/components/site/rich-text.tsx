import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { frenchSpacing } from "@/lib/site/typography";

// `[libellé](/chemin)` ou `[libellé](https://…)`, et `**gras**`.
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/**
 * Texte des guides (ADR 0135) : liens internes (navigation Next) ou externes (nouvel onglet), gras,
 * et typographie française. Le texte vient du code de l'application, jamais d'un utilisateur.
 */
export function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const [whole, label, href, bold] = match;
    if (match.index > last) parts.push(frenchSpacing(text.slice(last, match.index)));
    if (bold) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {frenchSpacing(bold)}
        </strong>,
      );
    } else if (href?.startsWith("/")) {
      parts.push(
        <Link
          key={match.index}
          href={href as Route}
          className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
        >
          {frenchSpacing(label ?? "")}
        </Link>,
      );
    } else if (href) {
      parts.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
        >
          {frenchSpacing(label ?? "")}
        </a>,
      );
    }
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(frenchSpacing(text.slice(last)));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
