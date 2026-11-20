import Link from "next/link";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { Footer, Nav } from "@/components/Chrome";
import { CopyButton } from "@/components/CopyButton";
import { Barcode, CmykChips, CropCorners, RegMark, Reveal, Ticker } from "@/components/Press";
import { getServices, type Service } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";
import { getPaymentSettings } from "@/lib/settings";
import { waLink } from "@/lib/site";

export const dynamic = "force-dynamic";

const steps = [
  ["01", "Isi brief", "Ceritakan kebutuhan dan referensi yang kamu suka. Sekitar dua menit.", "text-cyan"],
  ["02", "Konfirmasi", "Kami baca brief-nya, lalu bahas lingkup, harga, dan jadwal lewat WhatsApp.", "text-magenta"],
  ["03", "Pengerjaan", "Status dan catatan progres bisa kamu pantau kapan saja dari halaman lacak.", "text-yellow"],
  ["04", "Selesai", "File final dikirim sesuai kesepakatan. Pembayaran ditandai lunas oleh admin.", "text-green"],
];

const faq = [
  [
    "Bagaimana harga ditentukan?",
    "Layanan desain punya harga awal. Layanan cetak dihitung otomatis: misalnya spanduk Rp25.000 per meter, tinggal isi panjangnya—sistem langsung mengalikannya. Harga final tetap kami konfirmasi lewat WhatsApp sebelum produksi.",
  ],
  [
    "Berapa lama pengerjaannya?",
    "Estimasi hari ada di tiap layanan. Kamu juga bisa mengisi tanggal target di formulir; kalau perlu penyesuaian, kami kabari lebih dulu.",
  ],
  [
    "Bagaimana cara memantau pesanan?",
    "Setiap pesanan punya kode seperti INT-4MXDL6. Buka halaman lacak, atau kirim “status INT-4MXDL6” ke WhatsApp kami untuk balasan otomatis.",
  ],
  [
    "Bisa revisi?",
    "Bisa dibicarakan sesuai lingkup pekerjaan. Catatan revisi dan status terbaru muncul di halaman lacak pesananmu.",
  ],
  [
    "Bagaimana pembayarannya?",
    "Transfer ke rekening BCA yang tertera, setelah harga disepakati. Lalu konfirmasi lewat WhatsApp; admin menandai pembayaran lunas di halaman pesanan.",
  ],
];

