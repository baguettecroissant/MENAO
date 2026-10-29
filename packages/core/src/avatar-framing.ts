/**
 * Cadrage de la photo de profil (ADR 0202) : l'image est placée dans un carré de côté `side`, avec
 * un zoom et un décalage choisis par l'utilisateur. Zoom minimal : image entière (logo, fond
 * autour) ; zoom « remplir » : le carré est couvert (photo). Partagé par le site et l'application.
 */

/** Côté de l'image enregistrée (photo de profil). */
export const AVATAR_SIDE = 512;
/** Zoom maximal, en multiple du zoom « remplir ». */
export const AVATAR_MAX_ZOOM = 4;
/** Image plus large ou plus haute que ce rapport : cadrée entière par défaut (logo, bannière). */
const WIDE_RATIO = 1.4;

export type AvatarFraming = {
  /** Pixels du carré par pixel de l'image. */
  scale: number;
  /** Position du coin haut gauche de l'image dans le carré. */
  x: number;
  y: number;
};

/** Zoom où l'image entière tient dans le rond de la bulle (sa diagonale égale au diamètre). */
export function fitScale(width: number, height: number, side: number): number {
  return side / Math.hypot(width, height);
}

/** Zoom où l'image couvre tout le carré. */
export function fillScale(width: number, height: number, side: number): number {
  return side / Math.min(width, height);
}

function clampAxis(position: number, length: number, side: number): number {
  const low = Math.min(0, side - length);
  const high = Math.max(0, side - length);
  return Math.min(high, Math.max(low, position));
}

/**
 * Cadrage gardé dans les limites : zoom entre « image entière » et 4 × « remplir » ; l'image ne
 * laisse pas de vide d'un côté quand elle dépasse, et ne sort pas du carré quand elle est plus
 * petite.
 */
export function clampFraming(
  framing: AvatarFraming,
  width: number,
  height: number,
  side: number,
): AvatarFraming {
  const scale = Math.min(
    fillScale(width, height, side) * AVATAR_MAX_ZOOM,
    Math.max(fitScale(width, height, side), framing.scale),
  );
  return {
    scale,
    x: clampAxis(framing.x, width * scale, side),
    y: clampAxis(framing.y, height * scale, side),
  };
}

/** Image centrée au zoom donné. */
export function centeredFraming(
  scale: number,
  width: number,
  height: number,
  side: number,
): AvatarFraming {
  return clampFraming(
    { scale, x: (side - width * scale) / 2, y: (side - height * scale) / 2 },
    width,
    height,
    side,
  );
}

/** Cadrage de départ : image entière pour un logo ou une image allongée, sinon carré rempli. */
export function initialFraming(width: number, height: number, side: number): AvatarFraming {
  const ratio = Math.max(width, height) / Math.min(width, height);
  const scale = ratio > WIDE_RATIO ? fitScale(width, height, side) : fillScale(width, height, side);
  return centeredFraming(scale, width, height, side);
}

/**
 * Zoom autour du centre du carré (curseur ou pincement), le point central de l'image restant au
 * centre.
 */
export function zoomFraming(
  framing: AvatarFraming,
  scale: number,
  width: number,
  height: number,
  side: number,
): AvatarFraming {
  const ratio = scale / framing.scale;
  const center = side / 2;
  return clampFraming(
    { scale, x: center - (center - framing.x) * ratio, y: center - (center - framing.y) * ratio },
    width,
    height,
    side,
  );
}

/** Même cadrage pour un carré d'une autre taille (aperçu à l'écran → image enregistrée). */
export function rescaleFraming(framing: AvatarFraming, from: number, to: number): AvatarFraming {
  const k = to / from;
  return { scale: framing.scale * k, x: framing.x * k, y: framing.y * k };
}

/** Couleur de fond autour d'une image entière : moyenne des pixels du bord (RGBA, 4 octets). */
export function edgeColor(pixels: Uint8ClampedArray, width: number, height: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    // Pixels transparents (PNG) : comptés comme du blanc.
    const a = (pixels[i + 3] ?? 255) / 255;
    r += (pixels[i] ?? 255) * a + 255 * (1 - a);
    g += (pixels[i + 1] ?? 255) * a + 255 * (1 - a);
    b += (pixels[i + 2] ?? 255) * a + 255 * (1 - a);
    n++;
  };
  for (let x = 0; x < width; x++) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    add(0, y);
    add(width - 1, y);
  }
  if (n === 0) return "#ffffff";
  const hex = (v: number) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
