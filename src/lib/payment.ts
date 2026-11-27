import { createHash } from "crypto";
import QRCode from "qrcode";

export type GatewayOrder = {
  code: string;
  price: number;
  name: string;
  wa: string;
};

export type PaymentMethod = "qris" | "bca_va" | "bni_va" | "bri_va" | "permata_va";

export type PaymentMethodMeta = {
  id: PaymentMethod;
  label: string;
  hint: string;
  kind: "qris" | "va";
  bank?: string;
};

/** Urutan tampil di halaman pembayaran. QRIS dulu karena paling cepat. */
export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { id: "qris", label: "QRIS", hint: "Scan dari semua e-wallet & m-banking", kind: "qris" },
  { id: "bca_va", label: "BCA Virtual Account", hint: "Transfer dari m-BCA atau ATM", kind: "va", bank: "BCA" },
  { id: "bni_va", label: "BNI Virtual Account", hint: "Transfer dari mobile banking BNI", kind: "va", bank: "BNI" },
  { id: "bri_va", label: "BRI Virtual Account", hint: "Transfer dari BRImo atau ATM", kind: "va", bank: "BRI" },
  { id: "permata_va", label: "Permata Virtual Account", hint: "Transfer dari PermataMobile atau ATM", kind: "va", bank: "Permata" },
];

export type CoreCharge = {
  method: PaymentMethod;
  transactionId: string;
  orderIdUsed: string;
  status: string;
  expiresAt: string;
  qrString?: string;
  qrDataUrl?: string;
  vaNumber?: string;
  bank?: string;
};

export type CoreStatus = {
  transactionStatus: string;
  fraudStatus?: string;
  grossAmount: string;
  transactionId?: string;
  paymentType?: string;
};

const EXPIRY_MINUTES = 60;

const serverKey = () => process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
const baseUrl = () =>
  process.env.MIDTRANS_IS_PRODUCTION === "1"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

export function gatewayEnabled(): boolean {
  return Boolean(serverKey());
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

/**
 * Order ID Midtrans harus unik untuk setiap percobaan. Kode pesanan tetap
 * dikenali webhook karena sufiks `-P...` dibuang lagi saat lookup.
 */
function uniqueOrderId(code: string): string {
  return `${code}-P${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** `INT-261126001-PMABC123` -> `INT-261126001`; kode lama tanpa sufiks tetap utuh. */
export function orderCodeFromId(orderId: string): string {
  return orderId.toUpperCase().replace(/-P[A-Z0-9]{4,}$/, "");
}

function expiryIso(value: string | undefined): string {
  if (!value) return new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString();
  // Midtrans mengirim "2026-11-26 14:30:00" dalam WIB tanpa zona waktu.
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString()
      : parsed.toISOString();
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+07:00`).toISOString();
}

type ChargeResponse = {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  expiry_time?: string;
  qr_string?: string;
  va_numbers?: { bank?: string; va_number?: string }[];
  permata_va_number?: string;
  actions?: { name?: string; url?: string }[];
  error_messages?: string[];
};

export async function createCoreCharge(order: GatewayOrder, method: PaymentMethod): Promise<CoreCharge> {
  const key = serverKey();
  if (!key) throw new Error("Payment gateway belum dikonfigurasi.");

  const meta = PAYMENT_METHODS.find((item) => item.id === method);
  if (!meta) throw new Error("Metode pembayaran tidak dikenal.");

  const orderIdUsed = uniqueOrderId(order.code);
  const body: Record<string, unknown> = {
    payment_type: meta.kind === "qris" ? "qris" : "bank_transfer",
    transaction_details: { order_id: orderIdUsed, gross_amount: Math.round(order.price) },
    customer_details: { first_name: order.name, phone: order.wa },
    custom_expiry: { expiry_duration: EXPIRY_MINUTES, unit: "minute" },
  };
  if (meta.kind === "qris") {
    body.qris = { acquirer: "gopay" };
  } else {
    body.bank_transfer = { bank: method.replace("_va", "") };
  }

  const response = await fetch(`${baseUrl()}/v2/charge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: authHeader(),
      // Menjaga charge tidak dobel bila klien mengulang submit yang sama.
      "Idempotency-Key": orderIdUsed,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as ChargeResponse | null;
  if (!response.ok || !data?.transaction_id || !data.transaction_status) {
    const detail =
      data?.error_messages?.join(" ") || data?.status_message || `HTTP ${response.status}`;
    throw new Error(`Gagal membuat pembayaran ${meta.label}. ${detail}`.slice(0, 220));
  }

  const qrString = data.qr_string;
  let qrDataUrl = qrString
    ? await QRCode.toDataURL(qrString, {
        margin: 1,
        width: 640,
        errorCorrectionLevel: "M",
        color: { dark: "#09090b", light: "#ffffff" },
      })
    : undefined;

  // Sebagian akun hanya mengembalikan URL gambar QR (generate-qr-code). Ambil
  // gambarnya di server supaya halaman tetap bisa menampilkan QR tanpa auth.
  if (!qrDataUrl && method === "qris") {
    const action =
      data.actions?.find((item) => item.name === "generate-qr-code-v2") ??
      data.actions?.find((item) => item.name === "generate-qr-code");
    if (action?.url) {
      try {
        const image = await fetch(action.url, {
          headers: { authorization: authHeader() },
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if (image.ok) {
          const buffer = Buffer.from(await image.arrayBuffer());
          const type = image.headers.get("content-type") ?? "image/png";
          qrDataUrl = `data:${type};base64,${buffer.toString("base64")}`;
        }
      } catch {
        // Ditangani di bawah: QR dianggap gagal dibuat.
      }
    }
  }

  if (method === "qris" && !qrDataUrl) {
    throw new Error("QRIS berhasil dibuat, tetapi gambar QR gagal diambil. Coba lagi atau pilih Virtual Account.");
  }

  const va = data.va_numbers?.[0];

  return {
    method,
    transactionId: data.transaction_id,
    orderIdUsed: data.order_id ?? orderIdUsed,
    status: data.transaction_status,
    expiresAt: expiryIso(data.expiry_time),
    qrString,
    qrDataUrl,
    vaNumber: va?.va_number ?? data.permata_va_number,
    bank: meta.bank ?? va?.bank?.toUpperCase(),
  };
}

export async function getCoreStatus(orderIdUsed: string): Promise<CoreStatus | null> {
  const key = serverKey();
  if (!key) return null;
  const response = await fetch(`${baseUrl()}/v2/${encodeURIComponent(orderIdUsed)}/status`, {
    method: "GET",
    headers: { accept: "application/json", authorization: authHeader() },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as ChargeResponse | null;
  if (!data?.transaction_status || !data.gross_amount) return null;
  return {
    transactionStatus: data.transaction_status,
    fraudStatus: undefined,
    grossAmount: data.gross_amount,
    transactionId: data.transaction_id,
    paymentType: data.payment_type,
  };
}

export function midtransSignature(orderId: string, statusCode: string, grossAmount: string): string {
  const key = serverKey();
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${key}`).digest("hex");
}

export function isSettlement(status: string): boolean {
  return status === "settlement" || status === "capture";
}
