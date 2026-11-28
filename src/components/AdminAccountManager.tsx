"use client";

import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, Plus, Trash2, UserCog } from "lucide-react";
import {
  createAdminAccount,
  deleteAdminAccount,
  updateAdminAccount,
  type ActionResult,
} from "@/app/actions";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { PasswordField } from "@/components/PasswordField";
import { toast } from "@/components/Toast";
import type { AdminAccount } from "@/lib/auth";

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-tag-sm border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
      {error}
    </p>
  );
}

function CreateAccountForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createAdminAccount, null);
  const [key, setKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast("Akun admin dibuat.", "ok");
      setKey((value) => value + 1);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form key={key} action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="eyebrow">Nama tampilan</span>
        <input name="label" required maxLength={60} placeholder="Operator produksi" className="input mt-1.5" />
      </label>
      <label className="block">
        <span className="eyebrow">Username</span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._-]+"
          placeholder="operator"
          className="input mt-1.5"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="eyebrow">Password admin saat ini</span>
        <PasswordField name="current" required className="input mt-1.5" placeholder="Konfirmasi sebelum menambah akun" />
      </label>
      <label className="block">
        <span className="eyebrow">Password baru</span>
        <PasswordField name="password" minLength={8} autoComplete="new-password" className="input mt-1.5" placeholder="Minimal 8 karakter" />
      </label>
      <label className="block">
        <span className="eyebrow">Ulangi password</span>
        <PasswordField name="confirm" minLength={8} autoComplete="new-password" className="input mt-1.5" placeholder="Sama seperti di atas" />
      </label>
      <div className="sm:col-span-2">
        <FormError error={state?.error ?? undefined} />
        <button type="submit" disabled={pending} className="btn btn-primary min-h-10 px-4 text-sm">
          <Plus aria-hidden className="size-4" /> {pending ? "Menyimpan..." : "Tambah akun"}
        </button>
      </div>
    </form>
  );
}