function ServiceRows({ items, accent }: { items: Service[]; accent: "cyan" | "magenta" }) {
  const bar = accent === "cyan" ? "bg-cyan" : "bg-magenta";
  const hoverText = accent === "cyan" ? "group-hover:text-cyan" : "group-hover:text-magenta";
  return (
    <ul className="border-t border-line">
      {items.map((service, index) => (
        <li key={service.id}>
          <Link
            href={`/order?layanan=${service.id}`}
            className="group relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 border-b border-line py-5 transition-colors hover:bg-panel/60 sm:grid-cols-[3.5rem_minmax(0,1fr)_9rem_7rem_1.5rem] sm:items-center sm:gap-x-6 sm:px-4 sm:py-6"
          >
            <span aria-hidden className={`absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100 ${bar}`} />
            <span className="row-span-2 pt-1 font-mono text-sm text-mute sm:row-span-1 sm:pt-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className={`block text-lg font-semibold leading-snug tracking-tight transition-colors sm:text-xl ${hoverText}`}>
                {service.name}
              </span>
              <span className="mt-1 block text-sm leading-5 text-mute">{service.blurb}</span>
            </span>
            <span className="row-span-2 text-right sm:row-span-1">
              <span className="block font-mono text-[13px] font-semibold tabular-nums sm:text-sm">{priceLabel(service)}</span>
              <span className="mt-1 block text-xs text-mute sm:hidden">± {service.days} hari</span>
            </span>
            <span className="hidden font-mono text-xs text-mute sm:block sm:text-right">± {service.days} hari</span>
            <span aria-hidden className={`hidden text-mute transition-all duration-300 group-hover:translate-x-1 sm:block ${hoverText}`}>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const [services, payment] = await Promise.all([getServices(), getPaymentSettings()]);
  const design = services.filter((s) => s.pricing_mode !== "per_unit");
  const print = services.filter((s) => s.pricing_mode === "per_unit");
  const priced = services.filter((s) => s.price_from > 0);
  const minPrice = priced.length ? Math.min(...priced.map((s) => s.price_from)) : null;
  const days = services.map((s) => s.days);
  const minDays = days.length ? Math.min(...days) : 1;
  const maxDays = days.length ? Math.max(...days) : 5;

  return (
    <>
      <Nav />
      <main id="konten">
        {/* --------------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="wrap grid gap-14 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:pb-24">
            <div className="max-w-2xl">
              <p className="enter eyebrow flex items-center gap-2.5" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
                <RegMark className="size-3.5 text-cyan" />
                Studio desain &amp; cetak — Indonesia
              </p>
              <h1 className="enter display mt-7 text-[clamp(2.9rem,7.4vw,6.2rem)]" style={{ "--enter-delay": "90ms" } as React.CSSProperties}>
                Ide kamu,
                <br />
                dibikin{" "}
                <span className="relative inline-block font-serif font-normal italic tracking-[-0.02em]">
                  kelihatan.
                  <span aria-hidden className="absolute -bottom-1 left-0 flex h-[5px] w-full gap-[3px] sm:-bottom-2">
                    <span className="h-full flex-1 bg-cyan" />
                    <span className="h-full flex-1 bg-magenta" />
                    <span className="h-full flex-1 bg-yellow" />
                    <span className="h-full flex-1 bg-ink/70" />
                  </span>
                </span>
              </h1>
              <p className="enter mt-8 max-w-lg text-[15px] leading-7 text-ink/65 sm:text-base sm:leading-8" style={{ "--enter-delay": "180ms" } as React.CSSProperties}>
                Logo, poster, konten sosial, kemasan, sampai spanduk dan kartu nama. Pilih layanan, isi
                jumlahnya, dan harga langsung terhitung—tanpa perlu tanya-tanya dulu.
              </p>
              <div className="enter mt-9 flex flex-wrap items-center gap-3" style={{ "--enter-delay": "270ms" } as React.CSSProperties}>
                <Link href="/order" className="btn-primary">
                  Mulai pesan <span aria-hidden="true">→</span>
                </Link>
                <Link href="/lacak" className="btn-outline">
                  Lacak pesanan
                </Link>
              </div>
              <ul className="enter mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] uppercase tracking-[0.08em] text-mute" style={{ "--enter-delay": "360ms" } as React.CSSProperties}>
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-cyan" />Harga otomatis</li>
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-magenta" />Kabar via WhatsApp</li>
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-yellow" />Lacak online</li>
              </ul>
            </div>

            <aside
              aria-label="Ringkasan studio"
              className="enter relative border border-line bg-panel/80 p-7 shadow-ticket sm:p-9"
              style={{ "--enter-delay": "220ms" } as React.CSSProperties}
            >
              <CropCorners />
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow">Mulai dari</p>
                  <p className="mt-3 font-mono text-4xl font-bold tabular-nums tracking-tight text-cyan sm:text-5xl">
                    {minPrice ? rupiah(minPrice) : "Sesuai brief"}
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" className="h-14 w-14 shrink-0 rounded-tag-sm bg-ink p-1.5" />
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 text-sm">
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Layanan</dt>
                  <dd className="mt-1.5 font-semibold">{services.length} pilihan</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Pengerjaan</dt>
                  <dd className="mt-1.5 font-semibold">{minDays}–{maxDays} hari</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Pembayaran</dt>
                  <dd className="mt-1.5 font-semibold">{payment.enabled ? payment.bankName || "Transfer" : "Via WhatsApp"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Konfirmasi</dt>
                  <dd className="mt-1.5 font-semibold">WhatsApp</dd>
                </div>
              </dl>

              <div className="mt-8 border-t border-line pt-6">
                <Barcode value="INTORMA-STUDIO" height={30} className="text-ink/70" label="" />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <CmykChips />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Creative without idea</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <Ticker items={["Logo", "Poster", "Feed Instagram", "Kemasan", "Spanduk", "Kartu Nama", "Stiker", "Thumbnail"]} />

        {/* ------------------------------------------------------------ Layanan */}
        <section id="layanan" className="scroll-mt-24 border-b border-line">
          <div className="wrap py-16 sm:py-24">
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
                <div>
                  <p className="eyebrow flex items-center gap-2.5">
                    <RegMark className="size-3.5 text-magenta" />
                    Layanan &amp; harga
                  </p>
                  <h2 className="display mt-5 text-4xl sm:text-5xl">Pilih bentuk yang kamu butuhkan.</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-mute lg:justify-self-end">
                  Harga di bawah adalah titik awal. Setiap proyek punya kebutuhan sendiri, jadi harga final
                  selalu dikonfirmasi sebelum mulai.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 space-y-12 sm:mt-14">
              <Reveal>
                <section aria-labelledby="grp-desain">
                  <div className="mb-3 flex items-baseline gap-3">
                    <span aria-hidden className="h-3 w-3 bg-cyan" />
                    <h3 id="grp-desain" className="font-serif text-2xl italic text-ink/80">Desain</h3>
                    <span aria-hidden className="h-px flex-1 bg-line" />
                    <span className="font-mono text-xs text-mute">{design.length} layanan</span>
                  </div>
                  <ServiceRows items={design} accent="cyan" />
                </section>
              </Reveal>

              <Reveal>
                <section aria-labelledby="grp-cetak">
                  <div className="mb-3 flex items-baseline gap-3">
                    <span aria-hidden className="h-3 w-3 bg-magenta" />
                    <h3 id="grp-cetak" className="font-serif text-2xl italic text-ink/80">Cetak</h3>
                    <span aria-hidden className="h-px flex-1 bg-line" />
                    <span className="font-mono text-xs text-mute">{print.length} layanan</span>
                  </div>
                  <ServiceRows items={print} accent="magenta" />
                </section>
              </Reveal>
            </div>

            <Reveal>
              <p className="mt-10 text-sm text-mute">
                Belum tahu harus pilih apa?{" "}
                <a
                  href={waLink("Halo in.torma, saya belum tahu butuh layanan apa. Boleh minta arahan?")}
                  target="_blank"
                  rel="noreferrer"
                  className="link-accent"
                >
                  Ceritakan saja lewat WhatsApp
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- Cara kerja */}
        <section id="cara-kerja" className="relative scroll-mt-24 overflow-hidden border-b border-line bg-sand/80">
          <div aria-hidden className="pointer-events-none absolute -right-40 top-0 size-[30rem] rounded-full bg-magenta/[0.05] blur-[110px]" />
          <div className="wrap relative py-16 sm:py-24">
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
                <div>
                  <p className="eyebrow flex items-center gap-2.5">
                    <RegMark className="size-3.5 text-yellow" />
                    Cara kerja
                  </p>
                  <h2 className="display mt-5 text-4xl sm:text-5xl">Jelas dari awal sampai akhir.</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-mute lg:justify-self-end">
                  Kamu tahu apa yang sedang dikerjakan, kapan kira-kira selesai, dan di mana bisa melihat
                  progresnya.
                </p>
              </div>
            </Reveal>

            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map(([number, title, description, color], i) => (
                <Reveal key={number} delay={i * 110}>
                  <li className="relative h-full border border-line bg-panel/50 p-6">
                    <CropCorners className="border-line" />
                    <span className={`font-serif text-4xl italic ${color}`}>{number}</span>
                    <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- Pembayaran */}
        <section id="pembayaran" className="scroll-mt-24 border-b border-line">
          <div className="wrap grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
            <Reveal>
              <div>
                <p className="eyebrow flex items-center gap-2.5">
                  <RegMark className="size-3.5 text-green" />
                  Pembayaran
                </p>
                <h2 className="display mt-5 text-4xl sm:text-5xl">
                  Transfer bank,
                  <br />
                  <span className="font-serif font-normal italic tracking-[-0.02em]">tanpa ribet.</span>
                </h2>
                <p className="mt-6 max-w-md text-sm leading-6 text-ink/65">
                  Pembayaran dilakukan setelah harga dan lingkup kerja disepakati lewat WhatsApp. Setelah
                  transfer, konfirmasi lewat chat yang sama supaya pesanan bisa segera diproses.
                </p>
                <ul className="mt-7 space-y-3 text-sm text-mute">
                  <li className="flex gap-3"><span aria-hidden className="mt-[0.4rem] status-dot bg-yellow" />Nominal sesuai kesepakatan, bukan estimasi di daftar.</li>
                  <li className="flex gap-3"><span aria-hidden className="mt-[0.4rem] status-dot bg-green" />Status pembayaran ditandai lunas oleh admin.</li>
                  <li className="flex gap-3"><span aria-hidden className="mt-[0.4rem] status-dot bg-cyan" />Bukti transfer bisa dikirim langsung di WhatsApp.</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="ticket p-7 shadow-ticket sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-paper/55">Rekening tujuan</p>
                  <CmykChips className="size-2" />
                </div>
                {payment.enabled ? (
                  <>
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                      {hasBankLogo(payment.bankName) && (
                        <span className="grid h-12 shrink-0 place-items-center rounded-tag-sm border border-paper/15 bg-paper px-3">
                          <BankLogo bank={payment.bankName} className="h-7 w-auto" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-paper/60">Transfer {payment.bankName || "bank"}</p>
                        <p className="mt-0.5 break-all font-mono text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                          {payment.bankAccount}
                        </p>
                      </div>
                    </div>
                    {payment.bankHolder && <p className="mt-3 text-sm text-paper/60">a.n. {payment.bankHolder}</p>}
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-paper/25 pt-5">
                      <CopyButton value={payment.bankAccount} label="Salin nomor" className="!border-paper/25 !bg-paper/5 !text-paper hover:!border-paper hover:!text-paper" />
                      <a
                        href={waLink("Halo in.torma, saya mau konfirmasi transfer pesanan.")}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-on-dark min-h-10 px-4 text-sm"
                      >
                        Konfirmasi via WhatsApp <span aria-hidden="true">→</span>
                      </a>
                    </div>
                    {payment.note && <p className="mt-5 text-sm leading-6 text-paper/55">{payment.note}</p>}
                  </>
                ) : (
                  <p className="mt-6 text-sm leading-6 text-paper/60">
                    Instruksi transfer sedang tidak ditampilkan. Pembayaran dibahas langsung lewat WhatsApp
                    setelah harga disepakati.
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------------- FAQ */}
        <section className="border-b border-line">
          <div className="wrap grid gap-10 py-16 sm:py-24 lg:grid-cols-[.75fr_1.25fr]">
            <Reveal>
              <div>
                <p className="eyebrow flex items-center gap-2.5">
                  <RegMark className="size-3.5 text-blue" />
                  Pertanyaan
                </p>
                <h2 className="display mt-5 text-4xl sm:text-5xl">Hal yang sering ditanya.</h2>
                <p className="mt-5 max-w-xs text-sm leading-6 text-mute">
                  Masih ada yang lain?{" "}
                  <a href={waLink()} target="_blank" rel="noreferrer" className="link-accent">
                    Chat kami
                  </a>
                  , dibalas manusia—bukan bot.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="border-t border-line">
                {faq.map(([question, answer]) => (
                  <details key={question} className="group border-b border-line">
                    <summary className="flex cursor-pointer items-center justify-between gap-5 py-5 text-[15px] font-semibold leading-6 transition-colors hover:text-cyan">
                      {question}
                      <span aria-hidden className="grid size-6 shrink-0 place-items-center border border-line font-mono text-sm text-mute transition-all duration-300 group-open:rotate-45 group-open:border-cyan/60 group-open:text-cyan">
                        +
                      </span>
                    </summary>
                    <p className="max-w-xl pb-6 text-sm leading-6 text-ink/60">{answer}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------------- CTA */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 size-[26rem] rounded-full bg-cyan/[0.06] blur-[100px]" />
          <div className="wrap relative grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.2fr_auto] lg:items-end">
            <Reveal>
              <div>
                <p className="eyebrow">Mulai dari ceritamu</p>
                <h2 className="display mt-5 text-[clamp(2.4rem,5.5vw,4.5rem)]">
                  Brief belum rapi?
                  <br />
                  <span className="font-serif font-normal italic tracking-[-0.02em] text-magenta">Nggak masalah.</span>
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-ink/60 sm:text-base sm:leading-7">
                  Pilih layanan dan isi yang sudah kamu tahu. Sisanya bisa dibicarakan setelahnya—lewat
                  WhatsApp, tanpa harus rapat.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex flex-wrap gap-3">
                <Link href="/order" className="btn-primary">
                  Mulai pesan <span aria-hidden="true">→</span>
                </Link>
                <a href={waLink()} target="_blank" rel="noreferrer" className="btn-outline">
                  Tanya dulu
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}