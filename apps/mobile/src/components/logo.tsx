import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** Logo MENAO (toit et sourire), mêmes tracés que sur le site. */
export function LogoMark({
  size = 40,
  tone = "brand",
}: {
  size?: number;
  tone?: "brand" | "white";
}) {
  const stroke = tone === "white" ? "#ffffff" : "url(#menao)";
  // Décoratif : masqué des lecteurs d'écran (aria-hidden, compris par iOS, Android et le web).
  return (
    <View aria-hidden>
      <Svg width={size} height={(size * 28) / 32} viewBox="0 0 32 28" fill="none">
        {tone === "brand" && (
          <Defs>
            <LinearGradient
              id="menao"
              x1="16"
              y1="2"
              x2="16"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#86a0fb" />
              <Stop offset="1" stopColor="#4869f6" />
            </LinearGradient>
          </Defs>
        )}
        <Path
          d="M9.5 10.5 16 5.5l6.5 5"
          stroke={stroke}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
          stroke={stroke}
          strokeWidth={4.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
