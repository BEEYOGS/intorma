import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ProductIllustration } from "@/components/ProductIllustration";
import { StatusBadge } from "@/components/Chrome";
import { BankLogo } from "@/components/BankLogo";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { STATUS_META, asStatus } from "@/lib/status";
import { isAdmin } from "@/lib/auth";
import { getLatestJobs, getProductStats } from "@/lib/data";
import { getServices } from "@/lib/db";
import { sql } from "@/lib/db";
import { tanggal } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";

export default async function ProductPage() {
  const [stats, jobs, admin, services, reviews] = await Promise.all([
    getProductStats(),
    getLatestJobs(),
    isAdmin(),
    getServices(),
    sql`
      select r.name, r.rating, r.comment, r.created_at, coalesce(s.name, o.service_label) as service
      from reviews r
      left join orders o on o.id = r.order_id
      left join services s on s.id = o.service_id
      where r.approved = true
      order by r.created_at desc
      limit 6
    `.then((rows) => rows as Array<{ name: string; rating: number; comment: string; created_at: string | Date; service: string | null }>),
  ]);
  const featuredServices = services.slice(0, 9);

  return (
    <div className="animate-in">
      <TopBar isAdmin={admin} />
      {/* Hero */}
      <section className="pt-24 pb-20 sm:pt-32 sm:pb-24">
        <div className="wrap">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4">Studio desain & cetak — Indonesia</p>
            <h1 className="display gradient-text text-[clamp(2.5rem,5.5vw,4.25rem)] mb-6">
              Ide kamu, dibikin kelihatan.
            </h1>
            <p className="text-[17px] leading-relaxed text-[var(--text-2)] max-w-xl mb-8">
              Logo, poster, konten sosial, kemasan, sampai spanduk dan kartu nama. Pilih layanan, isi jumlahnya, harga langsung terhitung. Tanpa tanya-tanya dulu.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/order" className="btn btn-primary">
                Mulai pesan
              </Link>
              <Link href="/lacak" className="btn btn-ghost">
                Lacak pesanan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[var(--border)]">
        <div className="wrap">
          <div className="stat-grid">
            <div className="stat-cell">
              <div className="stat-value">{stats.services}</div>
              <div className="stat-label">Layanan aktif</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.orders}</div>
              <div className="stat-label">Total pesanan</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.menunggu}</div>
              <div className="stat-label">Menunggu</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.dikerjakan}</div>
              <div className="stat-label">Dikerjakan</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{stats.selesi}</div>
              <div className="stat-label">Selesai</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <div className="wrap">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="eyebrow mb-2">Layanan & harga</p>
              <h2 className="display text-2xl sm:text-3xl">Pilih bentuk yang kamu butuhkan.</h2>
            </div>
            <Link href="/order" className="btn btn-ghost text-sm">
              Semua layanan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="text-[15px] text-[var(--text-2)] max-w-2xl mb-10">
            Pilih bahan, ukuran, finishing, dan jumlah—total dihitung otomatis sebelum kamu membayar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[var(--radius-sharp)] overflow-hidden">
            {featuredServices.map((svc) => (
              <Link
                key={svc.id}
                href={`/order?layanan=${svc.id}`}
                className="bg-[var(--panel)] p-5 sm:p-6 transition-all duration-200 group hover:-translate-y-0.5 hover:bg-[var(--panel-2)]"
              >
                <div className="relative mb-4 grid h-32 place-items-center overflow-hidden rounded-tag-sm border border-line bg-white/[0.015] px-4 text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.16]"
                    style={{
                      backgroundImage: "radial-gradient(currentColor 0.6px, transparent 0.6px)",
                      backgroundSize: "11px 11px",
                    }}
                  />
                  <ProductIllustration service={svc} className="relative h-24 w-full max-w-[220px]" />
                  <ArrowUpRight aria-hidden className="absolute right-3 top-3 size-4 text-[var(--text-3)] transition-colors group-hover:text-[var(--accent-2)]" />
                </div>
                <h3 className="text-[15px] font-medium text-[var(--text)] mb-1">{svc.name}</h3>
                <p className="text-xs text-[var(--text-3)] leading-relaxed min-h-[2.5rem]">{svc.blurb}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="mono text-sm text-[var(--accent-2)]">{priceLabel(svc)}</span>
                  <span className="text-xs text-[var(--text-3)]">± {svc.days} hari</span>
                </div>
              </Link>
            ))}
          </div>
          {services.length > featuredServices.length && (
            <p className="mt-4 text-xs text-[var(--text-3)]">
              Menampilkan {featuredServices.length} dari {services.length} layanan.{" "}
              <Link href="/katalog" className="inline-flex items-center gap-1 text-[var(--text-2)] underline underline-offset-4 hover:text-[var(--text)]">
                Lihat katalog lengkap <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="section-sm border-t border-[var(--border)]">
        <div className="wrap">
          <p className="eyebrow mb-2">Cara kerja</p>
          <h2 className="display text-2xl sm:text-3xl mb-10">Jelas dari awal sampai akhir.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[var(--radius-sharp)] overflow-hidden">
            {[
              { num: "01", title: "Pilih & atur", desc: "Pilih layanan, lalu tentukan bahan, ukuran, finishing, dan jumlah." },
              { num: "02", title: "Lihat total", desc: "Harga dihitung otomatis dan langsung terlihat sebelum kamu memesan." },
              { num: "03", title: "Bayar", desc: "Transfer sesuai total, lalu kirim bukti transfer lewat WhatsApp." },
              { num: "04", title: "Selesai", desc: "Status dipantau lewat halaman lacak. File final dikirim setelah produksi." },
            ].map((step) => (
              <div key={step.num} className="bg-[var(--panel)] p-6">
                <span className="mono text-xs text-[var(--text-3)] mb-4 block">{step.num}</span>
                <h3 className="text-[15px] font-medium text-[var(--text)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="section-sm border-t border-[var(--border)]">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="eyebrow mb-2">Pembayaran</p>
              <h2 className="display text-2xl sm:text-3xl mb-4">Transfer bank, tanpa ribet.</h2>
              <p className="text-[15px] text-[var(--text-2)] leading-relaxed max-w-md">
                Total sudah tertera di halaman pesanan. Transfer sesuai nominal tersebut, lalu konfirmasi lewat WhatsApp supaya pesanan segera diproses.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[var(--text-2)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-2)] mt-0.5">—</span>
                  Nominal sesuai total di halaman pesanan.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-2)] mt-0.5">—</span>
                  Status pembayaran ditandai lunas oleh admin.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-2)] mt-0.5">—</span>
                  Bukti transfer bisa dikirim langsung di WhatsApp.
                </li>
              </ul>
            </div>
            <div className="card p-6">
              <p className="eyebrow mb-4">Rekening tujuan</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="grid h-8 w-12 place-items-center rounded border border-[var(--border)] bg-white p-1">
                  <BankLogo bank="BCA" className="h-full w-auto max-w-full object-contain" />
                </div>
                <div>
                  <p className="mono text-lg font-medium text-[var(--text)]">8171700213</p>
                  <p className="text-sm text-[var(--text-2)]">a.n. Yogi</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-3)]">
                Transfer sesuai total, lalu konfirmasi lewat WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-sm border-t border-[var(--border)]">
        <div className="wrap">
          <p className="eyebrow mb-2">Pertanyaan</p>
          <h2 className="display text-2xl sm:text-3xl mb-8">Hal yang sering ditanya.</h2>

          <div className="max-w-2xl space-y-px bg-[var(--border)] border border-[var(--border)] rounded-[var(--radius-sharp)] overflow-hidden">
            {[
              { q: "Bagaimana harga ditentukan?", a: "Pilih bahan, ukuran, finishing, dan jumlah. Total langsung dihitung otomatis dan terlihat sebelum kamu membuat pesanan." },
              { q: "Berapa lama pengerjaannya?", a: "Tergantung jenis layanan, rata-rata 1-5 hari kerja. Jadwal pasti dibahas saat konfirmasi." },
              { q: "Bagaimana cara memantau pesanan?", a: "Setelah pesan, kamu dapat kode pesanan. Lacak progresnya kapan saja di halaman lacak." },
              { q: "Bisa revisi?", a: "Bisa. Revisi minor biasanya sudah termasuk. Revisi besar dibahas dulu agar tidak keluar lingkup." },
              { q: "Bagaimana pembayarannya?", a: "Transfer bank sesuai total di halaman pesanan. Konfirmasi via WhatsApp, lalu admin menandai pesanan lunas." },
            ].map((faq) => (
              <details key={faq.q} className="bg-[var(--panel)] group">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-[15px] font-medium text-[var(--text)] hover:bg-[var(--panel-2)] transition-colors list-none">
                  {faq.q}
                  <span className="text-[var(--text-3)] group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-[var(--text-2)] leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section-sm border-t border-[var(--border)]">
          <div className="wrap">
            <p className="eyebrow mb-2">Ulasan klien</p>
            <h2 className="display text-2xl sm:text-3xl mb-8">Apa kata mereka.</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, index) => (
                <article key={index} className="card p-5">
                  <div className="flex items-center gap-1" role="img" aria-label={`${review.rating} dari 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="text-sm"
                        style={{ color: i < review.rating ? "#facc15" : "var(--text-3)" }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-2)]">“{review.comment}”</p>
                  <p className="mt-4 text-xs font-semibold text-[var(--text)]">{review.name}</p>
                  {review.service && <p className="text-xs text-[var(--text-3)]">{review.service}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-sm border-t border-[var(--border)]">
        <div className="wrap">
          <div className="card p-8 sm:p-12 text-center">
            <h2 className="display text-2xl sm:text-3xl mb-3">Mulai dari ceritamu.</h2>
            <p className="text-[15px] text-[var(--text-2)] max-w-md mx-auto mb-6">
              Brief belum rapi? Nggak masalah. Pilih layanan dan isi yang sudah kamu tahu. Sisanya bisa dibicarakan setelahnya.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/order" className="btn btn-primary">
                Mulai pesan
              </Link>
              <WhatsAppLink text="Halo in.torma, saya mau tanya soal layanan desain dan cetak." className="btn btn-ghost">
                <WhatsAppIcon aria-hidden className="size-4" /> Tanya dulu
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </section>

      {/* Latest jobs (if any) */}
      {jobs.length > 0 && (
        <section className="section-sm border-t border-[var(--border)]">
          <div className="wrap">
            <p className="eyebrow mb-2">Aktivitas terbaru</p>
            <h2 className="display text-2xl sm:text-3xl mb-8">Pesanan terbaru.</h2>
            <div className="border border-[var(--border)] rounded-[var(--radius-sharp)] overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="mono text-[var(--text)]">{job.code}</td>
                      <td>{job.name}</td>
                      <td>
                        <StatusBadge
                          color={STATUS_META[asStatus(job.status)].color}
                          label={STATUS_META[asStatus(job.status)].label}
                          status={asStatus(job.status)}
                          compact
                        />
                      </td>
                      <td className="mono text-xs">{tanggal(job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="wrap">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">in.torma</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Studio desain & cetak independen. Creative without idea.</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-[var(--text-3)]">
              <Link href="/order" className="hover:text-[var(--text-2)] transition-colors">Pesan</Link>
              <Link href="/lacak" className="hover:text-[var(--text-2)] transition-colors">Lacak</Link>
              <Link href="/download" className="hover:text-[var(--text-2)] transition-colors">Aplikasi</Link>
              <WhatsAppLink text="Halo in.torma, saya mau tanya soal layanan desain dan cetak." className="inline-flex items-center gap-1.5 hover:text-[var(--text-2)] transition-colors">
                <WhatsAppIcon aria-hidden className="size-3.5" /> WhatsApp
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}