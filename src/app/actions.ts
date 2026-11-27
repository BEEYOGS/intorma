"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceWithOptions, sql } from "@/lib/db";
import { isAdmin, login, logout, verifyAdminCredential } from "@/lib/auth";
import { normalizeWA, rupiah, tanggalJam } from "@/lib/format";
import { isValidCode, makeCode, normalizeCode } from "@/lib/codes";
import { calculateQuote, type QuoteSelection } from "@/lib/pricing";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { getPaymentSettings, paymentLines, savePaymentSettings } from "@/lib/settings";
import {
  claimOrders,
  clearCustomerSession,
  getCustomer,
  hashPassword,
  setCustomerSession,
  verifyPassword,
} from "@/lib/customer-auth";
import {
  createCoreCharge,
  gatewayEnabled,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/payment";
import { siteUrl } from "@/lib/wa";
import { audit } from "@/lib/audit";
import { clientErrorMessage } from "@/lib/error";
import {
  adminWhatsApp,
  orderCreatedAdminMessage,
  orderCreatedCustomerMessage,
  orderStatusMessage,
  sendStudioMessage,
} from "@/lib/notifications/whatsapp";

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

/**
 * Satu tempat untuk menyamakan orders.paid dengan baris pembayaran manual.
 * Dipakai updateOrder, quickUpdateOrder, dan bulkUpdateOrders supaya tidak ada
 * jalur yang mengubah `paid` tanpa menyentuh tabel `payments`.
 */
async function syncManualPayment(
  id: number,
  price: number | null,
  paid: boolean,
  paidAt: Date | null,
  proofUrl?: string | null,
): Promise<void> {
  if (price !== null) {
    await sql`
      update payments set amount = ${price}
      where order_id = ${id} and provider = 'manual' and status = 'pending'`;
  }
  if (proofUrl !== undefined) {
    await sql`update payments set proof_url = ${proofUrl || null} where order_id = ${id} and provider = 'manual'`;
  }
  if (paid && paidAt) {
    const updated = await sql`
      update payments set status = 'paid', paid_at = ${paidAt}
      where order_id = ${id} and provider = 'manual' and status in ('pending', 'paid')
      returning id`;
    if (!updated.length && price !== null) {
      await sql`
        insert into payments (order_id, provider, method, amount, status, paid_at, proof_url)
        values (${id}, 'manual', 'transfer', ${price}, 'paid', ${paidAt}, ${proofUrl ?? null})`;
    }
  } else if (!paid) {
    await sql`
      update payments set status = 'pending', paid_at = null
      where order_id = ${id} and provider = 'manual' and status = 'paid'`;
  }
}

export async function createOrder(_prev: OrderState, f: FormData): Promise<OrderState> {
  const values = {
    name: str(f, "name"),
    wa: str(f, "wa"),
    service: str(f, "service"),
    brief: str(f, "brief"),
    ref: str(f, "ref"),
    deadline: str(f, "deadline"),
    deadlineTime: str(f, "deadlineTime"),
    qty: str(f, "qty"),
    width: str(f, "width"),
    height: str(f, "height"),
    selection: str(f, "selection"),
    file: str(f, "file"),
    promo: str(f, "promo"),
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
  if (!values.deadline) return { error: "Pilih tanggal deadline pengerjaan dulu.", values };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.deadlineTime ?? "")) {
    return { error: "Jam deadline belum valid. Pilih jam antara 00:00 sampai 23:59.", values };
  }
  const deadlineTime = values.deadlineTime;
  // Input dari browser adalah waktu WIB; ubah ke UTC agar konsisten di server.
  const deadlineAt = new Date(`${values.deadline}T${deadlineTime}:00+07:00`);
  if (Number.isNaN(deadlineAt.getTime())) return { error: "Tanggal atau jam deadline belum valid.", values };
  if (deadlineAt.getTime() < Date.now() - 30_000) {
    return { error: "Deadline tidak boleh di masa lalu.", values };
  }
  const minLeadTime = (svc.days ?? 0) * 86400000;
  if (minLeadTime > 0 && deadlineAt.getTime() < Date.now() + minLeadTime - 30_000) {
    return { error: `Deadline minimal ${svc.days} hari dari sekarang untuk layanan ini.`, values };
  }
  if (svc.requires_file && !values.file) {
    return { error: "Tempel link file siap cetak dulu (Google Drive/WeTransfer).", values };
  }
  if (values.file && !/^https?:\/\//i.test(values.file) && !values.file.startsWith("/api/upload/")) {
    return { error: "Link file harus diawali http:// atau https://.", values };
  }
  // Simpan kode upload sebelum URL diubah absolut, supaya relasi uploads
  // ke order tidak hilang saat admin hendak menyertakan tautan Drive.
  const uploadCode = values.file.startsWith("/api/upload/")
    ? values.file.slice("/api/upload/".length).split("?")[0]
    : null;
  const fileUrl = uploadCode
    ? `${siteUrl()}/api/upload/${uploadCode}`
    : values.file || null;

  const quote = calculateQuote(svc, {
    qty: values.qty,
    widthCm: values.width,
    heightCm: values.height,
    selected: parseSelection(values.selection),
  });
  if (quote.error) return { error: quote.error, values };

  let promoCode: string | null = null;
  let discountAmount = 0;
  if (values.promo) {
    const code = values.promo.toUpperCase();
    const rows = (await sql`
      select code, type, value, min_order, max_discount, usage_limit, used_count, active, expires_at
      from promo_codes where code = ${code}
    `) as Array<Record<string, unknown>>;
    const promo = rows[0];
    if (!promo) return { error: "Kode promo tidak ditemukan.", values };
    if (!promo.active) return { error: "Kode promo tidak aktif.", values };
    if (promo.expires_at && new Date(String(promo.expires_at)) < new Date()) {
      return { error: "Kode promo sudah kedaluwarsa.", values };
    }
    if (promo.usage_limit != null && Number(promo.used_count) >= Number(promo.usage_limit)) {
      return { error: "Kuota kode promo habis.", values };
    }
    const basePrice = quote.price ?? 0;
    if (basePrice < Number(promo.min_order ?? 0)) {
      return { error: `Minimal pesanan Rp${Number(promo.min_order).toLocaleString("id-ID")} untuk kode ini.`, values };
    }
    if (promo.type === "percent") {
      discountAmount = Math.round((basePrice * Number(promo.value)) / 100);
      if (promo.max_discount != null) discountAmount = Math.min(discountAmount, Number(promo.max_discount));
    } else {
      discountAmount = Math.round(Number(promo.value));
    }
    discountAmount = Math.max(0, Math.min(discountAmount, basePrice));
    promoCode = String(promo.code);
  }

  const snapshot = quote.snapshot ? JSON.stringify(quote.snapshot) : null;
  const paymentStatus = quote.price != null ? "unpaid" : "waiting";
  const widthCm = quote.snapshot?.width_cm ?? null;
  const heightCm = quote.snapshot?.height_cm ?? null;

  let order: { id: number; code: string } | undefined;
  for (let i = 0; i < 5 && !order; i++) {
    const rows = await sql`
      insert into orders (
        code, name, wa, service_id, service_label, customer_id, brief, ref_link, deadline, deadline_at,
        qty, unit_rate, price, width_cm, height_cm, options, subtotal,
        file_url, payment_method, payment_status, promo_code, discount_amount
      )
      values (
        ${await makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${svc.name}, ${customer?.id ?? null}, ${values.brief},
        ${values.ref || null}, ${values.deadline}, ${deadlineAt},
        ${quote.qty}, ${quote.unitRate}, ${quote.price != null ? quote.price - discountAmount : null},
        ${widthCm}, ${heightCm}, ${snapshot}::jsonb, ${quote.subtotal},
        ${fileUrl}, 'transfer', ${paymentStatus}, ${promoCode}, ${discountAmount}
      )
      on conflict (code) do nothing
      returning id, code`;
    order = rows[0] as { id: number; code: string } | undefined;
  }
  if (!order) return { error: "Gagal menyimpan pesanan. Coba kirim lagi.", values };

  if (promoCode) {
    await sql`update promo_codes set used_count = used_count + 1 where code = ${promoCode}`;
  }

  await sql`insert into order_events (order_id, status, note) values (${order.id}, 'menunggu', 'Pesanan diterima')`;
  if (quote.price != null) {
    await sql`
      insert into payments (order_id, provider, method, amount, status)
      values (${order.id}, 'manual', 'transfer', ${quote.price}, 'pending')`;
  }
  let driveLink: string | null = null;
  if (uploadCode) {
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
  const serviceSummary = quote.snapshot?.summary ?? svc.name;
  const total = quote.price != null ? quote.price - discountAmount : null;

  // Kalau trigger database aktif, trigger sudah mengantrekan pesan pelanggan
  // dan admin. Jangan kirim lagi dari sini supaya tidak dobel.
  if (!(await waTriggerActive())) {
    const adminWa = adminWhatsApp();
    await Promise.all([
      sendStudioMessage(
        wa,
        orderCreatedCustomerMessage({
          name: values.name,
          code: order.code,
          service: serviceSummary,
          total,
          deadline: tanggalJam(deadlineAt),
          link,
        }),
      ),
      adminWa
        ? sendStudioMessage(
            adminWa,
            orderCreatedAdminMessage({
              code: order.code,
              name: values.name,
              wa,
              service: serviceSummary,
              total,
              deadline: tanggalJam(deadlineAt),
              brief: values.brief,
              fileUrl,
              driveLink,
            }),
          )
        : Promise.resolve(false),
    ]);
  }

  const adminCreating = await isAdmin();
  await audit("create", "order", order.code, {
    name: values.name,
    service: svc.name,
    price: quote.price,
    wa: values.wa,
  }, adminCreating ? "admin" : "customer");

  redirect(`/lacak/${order.code}?baru=1`);
}

export async function approveReview(f: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(f.get("id"));
  if (!id) return;
  await sql`update reviews set approved = true where id = ${id}`;
  revalidatePath("/admin/ulasan");
  revalidatePath("/");
}

export async function deleteReview(f: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(f.get("id"));
  if (!id) return;
  await sql`delete from reviews where id = ${id}`;
  revalidatePath("/admin/ulasan");
  revalidatePath("/");
}

export async function createPromo(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir." };

  const code = str(f, "code").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const type = str(f, "type");
  const value = Number(str(f, "value").replace(",", "."));
  const minOrder = Number(digits(f, "minOrder") || "0");
  const maxDiscountRaw = digits(f, "maxDiscount");
  const maxDiscount = maxDiscountRaw ? Number(maxDiscountRaw) : null;
  const usageLimitRaw = digits(f, "usageLimit");
  const usageLimit = usageLimitRaw ? Number(usageLimitRaw) : null;
  const expiresRaw = str(f, "expiresAt");
  const expiresAt = expiresRaw ? new Date(`${expiresRaw}T23:59:59+07:00`) : null;

  if (!code || code.length < 3) return { error: "Kode promo minimal 3 karakter." };
  if (type !== "percent" && type !== "fixed") return { error: "Tipe promo tidak valid." };
  if (!Number.isFinite(value) || value <= 0) return { error: "Nilai promo harus lebih dari 0." };
  if (type === "percent" && value > 100) return { error: "Diskon persen maksimal 100%." };
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Tanggal kedaluwarsa tidak valid." };

  try {
    await sql`
      insert into promo_codes (code, type, value, min_order, max_discount, usage_limit, expires_at)
      values (${code}, ${type}, ${value}, ${minOrder}, ${maxDiscount}, ${usageLimit}, ${expiresAt})
    `;
  } catch (error) {
    return { error: "Kode promo sudah ada atau gagal disimpan." };
  }

  revalidatePath("/admin/promo");
  return { ok: true };
}

export async function togglePromo(f: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(f.get("id"));
  const active = f.get("active") === "on";
  if (!id) return;
  await sql`update promo_codes set active = ${active} where id = ${id}`;
  revalidatePath("/admin/promo");
}

export async function lookupOrder(_prev: { error?: string } | null, f: FormData) {
  const full = normalizeCode(str(f, "kode"));
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

function normalizeAdminUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function newAdminPassword(f: FormData): { value: string } | { error: string } {
  const password = String(f.get("password") ?? "");
  const confirm = String(f.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password.length > 128) return { error: "Password terlalu panjang." };
  if (password !== confirm) return { error: "Konfirmasi password tidak cocok." };
  return { value: password };
}

export async function createAdminAccount(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const username = normalizeAdminUsername(str(f, "username"));
  const label = str(f, "label").slice(0, 60) || username;
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: "Username harus 3–32 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." };
  }
  const password = newAdminPassword(f);
  if ("error" in password) return { error: password.error };

  const exists = (await sql`select 1 from admin_accounts where username = ${username}`)[0];
  if (exists) return { error: "Username itu sudah dipakai." };

  await sql`
    insert into admin_accounts (username, label, password_hash)
    values (${username}, ${label}, ${hashPassword(password.value)})
  `;
  await audit("create", "admin_account", username, { label });
  revalidatePath("/admin/akun");
  return { ok: true };
}

