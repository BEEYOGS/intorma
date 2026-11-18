import Link from "next/link";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { Footer, Nav } from "@/components/Chrome";
import { CopyButton } from "@/components/CopyButton";
import { getServices } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { getPaymentSettings } from "@/lib/settings";
import { waLink } from "@/lib/site";

export const dynamic = "force-dynamic";

const steps = [
  ["01", "Isi brief", "Ceritakan kebutuhan dan referensi yang kamu suka. Sekitar dua menit."],
  ["02", "Konfirmasi", "Kami baca brief-nya, lalu bahas lingkup, harga, dan jadwal lewat WhatsApp."],
  ["03", "Pengerjaan", "Status dan catatan progres bisa kamu pantau kapan saja dari halaman lacak."],
  ["04", "Selesai", "File final dikirim sesuai kesepakatan. Pembayaran ditandai lunas oleh admin."],
];

const faq = [
  [
    "Bagaimana harga ditentukan?",
    "Harga awal tiap layanan tertera di daftar. Setelah brief masuk, kami konfirmasi lingkup kerja dan harga final lewat WhatsApp sebelum pengerjaan dimulai.",
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

export default async function Home() {
  const [services, payment] = await Promise.all([getServices(), getPaymentSettings()]);
  const priced = services.filter((s) => s.price_from > 0);
  const minPrice = priced.length ? Math.min(...priced.map((s) => s.price_from)) : null;
  const days = services.map((s) => s.days);
  const minDays = days.length ? Math.min(...days) : 1;
  const maxDays = days.length ? Math.max(...days) : 5;

  return (
    <>
      <Nav />
      <main id="konten">
        <section className="border-b border-line">
          <div className="wrap grid gap-14 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:gap-20 lg:pb-20">
            <div className="max-w-2xl">
              <p className="eyebrow">Studio desain independen — Indonesia</p>
              <h1 className="display mt-6 text-[clamp(2.9rem,7.4vw,6.2rem)]">
                Ide kamu,
                <br />
                dibikin{" "}
                <span className="font-serif font-normal italic tracking-[-0.02em]">kelihatan.</span>
              </h1>
              <p className="mt-7 max-w-lg text-[15px] leading-7 text-ink/65 sm:text-base sm:leading-8">
                Logo, poster, konten sosial, sampai kemasan. Mulai dari cerita yang kamu punya; kami bantu
                bentuk jadi desain yang siap dipakai.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/order" className="btn-primary">
                  Mulai pesan <span aria-hidden="true">→</span>
                </Link>
                <Link href="/lacak" className="btn-outline">
                  Lacak pesanan
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-mute">
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-ink/30" />Harga awal transparan</li>
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-ink/30" />Kabar progres via WhatsApp</li>
                <li className="flex items-center gap-2"><span aria-hidden className="status-dot bg-ink/30" />Bisa dilacak online</li>
              </ul>
            </div>

            <aside aria-label="Ringkasan studio" className="relative overflow-hidden rounded-tag-lg bg-ink p-7 text-paper sm:p-9">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/60">Mulai dari</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {minPrice ? rupiah(minPrice) : "Sesuai brief"}
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" className="h-14 w-14 shrink-0 opacity-90" />
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-paper/15 pt-6 text-sm">
                <div>
                  <dt className="text-paper/60">Layanan</dt>
                  <dd className="mt-1 font-semibold">{services.length} pilihan</dd>
                </div>
                <div>
                  <dt className="text-paper/60">Pengerjaan</dt>
                  <dd className="mt-1 font-semibold">{minDays}–{maxDays} hari</dd>
                </div>
                <div>
                  <dt className="text-paper/60">Pembayaran</dt>
                  <dd className="mt-1 font-semibold">{payment.enabled ? payment.bankName || "Transfer" : "Via WhatsApp"}</dd>
                </div>
                <div>
                  <dt className="text-paper/60">Konfirmasi</dt>
                  <dd className="mt-1 font-semibold">WhatsApp</dd>
                </div>
              </dl>

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-paper/15 pt-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/int.svg" alt="in.torma — Creative without idea" className="h-7 w-auto invert" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-paper/55">Creative without idea</span>
              </div>
            </aside>
          </div>
        </section>

        <section id="layanan" className="scroll-mt-20 border-b border-line">
          <div className="wrap py-16 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="eyebrow">Layanan &amp; harga</p>
                <h2 className="display mt-5 text-4xl sm:text-5xl">Pilih bentuk yang kamu butuhkan.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-mute lg:justify-self-end">
                Harga di bawah adalah titik awal. Setiap proyek punya kebutuhan sendiri, jadi harga final
                selalu dikonfirmasi sebelum mulai.
              </p>
            </div>

            <ul className="mt-10 border-t border-line sm:mt-12">
              {services.map((service, index) => (
                <li key={service.id}>
                  <Link
                    href={`/order?layanan=${service.id}`}
                    className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 border-b border-line py-5 transition-colors hover:bg-sand/60 sm:grid-cols-[3rem_minmax(0,1fr)_8.5rem_7rem_1.5rem] sm:items-center sm:gap-x-6 sm:px-4 sm:py-6"
                  >
                    <span className="row-span-2 pt-1 font-serif text-lg italic text-ink/30 sm:row-span-1 sm:pt-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold leading-snug tracking-tight sm:text-xl">{service.name}</span>
                      <span className="mt-1 block text-sm leading-5 text-mute">{service.blurb}</span>
                    </span>
                    <span className="row-span-2 text-right sm:row-span-1">
                      <span className="block text-[13px] font-semibold sm:text-sm">
                        {service.price_from ? `Mulai ${rupiah(service.price_from)}` : "Sesuai brief"}
                      </span>
                      <span className="mt-1 block text-xs text-mute sm:hidden">± {service.days} hari</span>
                    </span>
                    <span className="hidden text-sm text-mute sm:block sm:text-right">± {service.days} hari</span>
                    <span aria-hidden="true" className="hidden text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-ink sm:block">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-mute">
              Belum tahu harus pilih apa?{" "}
              <a
                href={waLink("Halo in.torma, saya belum tahu butuh layanan apa. Boleh minta arahan?")}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
              >
                Ceritakan saja lewat WhatsApp
              </a>
              .
            </p>
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-20 border-b border-line bg-sand/70">
          <div className="wrap py-16 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="eyebrow">Cara kerja</p>
                <h2 className="display mt-5 text-4xl sm:text-5xl">Jelas dari awal sampai akhir.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-mute lg:justify-self-end">
                Kamu tahu apa yang sedang dikerjakan, kapan kira-kira selesai, dan di mana bisa melihat
                progresnya.
              </p>
            </div>

            <ol className="mt-10 grid gap-8 border-t border-ink/15 pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map(([number, title, description]) => (
                <li key={number} className="border-l border-ink/15 pl-5">
                  <span className="font-serif text-2xl italic text-ink/30">{number}</span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-ink/60">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pembayaran" className="scroll-mt-20 border-b border-line">
          <div className="wrap grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
            <div>
              <p className="eyebrow">Pembayaran</p>
              <h2 className="display mt-5 text-4xl sm:text-5xl">
                Transfer bank,
                <br />
                <span className="font-serif font-normal italic tracking-[-0.02em]">tanpa ribet.</span>
              </h2>
              <p className="mt-6 max-w-md text-sm leading-6 text-ink/65">
                Pembayaran dilakukan setelah harga dan lingkup kerja disepakati lewat WhatsApp. Setelah
                transfer, konfirmasi lewat chat yang sama supaya pesanan bisa segera diproses.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-mute">
                <li className="flex gap-2.5"><span aria-hidden className="mt-[0.45rem] status-dot bg-ink/30" />Nominal sesuai kesepakatan, bukan estimasi di daftar.</li>
                <li className="flex gap-2.5"><span aria-hidden className="mt-[0.45rem] status-dot bg-ink/30" />Status pembayaran ditandai lunas oleh admin.</li>
                <li className="flex gap-2.5"><span aria-hidden className="mt-[0.45rem] status-dot bg-ink/30" />Bukti transfer bisa dikirim langsung di WhatsApp.</li>
              </ul>
            </div>

            <div className="rounded-tag-lg border border-line bg-panel/60 p-6 sm:p-8">
              <p className="eyebrow">Rekening tujuan</p>
              {payment.enabled ? (
                <>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                    {hasBankLogo(payment.bankName) && (
                      <span className="grid h-12 shrink-0 place-items-center rounded-tag-sm border border-line bg-ink px-3">
                        <BankLogo bank={payment.bankName} className="h-7 w-auto" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-mute">Transfer {payment.bankName || "bank"}</p>
                      <p className="mt-0.5 break-all text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{payment.bankAccount}</p>
                    </div>
                    <CopyButton value={payment.bankAccount} label="Salin" />
                  </div>
                  {payment.bankHolder && <p className="mt-3 text-sm text-ink/60">a.n. {payment.bankHolder}</p>}
                  {payment.note && <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-mute">{payment.note}</p>}
                  <a
                    href={waLink("Halo in.torma, saya mau konfirmasi transfer pesanan.")}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline mt-6 w-full sm:w-auto"
                  >
                    Konfirmasi via WhatsApp <span aria-hidden="true">→</span>
                  </a>
                </>
              ) : (
                <p className="mt-5 text-sm leading-6 text-mute">
                  Instruksi transfer sedang tidak ditampilkan. Pembayaran dibahas langsung lewat WhatsApp
                  setelah harga disepakati.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="wrap grid gap-10 py-16 sm:py-24 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="eyebrow">Pertanyaan</p>
              <h2 className="display mt-5 text-4xl sm:text-5xl">Hal yang sering ditanya.</h2>
              <p className="mt-5 max-w-xs text-sm leading-6 text-mute">
                Masih ada yang lain?{" "}
                <a href={waLink()} target="_blank" rel="noreferrer" className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                  Chat kami
                </a>
                , dibalas manusia—bukan bot.
              </p>
            </div>
            <div className="border-t border-line">
              {faq.map(([question, answer]) => (
                <details key={question} className="group border-b border-line">
                  <summary className="flex cursor-pointer items-center justify-between gap-5 py-5 text-[15px] font-semibold leading-6">
                    {question}
                    <span aria-hidden className="text-xl font-normal text-ink/35 transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-xl pb-5 text-sm leading-6 text-ink/60">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="on-dark bg-[#080808] text-ink">
          <div className="wrap grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.2fr_auto] lg:items-end">
            <div>
              <p className="eyebrow">Mulai dari ceritamu</p>
              <h2 className="display mt-5 text-[clamp(2.4rem,5.5vw,4.5rem)]">
                Brief belum rapi?
                <br />
                <span className="font-serif font-normal italic tracking-[-0.02em]">Nggak masalah.</span>
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-6 text-ink/60 sm:text-base sm:leading-7">
                Pilih layanan dan isi yang sudah kamu tahu. Sisanya bisa dibicarakan setelahnya—lewat
                WhatsApp, tanpa harus rapat.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/order" className="btn-on-dark">
                Mulai pesan <span aria-hidden="true">→</span>
              </Link>
              <a href={waLink()} target="_blank" rel="noreferrer" className="btn-on-dark-line">
                Tanya dulu
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
