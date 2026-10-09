import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, detectFileType, stripImageMetadata } from "../src/files";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const bytes = (...parts: number[][]) => new Uint8Array(parts.flat());

/** Segment JPEG : marqueur + longueur (2 octets, incluant la longueur) + données. */
function seg(marker: number, data: number[]) {
  const len = data.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...data];
}

/** Chunk PNG : longueur + type + données + CRC (non vérifié ici). */
function chunk(type: string, data: number[]) {
  const len = data.length;
  return [
    (len >>> 24) & 0xff,
    (len >>> 16) & 0xff,
    (len >>> 8) & 0xff,
    len & 0xff,
    ...ascii(type),
    ...data,
    1,
    2,
    3,
    4,
  ];
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GPS = ascii("GPS 43.7N 7.26E");

describe("detectFileType", () => {
  it("reconnaît PDF, JPEG et PNG par leur signature", () => {
    expect(detectFileType(bytes(ascii("%PDF-1.7\n")))).toBe("pdf");
    expect(detectFileType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectFileType(bytes(PNG_SIG, [0, 0]))).toBe("png");
  });

  it("refuse le reste, quel que soit le nom ou le type déclaré", () => {
    expect(detectFileType(bytes(ascii("<html>")))).toBeNull();
    expect(detectFileType(bytes(ascii("MZ"), [0x90, 0x00]))).toBeNull();
    expect(detectFileType(new Uint8Array())).toBeNull();
  });

  it("limite de taille : 10 Mo", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("stripImageMetadata — JPEG", () => {
  const app0 = seg(0xe0, ascii("JFIF\0"));
  const exif = seg(0xe1, [...ascii("Exif\0\0"), ...GPS]);
  const xmp = seg(0xe1, ascii("http://ns.adobe.com/xap/1.0/"));
  const icc = seg(0xe2, ascii("ICC_PROFILE\0"));
  const comment = seg(0xfe, ascii("Appareil de Camille"));
  const iptc = seg(0xed, ascii("Photoshop 3.0"));
  const dqt = seg(0xdb, [0, 1, 2, 3]);
  const scan = [...seg(0xda, [1, 2, 3]), 0x12, 0xff, 0x00, 0x34, 0xff, 0xd9];
  const jpeg = bytes([0xff, 0xd8], app0, exif, xmp, icc, comment, iptc, dqt, scan);

  it("retire EXIF, XMP, IPTC et commentaires", () => {
    const out = stripImageMetadata(jpeg, "jpeg");
    expect(out).toEqual(bytes([0xff, 0xd8], app0, icc, dqt, scan));
  });

  it("ne garde aucune trace des coordonnées GPS", () => {
    const text = String.fromCharCode(...stripImageMetadata(jpeg, "jpeg"));
    expect(text).not.toContain("GPS");
    expect(text).not.toContain("Camille");
  });

  it("refuse un JPEG tronqué", () => {
    expect(() =>
      stripImageMetadata(bytes([0xff, 0xd8], [0xff, 0xe1, 0x00, 0x40, 1, 2]), "jpeg"),
    ).toThrow();
  });
});

describe("stripImageMetadata — PNG", () => {
  const ihdr = chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const text = chunk("tEXt", [...ascii("Author\0"), ...ascii("Camille")]);
  const exif = chunk("eXIf", GPS);
  const time = chunk("tIME", [7, 234, 10, 9, 12, 0, 0]);
  const idat = chunk("IDAT", [1, 2, 3]);
  const iend = chunk("IEND", []);
  const png = bytes(PNG_SIG, ihdr, text, exif, time, idat, iend);

  it("retire tEXt, eXIf, tIME et garde les chunks d'image", () => {
    expect(stripImageMetadata(png, "png")).toEqual(bytes(PNG_SIG, ihdr, idat, iend));
  });

  it("refuse un PNG tronqué", () => {
    expect(() =>
      stripImageMetadata(bytes(PNG_SIG, [0, 0, 0, 50, ...ascii("IDAT"), 1]), "png"),
    ).toThrow();
  });
});
