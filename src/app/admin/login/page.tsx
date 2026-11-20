import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="animate-in">
      <div className="wrap py-16 sm:py-24">
        <div className="max-w-sm">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="display text-2xl sm:text-3xl mb-2">Masuk</h1>
          <p className="text-sm text-[var(--text-2)] mb-8">
            Sesi dilindungi. Masukkan password untuk melanjutkan.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}