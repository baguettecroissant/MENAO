import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { qrPath } from "@/lib/qr";
import { theme } from "@/ui/theme";

/** QR code d'une adresse, sur fond blanc (lisible par l'appareil photo, même en mode sombre). */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const qr = useMemo(() => qrPath(value), [value]);
  return (
    <View role="img" aria-label={label} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${qr.size} ${qr.size}`}>
        <Rect width={qr.size} height={qr.size} fill="#ffffff" />
        <Path d={qr.path} fill={theme.colors.foreground} />
      </Svg>
    </View>
  );
}