export async function updateAdminAccount(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  if (!id) return { error: "Akun tidak ditemukan." };
  if (!(await verifyAdminCredential(str(f, "current")))) {
    return { error: "Password admin saat ini salah." };
  }
  const row = (await sql`select username from admin_accounts where id = ${id}`)[0];
  if (!row) return { error: "Akun tidak ditemukan." };

  const label = str(f, "label").slice(0, 60);
  const passwordRaw = String(f.get("password") ?? "");
  if (passwordRaw) {
    const password = newAdminPassword(f);
    if ("error" in password) return { error: password.error };
    await sql`
      update admin_accounts set label = ${label}, password_hash = ${hashPassword(password.value)}
      where id = ${id}
    `;
  } else {
    await sql`update admin_accounts set label = ${label} where id = ${id}`;
  }

  await audit("update", "admin_account", String(row.username), { label, passwordChanged: Boolean(passwordRaw) });
  revalidatePath("/admin/akun");
  return { ok: true };
}

export async function deleteAdminAccount(f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  if (!id) return { error: "Akun tidak ditemukan." };
  if (!(await verifyAdminCredential(str(f, "current")))) {
    return { error: "Password admin saat ini salah." };
  }
  const rows = (await sql`select id, username from admin_accounts`) as Array<{ id: number; username: string }>;
  const target = rows.find((row) => Number(row.id) === id);
  if (!target) return { error: "Akun tidak ditemukan." };
  if (rows.length === 1 && !process.env.ADMIN_PASSWORD) {
    return { error: "Tidak bisa menghapus akun terakhir sebelum cadangan ADMIN_PASSWORD aktif." };
  }

  await sql`delete from admin_accounts where id = ${id}`;
  await audit("delete", "admin_account", target.username);
  revalidatePath("/admin/akun");
  return { ok: true };
}

