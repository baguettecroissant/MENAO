import { exampleGrade } from "@menao/core";
import { parseGrade } from "@menao/validation";
import type { Metadata } from "next";
import { GradeScreen } from "@/components/pro/grade/grade-screen";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `${fr.pro.grade.title} — MENAO` };

/**
 * « Mon grade MENAO » d'exemple (ADR 0184) : le vrai barème (niveaux, objectifs, badges) avec une
 * progression fictive de niveau 2.
 */
export default async function ExampleGradePage() {
  const { firstName, commercial } = await requireExampleViewer();
  const supabase = await createClient();
  // Démo d'un commercial (ADR 0205) : le barème seul, sans fiche artisan.
  const { data } = await supabase.rpc(commercial ? "grade_scale" : "artisan_grade");
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
      grade={exampleGrade(grade)}
      delivery={{ firstName, address: "", city: "", phone: "" }}
    />
  );
}
