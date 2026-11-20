import * as WebBrowser from "expo-web-browser";
import {
  ArrowRight,
  Clock,
  CreditCard,
  Euro,
  ExternalLink,
  IdCard,
  Info,
  Landmark,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type ScrollViewInstance,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Button, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPayments.explainer;
const { colors, font, radius, spacing } = theme;
const ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  card: CreditCard,
  shield: ShieldCheck,
  id: IdCard,
  phone: Smartphone,
  euro: Euro,
  clock: Clock,
};
const PRICING_URL = "https://stripe.com/fr/pricing";

/** Le mémo « Stripe en 1 minute » en volet du bas, ouvert sur une question précise si besoin. */
function StripeMemo({
  visible,
  onClose,
  focus,
}: {
  visible: boolean;
  onClose: () => void;
  focus?: string;
}) {
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.title} closeLabel={t.close}>
      <ScrollView ref={scroll} style={{ maxHeight: height * 0.6 }}>
        <Text style={styles.lead}>{t.lead}</Text>
        {t.items.map((item, index) => {
          const Icon = ICONS[item.icon] ?? Info;
          const focused = focus === item.id;
          return (
            <View
              key={item.id}
              onLayout={
                focused
                  ? (event) =>
                      scroll.current?.scrollTo({
                        y: Math.max(0, event.nativeEvent.layout.y - spacing(10)),
                        animated: false,
                      })
                  : undefined
              }
              style={[styles.item, index > 0 && styles.itemBorder, focused && styles.itemFocus]}
            >
              <View style={styles.iconTile}>
                <Icon size={18} color={colors["primary-strong"]} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.q}>{item.q}</Text>
                <Text style={styles.a}>{item.a}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Pressable
        role="link"
        hitSlop={8}
        onPress={() => void WebBrowser.openBrowserAsync(PRICING_URL)}
        style={styles.pricing}
      >
        <Text style={styles.pricingText}>{t.pricing}</Text>
        <ExternalLink size={14} color={colors["primary-strong"]} />
      </Pressable>
      <Button label={t.done} onPress={onClose} />
    </BottomSheet>
  );
}

/**
 * « Stripe, c'est quoi ? » (F-185, ADR 0384, maquette du lot 80), comme sur le site : une image
 * simple, puis le mémo des 7 questions que se posent les artisans. Sans jargon.
 */
export function StripeExplainerCard() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Info size={22} color={colors["primary-strong"]} />
      </View>
      <View style={styles.cardText}>
        <Text role="heading" style={styles.cardTitle}>
          {t.cardTitle}
        </Text>
        <Text style={styles.a}>{t.cardText}</Text>
        <Tappable
          role="button"
          onPress={() => {
            haptic.select();
            setOpen(true);
          }}
          style={styles.inline}
        >
          <Text style={styles.linkText}>{t.open}</Text>
          <ArrowRight size={16} color={colors["primary-strong"]} />
        </Tappable>
      </View>
      <StripeMemo visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/** Petit « i » ou lien discret qui ouvre le mémo, sur une question si `focus` est donné. */
export function StripeExplainerLink({
  focus,
  asIcon = false,
}: {
  focus?: string;
  asIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const show = () => {
    haptic.select();
    setOpen(true);
  };
  return (
    <>
      {asIcon ? (
        <Pressable
          role="button"
          aria-label={t.infoLabel}
          hitSlop={10}
          onPress={show}
          style={styles.infoDot}
        >
          <Info size={14} color={colors["primary-strong"]} />
        </Pressable>
      ) : (
        <Tappable role="button" onPress={show} style={styles.inline}>
          <Info size={16} color={colors["primary-strong"]} />
          <Text style={styles.linkSoft}>{t.link}</Text>
        </Tappable>
      )}
      <StripeMemo visible={open} onClose={() => setOpen(false)} focus={focus} />
    </>
  );
}

const styles = StyleSheet.create({
  lead: {
    marginBottom: spacing(1),
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  item: { flexDirection: "row", gap: spacing(3), paddingVertical: spacing(3.5) },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemFocus: {
    paddingHorizontal: spacing(2),
    borderRadius: 12,
    backgroundColor: colors["primary-softer"],
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  itemText: { flex: 1, gap: 2 },
  q: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  a: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  pricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    alignSelf: "flex-start",
  },
  pricingText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  card: {
    flexDirection: "row",
    gap: spacing(3.5),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: "#b9c6f5",
    backgroundColor: colors.surface,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  cardText: { flex: 1, gap: spacing(1.5) },
  cardTitle: { fontFamily: font.display, fontSize: 17, color: colors.foreground },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    alignSelf: "flex-start",
  },
  linkText: { fontFamily: font.bold, fontSize: 14, color: colors["primary-strong"] },
  linkSoft: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  infoDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
});
