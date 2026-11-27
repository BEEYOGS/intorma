"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceWithOptions, sql } from "@/lib/db";
import { currentAdmin, isAdmin, login, logout, verifyAdminCredential } from "@/lib/auth";
import { clientKey, rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { normalizeWA, rupiah, tanggalJam } from "@/lib/format";
import { isValidCode, makeCode, normalizeCode } from "@/lib/codes";
import { calculateQuote, type QuoteSelection } from "@/lib/pricing";
import { minDeadlineDate, deadlineToUtc } from "@/lib/deadline";
import {
  cleanAccessToken,
  hasOrderAccess,
  newOrderAccessToken,
  withAccess,
} from "@/lib/order-access";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { getPaymentSettings, paymentLines, savePaymentSettings } from "@/lib/settings";
import {
  clearCustomerSession,
  getCustomer,
  hashPassword,
  setCustomerSession,
  verifyPasswordAsync,
} from "@/lib/customer-auth";
import {
  cancelCoreCharge,
  createCoreCharge,
  gatewayEnabled,
  PAYMENT_METHODS,
  qrFromString,
  uniqueOrderId,
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
/** Server action wajib fail-closed: DB rate-limit error tidak boleh mematikan pembatasan. */
async function actionRate(
  scope: string,
  limit: number,
  windowMs = 60_000,
): Promise<{ error: string } | null> {
  try {
    const result = await rateLimit(await clientKey(scope), limit, windowMs);
    return result.ok ? null : { error: rateLimitMessage(result) };
  } catch (error) {
    console.error(`rate limit failed for ${scope}`, error);
    return { error: "Layanan sedang sibuk. Coba lagi sebentar." };
  }
}

function adminReturn(value: string): string {
  return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

/** Tautan lanjutan setelah login klien hanya boleh Path lokal di aplikasi ini. */
function customerNext(f: FormData): string {
  const value = str(f, "next");
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/portal";
  return value.slice(0, 240);
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
    // Order yang lunas via Midtrans tidak boleh mendapat baris manual "paid".
    const gatewayPaid = (await sql`
      select 1 from payments
      where order_id = ${id} and provider <> 'manual' and status = 'paid'
      limit 1`)[0];
    if (gatewayPaid) return;
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
    requestId: str(f, "requestId"),
  };
  const limited = await actionRate("create_order", 8);
  if (limited) return { error: limited.error, values };
  const wa = normalizeWA(values.wa);
  const customer = await getCustomer();

  // Idempotency submit: retry jaringan/double klik mengembalikan order yang sama.
  const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    values.requestId,
  )
    ? values.requestId
    : null;
  if (requestId) {
    const prior = (await sql`select code, access_token from orders where client_request_id = ${requestId} limit 1`)[0] as
      | { code: string; access_token: string | null }
      | undefined;
    if (prior) redirect(withAccess(`/lacak/${prior.code}?baru=1`, prior.access_token));
  }

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
  // Aturan yang sama dipakai datepicker: hari kalender WIB, bukan 24 jam berjalan.
  const deadlineAt = deadlineToUtc(values.deadline, deadlineTime);
  if (Number.isNaN(deadlineAt.getTime())) return { error: "Tanggal atau jam deadline belum valid.", values };
  if (deadlineAt.getTime() <= Date.now()) {
    return { error: "Deadline tidak boleh di masa lalu.", values };
  }
  const earliest = minDeadlineDate(svc.days ?? 0);
  if (values.deadline < earliest) {
    return {
      error: `Deadline minimal ${svc.days} hari dari sekarang (${earliest}) untuk layanan ini.`,
      values,
    };
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
  let promoClaimed = false;
  const basePrice = quote.price ?? 0;
  if (values.promo) {
    const code = values.promo.toUpperCase();
    // Klaim kuota bersifat atomik: dua submit paralel tidak bisa sama-sama
    // memakai potongan terakhir.
    const rows = (await sql`
      update promo_codes
      set used_count = used_count + 1
      where code = ${code}
        and active = true
        and (expires_at is null or expires_at > now())
        and (usage_limit is null or used_count < usage_limit)
        and min_order <= ${basePrice}
      returning code, type, value, max_discount
    `) as Array<Record<string, unknown>>;
    const promo = rows[0];
    if (!promo) return { error: "Kode promo tidak tersedia / kuota habis.", values };
    promoClaimed = true;
    if (promo.type === "percent") {
      discountAmount = Math.round((basePrice * Number(promo.value)) / 100);
      if (promo.max_discount != null) discountAmount = Math.min(discountAmount, Number(promo.max_discount));
    } else {
      discountAmount = Math.round(Number(promo.value));
    }
    discountAmount = Math.max(0, Math.min(discountAmount, basePrice));
    promoCode = String(promo.code);
  }

  const snapshotValue = quote.snapshot
    ? {
        ...quote.snapshot,
        lines: promoCode
          ? [
              ...quote.snapshot.lines,
              { label: `Promo ${promoCode}`, detail: "Diskon", amount: -discountAmount },
            ]
          : quote.snapshot.lines,
      }
    : null;
  const snapshot = snapshotValue ? JSON.stringify(snapshotValue) : null;
  const finalPrice = quote.price != null ? quote.price - discountAmount : null;
  const paymentStatus = finalPrice != null ? "unpaid" : "waiting";
  const widthCm = quote.snapshot?.width_cm ?? null;
  const heightCm = quote.snapshot?.height_cm ?? null;

  let order: { id: number; code: string; access_token: string } | undefined;
  const accessToken = newOrderAccessToken();
  try {
    for (let i = 0; i < 5 && !order; i++) {
      const rows = await sql`
        insert into orders (
          code, name, wa, service_id, service_label, customer_id, brief, ref_link, deadline, deadline_at,
          qty, unit_rate, price, width_cm, height_cm, options, subtotal,
          file_url, payment_method, payment_status, promo_code, discount_amount, client_request_id,
          access_token
        )
        values (
          ${await makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${svc.name}, ${customer?.id ?? null}, ${values.brief},
          ${values.ref || null}, ${values.deadline}, ${deadlineAt},
          ${quote.qty}, ${quote.unitRate}, ${finalPrice},
          ${widthCm}, ${heightCm}, ${snapshot}::jsonb, ${quote.subtotal},
          ${fileUrl}, 'transfer', ${paymentStatus}, ${promoCode}, ${discountAmount}, ${requestId}::uuid,
          ${accessToken}
        )
        on conflict (code) do nothing
        returning id, code, access_token`;
      order = rows[0] as { id: number; code: string; access_token: string } | undefined;
    }
  } catch (error) {
    // Duplicate client_request_id berarti request yang sama sudah berhasil.
    if (requestId) {
      const prior = (await sql`select code, access_token from orders where client_request_id = ${requestId} limit 1`)[0] as
        | { code: string; access_token: string | null }
        | undefined;
      if (prior) {
      // Kuota sudah diklaim sebelum insert; kembalikan sebelum redirect.
      if (promoClaimed && promoCode) {
        await sql`update promo_codes set used_count = greatest(0, used_count - 1) where code = ${promoCode}`.catch(
          () => undefined,
        );
      }
      redirect(withAccess(`/lacak/${prior.code}?baru=1`, prior.access_token));
    }
    }
    console.error("createOrder insert failed", error);
  }
  if (!order) {
    if (promoClaimed && promoCode) {
      await sql`update promo_codes set used_count = greatest(0, used_count - 1) where code = ${promoCode}`.catch(
        () => undefined,
      );
    }
    return { error: "Gagal menyimpan pesanan. Coba kirim lagi.", values };
  }

  await sql`insert into order_events (order_id, status, note) values (${order.id}, 'menunggu', 'Pesanan diterima')`;
  if (finalPrice != null) {
    await sql`
      insert into payments (order_id, provider, method, amount, status)
      values (${order.id}, 'manual', 'transfer', ${finalPrice}, 'pending')`;
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

  const link = `${siteUrl()}${withAccess(`/lacak/${order.code}`, order.access_token)}`;
  const serviceSummary = quote.snapshot?.summary ?? svc.name;
  const total = finalPrice;

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
    price: finalPrice,
    promo: promoCode,
    discount: discountAmount,
    wa: values.wa,
  }, adminCreating ? "admin" : "customer");

  redirect(withAccess(`/lacak/${order.code}?baru=1`, order.access_token));
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
  const limited = await actionRate("lookup_order", 12);
  if (limited) return { error: limited.error };
  const full = normalizeCode(str(f, "kode"));
  const found = (await sql`select code from orders where code = ${full}`)[0];
  if (!found) return { error: "Kode tidak ditemukan. Cek lagi pesan WhatsApp yang kamu terima." };
  redirect(`/lacak/${full}`);
}

export async function adminLogin(_prev: { error?: string } | null, f: FormData) {
  if (!(await login(str(f, "password")))) {
    const limited = await actionRate("admin_login_view", 6);
    return { error: limited?.error ?? "Password salah. Coba lagi." };
  }
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

async function adminMutationGuard(): Promise<
  | { error: string }
  | { actor: NonNullable<Awaited<ReturnType<typeof currentAdmin>>> }
> {
  if (!(await isAdmin())) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };
  const limited = await actionRate("admin_account", 10);
  if (limited) return { error: limited.error };
  const actor = await currentAdmin();
  if (!actor) return { error: "Sesi admin berakhir. Muat ulang halaman lalu masuk lagi." };
  return { actor };
}

async function verifyOwnAccountPassword(
  id: number,
  password: string,
): Promise<boolean> {
  const rows = (await sql`select password_hash from admin_accounts where id = ${id}`) as Array<{
    password_hash: string;
  }>;
  return rows[0] ? verifyPasswordAsync(password, String(rows[0].password_hash)) : false;
}

export async function createAdminAccount(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const guard = await adminMutationGuard();
  if ("error" in guard) return { error: guard.error };
  if (guard.actor.role !== "owner") return { error: "Hanya owner yang bisa menambah akun." };
  if (!(await verifyAdminCredential(str(f, "current")))) {
    return { error: "Password admin saat ini salah." };
  }

  const username = normalizeAdminUsername(str(f, "username"));
  const label = str(f, "label").slice(0, 60) || username;
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: "Username harus 3–32 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." };
  }
  const password = newAdminPassword(f);
  if ("error" in password) return { error: password.error };

  const rows = await sql`
    insert into admin_accounts (username, label, password_hash, role)
    values (${username}, ${label}, ${hashPassword(password.value)}, 'operator')
    on conflict (username) do nothing
    returning id`;
  if (!rows[0]) return { error: "Username itu sudah dipakai." };

  await audit("create", "admin_account", username, { label, actor: guard.actor.username });
  revalidatePath("/admin/akun");
  return { ok: true };
}