export async function updateOrder(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  const status = str(f, "status");
  const note = str(f, "note");
  const internalNote = str(f, "internalNote");
  const proofUrl = str(f, "proofUrl");
  const priceRaw = digits(f, "price");
  const price = priceRaw ? Number(priceRaw) : null;
  const paid = f.get("paid") === "on";
  if (!id || !isStatus(status)) return { error: "Status pesanan tidak valid." };

  const prev = (await sql`
    select status, note, internal_note, price, paid, paid_at from orders where id = ${id}`)[0];
  if (!prev) return { error: "Pesanan tidak ditemukan." };

  const paidAt = paid ? (prev.paid_at ?? new Date()) : null;
  const paymentStatus = paid ? "paid" : price !== null ? "unpaid" : "waiting";
  const rows = await sql`
    update orders set status = ${status}, price = ${price}, note = ${note || null},
      internal_note = ${internalNote || null}, paid = ${paid}, paid_at = ${paidAt},
      payment_status = ${paymentStatus}, updated_at = now()
    where id = ${id} returning code, name, wa`;
  const order = rows[0];
  if (!order) return { error: "Pesanan tidak ditemukan." };

  await syncManualPayment(id, price, paid, paidAt, proofUrl);

  const statusChanged = prev.status !== status;
  const noteChanged = (prev.note ?? "") !== note;
  const internalNoteChanged = (prev.internal_note ?? "") !== internalNote;
  const priceChanged = (prev.price ?? null) !== price;
  const paidChanged = Boolean(prev.paid) !== paid;

  if (statusChanged || noteChanged) {
    await sql`insert into order_events (order_id, status, note) values (${id}, ${status}, ${note || null})`;
  }

  if (f.get("notify") === "on" && (statusChanged || noteChanged || priceChanged || paidChanged)) {
    const payment = await getPaymentSettings();
    const paymentLinesList = payment.enabled && price !== null ? paymentLines(payment) : [];
    await sendStudioMessage(
      order.wa,
      orderStatusMessage({
        code: order.code,
        name: order.name,
        status: status as Status,
        price,
        note: note || null,
        paid,
        paymentLines: paymentLinesList,
      }),
    );
  }

  await audit("update", "order", order.code, {
    status,
    price,
    paid,
    note: note || null,
    statusChanged,
    priceChanged,
    paidChanged,
    noteChanged,
    internalNoteChanged,
    proofUrlChanged: Boolean(proofUrl),
  });

  revalidatePath("/admin");
  revalidatePath(`/lacak/${order.code}`);
  revalidatePath(`/admin/pelanggan`);
  redirect(withQuery(str(f, "returnTo"), { open: order.code, saved: "1" }));
}

