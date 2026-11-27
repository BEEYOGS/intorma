import { TopBar } from "@/components/TopBar";
import { CheckCircle2, Clock3, Download, ExternalLink, Monitor, Smartphone } from "lucide-react";

export const metadata = { title: "Download aplikasi", robots: { index: false } };
export const revalidate = 300;

const RELEASES_URL = "https://github.com/BEEYOGS/intorma/releases";
const LATEST_API = "https://api.github.com/repos/BEEYOGS/intorma/releases/latest";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type Release = {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
};

async function getLatestRelease(): Promise<Release | null> {
  try {
    const res = await fetch(LATEST_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "in.torma-download-page",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Release;
    return data?.tag_name ? data : null;
  } catch {
    return null;
  }
}

function fileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function AssetButton({ asset, label }: { asset: ReleaseAsset; label: string }) {
  return (
    <a
      href={asset.browser_download_url}
      className="btn btn-primary min-h-10 px-4 text-sm"
      rel="noreferrer"
    >
      <Download aria-hidden className="size-4" />
      {label}
      {asset.size > 0 && <span className="text-xs font-normal opacity-70">{fileSize(asset.size)}</span>}
    </a>
  );
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const assets = release?.assets ?? [];
  const exe = assets.find((asset) => asset.name.toLowerCase().endsWith(".exe"));
  const msi = assets.find((asset) => asset.name.toLowerCase().endsWith(".msi"));
  const apk = assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
  const releaseUrl = release?.html_url ?? RELEASES_URL;

  return (
    <div className="animate-in">
      <TopBar />
      <main id="konten" className="wrap py-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Aplikasi</p>
            <h1 className="display text-3xl sm:text-4xl mb-3">Download in.torma</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-2)]">
              Pilih cara pasang yang paling nyaman. Web app bisa dipasang langsung dari browser;
              installer native tersedia untuk Windows dan Android.
            </p>
          </div>
          <a
            href={releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="tag hover:border-accent/50 hover:text-ink"
          >
            {release ? `Rilis ${release.tag_name}` : "Semua rilis"}
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card flex flex-col p-5">
            <div className="mb-3 flex items-center gap-3">
              <Monitor aria-hidden className="size-5 text-accent" />
              <p className="font-semibold">Desktop (Windows)</p>
            </div>
            <p className="mb-5 text-sm leading-6 text-[var(--text-2)]">
              Installer native untuk Windows 10/11. Pilih <span className="text-ink">.exe</span> untuk
              pemasangan cepat atau <span className="text-ink">.msi</span> untuk deploy terkelola.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              {exe && <AssetButton asset={exe} label="Unduh .exe" />}
              {msi && <AssetButton asset={msi} label="Unduh .msi" />}
              {!exe && !msi && (
                <a href={releaseUrl} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-10 px-4 text-sm">
                  <Download aria-hidden className="size-4" /> Buka halaman rilis
                </a>
              )}
            </div>
          </div>

          <div className="card flex flex-col p-5">
            <div className="mb-3 flex items-center gap-3">
              <Smartphone aria-hidden className="size-5 text-accent" />
              <p className="font-semibold">Android (.apk)</p>
            </div>
            <p className="mb-5 text-sm leading-6 text-[var(--text-2)]">
              Pasang langsung di Android. Izinkan pemasangan dari sumber tidak dikenal saat diminta.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              {apk ? (
                <AssetButton asset={apk} label="Unduh APK" />
              ) : (
                <div className="rounded-tag-sm border border-line bg-white/[0.02] px-3.5 py-2.5 text-xs leading-5 text-mute">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <Clock3 aria-hidden className="size-3.5" /> APK sedang disiapkan
                  </span>
                  <br />
                  Build Android berjalan otomatis lewat GitHub Actions. Cek halaman rilis untuk file terbaru.
                </div>
              )}
              {!apk && (
                <a href={releaseUrl} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-10 px-4 text-sm">
                  <ExternalLink aria-hidden className="size-4" /> Halaman rilis
                </a>
              )}
            </div>
          </div>

          <div className="card p-5 sm:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Pasang dari browser (PWA)</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-2)]">
                  Tidak perlu download file. Buka situs di Chrome/Edge/Safari, lalu pilih “Install app” /
                  “Add to Home Screen”. Popup pemasangan muncul otomatis beberapa detik lalu hilang sendiri.
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-[var(--text-2)] sm:grid-cols-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden className="size-4 text-accent" /> Ringan, tanpa update manual
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden className="size-4 text-accent" /> Nota & status pesanan tetap sinkron
                  </li>
                </ul>
              </div>
              <a href="/install" className="btn btn-ghost min-h-10 px-4 text-sm">
                Lihat panduan pasang
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-mute">
          Catatan: installer Windows dan APK dibangun otomatis dari tag rilis. Jika tombol belum aktif,
          buka halaman rilis lalu unduh aset terbaru.
        </p>
      </main>
    </div>
  );
}
