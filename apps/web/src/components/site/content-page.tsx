import type { ReactNode } from "react";

/** Mise en page des pages de contenu (F-03), dans le style des maquettes : fond crème, carte blanche. */
export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-[2.5rem]">
            {title}
          </h1>
          {intro && <p className="text-lg text-muted-foreground">{intro}</p>}
        </div>
        <div className="flex flex-col gap-8 rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

export function BulletList({
  items,
  ordered = false,
}: {
  items: readonly string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary-strong ${
              ordered ? "size-6" : "size-2 mt-2"
            }`}
          >
            {ordered ? i + 1 : null}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </List>
  );
}
