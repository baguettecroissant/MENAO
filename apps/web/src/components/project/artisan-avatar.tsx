/** Photo de l'artisan, ou ses initiales s'il n'en a pas. */
export function ArtisanAvatar({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "md" | "lg";
}) {
  const dims = size === "lg" ? "size-24 text-3xl" : "size-16 text-xl";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
    return <img src={url} alt="" className={`${dims} shrink-0 rounded-full object-cover`} />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-medium text-primary`}
    >
      {initials}
    </span>
  );
}

export function AvailabilityBadge({ label, tone }: { label: string; tone: "success" | "muted" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        tone === "success" ? "bg-success-soft text-success" : "bg-background text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
