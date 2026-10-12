import { requireAdmin } from "@/lib/admin/guard";
import { adminUserExport } from "@/lib/admin/export";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Export RGPD d'une personne par l'équipe (ADR 0048) : fichier JSON, journalisé. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const { supabase } = await requireAdmin();
  const data = await adminUserExport(supabase, id);
  if (!data) return new Response(null, { status: 404 });
  const { error } = await supabase.rpc("admin_log_account_action", {
    p_user_id: id,
    p_action: "compte.export",
  });
  if (error) return new Response(null, { status: 502 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="menao-donnees-${id}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
