"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceWithOptions, sql } from "@/lib/db";
import { isAdmin, login, logout } from "@/lib/auth";
import { makeCode, normalizeWA, rupiah } from "@/lib/format";
import { calculateQuote, type QuoteSelection } from "@/lib/pricing";
import { STATUS_META, isStatus } from "@/lib/status";
import { getPaymentSettings, paymentLines, savePaymentSettings } from "@/lib/settings";
import { sendWA, siteUrl } from "@/lib/wa";

export type OrderState = {
  error?: string;
  values?: Record<string, string>;
} | null;

export type ActionResult = { ok?: boolean; error?: string; reset?: boolean } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const digits = (f: FormData, k: string) => str(f, k).replace(/\D/g, "");

/** Hanya terima path admin internal supaya redirect tidak bisa dipakai untuk open redirect. */
function adminReturn(value: string): string {
  return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

function withQuery(path: string, values: Record<string, string>): string {
  const url = new URL(adminReturn(path), "http://local");
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function parseSelection(raw: string): QuoteSelection {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as QuoteSelection;
  } catch {
    return {};
  }
}

async function waTriggerActive(): Promise<boolean> {
  const row = (await sql`select value from app_settings where key = 'wa_trigger_enabled'`)[0];
  return String(row?.value ?? "0") === "1";
}

export async function createOrder(_prev: OrderState, f: FormData): Promise<OrderState> {
  const values = {
    name: str(f, "name"),
    wa: str(f, "wa"),
    service: str(f, "service"),
    brief: str(f, "brief"),
    ref: str(f, "ref"),
    deadline: str(f, "deadline"),
    qty: str(f, "qty"),
    width: str(f, "width"),
    height: str(f, "height"),
    selection: str(f, "selection"),
    file: str(f, "file"),
  };
  const wa = normalizeWA(values.wa);

  if (values.name.length < 2) return { error: "Isi nama kamu dulu.", values };
  if (!wa) return { error: "Nomor WhatsApp belum valid. Contoh: 0812 3456 7890.", values };
  if (!values.service) return { error: "Pilih salah satu layanan.", values };

  const svc = await getServiceWithOptions(values.service);
  if (!svc || !svc.active) return { error: "Layanan tidak ditemukan. Pilih layanan lain.", values };

  const briefMin = svc.category === "print" ? 10 : 15;
  if (values.brief.length < briefMin) {
    return {
      error: `Tulis ${svc.category === "print" ? "catatan pesanan" : "brief"} minimal ${briefMin} karakter.`,
      values,
    };
  }
  if (values.ref && !/^https?:\/\//i.test(values.ref)) return { error: "Link referensi harus diawali http:// atau https://.", values };
  if (svc.requires_file && !values.file) {
    return { error: "Tempel link file siap cetak dulu (Google Drive/WeTransfer).", values };
  }
  if (values.file && !/^https?:\/\//i.test(values.file)) {
    return { error: "Link file harus diawali http:// atau https://.", values };
  }

  const quote = calculateQuote(svc, {
    qty: values.qty,
    widthCm: values.width,
    heightCm: values.height,
    selected: parseSelection(values.selection),
  });
  if (quote.error) return { error: quote.error, values };

  const snapshot = quote.snapshot ? JSON.stringify(quote.snapshot) : null;
  const paymentStatus = quote.price != null ? "unpaid" : "waiting";
  const widthCm = quote.snapshot?.width_cm ?? null;
  const heightCm = quote.snapshot?.height_cm ?? null;

  let order: { id: number; code: string } | undefined;
  for (let i = 0; i < 5 && !order; i++) {
    const rows = await sql`
      insert into orders (
        code, name, wa, service_id, brief, ref_link, deadline,
        qty, unit_rate, price, width_cm, height_cm, options, subtotal,
        file_url, payment_method, payment_status
      )
      values (
        ${makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${values.brief},
        ${values.ref || null}, ${values.deadline || null},
        ${quote.qty}, ${quote.unitRate}, ${quote.price},
        ${widthCm}, ${heightCm}, ${snapshot}::jsonb, ${quote.subtotal},
        ${values.file || null}, 'transfer', ${paymentStatus}
      )
      on conflict (code) do nothing
      returning id, code`;
    order = rows[0] as { id: number; code: string } | undefined;
  }
  if (!order) return { error: "Gagal menyimpan pesanan. Coba kirim lagi.", values };

  await sql`insert into order_events (order_id, status, note) values (${order.id}, 'menunggu', 'Pesanan diterima')`;
  if (quote.price != null) {
    await sql`
      insert into payments (order_id, provider, method, amount, status)
      values (${order.id}, 'manual', 'transfer', ${quote.price}, 'pending')`;
  }

  const link = `${siteUrl()}/lacak/${order.code}`;
  const detail = [
    quote.snapshot?.summary ?? svc.name,
    quote.price != null ? `Total: ${rupiah(quote.price)}` : "Total: menunggu konfirmasi",
  ].join("\n");

  // Kalau trigger database aktif, trigger sudah mengantrekan pesan pelanggan
  // dan admin. Jangan kirim lagi dari sini supaya tidak dobel.
  if (!(await waTriggerActive())) {
    await Promise.all([
      sendWA(
        wa,
        `Halo ${values.name}, pesananmu ${order.code} sudah kami terima.\n\n${detail}\n\nPantau & bayar: ${link}`,
      ),
      process.env.ADMIN_WA
        ? sendWA(
            process.env.ADMIN_WA,
            [
              `Pesanan baru ${order.code}`,
              `${values.name} (${wa})`,
              "",
              detail,
              "",
              `Brief: ${values.brief}`,
              values.file ? `File: ${values.file}` : null,
            ]
              .filter((line) => line !== null)
              .join("\n"),
          )
        : Promise.resolve(false),
    ]);
  }

  redirect(`/lacak/${order.code}?baru=1`);
}

export async function lookupOrder(_prev: { error?: string } | null, f: FormData) {
  const code = str(f, "kode").toUpperCase().replace(/\s/g, "");
  const full = code.startsWith("INT-") ? code : `INT-${code}`;
  const found = (await sql`select code from orders where code = ${full}`)[0];
  if (!found) return { error: "Kode tidak ditemukan. Cek lagi pesan WhatsApp yang kamu terima." };
  redirect(`/lacak/${full}`);
}

export async function adminLogin(_prev: { error?: string } | null, f: FormData) {
  if (!(await login(str(f, "password")))) return { error: "Password salah. Coba lagi." };
  redirect("/admin");
}

export async function adminLogout() {
  await logout();
  redirect("/admin/login");
}

export async function updateOrder(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  const status = str(f, "status");
  const note = str(f, "note");
  const priceRaw = digits(f, "price");
  const price = priceRaw ? Number(priceRaw) : null;
  const paid = f.get("paid") === "on";
  if (!id || !isStatus(status)) return { error: "Status pesanan tidak valid." };

  const prev = (await sql`select status, note, price, paid, paid_at from orders where id = ${id}`)[0];
  if (!prev) return { error: "Pesanan tidak ditemukan." };

  const paidAt = paid ? (prev.paid_at ?? new Date()) : null;
  const paymentStatus = paid ? "paid" : price !== null ? "unpaid" : "waiting";
  const rows = await sql`
    update orders set status = ${status}, price = ${price}, note = ${note || null},
      paid = ${paid}, paid_at = ${paidAt}, payment_status = ${paymentStatus}, updated_at = now()
    where id = ${id} returning code, name, wa`;
  const order = rows[0];
  if (!order) return { error: "Pesanan tidak ditemukan." };

  // Sinkronkan catatan pembayaran manual dengan centang admin.
  if (price !== null) {
    await sql`
      update payments set amount = ${price}
      where order_id = ${id} and provider = 'manual' and status = 'pending'`;
  }
  if (paid && paidAt) {
    const updated = await sql`
      update payments set status = 'paid', paid_at = ${paidAt}
      where order_id = ${id} and provider = 'manual' and status in ('pending', 'paid')
      returning id`;
    if (!updated.length && price !== null) {
      await sql`
        insert into payments (order_id, provider, method, amount, status, paid_at)
        values (${id}, 'manual', 'transfer', ${price}, 'paid', ${paidAt})`;
    }
  } else if (!paid) {
    await sql`
      update payments set status = 'pending', paid_at = null
      where order_id = ${id} and provider = 'manual' and status = 'paid'`;
  }

  const statusChanged = prev.status !== status;
  const noteChanged = (prev.note ?? "") !== note;
  const priceChanged = (prev.price ?? null) !== price;
  const paidChanged = Boolean(prev.paid) !== paid;

  if (statusChanged || noteChanged) {
    await sql`insert into order_events (order_id, status, note) values (${id}, ${status}, ${note || null})`;
  }

  if (f.get("notify") === "on" && (statusChanged || noteChanged || priceChanged || paidChanged)) {
    const parts: string[] = [];
    if (statusChanged) parts.push(STATUS_META[status].wa(order.code, order.name));
    else parts.push(`Halo ${order.name}, ada kabar untuk pesanan ${order.code}.`);
    if (price !== null) parts.push(`Total: ${rupiah(price)}`);
    if (note) parts.push(`Catatan: ${note}`);

    const payment = await getPaymentSettings();
    if (paid) parts.push("Pembayaran sudah kami terima. Terima kasih.");
    else if (price !== null && payment.enabled) {
      const lines = paymentLines(payment);
      if (lines.length) parts.push(lines.join("\n"));
    }

    parts.push(`Pantau di: ${siteUrl()}/lacak/${order.code}`);
    await sendWA(order.wa, parts.join("\n\n"));
  }

  revalidatePath("/admin");
  revalidatePath(`/lacak/${order.code}`);
  redirect(withQuery(str(f, "returnTo"), { open: order.code, saved: "1" }));
}

export async function deleteOrder(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  const code = str(f, "code").toUpperCase();
  const confirm = str(f, "confirm").toUpperCase();
  if (!id || !/^INT-[A-Z0-9]{6}$/.test(code)) return { error: "Data pesanan tidak valid." };
  if (confirm !== code) {
    return { error: `Kode tidak sama. Ketik ${code} persis untuk mengonfirmasi penghapusan.` };
  }

  const existing = (await sql`select code from orders where id = ${id}`)[0];
  if (!existing || existing.code !== code) return { error: "Pesanan tidak ditemukan atau kode sudah berubah." };

  // order_events punya ON DELETE CASCADE, jadi riwayat ikut terhapus.
  await sql`delete from orders where id = ${id}`;
  revalidatePath("/admin");
  redirect(withQuery(str(f, "returnTo"), { deleted: code }));
}

export async function saveService(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const mode = str(f, "mode");
  const name = str(f, "name");
  const blurb = str(f, "blurb");
  const price = Number(digits(f, "price_from")) || 0;
  const days = Math.min(365, Math.max(1, Number(digits(f, "days")) || 1));
  const sort = Math.min(9999, Math.max(0, Number(digits(f, "sort")) || 0));
  const active = f.get("active") === "on";
  const requestedModel = str(f, "pricing_model");
  const pricingModel =
    requestedModel === "area" || requestedModel === "per_unit" || requestedModel === "flat"
      ? requestedModel
      : str(f, "pricing_mode") === "per_unit"
        ? "per_unit"
        : "flat";
  // pricing_mode lama tetap diisi supaya aplikasi production tetap paham.
  const pricingMode = pricingModel === "flat" ? "flat" : "per_unit";
  const requestedCategory = str(f, "category");
  const category = ["design", "print", "other"].includes(requestedCategory)
    ? requestedCategory
    : pricingModel === "flat"
      ? "design"
      : "print";
  const unitLabel =
    pricingModel === "flat"
      ? ""
      : (str(f, "unit_label") || (pricingModel === "area" ? "m²" : "unit")).slice(0, 24);
  const minQty = pricingModel === "per_unit" ? Math.max(0.01, Number(str(f, "min_qty")) || 1) : 1;
  const maxQty = pricingModel === "per_unit" ? Math.min(1_000_000, Number(str(f, "max_qty")) || 10000) : 10000;
  const minPrice = Math.min(100_000_000, Math.max(0, Number(digits(f, "min_price")) || 0));
  const roundTo = Math.min(100_000, Math.max(0, Number(digits(f, "round_to")) || 0));
  const minArea = pricingModel === "area" ? Math.max(0.01, Number(str(f, "min_area_m2")) || 1) : 1;
  const requiresFile = f.get("requires_file") === "on";
  const priceNote = str(f, "price_note").slice(0, 240);

  if (name.length < 2) return { error: "Nama layanan minimal 2 karakter." };
  if (blurb.length < 5) return { error: "Tulis deskripsi singkat (minimal 5 karakter)." };
  if (pricingModel !== "flat" && !unitLabel) return { error: "Isi nama satuan, misalnya lembar atau m²." };
  if (maxQty < minQty) return { error: "Jumlah maksimal tidak boleh lebih kecil dari minimal." };

  if (mode === "new") {
    const id = str(f, "id").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(id)) {
      return { error: "ID layanan pakai huruf kecil, angka, atau tanda hubung (2–31 karakter)." };
    }
    const exists = (await sql`select 1 from services where id = ${id}`)[0];
    if (exists) return { error: "ID layanan itu sudah dipakai." };
    await sql`
      insert into services (
        id, name, blurb, price_from, days, sort, active, pricing_mode, unit_label,
        min_qty, max_qty, category, pricing_model, min_price, round_to,
        min_area_m2, requires_file, price_note
      )
      values (
        ${id}, ${name}, ${blurb}, ${price}, ${days}, ${sort}, ${active}, ${pricingMode}, ${unitLabel},
        ${minQty}, ${maxQty}, ${category}, ${pricingModel}, ${minPrice}, ${roundTo},
        ${minArea}, ${requiresFile}, ${priceNote}
      )`;
    revalidatePath("/admin/layanan");
    revalidatePath("/");
    revalidatePath("/order");
    return { ok: true, reset: true };
  }

  const id = str(f, "id");
  const rows = await sql`
    update services set name = ${name}, blurb = ${blurb}, price_from = ${price},
      days = ${days}, sort = ${sort}, active = ${active},
      pricing_mode = ${pricingMode}, unit_label = ${unitLabel}, min_qty = ${minQty}, max_qty = ${maxQty},
      category = ${category}, pricing_model = ${pricingModel}, min_price = ${minPrice},
      round_to = ${roundTo}, min_area_m2 = ${minArea}, requires_file = ${requiresFile},
      price_note = ${priceNote}
    where id = ${id} returning id`;
  if (!rows[0]) return { error: "Layanan tidak ditemukan." };

  revalidatePath("/admin/layanan");
  revalidatePath("/");
  revalidatePath("/order");
  return { ok: true };
}

export async function saveSettings(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const bankName = str(f, "bankName").slice(0, 40) || "BCA";
  const bankAccount = str(f, "bankAccount").replace(/[^\d-]/g, "").slice(0, 32);
  const bankHolder = str(f, "bankHolder").slice(0, 80);
  const note = str(f, "note").slice(0, 300);
  const enabled = f.get("enabled") === "on";

  if (enabled && !bankAccount) return { error: "Isi nomor rekening, atau matikan pembayaran transfer." };

  await savePaymentSettings({ enabled, bankName, bankAccount, bankHolder, note });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/");
  revalidatePath("/lacak");
  return { ok: true };
}
