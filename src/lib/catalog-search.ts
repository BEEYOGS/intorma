import type { Service } from "@/lib/db";

/**
 * Kelompok sinonim. Kalau query mengandung salah satu kata di grup,
 * semua kata lain di grup dianggap cocok. Ini membuat pencarian "cerdas"
 * tanpa backend: "banner" ikut menemukan "spanduk", "stiker" ikut
 * menemukan "sticker", dst.
 */
const ALIAS_GROUPS: string[][] = [
  ["spanduk", "banner", "baliho", "umbul", "flexi"],
  ["stiker", "sticker", "label", "vinyl"],
  ["kartu nama", "business card", "name card", "kartu"],
  ["kemasan", "packaging", "box", "dus", "kotak"],
  ["undangan", "invitation", "kartu ucapan"],
  ["poster", "plakat", "a3", "a4"],
  ["brosur", "flyer", "selebaran", "leaflet"],
  ["logo", "branding", "identitas", "brand"],
  ["instagram", "feed", "story", "sosmed", "media sosial", "konten sosial"],
  ["video", "reels", "tiktok", "shorts"],
  ["website", "web", "landing page", "landing"],
  ["nota", "invoice", "kwitansi", "receipt"],
  ["kemasan makanan", "food box", "box makanan"],
  ["kemasan kosmetik", "box kosmetik", "packaging kosmetik"],
  ["kartu ucapan", "greeting card", "thank you card"],
];

/** Normalisasi teks: lowercase, tanpa aksen, spasi tunggal. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Kumpulan istilah yang dianggap cocok untuk query (termasuk sinonim). */
function expandTerms(query: string): string[] {
  const q = normalizeText(query);
  if (!q) return [];
  const terms = new Set(q.split(" ").filter(Boolean));
  for (const group of ALIAS_GROUPS) {
    const normalized = group.map(normalizeText);
    if (normalized.some((term) => q.includes(term))) {
      normalized.forEach((term) => term.split(" ").forEach((t) => terms.add(t)));
    }
  }
  return [...terms];
}

export function serviceHaystack(service: Service): string {
  return normalizeText(
    `${service.name} ${service.blurb} ${service.id} ${service.category} ${service.unit_label ?? ""}`,
  );
}

/** Skor relevansi. 0 = tidak cocok. */
export function scoreService(service: Service, query: string): number {
  const q = normalizeText(query);
  if (!q) return 0;
  const hay = serviceHaystack(service);
  const name = normalizeText(service.name);
  let score = 0;

  if (name === q) score += 120;
  else if (name.startsWith(q)) score += 70;
  else if (name.includes(q)) score += 40;
  if (hay.includes(q)) score += 20;

  const terms = expandTerms(q);
  const matched = terms.filter((t) => hay.includes(t)).length;
  if (matched > 0) score += matched * 8;

  // Bonus bila sinonim grup cocok di kedua sisi.
  for (const group of ALIAS_GROUPS) {
    const normalized = group.map(normalizeText);
    if (normalized.some((term) => q.includes(term)) && normalized.some((term) => hay.includes(term))) {
      score += 12;
    }
  }

  return score;
}

/** Filter + urutkan berdasarkan relevansi. Kalau query kosong, kembalikan salinan input. */
export function searchServices(services: Service[], query: string): Service[] {
  const q = normalizeText(query);
  if (!q) return services.slice();
  return services
    .map((service) => ({ service, score: scoreService(service, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name, "id"))
    .map((item) => item.service);
}

/** Saran pencarian bila hasil kosong: term-term dari grup sinonim yang cocok. */
export function searchSuggestions(query: string, limit = 5): string[] {
  const q = normalizeText(query);
  if (!q) return [];
  const out = new Set<string>();
  for (const group of ALIAS_GROUPS) {
    const normalized = group.map(normalizeText);
    if (normalized.some((term) => term.includes(q) || q.includes(term))) {
      group.forEach((term) => {
        if (normalizeText(term) !== q) out.add(term);
      });
    }
  }
  return [...out].slice(0, limit);
}

/** Sorot kata yang cocok di teks (aman, tanpa HTML). */
export function highlightTerms(text: string, query: string): Array<{ text: string; match: boolean }> {
  const q = normalizeText(query);
  if (!q) return [{ text, match: false }];
  const terms = expandTerms(q);
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts: Array<{ text: string; match: boolean }> = [];
  let last = 0;
  const matches = [...text.matchAll(regex)];
  for (const m of matches) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx), match: false });
    parts.push({ text: m[0], match: true });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  if (!parts.length) parts.push({ text, match: false });
  return parts;
}
