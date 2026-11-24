"use client";

import { Printer } from "lucide-react";

export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`btn btn-primary min-h-10 px-4 text-sm ${className}`}>
      <Printer aria-hidden className="size-4" /> Cetak nota
    </button>
  );
}
