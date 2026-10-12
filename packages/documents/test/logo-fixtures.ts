import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFStream } from "pdf-lib";
import type { DocumentLogo } from "../src/pdf-layout.ts";

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Logos de test (60 × 24 px) : PNG à fond transparent, et sa version JPEG. */
export const PNG_LOGO: DocumentLogo = {
  type: "png",
  bytes: bytes(
    "iVBORw0KGgoAAAANSUhEUgAAADwAAAAYCAYAAACmwZ5SAAAAO0lEQVR42u3WsQ0AMAgDQcbLKtlfoiUzpATuJQ9w" +
      "nSMkjercrEkDBt4O/g0YGBgYGBjY8QAG3gqW1KoHzSEcSMK+IsMAAAAASUVORK5CYII=",
  ),
};
export const JPEG_LOGO: DocumentLogo = {
  type: "jpeg",
  bytes: bytes(
    "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAAB" +
      "AAEAAKACAAQAAAABAAAAPKADAAQAAAABAAAAGAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklN" +
      "BCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAGAA8AwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAAB" +
      "AgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNi" +
      "coIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SV" +
      "lpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8B" +
      "AAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXET" +
      "IjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpz" +
      "dHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm" +
      "5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwQDAwMEBQQEBAQFBwUFBQUFBwgHBwcHBwcICAgICAgICAoKCgoK" +
      "CgsLCwsLDQ0NDQ0NDQ0NDf/bAEMBAgICAwMDBgMDBg0JBwkNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N" +
      "DQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDf/dAAQABP/aAAwDAQACEQMRAD8A/Wz9oL9oL/hRP9gf8SD+3P7c+2f8vn2Tyfsn" +
      "k/8ATGbdu872xt754+b/APh4L/1IX/lY/wDuKj/goL/zIX/cY/8AbKv0gr9fp0+HMq4cy7H4/Lvb1a/tbv2s4W5J" +
      "2Wiutmui263PnHLG4jG1qNGtyRhy/ZT3V+p+b/8Aw8F/6kL/AMrH/wBxUf8ADwX/AKkL/wArH/3FR/wUF/5kL/uM" +
      "f+2Vfm/X6/wdwBwhn2UUc1+ocnPze77WpK3LJx35le9r7HzmZZvmOExMsP7a9ra8sVuk+x+kH/DwX/qQv/Kx/wDc" +
      "VH/DwX/qQv8Aysf/AHFX5v0V9N/xB3hD/oE/8qVP/kzh/wBZMx/5+fhH/I/SD/h4L/1IX/lY/wDuKv0gr+b+v6QK" +
      "/DfGfg7KMh+p/wBlUeTn9pze9KV+Xkt8Una13tY+q4ZzLE4v2n1iV7Wtolvfsl2P/9D9bP2gv2ff+F7f2B/xP/7D" +
      "/sP7Z/y5/a/O+1+T/wBNodu3yffO7tjn5v8A+HfX/U+/+Uf/AO7a/SCivucn8SeI8qwcMBgMRy0o3suSDtdtvVxb" +
      "3b6nlYnJMFiKjrVoXk/N+nRn5v8A/Dvr/qff/KP/APdtH/Dvr/qff/KP/wDdtfpBRXp/8Ri4v/6C/wDynT/+QMP9" +
      "W8u/59/jL/M/N/8A4d9f9T7/AOUf/wC7aP8Ah31/1Pv/AJR//u2v0goo/wCIxcX/APQX/wCU6f8A8gH+reXf8+/x" +
      "l/mfm/8A8O+v+p9/8o//AN21+kFFFfM8RcY5vn3s/wC1a3PyX5fdjG3Na/wxV72W9zuwWW4bCX+rxtffVvb1b7n/" +
      "2Q==",
  ),
};

/** Images dessinées sur la première page (hors masques de transparence) : dimensions en pixels. */
export async function drawnImages(pdf: Uint8Array): Promise<{ width: number; height: number }[]> {
  const doc = await PDFDocument.load(pdf);
  const xobjects = doc.getPage(0).node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  return (xobjects?.keys() ?? []).map((key) => {
    const image = doc.context.lookup(xobjects?.get(key), PDFStream);
    const size = (name: string) => doc.context.lookup(image.dict.get(PDFName.of(name)), PDFNumber);
    return { width: size("Width").asNumber(), height: size("Height").asNumber() };
  });
}
