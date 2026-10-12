/** Squelettes pendant la recherche des artisans (F-09). */
export default function Loading() {
  return (
    <main
      className="@container mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10"
      aria-busy="true"
    >
      <div className="h-9 w-2/3 animate-pulse rounded-button bg-border" />
      <div className="grid gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
          >
            <div className="flex items-center gap-3">
              <div className="size-16 animate-pulse rounded-full bg-border" />
              <div className="h-5 flex-1 animate-pulse rounded-button bg-border" />
            </div>
            <div className="h-4 w-1/2 animate-pulse rounded-button bg-border" />
            <div className="h-11 animate-pulse rounded-button bg-border" />
          </div>
        ))}
      </div>
    </main>
  );
}
