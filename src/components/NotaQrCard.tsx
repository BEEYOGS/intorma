import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { siteUrl } from "@/lib/wa";

/**
 * Konsumen tidak mencetak nota lewat browser. Mereka memindai QR atau menekan
 * unduh untuk menyimpan berkas PDF yang dibuat server.
 */
export async function NotaQrCard({ code }: { code: string }) {
  const pdfUrl = `${siteUrl()}/api/nota/${encodeURIComponent(code)}/pdf`;
  const svg = await QRCode.toString(pdfUrl, {
    type: "svg",
    margin: 1,
    width: 140,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#FFFFFF" },
  });

  return (
    <section className="card p-5 sm:p-6" aria-label={`Nota PDF ${code}`}>
      <div className="flex items-center gap-2">
        <QrCode aria-hidden className="size-4 text-accent" />
        <p className="eyebrow">Nota pesanan</p>
      </div>
      <p className="mt-2 text-sm font-semibold tracking-tight">Simpan nota sebagai PDF</p>
      <p className="mt-1 text-xs leading-5 text-mute">
        Pindai QR dengan kamera ponsel atau tekan unduh. Berkas PDF siap disimpan.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div
          role="img"
          className="grid size-[148px] shrink-0 place-items-center rounded-tag-sm border border-line bg-white p-2 [&>svg]:block [&>svg]:size-full"
          aria-label={`QR unduh nota PDF ${code}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1">
          <a href={pdfUrl} download className="btn btn-primary min-h-10 w-full px-4 text-sm sm:w-auto">
            <Download aria-hidden className="size-4" /> Unduh nota PDF
          </a>
          <p className="mt-2 break-all font-mono text-xs text-mute">{code}.pdf</p>
        </div>
      </div>
    </section>
  );
}
