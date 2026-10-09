import Link from "next/link";
import { fr } from "@/i18n/fr";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center">
      <h1 className="text-3xl font-bold sm:text-5xl">{fr.home.title}</h1>
      <p className="text-lg text-muted-foreground">{fr.home.subtitle}</p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/inscription"
          className="inline-flex min-h-touch items-center justify-center rounded-button bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {fr.nav.signUp}
        </Link>
        <Link
          href="/connexion"
          className="inline-flex min-h-touch items-center justify-center rounded-button border border-border bg-surface px-6 font-semibold"
        >
          {fr.nav.signIn}
        </Link>
      </div>
    </main>
  );
}
