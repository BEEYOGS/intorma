import {
  BookOpen,
  Boxes,
  CalendarDays,
  Camera,
  ContactRound,
  CupSoda,
  FileImage,
  Flag,
  Gift,
  IdCard,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  Monitor,
  Newspaper,
  NotebookPen,
  Palette,
  PenLine,
  PenTool,
  Printer,
  Ruler,
  Scissors,
  Shirt,
  Sparkles,
  Sticker,
  type LucideIcon,
} from "lucide-react";
import type { Service } from "@/lib/db";

const RULES: [RegExp, LucideIcon][] = [
  [/dtf|sablon|kaos|baju|shirt|apparel/i, Shirt],
  [/kartu|undangan|wedding|undang/i, ContactRound],
  [/stiker|label|sticker/i, Sticker],
  [/brosur|flyer|pamflet|leaflet/i, Newspaper],
  [/spanduk|x-banner|banner|billboard/i, Flag],
  [/poster/i, ImageIcon],
  [/feed|instagram|sosmed|media sosial/i, LayoutGrid],
  [/katalog|booklet|buku|majalah|notebook/i, BookOpen],
  [/kalender|calendar/i, CalendarDays],
  [/tumbler|gelas|mug|cup|kopi|coffee/i, CupSoda],
  [/lanyard|id.?card|badge/i, IdCard],
  [/laminat|lamination|binding|jilid/i, Layers3],
  [/potong|cutting|laser|cetak.*kain/i, Scissors],
  [/ukur|ruler|measurement/i, Ruler],
  [/digital|file|scan/i, FileImage],
  [/foto|kamera|photo/i, Camera],
  [/kemasan|packaging|box|kotak/i, Boxes],
  [/hadiah|gift|souvenir/i, Gift],
  [/logo|brand|identitas/i, Palette],
  [/website|web|landing|desain web/i, Monitor],
  [/copywriting|naskah|copy|kata/i, PenLine],
  [/tulis|catatan|note/i, NotebookPen],
  [/desain|design|ilustrasi/i, PenTool],
  [/cetak|print/i, Printer],
];

const FALLBACK: LucideIcon[] = [Sparkles, PenTool, Printer, Layers3, Palette, Scissors, Flag, Boxes];

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
  for (const char of haystack) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
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
