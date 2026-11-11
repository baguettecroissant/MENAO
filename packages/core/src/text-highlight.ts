/**
 * Découpe un texte autour des mots à surligner (écran d'analyse, ADR 0279) : première occurrence de
 * chaque terme, sans tenir compte des majuscules ; quand deux termes se chevauchent, le premier de
 * la liste l'emporte. Le texte rendu est toujours celui d'origine, morceau par morceau.
 */
export type HighlightPart<Tone extends string> = { text: string; tone: Tone | null };

export function highlightParts<Tone extends string>(
  text: string,
  marks: readonly { term: string | null | undefined; tone: Tone }[],
): HighlightPart<Tone>[] {
  const lower = text.toLocaleLowerCase("fr");
  // Même longueur que le texte d'origine, sinon les positions ne correspondent plus.
  const searchable = lower.length === text.length ? lower : text;
  const ranges: { start: number; end: number; tone: Tone }[] = [];
  for (const { term, tone } of marks) {
    const needle = term?.trim();
    if (!needle) continue;
    const start = searchable.indexOf(
      searchable === lower ? needle.toLocaleLowerCase("fr") : needle,
    );
    if (start < 0) continue;
    const end = start + needle.length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, tone });
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: HighlightPart<Tone>[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) parts.push({ text: text.slice(cursor, range.start), tone: null });
    parts.push({ text: text.slice(range.start, range.end), tone: range.tone });
    cursor = range.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), tone: null });
  return parts;
}
