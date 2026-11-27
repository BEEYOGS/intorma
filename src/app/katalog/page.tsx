import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ProductIllustration } from "@/components/ProductIllustration";
import { isAdmin } from "@/lib/auth";
import { getServices, type Service } from "@/lib/db";
import { priceLabel } from "@/lib/pricing";

const SECTIONS = [
  {
    key: "design",
    id: "desain",
    label: "Desain",
    description: "Identitas, materi promosi, dan konten digital.",
  },
  {
    key: "print",
    id: "cetak",
    label: "Cetak & produksi",
    description: "Harga dihitung otomatis dari jumlah, ukuran, dan finishing.",
  },
  {
    key: "other",
    id: "lainnya",
    label: "Lainnya",
    description: "Belum menemukan yang cocok? Ceritakan kebutuhanmu.",
  },
] as const;

function ProductCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/order?layanan=${service.id}`}
      className="card glow-card group flex flex-col overflow-hidden"
    >
      <div className="relative grid h-40 place-items-center overflow-hidden border-b border-line bg-white/[0.015] px-5 text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "radial-gradient(currentColor 0.6px, transparent 0.6px)",
            backgroundSize: "11px 11px",
          }}
        />
        <ProductIllustration service={service} className="relative h-28 w-full max-w-[250px]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15px] font-medium leading-snug text-[var(--text)]">{service.name}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-3)]">{service.blurb}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="mono text-sm text-[var(--gold-2)]">{priceLabel(service)}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--text-3)]">
              <Clock3 aria-hidden className="size-3" /> ± {service.days} hari
            </p>
          </div>
          <span className="inline-flex size-8 shrink-0 place-items-center rounded-tag-sm border border-line text-[var(--text-3)] transition-colors group-hover:border-[var(--border-2)] group-hover:text-[var(--text)]">
            <ArrowUpRight aria-hidden className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function KatalogPage() {
  const [services, admin] = await Promise.all([getServices(), isAdmin()]);

  return (
    <div className="animate-in">
      <TopBar isAdmin={admin} />

      <section className="pb-10 pt-20 sm:pb-12 sm:pt-28">
        <div className="wrap">
          <p className="eyebrow mb-4">Katalog layanan</p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Semua yang bisa kami buat untukmu.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)] sm:text-base">
                Pilih layanan, tentukan spesifikasi, dan lihat harga final sebelum memesan. Harga cetak
                dihitung otomatis saat kamu mengisi jumlah dan ukuran.
              </p>
              <p className="mt-2 text-xs text-[var(--text-3)]">
                Gambar di katalog adalah ilustrasi skematis, bukan foto hasil produksi.
              </p>
            </div>
            <Link href="/order" className="btn btn-primary w-fit !h-10 px-4 text-sm">
              Mulai pesan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          <nav aria-label="Kategori katalog" className="mt-8 flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="chip hover:text-[var(--text)]">
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {SECTIONS.map((section) => {
        const items = services.filter((service) => service.category === section.key);
        if (items.length === 0) return null;
        return (
          <section key={section.id} id={section.id} className="scroll-mt-24 pb-14">
            <div className="wrap">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{section.label}</h2>
                  <p className="mt-1 text-xs text-[var(--text-3)]">{section.description}</p>
                </div>
                <span className="mono text-xs text-[var(--text-3)]">
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
                {items.map((service) => (
                  <ProductCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="pb-20">
        <div className="wrap">
          <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Belum menemukan yang dicari?</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                Pilih “Belum tahu butuh apa” di halaman pemesanan, lalu ceritakan kebutuhanmu.
              </p>
            </div>
            <Link href="/order?layanan=lain" className="btn btn-ghost w-fit !h-10 px-4 text-sm">
              Ceritakan kebutuhan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
