import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketConversationView } from "@/components/admin/ticket-conversation-view";
import { fr } from "@/i18n/fr";
import { requireStaff } from "@/lib/admin/guard";
import { getTicketConversation } from "@/lib/admin/tickets";

const c = fr.admin.tickets.conversation;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${c.title} — ${fr.admin.title}` };

/**
 * Conversation du chantier, consultée depuis un litige ou un message signalé (F-125, ADR 0277) :
 * lecture seule, client à gauche et artisan à droite. La base vérifie le rôle (admin en double
 * authentification ou support) et le type de ticket, et inscrit chaque ouverture au journal.
 */
export default async function TicketConversationPage({
  params,
}: PageProps<"/admin/tickets/[id]/conversation">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireStaff();
  const messages = await getTicketConversation(supabase, id);
  if (!messages) notFound();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("chantiers(title)")
    .eq("id", id)
    .maybeSingle();
  const chantier = ticket?.chantiers?.title ?? null;

  return <TicketConversationView ticketId={id} chantier={chantier} messages={messages} />;
}
