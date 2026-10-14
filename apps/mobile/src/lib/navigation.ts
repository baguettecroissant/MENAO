import { router } from "expo-router";

/** Retour à l'écran précédent, ou à l'accueil quand l'écran a été ouvert directement (lien). */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Referme les écrans de connexion et d'inscription : on revient là où l'on était. L'espace qui
 * s'affiche suit le rôle du compte (un artisan est redirigé vers son espace).
 */
export function closeAuth(): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace("/");
}

/** Referme les écrans ouverts par-dessus les onglets, puis affiche l'onglet demandé. */
export function openTab(href: "/accueil" | "/chantiers" | "/documents" | "/messages"): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(href);
}