/**
 * Aksi sekali ketuk dari daftar pesanan. Sengaja tidak mengirim WA: notifikasi
 * tetap dikendalikan lewat editor penuh supaya kuota Fonnte tidak boros.
 */
export async function quickUpdateOrder(input: {
  id: number;
  kind: "status" | "paid";
  value: string | boolean;
}): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(input?.id);
  if (!id) return { error: "Pesanan tidak valid." };
  if (input?.kind !== "status" && input?.kind !== "paid") return { error: "Aksi tidak dikenal." };

  const prev = (await sql`
    select code, status, price, paid, paid_at from orders where id = ${id}`)[0] as
    | { code: string; status: string; price: number | null; paid: boolean; paid_at: Date | null }
    | undefined;
  if (!prev) return { error: "Pesanan tidak ditemukan." };

  const price = prev.price == null ? null : Number(prev.price);
  let status = prev.status;
  let paid = Boolean(prev.paid);

  if (input.kind === "status") {
    const next = String(input.value);
    if (!isStatus(next)) return { error: "Status tidak valid." };
    status = next;
  } else {
    paid = Boolean(input.value);
    if (paid && price === null) return { error: "Harga belum disepakati, belum bisa ditandai lunas." };
  }

  const paidAt = paid ? (prev.paid_at ?? new Date()) : null;
  const paymentStatus = paid ? "paid" : price !== null ? "unpaid" : "waiting";

  await sql`
    update orders set status = ${status}, paid = ${paid}, paid_at = ${paidAt},
      payment_status = ${paymentStatus}, updated_at = now()
    where id = ${id}`;
  await syncManualPayment(id, price, paid, paidAt);

  if (status !== prev.status) {
    await sql`insert into order_events (order_id, status, note) values (${id}, ${status}, null)`;
  }

  await audit("quick_update", "order", prev.code, {
    field: input.kind,
    status,
    paid,
  });

  revalidatePath("/admin");
  revalidatePath(`/lacak/${prev.code}`);
  revalidatePath("/admin/pelanggan");
  return { ok: true };
}

