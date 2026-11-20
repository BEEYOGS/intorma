export default function ContactPage() {
  return (
    <div className="animate-in">
      <div className="wrap py-12 sm:py-16">
        <div className="max-w-xl">
          <p className="eyebrow mb-2">Kontak</p>
          <h1 className="display text-2xl sm:text-3xl mb-4">Hubungi kami.</h1>
          <p className="text-[15px] text-[var(--text-2)] mb-8">
            Pertanyaan tentang layanan atau pesanan? Hubungi lewat channel di bawah.
          </p>

          <div className="card divide-y divide-[var(--border)]">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">WhatsApp</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">+62 896-1760-7952</p>
              </div>
              <a href="https://wa.me/6289617607952" target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                Chat →
              </a>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Email</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">hello@in.torma</p>
              </div>
              <a href="mailto:hello@in.torma" className="btn btn-ghost text-xs">
                Kirim →
              </a>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Instagram</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">@aku.vza</p>
              </div>
              <a href="https://instagram.com/aku.vza" target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                Kunjungi →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}