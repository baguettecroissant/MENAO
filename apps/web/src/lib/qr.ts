import { toQR } from "toqr";

/**
 * QR code d'une adresse, en tracé SVG (un carré par module), avec une marge de 4 modules. Calculé
 * côté serveur : aucun script dans la page.
 */
export function qrSvg(text: string): { size: number; path: string } {
  const modules = toQR(text);
  const side = Math.sqrt(modules.length);
  const margin = 4;
  let path = "";
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (modules[y * side + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }
  return { size: side + margin * 2, path };
}
