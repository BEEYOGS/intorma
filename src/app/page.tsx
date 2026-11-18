import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { getServices } from "@/lib/db";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const steps = [
  ["01", "Isi brief", "Ceritakan kebutuhan dan referensi yang kamu suka."],
  ["02", "Konfirmasi", "Bahas harga, detail, dan jadwal langsung lewat WhatsApp."],
  ["03", "Pengerjaan", "Pantau progres desainmu dari halaman lacak."],
  ["04", "Selesai", "Terima file final sesuai kesepakatan."],
];

export default async function Home() {
  const services = await getServices();

  return (
    <>
      <Nav />
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-20 pt-10 sm:gap-12 sm:pb-28 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-sm">
              Studio desain independen <span className="px-2 text-white/25">/</span> Indonesia
            </p>
            <h1 className="mt-7 text-5xl font-bold leading-[0.94] tracking-tightest sm:mt-9 sm:text-7xl lg:text-[5.5rem]">
              Ide kamu,
              <span className="mt-2 block text-white/45">dibikin kelihatan.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:mt-8 sm:text-lg sm:leading-8">
              Logo, poster, konten sosial, sampai kemasan. Mulai dari cerita yang kamu punya; kami bantu bentuk jadi desain yang siap dipakai.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-10">
              <Link href="/order" className="btn-solid">
                Isi brief <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/lacak"
                className="inline-flex items-center gap-2 py-3 text-sm font-semibold text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              >
                Lacak pesanan
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[34rem] py-5 sm:py-8">
            <div className="flex items-center justify-between border-y border-white/20 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              <span>Visual identity</span>
              <span>in.tarma / 01</span>
            </div>
            <div className="flex justify-center py-8 sm:py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="Simbol logo in.tarma" className="w-[66%] max-w-[15rem]" />
            </div>
            <div className="border-t border-white/20 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/int.svg" alt="in.tarma — Creative without idea" className="w-full" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
              <span>Logo <span className="px-1 text-white/20">/</span> Sosial <span className="px-1 text-white/20">/</span> Cetak</span>
              <Link href="/#layanan" className="font-semibold text-white/80 transition-colors hover:text-white">
                Jelajahi layanan <span aria-hidden="true">↓</span>
              </Link>
            </div>
          </div>
        </section>

        <section id="layanan" className="scroll-mt-24 border-y border-white/15">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
            <div className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Layanan</p>
              <h2 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tightest sm:text-5xl">
                Pilih bentuk yang kamu butuhkan.
              </h2>
              <p className="mt-5 text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
                Setiap proyek punya kebutuhan sendiri. Pilih layanan untuk mulai, atau kirim cerita singkat kalau masih ragu.
              </p>
              <a
                href="https://wa.me/6289617607952"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
              >
                Tanya lewat WhatsApp <span aria-hidden="true">↗</span>
              </a>
            </div>

            <ul className="divide-y divide-white/15 border-y border-white/15">
              {services.map((service, index) => (
                <li key={service.id}>
                  <Link
                    href={`/order?layanan=${service.id}`}
                    className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-5 transition-colors hover:text-white sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_1.5rem] sm:gap-x-5 sm:py-6"
                  >
                    <span className="row-span-2 self-start pt-1 text-xs font-medium tabular-nums text-white/35 sm:row-span-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold tracking-tight sm:text-xl">{service.name}</span>
                      <span className="mt-1 block text-sm leading-5 text-white/50">{service.blurb}</span>
                    </span>
                    <span className="row-span-2 text-right text-xs leading-5 text-white/70 sm:row-span-1 sm:text-sm">
                      <span className="block font-semibold">
                        {service.price_from ? `Mulai ${rupiah(service.price_from)}` : "Sesuai brief"}
                      </span>
                      <span className="mt-1 block text-white/40">± {service.days} hari</span>
                    </span>
                    <span aria-hidden="true" className="hidden text-lg text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white sm:block">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="on-white bg-white text-black">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
            <div className="grid gap-5 sm:grid-cols-[.8fr_1.2fr] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Cara kerja</p>
                <h2 className="mt-4 max-w-md text-4xl font-bold leading-[1.02] tracking-tightest sm:text-5xl">
                  Jelas dari awal sampai akhir.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-black/60 sm:justify-self-end sm:text-base sm:leading-7">
                Kamu tetap tahu apa yang sedang dikerjakan, kapan akan selesai, dan ke mana harus melihat progresnya.
              </p>
            </div>

            <ol className="mt-12 grid gap-8 border-t border-black/20 pt-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map(([number, title, description]) => (
                <li key={number} className="border-l border-black/20 pl-4 sm:pl-5">
                  <span className="text-xs font-semibold tabular-nums text-black/40">{number}</span>
                  <h3 className="mt-7 text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-black/60">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Mulai dari ceritamu</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tightest sm:text-6xl">
              Brief belum rapi? Nggak masalah.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
              Pilih layanan dan isi yang sudah kamu tahu. Sisanya bisa dibicarakan setelahnya.
            </p>
          </div>
          <Link href="/order" className="btn-solid w-fit">
            Mulai pesan <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
