import { parisToday, roleFromAppMetadata } from "@menao/core";
import { NextResponse, type NextRequest } from "next/server";
import { accountExport } from "@/lib/account/export";
import { createClient } from "@/lib/supabase/server";

/**
 * « Télécharger mes données » (RGPD ; ADR 0039) : fichier JSON de tout ce que le compte peut
 * lire. Réservé aux particuliers et aux artisans (l'équipe lit toute la base).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) {
    return NextResponse.redirect(new URL("/connexion?next=/compte", request.url));
  }
  const role = roleFromAppMetadata(user.app_metadata);
  if (role === "admin" || role === "support" || role === "visiteur") {
    return new NextResponse(null, { status: 403 });
  }
  try {
    const payload = await accountExport(supabase, user, role);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="menao-mes-donnees-${parisToday()}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    console.error("export des données du compte en échec");
    return new NextResponse(null, { status: 503 });
  }
}
