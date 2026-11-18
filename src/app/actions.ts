"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { isAdmin, login, logout } from "@/lib/auth";
import { makeCode, normalizeWA } from "@/lib/format";
import { STATUS_META, isStatus } from "@/lib/status";
import { sendWA, siteUrl } from "@/lib/wa";

export type OrderState = {
  error?: string;
  values?: Record<string, string>;
} | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createOrder(_prev: OrderState, f: FormData): Promise<OrderState> {
  const values = {
    name: str(f, "name"), wa: str(f, "wa"), service: str(f, "service"),
    brief: str(f, "brief"), ref: str(f, "ref"), deadline: str(f, "deadline"),
  };
  const wa = normalizeWA(values.wa);

  if (values.name.length < 2) return { error: "Isi nama kamu.", values };
  if (!wa) return { error: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890.", values };
  if (!values.service) return { error: "Pilih salah satu layanan.", values };
  if (values.brief.length < 15) return { error: "Brief terlalu singkat. Tulis minimal satu-dua kalimat.", values };
  if (values.ref && !/^https?:\/\//i.test(values.ref)) return { error: "Link referensi harus diawali http:// atau https://.", values };

  const svc = (await sql`select id, name from services where id = ${values.service} and active`)[0];
  if (!svc) return { error: "Layanan tidak ditemukan.", values };

  let order: { id: number; code: string } | undefined;
  for (let i = 0; i < 5 && !order; i++) {
    const rows = await sql`
      insert into orders (code, name, wa, service_id, brief, ref_link, deadline)
      values (${makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${values.brief}, ${values.ref || null}, ${values.deadline || null})
      on conflict (code) do nothing returning id, code`;
    order = rows[0] as typeof order;
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
  if (!(await login(str(f, "password")))) return { error: "Password salah." };
  redirect("/admin");
}

export async function adminLogout() {
  await logout();
  redirect("/admin/login");
}

export async function updateOrder(f: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");

  const id = Number(f.get("id"));
  const status = str(f, "status");
  const note = str(f, "note");
  const priceRaw = str(f, "price").replace(/\D/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  if (!id || !isStatus(status)) return;

  const prev = (await sql`select status from orders where id = ${id}`)[0];
  const rows = await sql`
    update orders set status = ${status}, price = ${price}, note = ${note || null}, updated_at = now()
    where id = ${id} returning code, name, wa`;
  const order = rows[0];
  if (!order) return;

  const changed = prev?.status !== status;
  if (changed || note) {
    await sql`insert into order_events (order_id, status, note) values (${id}, ${status}, ${note || null})`;
  }

  if (f.get("notify") === "on" && (changed || note)) {
    const parts = [changed ? STATUS_META[status].wa(order.code, order.name) : `Halo ${order.name}, ada kabar untuk pesanan ${order.code}.`];
    if (price) parts.push(`Total: Rp${new Intl.NumberFormat("id-ID").format(price)}`);
    if (note) parts.push(`Catatan: ${note}`);
    parts.push(`Pantau di: ${siteUrl()}/lacak/${order.code}`);
    await sendWA(order.wa, parts.join("\n\n"));
  }
  revalidatePath("/admin");
}
