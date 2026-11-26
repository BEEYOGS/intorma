import { AdminShell } from "@/components/AdminShell";

export default function Loading() {
  return (
    <AdminShell active="orders">
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    </AdminShell>
  );
}
