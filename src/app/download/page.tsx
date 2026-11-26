import { TopBar } from "@/components/TopBar";
import { Download, Monitor, Smartphone } from "lucide-react";

export const metadata = { title: "Download aplikasi", robots: { index: false } };

const RELEASE_BASE = "https://github.com/BEEYOGS/intorma/releases/latest";

export default async function DownloadPage() {
  return (
    <div className="animate-in">
      <TopBar />
      <main id="konten" className="wrap py-10 sm:py-16">
        <p className="eyebrow mb-2">Aplikasi</p>
        <h1 className="display text-3xl sm:text-4xl mb-4">Download in.torma</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-2)] mb-8">
          Pilih cara pasang yang paling nyaman. Web app bisa dipasang langsung dari browser; installer native
          tersedia di GitHub Releases.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Monitor aria-hidden className="size-5 text-[var(--gold)]" />
              <p className="font-semibold">Desktop (Windows)</p>
            </div>
            <p className="text-sm text-[var(--text-2)] mb-4">
              Installer .exe / .msi dari GitHub Releases. Buka link, lalu unduh file terbaru.
            </p>
            <a href={RELEASE_BASE} target="_blank" rel="noreferrer" className="btn btn-primary min-h-10 px-4 text-sm">
              <Download aria-hidden className="size-4" /> Buka halaman rilis
            </a>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone aria-hidden className="size-5 text-[var(--gold)]" />
              <p className="font-semibold">Android (.apk)</p>
            </div>
            <p className="text-sm text-[var(--text-2)] mb-4">
              File .apk tersedia di GitHub Releases (debug build). Install dengan mengizinkan sumber tidak dikenal.
            </p>
            <a href={RELEASE_BASE} target="_blank" rel="noreferrer" className="btn btn-primary min-h-10 px-4 text-sm">
              <Download aria-hidden className="size-4" /> Unduh APK
            </a>
          </div>

          <div className="card p-5 sm:col-span-2">
            <p className="font-semibold mb-2">Pasang dari browser (PWA)</p>
            <p className="text-sm text-[var(--text-2)] mb-4">
              Tidak perlu download file. Buka situs di Chrome/Edge/Safari, lalu pilih “Install app” / “Add to Home Screen”.
              Popup pemasangan otomatis muncul beberapa detik lalu hilang sendiri.
            </p>
            <a href="/install" className="btn btn-ghost min-h-10 px-4 text-sm">
              Lihat panduan pasang
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
