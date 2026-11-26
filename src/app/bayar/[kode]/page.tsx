import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Landmark,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Footer, Nav } from "@/components/Chrome";
import { PaymentMethodPicker } from "@/components/PaymentMethodPicker";
import { PaymentPoller } from "@/components/PaymentPoller";
import { sql } from "@/lib/db";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { PAYMENT_METHODS, gatewayEnabled } from "@/lib/payment";
import { waLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembayaran" };

type OrderRow = {
  id: number;
  code: string;
  name: string;
  wa: string;
  price: number | null;
  paid: boolean;
  status: string;
  payment_status: string | null;
  deadline: string | null;
  deadline_at: string | null;
  service: string | null;
};

type ChargeRaw = {
  method?: string;
  transactionId?: string;
  orderIdUsed?: string;
  status?: string;
  expiresAt?: string;
  qrString?: string;
  qrDataUrl?: string;
  vaNumber?: string;
  bank?: string;
};

function parseRaw(value: unknown): ChargeRaw {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ChargeRaw;
}

function Step({ index, label, state }: { index: number; label: string; state: "done" | "active" | "todo" }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`grid size-6 place-items-center rounded-full border text-[11px] font-bold ${
          state === "done"
            ? "border-accent bg-accent text-[#04110f]"
            : state === "active"
              ? "border-accent/60 bg-accent/10 text-accent"
              : "border-line text-mute"
        }`}
      >
        {state === "done" ? <Check aria-hidden className="size-3.5" /> : index}
      </span>
      <span className={`text-xs font-medium ${state === "todo" ? "text-mute" : "text-ink"}`}>{label}</span>
    </li>
  );
}

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ ganti?: string }>;
}) {
  const [{ kode }, { ganti }] = await Promise.all([params, searchParams]);
  const code = kode.toUpperCase();

  const order = (
    await sql`
      select o.id, o.code, o.name, o.wa, o.price, o.paid, o.status, o.payment_status,
        o.deadline, o.deadline_at, coalesce(s.name, o.service_label) as service
      from orders o left join services s on s.id = o.service_id
      where o.code = ${code}
    `
  )[0] as OrderRow | undefined;
  if (!order) notFound();

  const enabled = gatewayEnabled();
  const pending = order.paid
    ? undefined
    : ((await sql`
        select id, method, raw, created_at from payments
        where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'
        order by created_at desc limit 1
      `)[0] as { id: number; method: string; raw: unknown; created_at: string } | undefined);

  const raw = parseRaw(pending?.raw);
  const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : null;
  const stillValid = Boolean(
    expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now() + 5_000,
  );
  const showInstruction = Boolean(pending && stillValid && ganti !== "1");
  const methodMeta = PAYMENT_METHODS.find((item) => item.id === (raw.method ?? pending?.method));
  const isQris = (raw.method ?? pending?.method) === "qris";

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:py-12">
        <Link
          href={`/lacak/${order.code}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Kembali ke status pesanan
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="eyebrow">Pembayaran aman</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {order.paid ? "Pembayaran selesai" : "Selesaikan pesanan"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
              {order.paid
                ? "Terima kasih. Pembayaran sudah terverifikasi dan pesanan masuk antrean produksi."
                : "Pilih metode, bayar sesuai nominal, lalu status pesanan berubah otomatis."}
            </p>

            <ol className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Step index={1} label="Pilih metode" state={order.paid || showInstruction ? "done" : "active"} />
              <Step
                index={2}
                label="Bayar"
                state={order.paid ? "done" : showInstruction ? "active" : "todo"}
              />
              <Step index={3} label="Lunas" state={order.paid ? "done" : "todo"} />
            </ol>

            <section className="card mt-6 p-5 sm:p-6">
              {order.paid ? (
                <div className="py-6 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                    <CheckCircle2 aria-hidden className="size-7" />
                  </span>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight">Pembayaran diterima</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-mute">
                    Pesanan {order.code} sudah lunas. Kami akan menghubungi kamu lewat WhatsApp kalau ada yang perlu dikonfirmasi.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <Link href={`/lacak/${order.code}`} className="btn btn-primary min-h-11 px-4 text-sm">
                      Lihat status pesanan
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                    <Link href={`/nota/${order.code}`} className="btn btn-ghost min-h-11 px-4 text-sm">
                      Buka nota
                    </Link>
                  </div>
                </div>
              ) : order.status === "batal" ? (
                <div className="py-4">
                  <h2 className="text-lg font-semibold">Pesanan dibatalkan</h2>
                  <p className="mt-2 text-sm leading-6 text-mute">
                    Tidak perlu melakukan pembayaran. Kalau ini keliru, hubungi kami lewat WhatsApp.
                  </p>
                  <a href={waLink(`Halo in.torma, pesanan ${order.code} dibatalkan. Saya mau tanya-tanya dulu.`)} className="btn btn-ghost mt-4 min-h-10 px-4 text-sm">
                    Chat admin
                  </a>
                </div>
              ) : !enabled ? (
                <div className="py-4">
                  <h2 className="text-lg font-semibold">Pembayaran online belum aktif</h2>
                  <p className="mt-2 text-sm leading-6 text-mute">
                    Silakan transfer manual atau hubungi admin untuk menyelesaikan pembayaran.
                  </p>
                  <a href={waLink(`Halo in.torma, saya mau bayar pesanan ${order.code}.`)} className="btn btn-primary mt-4 min-h-10 px-4 text-sm">
                    Hubungi admin
                  </a>
                </div>
              ) : order.price == null || order.price <= 0 ? (
                <div className="py-4">
                  <h2 className="text-lg font-semibold">Menunggu harga dari admin</h2>
                  <p className="mt-2 text-sm leading-6 text-mute">
                    Nominal belum ditentukan. Kami akan mengabari lewat WhatsApp setelah pesanan diperiksa.
                  </p>
                  <Link href={`/lacak/${order.code}`} className="btn btn-ghost mt-4 min-h-10 px-4 text-sm">
                    Lihat status pesanan
                  </Link>
                </div>
              ) : showInstruction && pending ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Metode terpilih</p>
                      <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
                        {isQris ? <QrCode aria-hidden className="size-4 text-accent" /> : <Landmark aria-hidden className="size-4 text-accent" />}
                        {methodMeta?.label ?? "Pembayaran online"}
                      </h2>
                    </div>
                    <Link
                      href={`/bayar/${order.code}?ganti=1`}
                      className="text-xs font-semibold text-mute underline decoration-line underline-offset-4 hover:text-ink"
                    >
                      Ganti metode
                    </Link>
                  </div>

                  {isQris ? (
                    <div className="mt-5">
                      {raw.qrDataUrl ? (
                        <div className="mx-auto w-full max-w-[16rem] rounded-[10px] bg-white p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={raw.qrDataUrl} alt={`QRIS pembayaran ${order.code}`} className="block w-full" />
                        </div>
                      ) : (
                        <p className="rounded-tag-sm border border-[var(--warn)]/35 bg-[var(--warn)]/[0.07] px-3 py-2 text-xs text-[var(--warn)]">
                          QR belum tersedia. Coba muat ulang halaman.
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-mute">
                          <QrCode aria-hidden className="size-3.5" />
                          Scan pakai e-wallet atau m-banking
                        </span>
                        {raw.qrDataUrl && (
                          <a
                            href={raw.qrDataUrl}
                            download={`QRIS-${order.code}.png`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong"
                          >
                            <Download aria-hidden className="size-3.5" />
                            Unduh
                          </a>
                        )}
                      </div>
                      <ol className="mt-5 grid gap-2 border-t border-line pt-4 text-xs leading-5 text-mute">
                        <li>1. Buka aplikasi e-wallet atau m-banking yang mendukung QRIS.</li>
                        <li>2. Scan QR di atas, lalu periksa nama toko dan nominal.</li>
                        <li>3. Konfirmasi pembayaran. Status pesanan berubah otomatis.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <div className="rounded-tag-sm border border-line bg-sand/60 p-4">
                        <p className="text-xs text-mute">Nomor Virtual Account {raw.bank ?? methodMeta?.bank ?? ""}</p>
                        <p className="mt-1 break-all font-mono text-2xl font-semibold tracking-tight text-ink">
                          {raw.vaNumber ?? "ÔÇö"}
                        </p>
                        {raw.vaNumber && (
                          <CopyButton value={raw.vaNumber} label="Salin nomor VA" className="mt-3" />
                        )}
                      </div>
                      <div className="mt-3 rounded-tag-sm border border-line px-4 py-3">
                        <p className="text-xs text-mute">Nominal harus tepat</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-accent">{rupiah(order.price)}</p>
                      </div>
                      <ol className="mt-5 grid gap-2 border-t border-line pt-4 text-xs leading-5 text-mute">
                        <li>1. Buka m-banking atau ATM, pilih menu Transfer ke Virtual Account.</li>
                        <li>2. Masukkan nomor VA di atas dan nominal {rupiah(order.price)}.</li>
                        <li>3. Konfirmasi. Status pesanan berubah otomatis setelah dana masuk.</li>
                      </ol>
                    </div>
                  )}

                  <PaymentPoller code={order.code} expiresAt={raw.expiresAt ?? new Date().toISOString()} />
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold">Pilih metode pembayaran</h2>
                  <p className="mt-1 text-sm leading-6 text-mute">
                    Total <span className="font-semibold text-ink">{rupiah(order.price)}</span>. Pilih yang paling praktis untukmu.
                  </p>
                  <PaymentMethodPicker code={order.code} methods={PAYMENT_METHODS} />
                </div>
              )}
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="card p-5">
              <p className="eyebrow">Ringkasan</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-mute">Kode</span>
                  <span className="font-mono text-xs font-semibold">{order.code}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-mute">Layanan</span>
                  <span className="text-right font-medium">{order.service ?? "Custom"}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-mute">Pemesan</span>
                  <span className="text-right font-medium">{order.name}</span>
                </div>
                {order.deadline_at || order.deadline ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-mute">Deadline</span>
                    <span className="text-right font-medium">
                      {order.deadline_at
                        ? tanggalJam(order.deadline_at)
                        : order.deadline
                          ? tanggal(order.deadline)
                          : "Fleksibel"}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                  <span className="text-mute">Total</span>
                  <span className="text-lg font-semibold tabular-nums text-accent">
                    {order.price == null ? "Menunggu" : rupiah(order.price)}
                  </span>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck aria-hidden className="size-4 text-accent" />
                Diproses Midtrans
              </p>
              <p className="mt-2 text-xs leading-5 text-mute">
                Data pembayaran diproses oleh Midtrans. in.torma tidak menyimpan nomor kartu atau PIN apa pun.
              </p>
              <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-xs leading-5 text-mute">
                <Clock3 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Tagihan berlaku 60 menit. Kalau lewat, buat tagihan baru dari halaman ini.
              </p>
            </section>

            <a
              href={waLink(`Halo in.torma, saya butuh bantuan pembayaran pesanan ${order.code}.`)}
              className="btn btn-ghost min-h-11 px-4 text-sm"
            >
              Butuh bantuan? Chat admin
            </a>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
