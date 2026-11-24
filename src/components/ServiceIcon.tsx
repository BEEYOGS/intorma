import {
  BookOpen,
  Boxes,
  CalendarDays,
  ContactRound,
  CupSoda,
  FileImage,
  Gift,
  IdCard,
  Layers3,
  Newspaper,
  NotebookPen,
  Palette,
  PenTool,
  Printer,
  Ruler,
  Scissors,
  Shirt,
  Sparkles,
  Sticker,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import type { Service } from "@/lib/db";

const RULES: [RegExp, LucideIcon][] = [
  [/kartu|undangan|wedding|undang/i, ContactRound],
  [/stiker|label|sticker/i, Sticker],
  [/brosur|flyer|pamflet|leaflet/i, Newspaper],
  [/poster|banner|spanduk|billboard/i, Stamp],
  [/katalog|booklet|buku|majalah|notebook/i, BookOpen],
  [/kalender|calendar/i, CalendarDays],
  [/kaos|baju|shirt|apparel/i, Shirt],
  [/tumbler|gelas|mug|cup/i, CupSoda],
  [/lanyard|id.?card|badge/i, IdCard],
  [/kopi|coffee/i, CupSoda],
  [/laminat|lamination|binding|jilid/i, Layers3],
  [/potong|cutting|laser|cetak.*kain/i, Scissors],
  [/ukur|ruler|measurement/i, Ruler],
  [/digital|file|scan|foto/i, FileImage],
  [/kemasan|packaging|box|kotak/i, Boxes],
  [/hadiah|gift|souvenir/i, Gift],
  [/logo|brand|identitas/i, Palette],
  [/tulis|catatan|note/i, NotebookPen],
  [/desain|design|ilustrasi/i, PenTool],
  [/cetak|print/i, Printer],
];

const FALLBACK: LucideIcon[] = [Sparkles, PenTool, Printer, Layers3, Palette, Scissors, Stamp, Boxes];

export function ServiceIcon({
  service,
  className = "size-5",
}: {
  service: Pick<Service, "id" | "name"> & { blurb?: string };
  className?: string;
}) {
  const haystack = `${service.name} ${service.blurb ?? ""} ${service.id}`;
  const match = RULES.find(([pattern]) => pattern.test(haystack));
  let hash = 0;
  for (const char of service.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const Icon = match?.[1] ?? FALLBACK[hash % FALLBACK.length];
  return <Icon aria-hidden className={className} strokeWidth={1.7} />;
}

export function ServiceIconTile({
  service,
  className = "size-10",
}: {
  service: Pick<Service, "id" | "name"> & { blurb?: string };
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-tag-sm border border-line bg-white/[0.035] text-ink/75 ${className}`}
    >
      <ServiceIcon service={service} className={className.includes("size-10") ? "size-5" : "size-4"} />
    </span>
  );
}
