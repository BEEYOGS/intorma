import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminAccountManager } from "@/components/AdminAccountManager";
import { envFallbackActive, isAdmin, listAdminAccounts } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun admin", robots: { index: false } };

export default async function AdminAccountsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const accounts = await listAdminAccounts();

  return (
    <AdminShell active="accounts">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Akun</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
          Kelola password admin tanpa mengubah environment. Perubahan tercatat di log aktivitas.
        </p>
      </div>

      <AdminAccountManager accounts={accounts} envPasswordActive={envFallbackActive()} />
    </AdminShell>
  );
}