export async function deleteOrder(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = Number(f.get("id"));
  const code = normalizeCode(str(f, "code"));
  const confirm = normalizeCode(str(f, "confirm"));
  if (!id || !isValidCode(code)) return { error: "Data pesanan tidak valid." };
  if (confirm !== code) {
    return { error: `Kode tidak sama. Ketik ${code} persis untuk mengonfirmasi penghapusan.` };
  }

  const existing = (await sql`select code from orders where id = ${id}`)[0];
  if (!existing || existing.code !== code) return { error: "Pesanan tidak ditemukan atau kode sudah berubah." };

  // order_events punya ON DELETE CASCADE, jadi riwayat ikut terhapus.
  await sql`delete from orders where id = ${id}`;

  await audit("delete", "order", code);

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
         await audit("create", "service", id, { name, price, pricingModel, active });
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

  await audit("update", "service", id, { name, price, pricingModel, active });

  revalidatePath("/admin/layanan");
  revalidatePath("/");
  revalidatePath("/order");
  return { ok: true };
}

export async function deleteService(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const id = str(f, "id").toLowerCase();
  const confirm = str(f, "confirm").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(id)) return { error: "ID layanan tidak valid." };
  if (confirm !== id) {
    return { error: `Ketik ${id} persis untuk mengonfirmasi penghapusan layanan.` };
  }

  const service = (await sql`select id, name from services where id = ${id}`)[0];
  if (!service) return { error: "Layanan tidak ditemukan." };

  // Order lama tetap menyimpan nama layanan, lalu lepas relasinya sebelum menghapus.
  await sql`update orders set service_label = coalesce(service_label, ${service.name}) where service_id = ${id}`;
  await sql`update orders set service_id = null where service_id = ${id}`;
  await sql`delete from services where id = ${id}`;

  await audit("delete", "service", id, { name: service.name });

  revalidatePath("/admin/layanan");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/order");
  revalidatePath("/portal");
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

  await audit("update", "settings", "payment", { enabled, bankName, bankAccount, bankHolder });

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
  const code = normalizeCode(str(f, "code"));
  if (!isValidCode(code)) return { error: "Kode pesanan tidak valid." };
  if (!gatewayEnabled()) return { error: "Payment gateway belum dikonfigurasi. Gunakan transfer manual." };

  const order = (await sql`
    select id, code, paid, price, status from orders where code = ${code}
  `)[0] as
    | { id: number; code: string; paid: boolean; price: number | null; status: string }
    | undefined;

  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.paid) return { error: "Pesanan ini sudah lunas." };
  if (order.status === "batal") return { error: "Pesanan ini sudah dibatalkan." };
  if (order.price == null || order.price <= 0) return { error: "Harga pesanan belum ditentukan." };

  redirect(`/bayar/${order.code}`);
}

