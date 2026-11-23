import { normalizeWA } from "./format";

export const SITE_NAME = "in.torma";
export const TAGLINE = "Creative without idea";

/**
 * Nomor WhatsApp studio. Bisa diubah lewat NEXT_PUBLIC_WA_NUMBER tanpa
 * menyentuh kode: 0896..., 896..., atau +62 896... semuanya dinormalisasi.
 */
const configuredNumber = process.env.NEXT_PUBLIC_WA_NUMBER?.trim() || "6289617607952";
export const WA_NUMBER = normalizeWA(configuredNumber) || "6289617607952";

/** Link universal: di ponsel membuka aplikasi WhatsApp. */
export function waLink(text?: string): string {
  const base = `https://wa.me/${WA_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Link desktop: langsung membuka chat di WhatsApp Web, tanpa halaman perantara. */
export function waWebLink(text?: string): string {
  const base = `https://web.whatsapp.com/send?phone=${WA_NUMBER}`;
  return text ? `${base}&text=${encodeURIComponent(text)}` : base;
}

/** Tampilan nomor yang enak dibaca, mis. +62 896-1760-7952. */
export const waDisplay = (() => {
  const n = WA_NUMBER;
  if (n.length < 8) return `+${n}`;
  return `+${n.slice(0, 2)} ${n.slice(2, 5)}-${n.slice(5, 9)}-${n.slice(9)}`;
})();
