import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

/**
 * Barre du bas du parcours guidé (ADR 0373) : le bouton qui fait avancer, toujours au même
 * endroit. Sur téléphone : l'indication, le bouton sur toute la largeur, puis l'action secondaire ;
 * sur ordinateur : « Retour » à gauche, le reste à droite. La page lui réserve sa place avec
 * `GuideBarSpace`, posé en fin de page et jamais dans une carte (il y laisserait un vide).
 */
export function GuideBar({
  backHref,
  back,
  note,
  secondary,
  children,
}: {
  backHref?: Route;
  /** « Retour » qui n'est pas un lien (partie précédente de la charte). */
  back?: ReactNode;
  /** Ce qui suit (« Suite : RC Pro ») ou ce que fait le bouton. */
  note?: ReactNode;
  secondary?: ReactNode;
  /** Le bouton principal. */
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          {back && <div className="hidden sm:block">{back}</div>}
          {backHref && (
            <div className="hidden sm:block">
              <ButtonLink href={backHref} variant="secondary">
                <ArrowLeft aria-hidden="true" className="size-4" />
                {fr.pro.onboarding.guide.back}
              </ButtonLink>
            </div>
          )}
          {note ? (
            <p className="text-center text-[0.8125rem] text-muted-foreground sm:flex-1 sm:text-right sm:text-sm">
              {note}
            </p>
          ) : (
            <span className="hidden sm:block sm:flex-1" />
          )}
          <div className="flex flex-col gap-1 sm:flex-row-reverse sm:items-center sm:gap-2">
            {children}
            {secondary}
          </div>
        </div>
      </div>
    </>
  );
}

/** Place de la barre du bas, en fin de page : le dernier contenu ne passe pas dessous. */
export function GuideBarSpace() {
  return <div aria-hidden="true" className="h-28 sm:h-16" />;
}
