import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Même bleu que l'écran de démarrage du téléphone (`app.config.ts`). */
const BRAND = "#4869f6";
/** Longueurs des deux tracés du logo (unités du dessin), un peu au-dessus du réel. */
const ROOF = 20;
const SMILE = 30;
/** Le toit (450 ms) puis le sourire (500 ms, après 350 ms) : logo tracé en 850 ms. */
const DRAWN_MS = 850;
const EXIT_MS = 320;
/** Image jamais chargée : l'écran du téléphone laisse quand même la place. */
const SHOW_FALLBACK_MS = 500;

/**
 * Démarrage animé (ADR 0192), par-dessus l'application le temps qu'elle se prépare (polices,
 * session, onglets gardés) :
 * - même image que l'écran de démarrage du téléphone (« menao » sur le bleu MENAO), qui
 *   disparaît sans saut dès que celui-ci est affiché ;
 * - le toit puis le sourire du logo se tracent au-dessus ;
 * - si l'application n'est pas prête, le logo respire doucement ;
 * - dès qu'elle l'est, fondu vers le premier écran.
 * Ne dure jamais plus que le chargement, sauf le tracé du logo, qui va jusqu'au bout. Avec
 * « Réduire les animations », le logo est entier d'emblée et s'efface simplement.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const roof = useSharedValue(reduced ? 1 : 0);
  const smile = useSharedValue(reduced ? 1 : 0);
  const breath = useSharedValue(1);
  const exit = useSharedValue(0);
  const [drawn, setDrawn] = useState(reduced);
  // L'écran du téléphone ne s'efface qu'une fois l'image affichée ici : aucun clignotement.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) {
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }
    const timer = setTimeout(() => setShown(true), SHOW_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    if (reduced || !shown) return;
    roof.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    smile.set(withDelay(350, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
    const timer = setTimeout(() => setDrawn(true), DRAWN_MS);
    return () => clearTimeout(timer);
  }, [reduced, shown, roof, smile]);

  // Le chargement dure : le logo respire doucement.
  useEffect(() => {
    if (!drawn || ready || reduced) return;
    breath.set(
      withRepeat(
        withSequence(withTiming(1.05, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
      ),
    );
    return () => cancelAnimation(breath);
  }, [drawn, ready, reduced, breath]);

  // Tout est prêt et le logo est tracé : fondu vers le premier écran.
  useEffect(() => {
    if (!drawn || !ready) return;
    const duration = reduced ? 200 : EXIT_MS;
    breath.set(withTiming(1, { duration: 150 }));
    exit.set(withTiming(1, { duration, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [drawn, ready, reduced, breath, exit, onDone]);

  const roofProps = useAnimatedProps(() => ({ strokeDashoffset: ROOF * (1 - roof.get()) }));
  const smileProps = useAnimatedProps(() => ({ strokeDashoffset: SMILE * (1 - smile.get()) }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.get() }] }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.get(),
    transform: [{ scale: 1 + exit.get() * 0.06 }],
  }));

  return (
    <Animated.View aria-hidden pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <View style={styles.logo}>
        <Image
          source={require("../../assets/splash-logo.png")}
          style={styles.word}
          fadeDuration={0}
          onLoad={() => setShown(true)}
          alt=""
        />
        <Animated.View style={[styles.mark, markStyle]}>
          <Svg width={92} height={80.5} viewBox="0 0 32 28" fill="none">
            <AnimatedPath
              d="M9.5 10.5 16 5.5l6.5 5"
              stroke="#ffffff"
              strokeWidth={3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={[ROOF, ROOF]}
              animatedProps={roofProps}
            />
            <AnimatedPath
              d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
              stroke="#ffffff"
              strokeWidth={4.6}
              strokeLinecap="round"
              strokeDasharray={[SMILE, SMILE]}
              animatedProps={smileProps}
            />
          </Svg>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Image de l'écran de démarrage : 220 × 148 points, le logo en haut au centre (92 points de large).
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
  },
  logo: { width: 220, height: 148 },
  word: { width: 220, height: 148 },
  mark: { position: "absolute", left: 64, top: 0, width: 92, height: 80.5 },
});