/**
 * Membuat tagihan Midtrans Core API (QRIS / VA) lalu menyimpannya supaya
 * halaman pembayaran bisa menampilkan QR/nomor VA yang sama saat dimuat ulang.
 */
export async function chargePayment(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const code = normalizeCode(str(f, "code"));
  const method = str(f, "method") as PaymentMethod;
  if (!isValidCode(code)) return { error: "Kode pesanan tidak valid." };
  if (!PAYMENT_METHODS.some((item) => item.id === method)) {
    return { error: "Pilih metode pembayaran dulu." };
  }
  if (!gatewayEnabled()) return { error: "Payment gateway belum dikonfigurasi. Gunakan transfer manual." };

  const order = (await sql`
    select id, code, name, wa, price, paid, status from orders where code = ${code}
  `)[0] as
    | {
        id: number;
        code: string;
        name: string;
        wa: string;
        price: number | null;
        paid: boolean;
        status: string;
      }
    | undefined;

  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.paid) return { error: "Pesanan ini sudah lunas." };
  if (order.status === "batal") return { error: "Pesanan ini sudah dibatalkan." };
  if (order.price == null || order.price <= 0) return { error: "Harga pesanan belum ditentukan." };

  let charge;
  try {
    charge = await createCoreCharge(
      { code: order.code, price: Number(order.price), name: order.name, wa: String(order.wa ?? "") },
      method,
    );
  } catch (error) {
    console.error("chargePayment failed", error);
    return { error: clientErrorMessage(error, "Gagal membuat pembayaran. Coba lagi.") };
  }

  await sql`
    update payments set status = 'failed'
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'`;
  await sql`
    insert into payments (order_id, provider, method, amount, status, reference, raw)
    values (${order.id}, 'midtrans', ${method}, ${order.price}, 'pending', ${charge.transactionId},
      ${JSON.stringify(charge)}::jsonb)`;

  revalidatePath(`/bayar/${order.code}`);
  return { ok: true };
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

