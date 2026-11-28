"use client";

import { Clipboard } from "lucide-react";
import { toast } from "@/components/Toast";

/** Tombol salin teks generik untuk konten statis seperti jawaban FAQ. */
export function CopyTextButton({
  value,
  label = "Salin teks",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast("Teks disalin.", "ok");
    } catch {
      toast("Teks tidak bisa disalin.", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-12 items-center gap-1.5 rounded-tag-sm border border-line px-2.5 text-xs text-[var(--text-3)] transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)] ${className}`}
    >
      <Clipboard aria-hidden className="size-3.5" /> Salin
    </button>
  );
}
