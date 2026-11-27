import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";
import { withAccess } from "@/lib/order-access";
import { rupiah } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import type { Status } from "@/lib/status";

/**
 * Adapter notifikasi WhatsApp. Semua template pesan studio dikumpulkan di sini
 * agar isi pesan konsisten dan 100% bebas branding pihak ketiga. Provider
 * (Fonnte/OpenWA/Meta Cloud) tetap dipilih lewat lib/wa.ts sesuai env.
 */
export async function sendStudioMessage(to: string, content: string, idempotencyKey?: string) {
  return sendWA(to, content, idempotencyKey);
}

export function orderCreatedCustomerMessage(input: {
  name: string;
  code: string;
  service: string;
  total: number | null;
  deadline: string;
  link: string;
}) {
  const totalLine = input.total != null ? `Total: ${rupiah(input.total)}` : "Total: menunggu konfirmasi";
  return `Halo ${input.name}, pesananmu ${input.code} sudah kami terima.

${input.service}
${totalLine}
Target selesai: ${input.deadline}

Pantau & bayar: ${input.link}`;
}

export function orderCreatedAdminMessage(input: {
  code: string;
  name: string;
  wa: string;
  service: string;
  total: number | null;
  deadline: string;
  brief: string;
  fileUrl: string | null;
  driveLink: string | null;
}) {
  const totalLine = input.total != null ? `Total: ${rupiah(input.total)}` : "Total: menunggu konfirmasi";
  return [
    `Pesanan baru ${input.code}`,
    `${input.name} (${input.wa})`,
    "",
    input.service,
    totalLine,
    `Target selesai: ${input.deadline}`,
    "",
    `Brief: ${input.brief}`,
    input.fileUrl ? `File: ${input.fileUrl}` : null,
    input.driveLink ? `Drive: ${input.driveLink}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function orderStatusMessage(input: {
  code: string;
  name: string;
  status: Status;
  price: number | null;
  note: string | null;
  paid: boolean;
  paymentLines?: string[];
  accessToken?: string | null;
}) {
  const parts: string[] = [];
  parts.push(STATUS_META[input.status].wa(input.code, input.name));
  if (input.price !== null) parts.push(`Total: ${rupiah(input.price)}`);
  if (input.note) parts.push(`Catatan: ${input.note}`);
  if (input.paid) parts.push("Pembayaran sudah kami terima. Terima kasih.");
  else if (input.price !== null && input.paymentLines?.length) {
    parts.push(input.paymentLines.join("\n"));
  }
  parts.push(
    `Pantau di: ${siteUrl()}${withAccess(`/lacak/${input.code}`, input.accessToken)}`,
  );
  return parts.join("\n\n");
}

export { adminWhatsApp };
