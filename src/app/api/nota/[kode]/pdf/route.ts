import PDFDocument, { registerStdFonts } from "pdfkit";
import Courier from "pdfkit/standard-fonts/Courier";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import TimesItalic from "pdfkit/standard-fonts/TimesItalic";
import { sql } from "@/lib/db";
import { jam, tanggal } from "@/lib/format";
import { notaRows, notaTotal, type NotaOrder, type NotaSnapshot } from "@/lib/nota";
import { getPaymentSettings } from "@/lib/settings";
import { STATUS_META, asStatus } from "@/lib/status";

export const runtime = "nodejs";
export const maxDuration = 30;

// Vercel tidak menyertakan direktori font pdfkit; daftarkan yang dipakai di sini.
registerStdFonts(Courier, Helvetica, HelveticaBold, TimesItalic);

const M = 42;

export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const order = (
    await sql`
      select o.code, o.name, o.status, o.price, o.options, o.brief, o.created_at,
        o.qty, o.width_cm, o.height_cm, o.paid, o.deadline, o.deadline_at,
        coalesce(s.name, o.service_label) as service
      from orders o left join services s on s.id = o.service_id
      where o.code = ${kode.toUpperCase()}`
  )[0] as NotaOrder | undefined;
  if (!order) return new Response("Nota tidak ditemukan.", { status: 404 });

  const [payment, snapshot] = await Promise.all([
    getPaymentSettings(),
    Promise.resolve(
      order.options && typeof order.options === "object" ? (order.options as NotaSnapshot) : null,
    ),
  ]);
  const meta = STATUS_META[asStatus(String(order.status))];
  const rows = notaRows(order, snapshot);

  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const width = doc.page.width - M * 2;
  const text = (value: string, x: number, y: number, options: Record<string, unknown> = {}) =>
    doc.text(value, x, y, { width, ...options });

  // Kop merek: wordmark, tagline, kontak (monokrom seperti nota asli).
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(46);
  text("in.torma", M, 42, { align: "center" });
  doc.font("Helvetica").fontSize(9).fillColor("#111111");
  text("CREATIVE WITHOUT IDEA", M, 100, { align: "center", characterSpacing: 3 });
  doc.fontSize(10);
  text("0896 1760 7952  |  @aku.vza", M, 116, { align: "center" });

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111");
  text("NOTA PESANAN", M, 166, { align: "center", characterSpacing: 4 });
  doc.font("Courier").fontSize(10).fillColor("#333333");
  text(order.code, M, 193, { align: "center", characterSpacing: 2 });

  let y = 232;
  const quarter = width / 4;
  doc.font("Helvetica").fontSize(8).fillColor("#555555");
  text("DITUTJUKAN KEPADA", M, y);
  y += 16;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111111");
  text(order.name || "-", M, y);
  y += 17;
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  text("Pesanan " + (order.service || "custom"), M, y);

  y += 30;
  doc.font("Helvetica").fontSize(8).fillColor("#555555");
  doc.text("TANGGAL", M, y, { width: quarter - 6 });
  doc.text("DEADLINE", M + quarter, y, { width: quarter - 6 });
  doc.text("STATUS", M + quarter * 2, y, { width: quarter - 6 });
  doc.text("PEMBAYARAN", M + quarter * 3, y, { width: quarter - 6 });
  y += 15;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111");
  doc.text(tanggal(order.created_at), M, y, { width: quarter - 6 });
  doc.text(
    order.deadline_at
      ? jam(order.deadline_at)
      : order.deadline
        ? tanggal(order.deadline)
        : "Fleksibel",
    M + quarter,
    y,
    { width: quarter - 6 },
  );
  doc.fillColor(meta.printColor);
  doc.text(meta.label, M + quarter * 2, y, { width: quarter - 6 });
  doc.fillColor("#111111");
  doc.text(
    order.paid ? "Lunas" : order.price == null ? "Menunggu harga" : "Belum dibayar",
    M + quarter * 3,
    y,
    { width: quarter - 6 },
  );

  // Tabel rincian.
  y += 30;
  const cols = [M, M + 40, M + 325, M + 425];
  const colWidths = [40, 285, 100, width - 425];
  const headers = ["No", "Nama", "Jumlah", "Harga"];
  doc.rect(M, y, width, 24).fill("#F4F4F5");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, cols[i] + 6, y + 7, {
      width: colWidths[i] - 12,
      align: i === 3 ? "right" : i === 0 ? "center" : "left",
    });
  });
  y += 24;

  rows.forEach((row, index) => {
    doc.rect(M, y, width, 24).stroke("#111111");
    doc.fillColor("#111111").font("Helvetica").fontSize(9);
    doc.text(row.name, cols[1] + 6, y + 7, { width: colWidths[1] - 12, ellipsis: true });
    doc.text(row.qty, cols[2] + 6, y + 7, { width: colWidths[2] - 12 });
    doc.text(row.amount, cols[3] + 6, y + 7, { width: colWidths[3] - 12, align: "right" });
    if (row.name) doc.text(String(index + 1), cols[0] + 6, y + 7, { width: colWidths[0] - 12, align: "center" });
    y += 24;
  });
  doc.rect(M, y, width, 24).fill("#F4F4F5");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(9);
  doc.text("Total:", cols[2] + 6, y + 7, { width: colWidths[2] - 12, align: "right" });
  doc.text(notaTotal(order), cols[3] + 6, y + 7, { width: colWidths[3] - 12, align: "right" });
  y += 42;

  if (order.brief) {
    doc.fillColor("#555555").font("Helvetica").fontSize(8);
    text("RINGKASAN BRIEF", M, y);
    doc.fillColor("#222222").fontSize(9);
    text(order.brief, M, y + 14);
    y += Math.max(40, doc.y - y + 20);
  }

  const half = width / 2 - 14;
  const rightX = M + width / 2 + 14;
  doc.fillColor("#555555").font("Helvetica").fontSize(8);
  doc.text("PEMBAYARAN", M, y, { width: half });
  doc.fillColor("#222222").fontSize(9);
  if (payment.enabled && payment.bankAccount) {
    doc.text(`Transfer ${payment.bankName} ${payment.bankAccount}`, M, y + 14, { width: half });
    if (payment.bankHolder) doc.text(`a.n. ${payment.bankHolder}`, M, y + 28, { width: half });
    doc.text(`Berita transfer: ${order.code}`, M, y + 42, { width: half });
  } else {
    doc.text("Instruksi pembayaran dikirim lewat WhatsApp.", M, y + 14, { width: half });
  }

  doc.fillColor("#555555").font("Helvetica").fontSize(9);
  doc.text("Hormat kami,", rightX, y, { width: half, align: "right" });
  doc.fillColor("#111111").font("Times-Italic").fontSize(18);
  doc.text("Yogi Dinata", rightX, y + 24, { width: half, align: "right" });
  doc.moveTo(rightX, y + 52).lineTo(M + width, y + 52).stroke("#111111");
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("in.torma", rightX, y + 57, { width: half, align: "right" });

  const footerY = doc.page.height - 52;
  doc.moveTo(M, footerY - 12).lineTo(M + width, footerY - 12).stroke("#C9C9C9");
  doc.fillColor("#555555").font("Helvetica").fontSize(8);
  doc.text("CREATIVE WITHOUT IDEA", M, footerY, { width: half });
  doc.text(order.code, M, footerY, { width, align: "right" });

  doc.end();
  const pdf = await done;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nota-${order.code}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