export async function updateAdminAccount(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const guard = await adminMutationGuard();
  if ("error" in guard) return { error: guard.error };

  const id = Number(f.get("id"));
  if (!id) return { error: "Akun tidak ditemukan." };
  const row = (await sql`
    select id, username, role, active from admin_accounts where id = ${id}
  `)[0] as { id: number; username: string; role: string; active: boolean } | undefined;
  if (!row) return { error: "Akun tidak ditemukan." };
  const isSelf = guard.actor.id === id;
  if (!isSelf && guard.actor.role !== "owner") {
    return { error: "Hanya owner yang bisa mengelola akun lain." };
  }
  // Owner mengubah akun lain memakai password owner yang sedang login,
  // bukan password akun target (yang bisa saja ia tidak tahu).
  const confirmation = isSelf
    ? await verifyOwnAccountPassword(id, str(f, "current"))
    : await verifyAdminCredential(str(f, "current"));
  if (!confirmation) {
    return {
      error: isSelf
        ? "Password akun sendiri tidak cocok."
        : "Password owner saat ini tidak cocok.",
    };
  }

  const label = str(f, "label").slice(0, 60) || row.username;
  const active = f.get("activeForm") === "1" ? f.get("active") === "on" : Boolean(row.active);
  if (isSelf && !active) return { error: "Tidak bisa menonaktifkan akun sendiri." };
  const passwordRaw = String(f.get("password") ?? "");
  let hashSet = "";
  if (passwordRaw) {
    const password = newAdminPassword(f);
    if ("error" in password) return { error: password.error };
    hashSet = hashPassword(password.value);
  }

  const revoke = Boolean(passwordRaw) || active !== Boolean(row.active);
  await sql`
    update admin_accounts
    set label = ${label}, active = ${active}, updated_at = now(),
      password_hash = case when ${hashSet} = '' then password_hash else ${hashSet} end,
      token_version = case when ${revoke} then token_version + 1 else token_version end
    where id = ${id}`;

  await audit("update", "admin_account", row.username, {
    label,
    active,
    passwordChanged: Boolean(passwordRaw),
    actor: guard.actor.username,
  });
  revalidatePath("/admin/akun");
  return { ok: true };
}