export async function bulkUpdateOrders(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };

  const raw = str(f, "codes");
  const codes = raw
    .split(/[\s,;]+/)
    .map(normalizeCode)
    .filter(isValidCode);
  if (codes.length === 0) return { error: "Tidak ada kode pesanan yang valid." };

  const status = str(f, "status");
  const hasStatus = isStatus(status);
  // `paidMode` menggantikan checkbox lama: "", "paid", atau "unpaid".
  const paidMode = str(f, "paidMode") || (f.has("paid") ? "paid" : "");
  const setPaid = paidMode === "paid" || paidMode === "unpaid";
  const paid = paidMode === "paid";
  if (!hasStatus && !setPaid) return { error: "Pilih status atau pembayaran." };

  const placeholders = codes.map((_, i) => `$${i + 1}`).join(",");
  const values: Array<string | boolean> = [...codes];
  const setClauses: string[] = [];
  if (hasStatus) {
    values.push(status);
    setClauses.push(`status = $${values.length}`);
  }
  if (setPaid) {
    values.push(paid);
    setClauses.push(`paid = $${values.length}`);
    setClauses.push(paid ? "paid_at = coalesce(paid_at, now())" : "paid_at = null");
    setClauses.push(
      paid
        ? "payment_status = 'paid'"
        : "payment_status = case when price is null then 'waiting' else 'unpaid' end",
    );
  }
  setClauses.push("updated_at = now()");
  const sqlText = `update orders set ${setClauses.join(", ")} where code in (${placeholders}) returning id`;
  const rows = await sql.query(sqlText, values);

  // Jalur lama hanya menyentuh orders. Sekarang baris payments dan event ikut sinkron.
  const affected = await sql.query(
    `select id, status, price, paid, paid_at from orders where code in (${placeholders})`,
    codes,
  );
  for (const o of affected) {
    const orderPrice = o.price == null ? null : Number(o.price);
    const orderPaid = Boolean(o.paid);
    const paidAt = orderPaid ? (o.paid_at ? new Date(o.paid_at) : new Date()) : null;
    await syncManualPayment(Number(o.id), orderPrice, orderPaid, paidAt);
    if (hasStatus) {
      await sql`insert into order_events (order_id, status, note) values (${o.id}, ${o.status}, null)`;
    }
  }

  await audit("bulk_update", "order", codes.join(","), {
    status: hasStatus ? status : null,
    paid: setPaid ? paid : null,
    count: rows.length,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pelanggan");
  return { ok: true, reset: true };
}
export async function toggleReminders(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };
  const enabled = f.get("enabled") === "on";
  await sql`
    insert into app_settings (key, value) values ('reminder_enabled', ${enabled ? "1" : "0"})
    on conflict (key) do update set value = excluded.value`;

  // Form pengaturan mengirim digestForm=1 supaya checkbox yang tidak dicentang
  // tetap bisa dibedakan dari form lama yang belum punya opsi ini.
  let digest: boolean | null = null;
  if (f.get("digestForm") === "1") {
    digest = f.get("digest") === "on";
    await sql`
      insert into app_settings (key, value) values ('admin_digest_enabled', ${digest ? "1" : "0"})
      on conflict (key) do update set value = excluded.value`;
  }

  await audit("update", "settings", "reminder", { enabled, digest });
  revalidatePath("/admin/pengaturan");
  return { ok: true };
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
