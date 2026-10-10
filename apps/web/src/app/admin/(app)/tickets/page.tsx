import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { setTicketStatus } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { ModerateReview } from "./moderate-review";

const t = fr.admin.tickets;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

type Status = "ouvert" | "en_cours" | "resolu";

/**
 * Dossiers « Envoyer mon dossier à MENAO », messages, signalements (avis signalés : masquage ou
 * republication, F-28) : réponse attendue sous 7 jours.
 */
export default async function TicketsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, type, subject, status, contact_email, message, due_at, created_at, projects(description, ville_nom, trades(label)), reviews(id, author_name, score, comment, status, moderation_reason)",
    )
    .order("due_at", { ascending: true })
    .limit(100);
  const tickets = data ?? [];
  const now = new Date();
  const open = tickets.filter((x) => x.status !== "resolu");
  const closed = tickets.filter((x) => x.status === "resolu");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
      {[
        { title: t.open, rows: open },
        { title: t.closed, rows: closed },
      ].map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">
            {group.title} ({group.rows.length})
          </h2>
          {group.rows.length === 0 && <p className="text-muted-foreground">{t.empty}</p>}
          {group.rows.map((ticket) => {
            const late = ticket.status !== "resolu" && new Date(ticket.due_at) < now;
            const project = ticket.projects;
            const review = ticket.reviews;
            return (
              <Card key={ticket.id}>
                <div className="flex flex-col gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span>{t.status[ticket.status as Status]}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={late ? "text-danger" : "text-muted-foreground"}>
                      {late ? t.late : t.due(day.format(new Date(ticket.due_at)))}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{t.types[ticket.type]}</p>
                  <p>
                    {t.contact} : {ticket.contact_email}
                  </p>
                  {ticket.subject && <p className="font-medium">{ticket.subject}</p>}
                  {project && (
                    <p>
                      {t.project} :{" "}
                      {[project.trades?.label, project.ville_nom].filter(Boolean).join(", ")}
                      <span className="block text-sm whitespace-pre-line text-muted-foreground">
                        {project.description}
                      </span>
                    </p>
                  )}
                  <p>
                    {t.message} : {ticket.message ?? t.noMessage}
                  </p>
                  {review && (
                    <div className="flex flex-col gap-2 rounded-input bg-background p-3">
                      <p className="text-sm font-medium">
                        {t.review.title} · {t.review.meta(review.author_name, review.score)}
                      </p>
                      <p className="text-sm whitespace-pre-line">{review.comment}</p>
                      {review.status === "masque" && review.moderation_reason && (
                        <p className="text-sm text-danger">
                          {t.review.hidden(review.moderation_reason)}
                        </p>
                      )}
                      <ModerateReview reviewId={review.id} status={review.status} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(ticket.status === "resolu"
                      ? [{ status: "ouvert", label: t.reopen }]
                      : [
                          ...(ticket.status === "ouvert"
                            ? [{ status: "en_cours", label: t.markInProgress }]
                            : []),
                          { status: "resolu", label: t.markResolved },
                        ]
                    ).map((action) => (
                      <form key={action.status} action={setTicketStatus}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="status" value={action.status} />
                        <button
                          type="submit"
                          className="min-h-touch rounded-button border border-border px-4 font-medium hover:bg-background"
                        >
                          {action.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      ))}
    </div>
  );
}