export async function deleteAdminAccount(f: FormData): Promise<ActionResult> {
  const guard = await adminMutationGuard();
  if ("error" in guard) return { error: guard.error };
  if (guard.actor.role !== "owner") return { error: "Hanya owner yang bisa menghapus akun." };

  const id = Number(f.get("id"));
  if (!id) return { error: "Akun tidak ditemukan." };
  if (guard.actor.id === id) return { error: "Gunakan akun owner lain untuk menghapus akun sendiri." };
  const row = (await sql`select username from admin_accounts where id = ${id}`)[0] as
    | { username: string }
    | undefined;
  if (!row) return { error: "Akun tidak ditemukan." };
  if (!(await verifyAdminCredential(str(f, "current")))) {
    return { error: "Password owner saat ini tidak cocok." };
  }

  try {
    await sql`delete from admin_accounts where id = ${id}`;
  } catch (error) {
    console.error("deleteAdminAccount failed", error);
    return { error: "Gagal menghapus akun. Pastikan masih ada akun admin lain." };
  }
  await audit("delete", "admin_account", row.username, { actor: guard.actor.username });
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
  if (paid && price === null) {
    return { error: "Isi nominal harga sebelum menandai pembayaran lunas." };
  }

  const prev = (await sql`
    select status, note, internal_note, price, paid, paid_at from orders where id = ${id}`)[0];
  if (!prev) return { error: "Pesanan tidak ditemukan." };

  const paidAt = paid ? (prev.paid_at ?? new Date()) : null;
  const paymentStatus = paid ? "paid" : price !== null ? "unpaid" : "waiting";
  const rows = await sql`
    update orders set status = ${status}, price = ${price}, note = ${note || null},
      internal_note = ${internalNote || null}, paid = ${paid}, paid_at = ${paidAt},
      payment_status = ${paymentStatus}, updated_at = now()
    where id = ${id} returning code, name, wa, access_token`;
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
        accessToken: order.access_token,
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
    if (typeof input.value === "boolean") paid = input.value;
    else if (input.value === "true" || input.value === "1") paid = true;
    else if (input.value === "false" || input.value === "0") paid = false;
    else return { error: "Nilai pembayaran tidak valid." };
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
  const accessToken = cleanAccessToken(f.get("accessToken"));
  if (!isValidCode(code)) return { error: "Kode pesanan tidak valid." };
  if (!gatewayEnabled()) return { error: "Payment gateway belum dikonfigurasi. Gunakan transfer manual." };

  const order = (await sql`
    select id, code, paid, price, status, access_token, customer_id from orders where code = ${code}
  `)[0] as
    | {
        id: number;
        code: string;
        paid: boolean;
        price: number | null;
        status: string;
        access_token: string | null;
        customer_id: number | null;
      }
    | undefined;

  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (!(await hasOrderAccess(order, accessToken))) {
    return { error: "Buka pesanan memakai tautan pribadi yang kami kirim lewat WhatsApp." };
  }
  if (order.paid) return { error: "Pesanan ini sudah lunas." };
  if (order.status === "batal") return { error: "Pesanan ini sudah dibatalkan." };
  if (order.price == null || order.price <= 0) return { error: "Harga pesanan belum ditentukan." };

  redirect(withAccess(`/bayar/${order.code}`, accessToken));
}

