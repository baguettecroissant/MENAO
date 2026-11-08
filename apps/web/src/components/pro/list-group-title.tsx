/**
 * Titre d'un groupe de lignes d'une liste, avec son nombre (« À traiter 2 ») — refonte « Nette »,
 * ADR 0248.
 */
export function ListGroupTitle({ id, title, count }: { id: string; title: string; count: number }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-lg sm:text-xl">
      {title}
      <span className="font-sans text-sm font-semibold text-muted-foreground tabular-nums">
        {count}
      </span>
    </h2>
  );
}
