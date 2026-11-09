import {
  Bell,
  Download,
  FolderOpen,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  CommunicationsForm,
  DeletionForm,
  EmailForm,
  PasswordForm,
  ProfileForm,
} from "@/components/account/account-forms";
import { Alert, Button, Card, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signOutEverywhere } from "@/lib/account/actions";
import { formatDay } from "@/lib/format";

const t = fr.account;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card className="scroll-mt-24">
      <section id={`${id}-section`} aria-labelledby={id} className="flex flex-col gap-4">
        <h2 id={id} className="text-lg font-medium">
          {title}
        </h2>
        {children}
      </section>
    </Card>
  );
}

/**
 * Écran « Mon compte » (F-08, ADR 0039), commun au particulier et à l'artisan : informations
 * personnelles, adresse e-mail, mot de passe, communications, données personnelles (export,
 * demande de suppression) et déconnexion de tous les appareils.
 */
export function AccountScreen({
  profile,
  email,
  pendingEmail,
  pro,
  deletionRequestedAt,
  emailConfirmed,
}: {
  profile: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    marketing_opt_in: boolean;
  } | null;
  email: string;
  /** Nouvelle adresse en attente de confirmation. */
  pendingEmail: string | null;
  pro: boolean;
  /** Demande de suppression en cours : sa date. */
  deletionRequestedAt: string | null;
  /** Retour d'un lien de confirmation d'adresse e-mail. */
  emailConfirmed: boolean;
}) {
  const rubrics = [
    { id: "informations", label: t.profile.title, Icon: UserRound },
    { id: "adresse-email", label: t.email.title, Icon: Mail },
    { id: "mot-de-passe", label: t.password.title, Icon: KeyRound },
    { id: "communications", label: t.communications.title, Icon: Bell },
    { id: "mes-donnees", label: t.data.title, Icon: FolderOpen },
    { id: "suppression", label: t.deletion.title, Icon: Trash2 },
    { id: "securite", label: t.security.title, Icon: ShieldCheck },
  ];
  // Refonte « Nette » (ADR 0258) : les rubriques à gauche en grand écran, les cartes à droite.
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {t.title}
        </h1>
        <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
      </div>
      {emailConfirmed && (
        <Alert tone="success">{pendingEmail ? t.email.partial : t.email.confirmed}</Alert>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label={t.rubricsLabel}
          className="hidden flex-col gap-0.5 rounded-card border border-border bg-surface p-2 shadow-card lg:sticky lg:top-24 lg:flex"
        >
          {rubrics.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={`#${id}-section`}
              className={`flex items-center gap-2.5 rounded-input px-3 py-2.5 text-sm font-medium hover:bg-background ${
                id === "suppression" ? "text-danger" : "text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </a>
          ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-4">
          <Section id="informations" title={t.profile.title}>
            <ProfileForm
              firstName={profile?.first_name ?? ""}
              lastName={profile?.last_name ?? ""}
              phone={profile?.phone ?? null}
              pro={pro}
            />
          </Section>

          <Section id="adresse-email" title={t.email.title}>
            <EmailForm email={email} pendingEmail={pendingEmail} />
          </Section>

          <Section id="mot-de-passe" title={t.password.title}>
            <PasswordForm />
          </Section>

          <Section id="communications" title={t.communications.title}>
            <CommunicationsForm marketingOptIn={profile?.marketing_opt_in ?? false} />
          </Section>

          <Section id="mes-donnees" title={t.data.title}>
            <p className="text-sm text-muted-foreground">{t.data.intro}</p>
            <a
              href="/compte/donnees"
              download
              className={`${buttonClasses({ variant: "outline", block: false })} self-start`}
            >
              <Download aria-hidden="true" className="size-4" />
              {t.data.download}
            </a>
          </Section>

          <Section id="suppression" title={t.deletion.title}>
            <p className="text-sm text-muted-foreground">{t.deletion.intro}</p>
            {/* TODO(legal) : durées de conservation et anonymisation à valider avant tout effacement automatique. */}
            {deletionRequestedAt ? (
              <Alert tone="info">{t.deletion.pending(formatDay(deletionRequestedAt))}</Alert>
            ) : (
              <DeletionForm />
            )}
          </Section>

          <Section id="securite" title={t.security.title}>
            <p className="text-sm text-muted-foreground">{t.security.signOutAllHint}</p>
            <form action={signOutEverywhere}>
              <Button type="submit" variant="secondary" block={false}>
                <LogOut aria-hidden="true" className="size-4" />
                {t.security.signOutAll}
              </Button>
            </form>
          </Section>
        </div>
      </div>
    </main>
  );
}
