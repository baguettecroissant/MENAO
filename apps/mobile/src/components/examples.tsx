import { router } from "expo-router";
import { ChevronDown, Eye } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { hideSpaceExamples, setExamplesActive } from "@/lib/examples";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExamples;
const { colors, font, radius, spacing } = theme;
const ON_COLOR = colors["primary-foreground"];

/** Pastille « Exemple » des demandes et chantiers fictifs, couleur des exemples (ADR 0184). */
export function ExampleBadge() {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeDot} />
      <Text style={styles.badgeText}>{t.badge}</Text>
    </View>
  );
}

/**
 * Zone d'actions d'un exemple : visible mais inactive, avec la mention « les boutons sont
 * désactivés » si `note`. Sans exemple, rendue telle quelle.
 */
export function ExampleLock({
  locked,
  note = false,
  children,
}: {
  locked: boolean;
  note?: boolean;
  children: ReactNode;
}) {
  if (!locked) return children;
  return (
    <View style={styles.lock}>
      {note ? <Text style={styles.lockNote}>{t.locked}</Text> : null}
      <View pointerEvents="none" aria-disabled style={styles.locked}>
        {children}
      </View>
    </View>
  );
}

/**
 * Bandeau fin en haut de l'application tant que le mode exemples est actif (ADR 0184), comme sur
 * le site : replié sur « Données d'exemple », il se déplie d'un toucher ; « Quitter » ramène à
 * l'accueil. Il prend la marge du haut de l'écran : les écrans en dessous n'en ajoutent pas.
 */
export function ExamplesBanner() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <View
      role="note"
      aria-label={t.banner.title}
      style={[styles.banner, { paddingTop: insets.top }]}
    >
      <View style={styles.bannerRow}>
        <Tappable
          role="button"
          aria-label={`${t.banner.title}, ${t.banner.more}`}
          aria-expanded={open}
          onPress={() => setOpen((value) => !value)}
          scaleTo={1}
          style={styles.bannerToggle}
        >
          <Eye size={16} color={ON_COLOR} />
          <Text style={styles.bannerTitle}>{t.banner.title}</Text>
          <ChevronDown
            size={16}
            color={ON_COLOR}
            style={open ? { transform: [{ rotate: "180deg" }] } : undefined}
          />
        </Tappable>
        <Tappable
          role="button"
          onPress={() => {
            setExamplesActive(false);
            router.replace("/pro");
          }}
          style={styles.quit}
        >
          <Text style={styles.quitText}>{t.banner.quit}</Text>
        </Tappable>
      </View>
      {open ? <Text style={styles.bannerText}>{t.banner.text}</Text> : null}
    </View>
  );
}

/**
 * Sous le bandeau, les écrans n'ajoutent plus la marge du haut (encoche, barre d'état) : le
 * bandeau l'a déjà prise.
 */
export function BelowExamplesBanner({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Toujours le même fournisseur : la navigation n'est pas recréée à l'entrée dans les exemples.
  return (
    <SafeAreaInsetsContext.Provider value={active ? { ...insets, top: 0 } : insets}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}

/** Carte d'entrée dans les exemples (dossier en vérification, tableau de bord encore vide). */
export function ExamplesCard({
  title,
  text,
  action,
  onHide,
}: {
  title: string;
  text: string;
  action: string;
  /** « Masquer les exemples » (artisan validé). */
  onHide?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>
          <Eye size={18} color={colors["example-strong"]} />
        </View>
        <View style={styles.cardText}>
          <Text role="heading" style={styles.cardTitle}>
            {title}
          </Text>
          <Text style={styles.cardBody}>{text}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Tappable
          role="button"
          onPress={() => {
            setExamplesActive(true);
            router.push("/pro");
          }}
          style={styles.cardButton}
        >
          <Text style={styles.cardButtonText}>{action}</Text>
        </Tappable>
        {onHide ? <HideExamples onHidden={onHide} /> : null}
      </View>
    </View>
  );
}

/** « Masquer les exemples » : choix gardé sur la fiche, le même sur le site. */
export function HideExamples({ onHidden }: { onHidden: () => void }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.hide}>
      <Tappable
        role="button"
        disabled={pending}
        onPress={async () => {
          setPending(true);
          const ok = await hideSpaceExamples();
          setPending(false);
          setFailed(!ok);
          if (ok) onHidden();
        }}
        style={styles.hideButton}
      >
        <Text style={styles.hideText}>{t.inSpace.hide}</Text>
      </Tappable>
      {failed ? (
        <Text role="alert" style={styles.error}>
          {t.inSpace.hideError}
        </Text>
      ) : null}
    </View>
  );
}

/** Mention des exemples dans une liste encore vide d'un artisan validé. */
export function SpaceExamplesNotice({ onHidden }: { onHidden: () => void }) {
  return (
    <View style={styles.notice}>
      <View style={styles.noticeRow}>
        <Eye size={18} color={colors["example-strong"]} />
        <Text style={styles.noticeText}>{t.inSpace.text}</Text>
      </View>
      <HideExamples onHidden={onHidden} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    backgroundColor: colors["example-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors["example-strong"] },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["example-strong"] },
  lock: { gap: spacing(2) },
  lockNote: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["example-strong"],
  },
  locked: { opacity: 0.55 },
  banner: {
    backgroundColor: colors.example,
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(2),
  },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: spacing(3), minHeight: 40 },
  bannerToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    minHeight: 40,
  },
  bannerTitle: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, color: ON_COLOR },
  bannerText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ON_COLOR },
  quit: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${ON_COLOR}B3`,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  quitText: { fontFamily: font.medium, fontSize: 13, color: ON_COLOR },
  card: {
    gap: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.example}40`,
    backgroundColor: colors["example-soft"],
    padding: spacing(4),
  },
  cardHead: { flexDirection: "row", gap: spacing(3) },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  cardText: { flex: 1, gap: spacing(1) },
  cardTitle: { fontFamily: font.medium, fontSize: 16, color: colors["example-strong"] },
  cardBody: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["example-strong"],
  },
  cardActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(3) },
  cardButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.example,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  cardButtonText: { fontFamily: font.medium, fontSize: 14, color: ON_COLOR },
  hide: { gap: spacing(1) },
  hideButton: { paddingVertical: spacing(2) },
  hideText: { fontFamily: font.medium, fontSize: 14, color: colors["example-strong"] },
  error: { fontFamily: font.regular, fontSize: 12, color: colors.danger },
  notice: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.example}40`,
    backgroundColor: colors["example-soft"],
    padding: spacing(4),
  },
  noticeRow: { flexDirection: "row", gap: spacing(3) },
  noticeText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["example-strong"],
  },
});
