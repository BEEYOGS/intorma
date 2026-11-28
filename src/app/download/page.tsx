import { TopBar } from "@/components/TopBar";
import { InstallNavButton } from "@/components/PWA";
import { CopyTextButton } from "@/components/CopyTextButton";
import { CheckCircle2, Clock3, Download, ExternalLink, Monitor, Smartphone } from "lucide-react";

export const metadata = { title: "Download aplikasi", robots: { index: false } };

const RELEASES_URL = "https://github.com/BEEYOGS/intorma/releases";

/** Kunci cache berubah tiap 5 menit supaya aset rilis baru tidak tersangkut di Data Cache lama. */
function releasesApi() {
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  return `https://api.github.com/repos/BEEYOGS/intorma/releases?per_page=20&t=${bucket}`;
}

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  digest?: string;
};

type Release = {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: ReleaseAsset[];
};

function versionValue(tag: string) {
  const match = tag.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 1_000_000 + Number(match[2]) * 1_000 + Number(match[3]);
}

/** Cache singkat per instance serverless: cukup segar, tapi tidak boros kuota GitHub API. */
let releaseCache: { at: number; release: Release | null } | null = null;
const RELEASE_TTL_MS = 5 * 60 * 1000;

async function getLatestRelease(): Promise<Release | null> {
  if (releaseCache && Date.now() - releaseCache.at < RELEASE_TTL_MS) {
    return releaseCache.release;
  }
  try {
    const res = await fetch(releasesApi(), {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "in.torma-download-page",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return releaseCache?.release ?? null;
    const releases = (await res.json()) as Release[];
    const published = releases.filter(
      (release) => release?.tag_name && !release.draft && !release.prerelease,
    );
    published.sort((a, b) => versionValue(b.tag_name) - versionValue(a.tag_name));
    const latest = published[0] ?? null;
    releaseCache = { at: Date.now(), release: latest };
    return latest;
  } catch {
    return releaseCache?.release ?? null;
  }
}

function fileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function AssetButton({ asset, label }: { asset: ReleaseAsset; label: string }) {
  const checksum = asset.digest?.replace(/^sha256:/, "") ?? "";
  const short = checksum.slice(0, 12);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={asset.browser_download_url}
        target="_blank"
        className="btn btn-primary min-h-10 px-4 text-sm"
        rel="noreferrer"
        title={checksum ? `SHA-256: ${checksum}` : undefined}
      >
        <Download aria-hidden className="size-4" />
        {label}
        {asset.size > 0 && <span className="text-xs font-normal opacity-70">{fileSize(asset.size)}</span>}
        {short && <span className="font-mono text-xs font-normal opacity-60">{short}</span>}
      </a>
      {checksum && <CopyTextButton value={checksum} label={`Salin SHA-256 ${asset.name}`} />}
      <CopyTextButton
        value={asset.browser_download_url}
        label={`Salin tautan ${asset.name}`}
      />
    </div>
  );
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const assets = release?.assets ?? [];
  const exe = assets.find((asset) => asset.name.toLowerCase().endsWith(".exe"));
  const msi = assets.find((asset) => asset.name.toLowerCase().endsWith(".msi"));
  const apk = assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
  // APK 1.0.1 masih memakai splash bawaan Capacitor; mulai 1.0.2 sudah memakai ikon in.torma.
  const apkReady = Boolean(apk) && versionValue(release?.tag_name ?? "") >= 1_000_002;
  const apkDebug = Boolean(apk && /debug/i.test(apk.name));
  const releaseUrl = release?.html_url ?? RELEASES_URL;

  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-10 sm:py-16">
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
            className="tag inline-flex min-h-12 items-center hover:border-accent/50 hover:text-ink"
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
              {apkDebug && (
                <span className="mt-2 block text-xs text-[var(--text-2)]">
                  Aset rilis saat ini masih build debug (debug-signed). Rilis berikutnya memakai APK
                  signed; untuk distribusi luas, tunggu aset berlabel release.
                </span>
              )}
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              {apkReady && apk ? (
                <AssetButton asset={apk} label={apkDebug ? "Unduh APK (debug)" : "Unduh APK"} />
              ) : (
                <div className="rounded-tag-sm border border-line bg-white/[0.02] px-3.5 py-2.5 text-xs leading-5 text-mute">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <Clock3 aria-hidden className="size-3.5" /> APK sedang disiapkan
                  </span>
                  <br />
                  Build Android berjalan otomatis lewat GitHub Actions. Cek halaman rilis untuk file terbaru.
                </div>
              )}
              {!apkReady && (
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
                  Tidak perlu download file. Buka situs di Chrome/Edge/Safari, lalu ketuk tombol
                  <span className="font-medium text-ink"> Install aplikasi</span> di header/menu.
                  Tidak ada popup otomatis; penolakan disimpan 30 hari dan pilihan “Nanti” 7 hari.
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
              <span className="tag">Direkomendasikan</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <InstallNavButton
                className="btn btn-primary min-h-10 px-4 text-sm"
                label="Install dari browser"
                iconClassName="size-4"
              />
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
      </div>
    </div>
  );
}
