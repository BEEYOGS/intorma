"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { isAdmin, login, logout } from "@/lib/auth";
import { makeCode, normalizeWA, rupiah } from "@/lib/format";
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

export async function createOrder(_prev: OrderState, f: FormData): Promise<OrderState> {
  const values = {
    name: str(f, "name"), wa: str(f, "wa"), service: str(f, "service"),
    brief: str(f, "brief"), ref: str(f, "ref"), deadline: str(f, "deadline"),
  };
  const wa = normalizeWA(values.wa);

  if (values.name.length < 2) return { error: "Isi nama kamu dulu.", values };
  if (!wa) return { error: "Nomor WhatsApp belum valid. Contoh: 0812 3456 7890.", values };
  if (!values.service) return { error: "Pilih salah satu layanan.", values };
  if (values.brief.length < 15) return { error: "Brief terlalu singkat. Tulis minimal satu-dua kalimat.", values };
  if (values.ref && !/^https?:\/\//i.test(values.ref)) return { error: "Link referensi harus diawali http:// atau https://.", values };

  const svc = (await sql`select id, name from services where id = ${values.service} and active`)[0];
  if (!svc) return { error: "Layanan tidak ditemukan. Pilih layanan lain.", values };

  let order: { id: number; code: string } | undefined;
  for (let i = 0; i < 5 && !order; i++) {
    const rows = await sql`
      insert into orders (code, name, wa, service_id, brief, ref_link, deadline)
      values (${makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${values.brief}, ${values.ref || null}, ${values.deadline || null})
      on conflict (code) do nothing returning id, code`;
    const inserted = rows[0] as { id: number; code: string } | undefined;
    order = inserted;
  }
  if (!order) return { error: "Gagal menyimpan pesanan. Coba kirim lagi.", values };

  await sql`insert into order_events (order_id, status, note) values (${order.id}, 'menunggu', 'Pesanan diterima')`;

  const link = `${siteUrl()}/lacak/${order.code}`;
  await Promise.all([
    sendWA(wa, `${STATUS_META.menunggu.wa(order.code, values.name)}\n\nPantau di: ${link}`),
    process.env.ADMIN_WA
      ? sendWA(process.env.ADMIN_WA, `Pesanan baru ${order.code}\n${values.name} (${wa})\n${svc.name}\n\n${values.brief}`)
      : Promise.resolve(false),
  ]);

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
  const rows = await sql`
    update orders set status = ${status}, price = ${price}, note = ${note || null},
      paid = ${paid}, paid_at = ${paidAt}, updated_at = now()
    where id = ${id} returning code, name, wa`;
  const order = rows[0];
  if (!order) return { error: "Pesanan tidak ditemukan." };

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
  return { ok: true };
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

  if (name.length < 2) return { error: "Nama layanan minimal 2 karakter." };
  if (blurb.length < 5) return { error: "Tulis deskripsi singkat (minimal 5 karakter)." };

  if (mode === "new") {
    const id = str(f, "id").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(id)) {
      return { error: "ID layanan pakai huruf kecil, angka, atau tanda hubung (2–31 karakter)." };
    }
    const exists = (await sql`select 1 from services where id = ${id}`)[0];
    if (exists) return { error: "ID layanan itu sudah dipakai." };
    await sql`
      insert into services (id, name, blurb, price_from, days, sort, active)
      values (${id}, ${name}, ${blurb}, ${price}, ${days}, ${sort}, ${active})`;
    revalidatePath("/admin/layanan");
    revalidatePath("/");
    revalidatePath("/order");
    return { ok: true, reset: true };
  }

  const id = str(f, "id");
  const rows = await sql`
    update services set name = ${name}, blurb = ${blurb}, price_from = ${price},
      days = ${days}, sort = ${sort}, active = ${active}
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
