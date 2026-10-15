"use client";

import { claimableReward, levelProgress, nextReward, type GradeLevel } from "@menao/core";
import type { Grade } from "@menao/validation";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { markBadgesSeen } from "@/lib/artisan/grade-actions";
import { formatDateNumeric } from "@/lib/format";
import { BadgeIcon } from "./badge-icon";
import { OutfitIllustration } from "./outfit-illustration";
import { RewardForm, type DeliveryDefaults } from "./reward-form";

const t = fr.pro.grade;
type Badge = Grade["badges"][number];

/**
 * « Mon grade MENAO » (F-24, maquettes « Mon grade Menao ») : niveau et points, prochaine
 * récompense (à réclamer au niveau 5), onglets objectifs et badges, progression d'un badge en
 * fenêtre, « Nouveau badge MENAO débloqué ! » pour un badge pas encore montré.
 */
export function GradeScreen({
  grade,
  delivery,
  scoreCard,
}: {
  grade: Grade;
  delivery: DeliveryDefaults;
  /** Score MENAO de la charte (ADR 0105), rendu par la page. */
  scoreCard?: ReactNode;
}) {
  const levels: GradeLevel[] = grade.levels.map((l) => ({
    level: l.level,
    xpMin: l.xp_min,
    reward: l.reward,
    rewardDetail: l.reward_detail,
  }));
  const claimedLevels = grade.claims.map((c) => c.level);
  const claimable = claimableReward(levels, grade.level, claimedLevels);
  const claimed = levels.some((l) => l.reward && claimedLevels.includes(l.level));
  const [tab, setTab] = useState<"objectives" | "badges">("objectives");
  const [open, setOpen] = useState<Badge | null>(null);
  const [celebrate, setCelebrate] = useState<Badge | null>(
    grade.badges.find((b) => b.unlocked_at && !b.seen) ?? null,
  );
  const current = grade.objectives.filter((o) => !o.achieved_at);
  const achieved = grade.objectives.filter((o) => o.achieved_at);
  const toEarn = grade.badges.filter((b) => !b.unlocked_at);
  const earned = grade.badges.filter((b) => b.unlocked_at);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <LevelCard xp={grade.xp} levels={levels} />
            {scoreCard}
            {claimable ? (
              <Card className="flex flex-col gap-4 border-primary">
                <div className="flex flex-col gap-1 text-center">
                  <h2 className="text-lg font-medium text-primary-strong">
                    {t.reward.title(delivery.firstName)}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t.reward.intro(claimable.level)}</p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-input bg-primary-softer p-4 text-center">
                  <p className="text-sm font-medium text-primary-strong">{t.reward.waiting}</p>
                  <OutfitIllustration className="my-2 h-32" />
                  <p className="text-sm font-medium">{claimable.reward}</p>
                  {claimable.rewardDetail && (
                    <p className="text-xs text-muted-foreground">{claimable.rewardDetail}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t.illustrationNote}</p>
                </div>
                <RewardForm level={claimable.level} defaults={delivery} />
              </Card>
            ) : claimed ? (
              <Alert tone="success">{t.claimed}</Alert>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div
              role="tablist"
              aria-label={t.tabsLabel}
              className="grid grid-cols-2 gap-1 rounded-pill bg-border p-1"
            >
              {(["objectives", "badges"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-10 rounded-pill text-sm font-medium transition-colors ${
                    tab === value
                      ? "bg-surface text-primary-strong shadow-card"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.tabs[value]}
                </button>
              ))}
            </div>

            {tab === "objectives" ? (
              <>
                <Section title={t.objectivesTitle}>
                  {current.length === 0 && <Alert tone="success">{t.noObjective}</Alert>}
                  {current.map((o) => (
                    <Objective key={o.code} objective={o} />
                  ))}
                </Section>
                {achieved.length > 0 && (
                  <Section title={t.achievedTitle}>
                    {achieved.map((o) => (
                      <Objective key={o.code} objective={o} />
                    ))}
                  </Section>
                )}
              </>
            ) : (
              <>
                <Section title={t.badgesToEarn}>
                  <BadgeGrid badges={toEarn} onOpen={setOpen} />
                </Section>
                <Section title={t.badgesEarned}>
                  {earned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noBadge}</p>
                  ) : (
                    <BadgeGrid badges={earned} onOpen={setOpen} />
                  )}
                </Section>
              </>
            )}
          </div>
        </div>
      </div>

      {open && <BadgeDialog badge={open} onClose={() => setOpen(null)} />}
      {celebrate && (
        <NewBadgeDialog
          badge={celebrate}
          onClose={() => {
            setCelebrate(null);
            void markBadgesSeen();
          }}
        />
      )}
    </main>
  );
}

