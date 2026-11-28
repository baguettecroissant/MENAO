import { fr } from "@/i18n/fr";

const bar = "animate-pulse rounded-md bg-border/70 motion-reduce:animate-none";

/**
 * Chargement de l'espace des conseillers (ADR 0396) : affiché dès le toucher d'un onglet, à la
 * forme d'une page (titre, sous-titre, deux cartes), le temps que le serveur prépare la page.
 */
export default function CommercialLoading() {
  return (
    <main className="bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">{fr.commercialField.loading}</span>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3">
          <span className={`${bar} h-9 w-56`} />
          <span className={`${bar} h-4 w-full max-w-md`} />
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <span className={`${bar} h-5 w-40`} />
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3 border-t border-border pt-3">
                <span className={`${bar} size-10 shrink-0 rounded-input`} />
                <span className="flex flex-1 flex-col gap-2">
                  <span className={`${bar} h-4 w-2/3`} />
                  <span className={`${bar} h-3 w-1/2`} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
