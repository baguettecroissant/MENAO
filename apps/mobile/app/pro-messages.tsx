import { MessagesScreen } from "@/components/messages/messages-screen";

/**
 * Messages de l'artisan (F-40) : une conversation par chantier avec ses clients. Ouvert depuis la
 * bulle de l'en-tête (ADR 0188), par-dessus les onglets.
 */
export default function ProMessagesScreen() {
  return <MessagesScreen standalone />;
}
