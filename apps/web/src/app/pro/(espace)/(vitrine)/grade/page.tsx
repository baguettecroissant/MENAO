import { parseGrade } from "@menao/validation";
import type { Metadata } from "next";
import { GradeScreen } from "@/components/pro/grade/grade-screen";
import { MenaoScoreCard } from "@/components/pro/score/menao-score-card";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { myMenaoScore } from "@/lib/artisan/score";
import { requireProSpace } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.grade.title} — MENAO` };

/**
 * « Mon grade MENAO » (F-24) : progression de l'artisan (artisan_grade), objectifs, badges et
 * récompense du niveau 5, livraison pré-remplie avec l'adresse de l'entreprise.
 */
export default async function GradePage() {
  const { supabase, artisanId, firstName } = await requireProSpace();
  const { data: claims } = await supabase.auth.getClaims();
  const [{ data }, { data: artisan }, { data: profile }, score] = await Promise.all([
    supabase.rpc("artisan_grade"),
    supabase
      .from("artisans")
      .select("adresse_ligne, adresse_code_postal, adresse_commune")
      .eq("id", artisanId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", claims?.claims.sub ?? "")
      .maybeSingle(),
    myMenaoScore(supabase),
  ]);
  const grade = parseGrade(data);
  if (!grade) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Alert tone="error">{fr.pro.grade.error}</Alert>
      </main>
    );
  }
  return (
    <GradeScreen
      grade={grade}
      scoreCard={score ? <MenaoScoreCard score={score} /> : null}
      delivery={{
        firstName,
        address: artisan?.adresse_ligne ?? "",
        city: [artisan?.adresse_code_postal, artisan?.adresse_commune].filter(Boolean).join(" "),
        phone: profile?.phone ?? "",
      }}
    />
  );
}
