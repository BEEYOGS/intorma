import { TopBar } from "@/components/TopBar";

export const metadata = { title: "Pasang aplikasi", robots: { index: false } };

export default async function InstallPage() {
  return (
    <div className="animate-in">
      <TopBar />
      <main id="konten" className="wrap py-10 sm:py-16">
        <p className="eyebrow mb-2">Aplikasi</p>
        <h1 className="display text-3xl sm:text-4xl mb-4">Pasang in.torma di layar utama.</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-2)] mb-8">
          in.torma adalah Progressive Web App. Tidak perlu download dari toko aplikasi; cukup pasang dari browser.
          Pop-up pemasangan otomatis muncul beberapa detik, lalu hilang sendiri.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="font-semibold mb-2">Android (Chrome)</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--text-2)]">
              <li>Buka situs ini di Chrome.</li>
              <li>Ketuk menu (⋮) lalu pilih <span className="font-semibold text-[var(--text)]">Install app</span> / <span className="font-semibold text-[var(--text)]">Add to Home screen</span>.</li>
              <li>Konfirmasi. Ikon in.torma muncul di layar utama.</li>
            </ol>
          </div>
          <div className="card p-5">
            <p className="font-semibold mb-2">iPhone / iPad (Safari)</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--text-2)]">
              <li>Buka situs ini di Safari.</li>
              <li>Ketuk tombol <span className="font-semibold text-[var(--text)]">Share</span>.</li>
              <li>Pilih <span className="font-semibold text-[var(--text)]">Add to Home Screen</span>.</li>
            </ol>
          </div>
          <div className="card p-5">
            <p className="font-semibold mb-2">Windows / macOS (Chrome / Edge)</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--text-2)]">
              <li>Buka situs ini di Chrome atau Edge.</li>
              <li>Ketuk ikon install di address bar, atau menu → <span className="font-semibold text-[var(--text)]">Install in.torma</span>.</li>
              <li>Aplikasi terbuka di jendela sendiri.</li>
            </ol>
          </div>
          <div className="card p-5">
            <p className="font-semibold mb-2">Installer native (.exe / .msi / .apk)</p>
            <p className="mb-4 text-sm leading-6 text-[var(--text-2)]">
              Butuh aplikasi desktop atau Android? Installer dibangun otomatis dari tag rilis dan tersedia
              di halaman download.
            </p>
            <a href="/download" className="btn btn-primary min-h-10 px-4 text-sm">
              Buka halaman download
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
