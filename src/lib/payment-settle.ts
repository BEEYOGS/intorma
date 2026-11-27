import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { withAccess } from "@/lib/order-access";
import { isSettlement, orderCodeFromId } from "@/lib/payment";
import { adminWhatsApp, sendWA, siteUrl, waTemplate } from "@/lib/wa";

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
  access_token?: string | null;
};

type PaymentRow = {
  id: number;
  amount: string | number;
  status: string;
  raw: unknown;
};

const TERMINAL_FAILED = ["expire", "cancel", "deny", "chargeback", "refund", "partial_refund", "failure"];

async function findPayment(orderId: number, payload: MidtransSettlement): Promise<PaymentRow | undefined> {
  const byReference = (await sql`
    select id, amount, status, raw from payments
    where order_id = ${orderId} and provider = 'midtrans'
      and (reference = ${payload.transactionId ?? ""}
        or coalesce(raw->>'order_id_used', raw->>'orderIdUsed') = ${payload.orderId})
    order by id desc limit 1
  `) as PaymentRow[];
  if (byReference[0]) return byReference[0];
  const rows = (await sql`
    select id, amount, status, raw from payments
    where order_id = ${orderId} and provider = 'midtrans'
    order by id desc limit 1
  `) as PaymentRow[];
  return rows[0];
}

/**
 * Efek samping setelah klaim lunas. Memakai idempotency key unik supaya retry
 * webhook/polling tidak mengirim WA dua kali walau baris payments gagal di update.
 */
async function finalizePaid(
  order: OrderRow,
  amount: number,
  payload: MidtransSettlement,
): Promise<void> {
  const paidAt = new Date();
  const rawJson = JSON.stringify(payload.raw ?? payload);
  const idempotency = payload.transactionId || payload.orderId;

  await sql`
    insert into order_events (order_id, status, note)
    values (${order.id}, ${order.status}, 'Pembayaran diterima via Midtrans')`;

  const updated = await sql`
    update payments set status = 'paid', paid_at = ${paidAt},
      amount = ${amount},
      reference = coalesce(${payload.transactionId ?? null}, reference),
      raw = coalesce(raw, '{}'::jsonb) || ${rawJson}::jsonb
    where order_id = ${order.id} and provider = 'midtrans' and status in ('pending', 'challenge')
      and (${payload.transactionId ?? null}::text is null or reference = ${payload.transactionId ?? null} or reference is null)
    returning id`;
  if (!updated.length) {
    const exists = (await sql`
      select 1 from payments
      where order_id = ${order.id} and provider = 'midtrans' and status = 'paid'
      limit 1`)[0];
    if (!exists) {
      await sql`
        insert into payments (order_id, provider, method, amount, status, reference, raw, paid_at)
        values (${order.id}, 'midtrans', ${payload.paymentType ?? "qris"}, ${amount}, 'paid',
          ${payload.transactionId ?? null}, ${rawJson}::jsonb, ${paidAt})`;
    }
  }

  const link = `${siteUrl()}${withAccess(`/lacak/${order.code}`, order.access_token)}`;
  const customerMessage = `Halo ${order.name}, pembayaran pesanan ${order.code} sebesar ${rupiah(amount)} sudah kami terima. Terima kasih!\n\nPantau: ${link}`;
  const adminMessage = `Pembayaran masuk via Midtrans untuk ${order.code} — ${order.name}.\nTotal: ${rupiah(amount)}`;
  await Promise.all([
    sendWA(
      order.wa,
      customerMessage,
      `midtrans-customer-${idempotency}`,
      waTemplate("payment", [order.name, order.code, rupiah(amount), link]),
    ),
    adminWhatsApp()
      ? sendWA(
          adminWhatsApp(),
          adminMessage,
          `midtrans-admin-${idempotency}`,
          waTemplate("admin", [`Pembayaran masuk ${order.code}`, adminMessage]),
        )
      : Promise.resolve(false),
  ]);

  revalidatePath(`/lacak/${order.code}`);
  revalidatePath(`/bayar/${order.code}`);
  revalidatePath("/admin");
  await audit("payment", "order", order.code, {
    amount,
    provider: "midtrans",
    method: payload.paymentType ?? null,
    transaction: payload.transactionId ?? payload.orderId,
  });
}

/**
 * Satu jalur penyelesaian pembayaran Midtrans, dipakai webhook dan polling.
 * Nominal dibandingkan terhadap snapshot di tabel payments, bukan harga order
 * yang bisa diubah admin saat pelanggan sedang membayar.
 */
export async function settleMidtransPayment(
  payload: MidtransSettlement,
): Promise<{ ok: boolean; code?: string; reason?: string; already?: boolean }> {
  const code = orderCodeFromId(payload.orderId);
  const order = (await sql`
    select id, code, name, wa, price, paid, status, access_token from orders where code = ${code}
  `)[0] as OrderRow | undefined;

  if (!order) return { ok: true, reason: "order_not_found" };
  const payment = await findPayment(order.id, payload);
  const amount = payment ? Number(payment.amount) : Number(order.price ?? 0);

  if (payload.fraudStatus === "deny" || payload.fraudStatus === "challenge") {
    if (payment && payment.status !== String(payload.fraudStatus)) {
      await sql`update payments set status = ${payload.fraudStatus} where id = ${payment.id}`;
      await audit("payment_fraud", "order", code, { status: payload.fraudStatus });
    }
    return { ok: true, code, reason: "fraud_" + payload.fraudStatus };
  }

  if (!isSettlement(payload.transactionStatus)) {
    if (TERMINAL_FAILED.includes(payload.transactionStatus)) {
      if (payment && payment.status === "pending") {
        await sql`update payments set status = 'failed' where id = ${payment.id}`;
      }
      // Notifikasi gagal yang usang tidak boleh membalik order yang sudah lunas.
      // Tandai untuk review admin; pembatalan final lah yang memutuskan status.
      if (order.paid && ["deny", "chargeback", "refund", "partial_refund", "failure"].includes(payload.transactionStatus)) {
        await audit("payment_reversal_review", "order", code, {
          status: payload.transactionStatus,
          transaction: payload.transactionId ?? null,
        });
        revalidatePath(`/admin`);
        return { ok: true, code, reason: "reversal_review" };
      }
    }
    return { ok: true, code, reason: "not_settled" };
  }

  if (!Number.isFinite(amount) || Number(payload.grossAmount) !== amount) {
    console.warn(
      `[payment] nominal tidak cocok untuk ${order.code}: gateway=${payload.grossAmount}, snapshot=${amount}`,
    );
    await audit("payment_rejected", "order", code, {
      amount: payload.grossAmount,
      expected: amount,
      provider: "midtrans",
      order_id: payload.orderId,
    });
    return { ok: true, code, reason: "amount_mismatch" };
  }

  if (order.paid) {
    // Perbaiki efek samping yang gagal pada retry sebelumnya.
    const paidRow = (await sql`
      select 1 from payments
      where order_id = ${order.id} and provider = 'midtrans' and status = 'paid'
      limit 1`)[0];
    if (!paidRow) {
      await finalizePaid(order, amount, payload).catch((error) =>
        console.error("repair payment side effects failed", error),
      );
    }
    return { ok: true, code, already: true };
  }

  const claimed = await sql`
    update orders set paid = true, paid_at = now(), payment_status = 'paid',
      payment_method = 'midtrans', updated_at = now()
    where id = ${order.id} and paid = false
    returning id`;
  if (!claimed.length) return { ok: true, code, already: true };

  await finalizePaid(order, amount, payload);
  return { ok: true, code, reason: "paid" };
}
