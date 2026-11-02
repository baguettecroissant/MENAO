import { colors } from "./tokens";

/**
 * Apparence du formulaire Stripe intégré à MENAO (composants Connect, ADR 0215) : couleurs,
 * rayons et taille de texte de MENAO. Taille de base 16 px : en dessous, l'iPhone zoome sur les
 * champs. Valeurs en pixels seulement, rayons de 24 px au plus (exigences de Stripe).
 */
export const stripeConnectAppearance = {
  overlays: "dialog",
  variables: {
    fontSizeBase: "16px",
    borderRadius: "12px",
    // Rayon maximal accepté par Stripe : boutons arrondis comme ceux de MENAO.
    buttonBorderRadius: "24px",
    formBorderRadius: "12px",
    overlayBorderRadius: "16px",
    colorPrimary: colors.primary,
    colorBackground: colors.surface,
    colorText: colors.foreground,
    colorSecondaryText: colors["muted-foreground"],
    colorBorder: colors["border-strong"],
    colorDanger: colors.danger,
    buttonPrimaryColorBackground: colors.primary,
    buttonPrimaryColorBorder: colors.primary,
    buttonPrimaryColorText: colors["primary-foreground"],
    buttonSecondaryColorBackground: colors["primary-soft"],
    buttonSecondaryColorBorder: colors["primary-soft"],
    buttonSecondaryColorText: colors["primary-strong"],
    actionPrimaryColorText: colors["primary-strong"],
    formBackgroundColor: colors.input,
    formHighlightColorBorder: colors.primary,
    formAccentColor: colors.primary,
    offsetBackgroundColor: colors["primary-softer"],
  },
} as const;
