"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceWithOptions, sql } from "@/lib/db";
import { isAdmin, login, logout } from "@/lib/auth";
import { makeCode, normalizeWA, rupiah } from "@/lib/format";
import { calculateQuote, type QuoteSelection } from "@/lib/pricing";
import { STATUS_META, isStatus } from "@/lib/status";
import { getPaymentSettings, paymentLines, savePaymentSettings } from "@/lib/settings";
import {
  claimOrders,
  clearCustomerSession,
  getCustomer,
  hashPassword,
  setCustomerSession,
  verifyPassword,
} from "@/lib/customer-auth";
import { createMidtransTransaction, gatewayEnabled } from "@/lib/payment";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

export type OrderState = {
  error?: string;
  values?: Record<string, string>;
} | null;

export type ActionResult = { ok?: boolean; error?: string; reset?: boolean } | null;
export type CustomerState = { error?: string } | null;

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
  const customer = await getCustomer();

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
  if (values.file && !/^https?:\/\//i.test(values.file) && !values.file.startsWith("/api/upload/")) {
    return { error: "Link file harus diawali http:// atau https://.", values };
  }
  const fileUrl = values.file.startsWith("/api/upload/")
    ? `${siteUrl()}${values.file}`
    : values.file || null;

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
        code, name, wa, service_id, customer_id, brief, ref_link, deadline,
        qty, unit_rate, price, width_cm, height_cm, options, subtotal,
        file_url, payment_method, payment_status
      )
      values (
        ${makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${customer?.id ?? null}, ${values.brief},
        ${values.ref || null}, ${values.deadline || null},
        ${quote.qty}, ${quote.unitRate}, ${quote.price},
        ${widthCm}, ${heightCm}, ${snapshot}::jsonb, ${quote.subtotal},
        ${fileUrl}, 'transfer', ${paymentStatus}
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
  let driveLink: string | null = null;
  if (fileUrl?.startsWith("/api/upload/")) {
    const uploadCode = fileUrl.slice("/api/upload/".length).split("?")[0];
    const uploaded = (await sql`
      update uploads set order_id = ${order.id},
        customer_id = coalesce(customer_id, ${customer?.id ?? null})
      where code = ${uploadCode}
      returning drive_file_id, drive_web_link`) as Array<{
      drive_file_id: string | null;
      drive_web_link: string | null;
    }>;
    const row = uploaded[0];
    driveLink =
      row?.drive_web_link ||
      (row?.drive_file_id
        ? `https://drive.google.com/file/d/${row.drive_file_id}/view`
        : null);
  }

  const link = `${siteUrl()}/lacak/${order.code}`;
  const detail = [
    quote.snapshot?.summary ?? svc.name,
    quote.price != null ? `Total: ${rupiah(quote.price)}` : "Total: menunggu konfirmasi",
  ].join("\n");

  // Kalau trigger database aktif, trigger sudah mengantrekan pesan pelanggan
  // dan admin. Jangan kirim lagi dari sini supaya tidak dobel.
  if (!(await waTriggerActive())) {
    const adminWa = adminWhatsApp();
    await Promise.all([
      sendWA(
        wa,
        `Halo ${values.name}, pesananmu ${order.code} sudah kami terima.\n\n${detail}\n\nPantau & bayar: ${link}`,
      ),
      adminWa
        ? sendWA(
            adminWa,
            [
              `Pesanan baru ${order.code}`,
              `${values.name} (${wa})`,
              "",
              detail,
              "",
              `Brief: ${values.brief}`,
              fileUrl ? `File: ${fileUrl}` : null,
              driveLink ? `Drive: ${driveLink}` : null,
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

const OPTION_CODE = /^[a-z0-9][a-z0-9-]{0,30}$/;

function revalidateCatalog() {
  revalidatePath("/admin/layanan");
  revalidatePath("/");
  revalidatePath("/order");
  revalidatePath("/lacak");
}

export async function saveOptionGroup(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(str(f, "id")) || 0;
  const serviceId = str(f, "service_id");
  const code = str(f, "code").toLowerCase();
  const label = str(f, "label");
  const help = str(f, "help").slice(0, 240);
  const selectType = str(f, "select_type") === "multi" ? "multi" : "single";
  const required = f.get("required") === "on";
  const active = f.get("active") === "on";
  const sort = Math.min(9999, Math.max(0, Number(str(f, "sort")) || 0));

  if (!OPTION_CODE.test(code)) return { error: "Kode grup pakai huruf kecil, angka, atau tanda hubung." };
  if (label.length < 2) return { error: "Nama grup minimal 2 karakter." };
  if (!(await sql`select 1 from services where id = ${serviceId}`)[0]) {
    return { error: "Layanan tidak ditemukan." };
  }

  if (id) {
    const rows = await sql`
      update service_option_groups set code = ${code}, label = ${label}, help = ${help || null},
        select_type = ${selectType}, required = ${required}, active = ${active}, sort = ${sort}
      where id = ${id} returning id`;
    if (!rows[0]) return { error: "Grup opsi tidak ditemukan." };
  } else {
    const exists = (await sql`select 1 from service_option_groups where service_id = ${serviceId} and code = ${code}`)[0];
    if (exists) return { error: "Kode grup itu sudah dipakai di layanan ini." };
    await sql`
      insert into service_option_groups (service_id, code, label, help, select_type, required, active, sort)
      values (${serviceId}, ${code}, ${label}, ${help || null}, ${selectType}, ${required}, ${active}, ${sort})`;
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteOptionGroup(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir." };
  const id = Number(str(f, "id")) || 0;
  await sql`delete from service_option_groups where id = ${id}`;
  revalidateCatalog();
  return { ok: true };
}

export async function saveOption(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(str(f, "id")) || 0;
  const groupId = Number(str(f, "group_id")) || 0;
  const code = str(f, "code").toLowerCase();
  const label = str(f, "label");
  const description = str(f, "description").slice(0, 240);
  const priceDelta = Math.min(100_000_000, Math.max(0, Number(digits(f, "price_delta")) || 0));
  const basis = str(f, "delta_basis") === "order" ? "order" : "unit";
  const isDefault = f.get("is_default") === "on";
  const active = f.get("active") === "on";
  const sort = Math.min(9999, Math.max(0, Number(str(f, "sort")) || 0));

  if (!OPTION_CODE.test(code)) return { error: "Kode opsi pakai huruf kecil, angka, atau tanda hubung." };
  if (label.length < 2) return { error: "Nama opsi minimal 2 karakter." };
  if (!(await sql`select 1 from service_option_groups where id = ${groupId}`)[0]) {
    return { error: "Grup opsi tidak ditemukan." };
  }

  if (id) {
    const rows = await sql`
      update service_options set code = ${code}, label = ${label}, description = ${description || null},
        price_delta = ${priceDelta}, delta_basis = ${basis}, is_default = ${isDefault},
        active = ${active}, sort = ${sort}
      where id = ${id} returning id`;
    if (!rows[0]) return { error: "Opsi tidak ditemukan." };
  } else {
    const exists = (await sql`select 1 from service_options where group_id = ${groupId} and code = ${code}`)[0];
    if (exists) return { error: "Kode opsi itu sudah dipakai di grup ini." };
    await sql`
      insert into service_options (group_id, code, label, description, price_delta, delta_basis, is_default, active, sort)
      values (${groupId}, ${code}, ${label}, ${description || null}, ${priceDelta}, ${basis}, ${isDefault}, ${active}, ${sort})`;
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteOption(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir." };
  const id = Number(str(f, "id")) || 0;
  await sql`delete from service_options where id = ${id}`;
  revalidateCatalog();
  return { ok: true };
}

export async function startPayment(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const code = str(f, "code").toUpperCase();
  if (!code) return { error: "Kode pesanan tidak ditemukan." };
  if (!gatewayEnabled()) return { error: "Payment gateway belum dikonfigurasi. Gunakan transfer manual." };

  const order = (await sql`
    select id, code, name, wa, price, paid from orders where code = ${code}
  `)[0] as { id: number; code: string; name: string; wa: string; price: number | null; paid: boolean } | undefined;

  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.paid) return { error: "Pesanan ini sudah lunas." };
  if (order.price == null || order.price <= 0) return { error: "Harga pesanan belum ditentukan." };

  let transaction;
  try {
    transaction = await createMidtransTransaction({
      code: order.code,
      price: Number(order.price),
      name: order.name,
      wa: String(order.wa ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal memulai pembayaran." };
  }

  await sql`
    update payments set status = 'failed'
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'`;
  await sql`
    insert into payments (order_id, provider, method, amount, status, reference, raw)
    values (${order.id}, 'midtrans', 'snap', ${order.price}, 'pending', ${transaction.token}, ${JSON.stringify({ redirect_url: transaction.redirectUrl })}::jsonb)`;

  redirect(transaction.redirectUrl);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerCustomer(_prev: CustomerState, f: FormData): Promise<CustomerState> {
  const name = str(f, "name");
  const wa = normalizeWA(str(f, "wa"));
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (!wa) return { error: "Nomor WhatsApp belum valid. Contoh: 0812 3456 7890." };
  if (!EMAIL_RE.test(email)) return { error: "Alamat email belum valid." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };

  const existing = (await sql`select 1 from customers where email = ${email}`)[0];
  if (existing) return { error: "Email ini sudah terdaftar. Silakan masuk." };

  const rows = (await sql`
    insert into customers (name, wa, email, password_hash)
    values (${name}, ${wa}, ${email}, ${hashPassword(password)})
    returning id`) as Array<{ id: number }>;
  const id = Number(rows[0]?.id ?? 0);
  if (!id) return { error: "Gagal membuat akun. Coba lagi." };

  await claimOrders(id, wa);
  await setCustomerSession(id);
  redirect("/portal");
}

export async function loginCustomer(_prev: CustomerState, f: FormData): Promise<CustomerState> {
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: "Alamat email belum valid." };

  const rows = (await sql`
    select id, wa, password_hash from customers where email = ${email}
  `) as Array<{ id: number; wa: string; password_hash: string }>;
  const customer = rows[0];
  if (!customer || !verifyPassword(password, customer.password_hash)) {
    return { error: "Email atau password salah." };
  }

  await claimOrders(Number(customer.id), String(customer.wa));
  await setCustomerSession(Number(customer.id));
  redirect("/portal");
}

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect("/");
}

export async function saveCustomerProfile(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Sesi berakhir. Silakan masuk lagi." };

  const name = str(f, "name");
  const wa = normalizeWA(str(f, "wa"));
  const email = str(f, "email").toLowerCase();
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (!wa) return { error: "Nomor WhatsApp belum valid." };
  if (!EMAIL_RE.test(email)) return { error: "Alamat email belum valid." };

  const taken = (await sql`select 1 from customers where email = ${email} and id <> ${customer.id}`)[0];
  if (taken) return { error: "Email ini sudah dipakai akun lain." };

  await sql`
    update customers set name = ${name}, wa = ${wa}, email = ${email} where id = ${customer.id}`;
  await claimOrders(customer.id, wa);
  revalidatePath("/portal");
  return { ok: true };
}