function AccountRow({ account }: { account: AdminAccount }) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState<ActionResult, FormData>(updateAdminAccount, null);
  const [deleteState, deleteAction, deletePending] = useActionState<ActionResult, FormData>(async (_prev, f) => deleteAdminAccount(f), null);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const router = useRouter();

  const closeConfirm = useCallback(() => setConfirming(false), []);
  const confirmDelete = useCallback(() => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    startTransition(() => deleteAction(new FormData(form)));
  }, [deleteAction]);

  useEffect(() => {
    if (editState?.ok) {
      toast("Akun diperbarui.", "ok");
      setEditing(false);
      router.refresh();
    }
    if (deleteState?.ok) {
      toast("Akun dihapus.", "ok");
      closeConfirm();
      router.refresh();
    }
  }, [closeConfirm, deleteState, editState, router]);

  return (
    <li className="rounded-tag-lg border border-line bg-panel/40">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-tag-sm border border-accent/25 bg-accent/[0.06] text-accent">
            <UserCog aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {account.label || account.username}
              {!account.active ? <span className="ml-2 text-xs font-medium text-danger">Nonaktif</span> : null}
              {account.role === "owner" ? <span className="mono ml-2 text-xs text-accent">owner</span> : null}
            </p>
            <p className="mono mt-0.5 truncate text-xs text-mute">
              {account.username}
              {account.last_login_at
                ? ` · masuk terakhir ${new Date(account.last_login_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB`
                : " · belum pernah masuk"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          aria-expanded={editing}
          className="btn btn-ghost min-h-10 px-4 text-sm"
        >
          <KeyRound aria-hidden className="size-4" /> {editing ? "Tutup" : "Kelola"}
          <ChevronDown aria-hidden className={`size-4 transition-transform ${editing ? "rotate-180" : ""}`} />
        </button>
      </div>

      {editing && (
        <div className="grid gap-5 border-t border-line p-4 sm:p-5">
          <form action={editAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={account.id} />
            <label className="block">
              <span className="eyebrow">Nama tampilan</span>
              <input name="label" defaultValue={account.label} maxLength={60} className="input mt-1.5" />
            </label>
            <label className="block">
              <span className="eyebrow">Password akun ini</span>
              <PasswordField name="current" required className="input mt-1.5" placeholder="Untuk konfirmasi" />
            </label>
            <label className="block">
              <span className="eyebrow">Password baru (opsional)</span>
              <PasswordField name="password" minLength={8} autoComplete="new-password" className="input mt-1.5" placeholder="Kosongkan jika tidak diubah" />
            </label>
            <label className="block">
              <span className="eyebrow">Ulangi password baru</span>
              <PasswordField name="confirm" minLength={8} autoComplete="new-password" className="input mt-1.5" placeholder="Sama seperti di atas" />
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-tag-sm border border-line px-3 sm:col-span-2">
              <input type="hidden" name="activeForm" value="1" />
              <input type="checkbox" name="active" defaultChecked={account.active} className="size-4 accent-[var(--accent)]" />
              <span className="text-xs text-mute">Akun aktif (nonaktif langsung mencabut sesi)</span>
            </label>
            <div className="sm:col-span-2">
              <FormError error={editState?.error ?? undefined} />
              <button type="submit" disabled={editPending} className="btn btn-outline min-h-10 px-4 text-sm">
                {editPending ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>
          </form>

          <form
            ref={formRef}
            id={formId}
            action={deleteAction}
            onSubmit={(event) => {
              event.preventDefault();
              setConfirming(true);
            }}
            className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
          >
            <input type="hidden" name="id" value={account.id} />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-5 text-mute">
                Perlu password akun ini untuk menghapus. Kata sandi diminta di dalam dialog konfirmasi.
              </p>
            </div>
            <button type="submit" disabled={deletePending} className="btn btn-ghost min-h-12 px-4 text-sm text-danger sm:min-h-10">
              <Trash2 aria-hidden className="size-4" /> {deletePending ? "Menghapus..." : "Hapus akun"}
            </button>
          </form>
          <ConfirmSheet
            open={confirming}
            onClose={closeConfirm}
            onConfirm={confirmDelete}
            title={`Hapus akun ${account.username}?`}
            description="Akun akan dinonaktifkan permanen dan sesinya dicabut. Tindakan ini tidak bisa dibatalkan."
            confirmLabel="Hapus akun"
            pending={deletePending}
            error={deleteState?.error ?? undefined}
            initialFocusSelector="input:not([type='hidden'])"
          >
            <label className="block">
              <span className="eyebrow">Password akun ini</span>
              <PasswordField
                form={formId}
                name="current"
                required
                className="input mt-1.5"
                placeholder="Untuk konfirmasi hapus"
              />
            </label>
          </ConfirmSheet>
        </div>
      )}
    </li>
  );
}

export function AdminAccountManager({
  accounts,
  envPasswordActive,
}: {
  accounts: AdminAccount[];
  envPasswordActive: boolean;
}) {
  return (
    <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="rounded-tag-lg border border-line bg-panel/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Tambah akun</h2>
        <p className="mt-1 text-sm leading-6 text-mute">
          Tiap akun punya password sendiri. Login tetap satu kolom password—coba password akun mana pun.
        </p>
        <div className="mt-6">
          <CreateAccountForm />
        </div>
        <p className="mt-5 rounded-tag-sm border border-line px-3 py-2.5 text-xs leading-5 text-mute">
          {envPasswordActive
            ? "Password cadangan ADMIN_PASSWORD di environment masih aktif dan selalu diterima."
            : "Cadangan ADMIN_PASSWORD tidak aktif. Simpan minimal satu akun agar tidak terkunci."}
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Daftar akun</h2>
          <span className="mono text-xs text-mute">{accounts.length} akun</span>
        </div>
        {accounts.length === 0 ? (
          <p className="mt-4 rounded-tag-lg border border-dashed border-line p-8 text-center text-sm text-mute">
            Belum ada akun. Login saat ini memakai password dari environment.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