function LevelCard({ xp, levels }: { xp: number; levels: readonly GradeLevel[] }) {
  const { current, next, progress } = levelProgress(levels, xp);
  const level = current?.level ?? 1;
  const reward = nextReward(levels, level);
  const percent = Math.round(progress * 100);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t.xp(xp, next?.xpMin ?? null)}</span>
        <span className="font-medium text-primary">{next ? `${percent} %` : t.maxLevel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-pill bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
          {t.level(level)}
        </span>
        <div
          role="progressbar"
          aria-label={t.levelLong(level)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 flex-1 overflow-hidden rounded-pill bg-primary-soft"
        >
          <div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} />
        </div>
        {next && (
          <span className="rounded-pill border border-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
            {t.level(next.level)}
          </span>
        )}
      </div>
      {reward && (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">{t.nextReward}</p>
          <p className="text-sm font-medium text-primary-strong">{reward.reward}</p>
          <div className="mt-2 flex h-32 w-full items-center justify-center rounded-input bg-primary-softer">
            <OutfitIllustration className="h-26" />
          </div>
        </div>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Objective({ objective: o }: { objective: Grade["objectives"][number] }) {
  const done = Boolean(o.achieved_at);
  return (
    <div
      className={`flex flex-col gap-3 rounded-card border border-border p-4 ${done ? "bg-background" : "bg-surface shadow-card"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-medium">{o.title}</p>
          <p className="text-xs text-muted-foreground">{o.description}</p>
          {o.achieved_at && (
            <p className="text-xs text-muted-foreground">
              {t.achievedOn(formatDateNumeric(o.achieved_at))}
            </p>
          )}
        </div>
        <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
          {t.xpGain(o.xp)}
        </span>
      </div>
      {!done && <Progress value={o.progress} target={o.target} />}
    </div>
  );
}

function Progress({ value, target }: { value: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value}
        className="h-1.5 flex-1 overflow-hidden rounded-pill bg-primary-soft"
      >
        <div className="h-full rounded-pill bg-primary" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {t.progress(value, target)}
      </span>
    </div>
  );
}

function BadgeGrid({ badges, onOpen }: { badges: Badge[]; onOpen: (badge: Badge) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {badges.map((b) => (
        <li key={b.code}>
          <button
            type="button"
            onClick={() => onOpen(b)}
            className="flex h-full w-full flex-col items-center gap-2 rounded-card border border-border bg-surface px-2 py-3 text-center shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <BadgeIcon code={b.code} unlocked={Boolean(b.unlocked_at)} />
            <span className="text-xs font-medium">{b.label}</span>
            {!b.unlocked_at && (
              <span className="h-1 w-full overflow-hidden rounded-pill bg-primary-soft">
                <span
                  className="block h-full rounded-pill bg-primary"
                  style={{ width: `${Math.min(1, b.progress / b.target) * 100}%` }}
                />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Fenêtre native (<dialog>) : focus gardé, touche Échap, fond assombri. */
function Dialog({
  label,
  onClose,
  className = "",
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className={`m-auto w-[min(26rem,calc(100%-2rem))] rounded-card bg-surface p-0 shadow-raised backdrop:bg-foreground/40 ${className}`}
    >
      {children}
    </dialog>
  );
}

function BadgeDialog({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  return (
    <Dialog label={badge.label} onClose={onClose}>
      <form method="dialog" className="relative flex flex-col items-center gap-3 p-6 text-center">
        <button
          type="submit"
          aria-label={t.close}
          className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <BadgeIcon code={badge.code} unlocked={Boolean(badge.unlocked_at)} className="size-24" />
        <h2 className="text-lg font-medium">{badge.label}</h2>
        <span className="rounded-pill bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {badge.unlocked_at ? t.earnedOn(formatDateNumeric(badge.unlocked_at)) : t.inProgress}
        </span>
        <p className="text-sm text-muted-foreground">{badge.description}</p>
        <div className="flex w-full flex-col gap-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t.progression}</span>
            <span className="font-medium text-primary">
              {t.progress(badge.progress, badge.target)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-primary-soft">
            <div
              className="h-full rounded-pill bg-primary"
              style={{ width: `${Math.min(1, badge.progress / badge.target) * 100}%` }}
            />
          </div>
          {!badge.unlocked_at && (
            <p className="text-xs text-muted-foreground">
              {t.remaining(badge.target - badge.progress)}
            </p>
          )}
        </div>
        <Button type="submit">{t.continue}</Button>
      </form>
    </Dialog>
  );
}

function NewBadgeDialog({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  return (
    <Dialog label={t.newBadge.title} onClose={onClose} className="overflow-hidden">
      <form method="dialog" className="flex flex-col">
        <div className="flex flex-col items-center gap-5 bg-primary px-6 pt-8 pb-6 text-center">
          <h2 className="text-xl font-medium text-primary-foreground">{t.newBadge.title}</h2>
          <div className="flex w-full flex-col items-center gap-3 rounded-card bg-surface px-5 py-7">
            <BadgeIcon code={badge.code} unlocked className="size-24" />
            <p className="text-lg font-medium">{badge.label}</p>
            <p className="text-sm text-muted-foreground">{badge.description}</p>
            <p className="text-sm font-medium text-primary-strong">{t.newBadge.congrats}</p>
          </div>
        </div>
        <div className="p-5">
          <Button type="submit">{t.newBadge.continue}</Button>
        </div>
      </form>
    </Dialog>
  );
}
