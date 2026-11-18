export const SITE_NAME = "in.torma";
export const TAGLINE = "Creative without idea";

/** Nomor WhatsApp studio (format internasional tanpa tanda +). */
export const WA_NUMBER = "6289617607952";

export function waLink(text?: string): string {
  const base = `https://wa.me/${WA_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const waDisplay = "+62 896-1760-7952";
