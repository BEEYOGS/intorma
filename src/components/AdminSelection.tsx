"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, Clipboard, ListChecks, X } from "lucide-react";
import { toast } from "@/components/Toast";

type SelectionContextValue = {
  selected: string[];
  toggle: (code: string) => void;
  isSelected: (code: string) => boolean;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function AdminSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const value = useMemo<SelectionContextValue>(
    () => ({
      selected,
      toggle: (code) =>
        setSelected((current) =>
          current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
        ),
      isSelected: (code) => selected.includes(code),
      clear: () => setSelected([]),
    }),
    [selected],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(selected.join("\n"));
      toast(`${selected.length} kode disalin.`, "ok");
    } catch {
      toast("Kode tidak bisa disalin.", "error");
    }
  }

  function fillBulk() {
    window.dispatchEvent(new CustomEvent("intorma:bulk-codes", { detail: selected.join("\n") }));
    document.getElementById("aksi-massal")?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(`${selected.length} kode dimasukkan ke aksi massal.`, "ok");
  }

  return (
    <SelectionContext.Provider value={value}>
      {children}
      {selected.length > 0 && (
        <div
          data-mobile-chrome
          role="region"
          aria-label="Pilihan pesanan"
          className="fixed inset-x-0 bottom-[calc(var(--bottom-bar-safe)+0.5rem)] z-40 mx-3 flex max-w-lg flex-wrap items-center gap-2 rounded-tag-lg border border-line bg-panel/95 p-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:mx-auto"
        >
          <span className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold">
            <ListChecks aria-hidden className="size-4 text-accent" /> {selected.length} dipilih
          </span>
          <button type="button" onClick={fillBulk} className="btn btn-primary min-h-12 px-3 text-xs">
            Isi aksi massal
          </button>
          <button type="button" onClick={copy} className="btn btn-ghost min-h-12 px-3 text-xs">
            <Clipboard aria-hidden className="size-3.5" /> Salin
          </button>
          <button
            type="button"
            onClick={value.clear}
            aria-label="Kosongkan pilihan"
            className="grid size-12 place-items-center rounded-tag-sm text-mute transition-colors hover:text-[var(--text)]"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}
    </SelectionContext.Provider>
  );
}

export function AdminSelectCode({ code }: { code: string }) {
  const context = useContext(SelectionContext);
  if (!context) return null;
  const active = context.isSelected(code);

  return (
    <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-xs text-mute">
      <input
        type="checkbox"
        checked={active}
        onChange={() => context.toggle(code)}
        className="peer sr-only"
        aria-label={`Pilih ${code} untuk aksi massal`}
      />
      <span className="grid size-5 place-items-center rounded-[3px] border border-line transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        {active && <Check aria-hidden className="size-3.5 text-ink" />}
      </span>
      Pilih untuk aksi massal
    </label>
  );
}