/**
 * Membuat tagihan Midtrans Core API (QRIS / VA) lalu menyimpannya supaya
 * halaman pembayaran bisa menampilkan QR/nomor VA yang sama saat dimuat ulang.
 */
export async function chargePayment(_prev: ActionResult, f: FormData): Promise<ActionResult> {
  const limited = await actionRate("charge_payment", 12);
  if (limited) return { error: limited.error };

  const code = normalizeCode(str(f, "code"));
  const method = str(f, "method") as PaymentMethod;
  const accessToken = cleanAccessToken(f.get("accessToken"));
  if (!isValidCode(code)) return { error: "Kode pesanan tidak valid." };
  if (!PAYMENT_METHODS.some((item) => item.id === method)) {
    return { error: "Pilih metode pembayaran dulu." };
  }
  if (!gatewayEnabled()) return { error: "Payment gateway belum dikonfigurasi. Gunakan transfer manual." };

  const order = (await sql`
    select id, code, name, wa, price, paid, status, access_token, customer_id from orders where code = ${code}
  `)[0] as
    | {
        id: number;
        code: string;
        name: string;
        wa: string;
        price: number | null;
        paid: boolean;
        status: string;
        access_token: string | null;
        customer_id: number | null;
      }
    | undefined;

  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (!(await hasOrderAccess(order, accessToken))) {
    return { error: "Buka pesanan memakai tautan pribadi yang kami kirim lewat WhatsApp." };
  }
  if (order.paid) return { error: "Pesanan ini sudah lunas." };
  if (order.status === "batal") return { error: "Pesanan ini sudah dibatalkan." };
  if (order.price == null || order.price <= 0) return { error: "Harga pesanan belum ditentukan." };

  const price = Number(order.price);
  const totalAttempts = Number(
    (
      await sql`select count(*)::int as n from payments where order_id = ${order.id} and provider = 'midtrans'`
    )[0]?.n ?? 0,
  );
  const attempt = totalAttempts + 1;
  const expectedOrderId = uniqueOrderId(order.code, method, price, attempt);

  // Tagihan aktif yang belum kedaluwarsa dipakai ulang, bukan dibuat baru.
  const pending = (await sql`
    select id, method, raw,
      coalesce(raw->>'order_id_used', raw->>'orderIdUsed') as order_id_used,
      coalesce(raw->>'expires_at', raw->>'expiresAt') as expires_at
    from payments
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'
    order by id desc limit 1
  `)[0] as
    | { id: number; method: string; raw: Record<string, string>; order_id_used: string | null; expires_at: string | null }
    | undefined;

  if (pending?.order_id_used) {
    const stillValid = pending.expires_at ? new Date(pending.expires_at).getTime() > Date.now() + 5_000 : true;
    if (stillValid) {
      if (pending.method === method) {
        // Perbaiki QR bila pengambilan gambar gagal saat charge pertama.
        const qrString = String(pending.raw?.qrString ?? "");
        if (pending.raw?.qrPending && qrString) {
          const dataUrl = await qrFromString(qrString);
          if (dataUrl) {
            await sql`
              update payments set raw = raw || ${JSON.stringify({ qrDataUrl: dataUrl, qrPending: false })}::jsonb
              where id = ${pending.id}`;
          }
        }
        const usable =
          Boolean(pending.raw?.qrDataUrl) ||
          (qrString ? Boolean(await qrFromString(qrString)) : false);
        if (!usable) {
          return { error: "QR tagihan tidak dapat dibuat. Muat ulang atau pilih metode VA." };
        }
        revalidatePath(`/bayar/${order.code}`);
        return { ok: true };
      }
      return { error: "Tagihan lain masih aktif. Batalkan/muat ulang halaman sebelum ganti metode." };
    }
    await cancelCoreCharge(pending.order_id_used);
    await sql`update payments set status = 'failed' where id = ${pending.id} and status = 'pending'`;
  }

  let charge;
  try {
    charge = await createCoreCharge(
      { code: order.code, price, name: order.name, wa: String(order.wa ?? "") },
      method,
      attempt,
    );
  } catch (error) {
    console.error("chargePayment failed", error);
    return { error: clientErrorMessage(error, "Gagal membuat pembayaran. Coba lagi.") };
  }

  if (method === "qris" && !charge.qrString && !charge.qrDataUrl) {
    await cancelCoreCharge(charge.orderIdUsed);
    return { error: "QR tidak tersedia dari gateway. Pilih metode virtual account." };
  }

  try {
    await sql`
      insert into payments (order_id, provider, method, amount, status, reference, raw)
      values (${order.id}, 'midtrans', ${method}, ${price}, 'pending', ${charge.transactionId},
        ${JSON.stringify({
          ...charge,
          order_id_used: charge.orderIdUsed,
          expires_at: charge.expiresAt,
          expected_order_id: expectedOrderId,
        })}::jsonb)`;
  } catch (error) {
    // Charge sudah dibuat di Midtrans dengan ID deterministik. Percobaan
    // berikutnya memakai ID/Idempotency-Key yang sama, bukan tagihan baru.
    console.error("chargePayment save failed", error);
    await audit("payment_charge_unsaved", "order", order.code, { order_id: charge.orderIdUsed });
    return { error: "Tagihan sedang diproses. Muat ulang halaman pembayaran." };
  }

  revalidatePath(`/bayar/${order.code}`);
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerCustomer(_prev: CustomerState, f: FormData): Promise<CustomerState> {
  const limited = await actionRate("customer_register", 5);
  if (limited) return { error: limited.error };
  const name = str(f, "name");
  const wa = normalizeWA(str(f, "wa"));
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (!wa) return { error: "Nomor WhatsApp belum valid. Contoh: 0812 3456 7890." };
  if (!EMAIL_RE.test(email)) return { error: "Alamat email belum valid." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password.length > 128) return { error: "Password terlalu panjang." };

  const existing = (await sql`select 1 from customers where email = ${email}`)[0];
  if (existing) return { error: "Email ini sudah terdaftar. Silakan masuk." };

  const rows = (await sql`
    insert into customers (name, wa, email, password_hash)
    values (${name}, ${wa}, ${email}, ${hashPassword(password)})
    returning id`) as Array<{ id: number }>;
  const id = Number(rows[0]?.id ?? 0);
  if (!id) return { error: "Gagal membuat akun. Coba lagi." };

  // Klaim otomatis dari nomor WA dinonaktifkan: nomor saja bukan bukti
  // kepemilikan. Pesanan lama diakses lewat tautan pribadi atau digabung admin.
  await setCustomerSession(id);
  redirect(customerNext(f));
}

export async function loginCustomer(_prev: CustomerState, f: FormData): Promise<CustomerState> {
  const limited = await actionRate("customer_login", 6);
  if (limited) return { error: limited.error };
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: "Alamat email belum valid." };

  const rows = (await sql`
    select id, wa, password_hash from customers where email = ${email}
  `) as Array<{ id: number; wa: string; password_hash: string }>;
  const customer = rows[0];
  if (!customer || !(await verifyPasswordAsync(password, String(customer.password_hash)))) {
    return { error: "Email atau password salah." };
  }

  await setCustomerSession(Number(customer.id));
  redirect(customerNext(f));
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
    // Aksi massah hanya mengubah status: jangan menyentuh pembayaran.
    if (setPaid) await syncManualPayment(Number(o.id), orderPrice, orderPaid, paidAt);
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
  // Profil tidak pernah memindahkan pesanan dari nomor WhatsApp lain.
  revalidatePath("/portal");
  return { ok: true };
}
