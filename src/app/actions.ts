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

function isValidDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

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
  if (values.ref) {
    try {
      const url = new URL(values.ref);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      return { error: "Masukkan link referensi yang valid dengan http:// atau https://.", values };
    }
  }
  if (!isValidDate(values.deadline)) return { error: "Tanggal target selesai tidak valid.", values };

  const svc = (await sql`select id, name from services where id = ${values.service} and active`)[0];
  if (!svc) return { error: "Layanan tidak ditemukan.", values };

  type CreatedOrder = { id: number; code: string };
  let order: CreatedOrder | undefined;
  for (let i = 0; i < 5 && !order; i++) {
    const rows = await sql`
      with created as (
        insert into orders (code, name, wa, service_id, brief, ref_link, deadline)
        values (${makeCode()}, ${values.name}, ${wa}, ${svc.id}, ${values.brief}, ${values.ref || null}, ${values.deadline || null})
        on conflict (code) do nothing returning id, code
      ), logged as (
        insert into order_events (order_id, status, note)
        select id, 'menunggu', 'Pesanan diterima' from created
        returning order_id
      )
      select c.id, c.code from created c
      join logged l on l.order_id = c.id`;
    order = rows[0] as CreatedOrder | undefined;
  }
  if (!order) return { error: "Gagal menyimpan pesanan. Coba kirim lagi.", values };

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

  const rows = await sql`
    with previous as (
      select id, status from orders where id = ${id} for update
    ), updated as (
      update orders o
      set status = ${status}, price = ${price}, note = ${note || null}, updated_at = now()
      from previous p
      where o.id = p.id
      returning o.id, o.code, o.name, o.wa, o.status
    ), logged as (
      insert into order_events (order_id, status, note)
      select u.id, u.status, ${note || null}
      from updated u
      join previous p on p.id = u.id
      where p.status is distinct from u.status or ${note || null} is not null
      returning order_id
    )
    select u.id, u.code, u.name, u.wa, u.status, p.status as previous_status
    from updated u
    join previous p on p.id = u.id
    left join logged l on l.order_id = u.id`;
  const order = rows[0];
  if (!order) return;

  const changed = order.previous_status !== status;

  if (f.get("notify") === "on" && (changed || note)) {
    const parts = [changed ? STATUS_META[status].wa(order.code, order.name) : `Halo ${order.name}, ada kabar untuk pesanan ${order.code}.`];
    if (price) parts.push(`Total: Rp${new Intl.NumberFormat("id-ID").format(price)}`);
    if (note) parts.push(`Catatan: ${note}`);
    parts.push(`Pantau di: ${siteUrl()}/lacak/${order.code}`);
    await sendWA(order.wa, parts.join("\n\n"));
  }
  revalidatePath("/admin");
}
