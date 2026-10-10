"use client";

import { useId, useState, type ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { DetailBlock } from "./detail";

const t = fr.pro.onboarding.requests;
/** Au-delà, le texte est replié sur 4 lignes avec « Voir plus » (maquettes). */
const LONG_TEXT = 220;

/** Carte dont le texte long se déplie avec « Voir plus », en haut à droite comme sur les maquettes. */
export function ExpandableBlock({
  icon,
  title,
  text,
  before,
  after,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  before?: ReactNode;
  after?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const textId = useId();
  const long = text.length > LONG_TEXT || text.split("\n").length > 4;
  return (
    <DetailBlock
      icon={icon}
      title={title}
      action={
        long ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={textId}
            onClick={() => setOpen(!open)}
            className="shrink-0 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            {open ? t.seeLess : t.seeMore}
          </button>
        ) : undefined
      }
    >
      {before}
      <p
        id={textId}
        className={`text-sm leading-relaxed whitespace-pre-line text-foreground/85 ${
          long && !open ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </p>
      {after}
    </DetailBlock>
  );
}
