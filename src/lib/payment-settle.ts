import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { isSettlement, orderCodeFromId } from "@/lib/payment";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

export type MidtransSettlement = {
  orderId: string;
  transactionStatus: string;
  fraudStatus?: string;
  grossAmount: string;
  transactionId?: string;
  paymentType?: string;
  raw?: unknown;
};

type OrderRow = {
  id: number;
  code: string;
  name: string;
  wa: string;
  price: number | null;
  paid: boolean;
  status: string;
};

/**
 * Satu jalur penyelesaian pembayaran Midtrans, dipakai webhook dan polling
 * status. Aman dipanggil berulang: kalau sudah lunas langsung keluar.
 */
export async function settleMidtransPayment(
  payload: MidtransSettlement,
): Promise<{ ok: boolean; code?: string; reason?: string; already?: boolean }> {
  const code = orderCodeFromId(payload.orderId);
  const order = (await sql`
    select id, code, name, wa, price, paid, status from orders where code = ${code}
  `)[0] as OrderRow | undefined;

  if (!order) return { ok: true, reason: "order_not_found" };
  if (!isSettlement(payload.transactionStatus) || payload.fraudStatus === "challenge") {
    return { ok: true, code, reason: "not_settled" };
  }
  if (order.paid) return { ok: true, code, already: true };

  if (order.price == null || Number(payload.grossAmount) !== Number(order.price)) {
    console.warn(
      `[payment] nominal tidak cocok untuk ${order.code}: gateway=${payload.grossAmount}, order=${order.price}`,
    );
    await audit("payment_rejected", "order", order.code, {
      amount: payload.grossAmount,
      expected: order.price,
      provider: "midtrans",
      order_id: payload.orderId,
    });
    return { ok: true, code, reason: "amount_mismatch" };
  }

  const paidAt = new Date();
  const rawJson = JSON.stringify(payload.raw ?? payload);

  // Klaim atomik: hanya satu proses (webhook atau polling) yang boleh
  // menyelesaikan pesanan, supaya WA dan baris pembayaran tidak dobel.
  const claimed = await sql`
    update orders set paid = true, paid_at = ${paidAt}, payment_status = 'paid',
      payment_method = 'midtrans', updated_at = now()
    where id = ${order.id} and paid = false
    returning id`;
  if (!claimed.length) return { ok: true, code, already: true };

  await sql`
    insert into order_events (order_id, status, note)
    values (${order.id}, ${order.status}, 'Pembayaran diterima via Midtrans')`;

  const updated = await sql`
    update payments set status = 'paid', paid_at = ${paidAt},
      reference = coalesce(${payload.transactionId ?? null}, reference),
      raw = coalesce(raw, '{}'::jsonb) || ${rawJson}::jsonb
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'
      and (${payload.transactionId ?? null}::text is null or reference = ${payload.transactionId ?? null} or reference is null)
    returning id`;
  if (!updated.length) {
    await sql`
      insert into payments (order_id, provider, method, amount, status, reference, raw, paid_at)
      values (${order.id}, 'midtrans', ${payload.paymentType ?? "qris"}, ${order.price}, 'paid',
        ${payload.transactionId ?? null}, ${rawJson}::jsonb, ${paidAt})`;
  }

  const link = `${siteUrl()}/lacak/${order.code}`;
  await Promise.all([
    sendWA(
      order.wa,
      `Halo ${order.name}, pembayaran pesanan ${order.code} sebesar ${rupiah(Number(order.price))} sudah kami terima. Terima kasih!\n\nPantau: ${link}`,
    ),
    adminWhatsApp()
      ? sendWA(
          adminWhatsApp(),
          `Pembayaran masuk via Midtrans untuk ${order.code} — ${order.name}.\nTotal: ${rupiah(Number(order.price))}`,
        )
      : Promise.resolve(false),
  ]);

  revalidatePath(`/lacak/${order.code}`);
  revalidatePath(`/bayar/${order.code}`);
  revalidatePath("/admin");
  await audit("payment", "order", order.code, {
    amount: order.price,
    provider: "midtrans",
    method: payload.paymentType ?? null,
  });
  return { ok: true, code, reason: "paid" };
}
