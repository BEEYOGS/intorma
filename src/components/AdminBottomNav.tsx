"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";
import { adminTabs, primaryAdminTabKeys, type AdminTab, type AdminTabDefinition } from "@/lib/admin-tabs";

const primaryKeys = new Set<string>(primaryAdminTabKeys);
const primaryTabs = adminTabs.filter((tab) => primaryKeys.has(tab.key));
const moreTabs = adminTabs.filter((tab) => !primaryKeys.has(tab.key));
const SHEET_ID = "admin-more-sheet";

function tabClass(active: boolean) {
  return `relative flex min-h-[var(--bottom-bar-height)] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold leading-none transition-colors ${
    active ? "text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]"
  }`;
}

function iconClass(active: boolean) {
  return `grid size-8 shrink-0 place-items-center rounded-[var(--radius-sharp)] transition-colors ${
    active ? "bg-[var(--panel-2)]" : ""
  }`;
}

function ActiveMark() {
  return <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--text)]" />;
}

export function AdminBottomNav({ active }: { active: AdminTab }) {
  const [open, setOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreActive = moreTabs.some((tab) => tab.key === active);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) moreButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sheetRef.current?.contains(target) || moreButtonRef.current?.contains(target)) return;
      close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const renderTab = (tab: AdminTabDefinition) => {
    const on = active === tab.key;
    const Icon = tab.icon;
    return (
      <li key={tab.key} className="min-w-0">
        <Link href={tab.href} aria-current={on ? "page" : undefined} className={tabClass(on)}>
          {on && <ActiveMark />}
          <span aria-hidden className={iconClass(on)}>
            <Icon className="size-[18px]" strokeWidth={on ? 2 : 1.7} />
          </span>
          <span className="max-w-full truncate">{tab.short}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Navigasi admin bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {primaryTabs.map(renderTab)}
          <li className="min-w-0">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={SHEET_ID}
              className={tabClass(open || moreActive)}
            >
              {(open || moreActive) && <ActiveMark />}
              <span aria-hidden className={iconClass(open || moreActive)}>
                <MoreHorizontal className="size-[18px]" strokeWidth={open || moreActive ? 2 : 1.7} />
              </span>
              <span className="max-w-full truncate">Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Tutup menu lainnya"
            onClick={() => close(true)}
            className="absolute inset-0 size-full cursor-default bg-black/60 backdrop-blur-sm"
          />
          <div
            id={SHEET_ID}
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu admin lainnya"
            className="absolute inset-x-0 bottom-0 rounded-t-[var(--radius)] border-t border-[var(--border-2)] bg-[var(--panel)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.9)]"
          >
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-2)]" />
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
              <div>
                <p className="eyebrow">Navigasi admin</p>
                <h2 className="mt-1 text-base font-semibold">Lainnya</h2>
              </div>
              <button
                type="button"
                onClick={() => close(true)}
                aria-label="Tutup menu"
                className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-[var(--border)] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2 px-4">
              {moreTabs.map((tab) => {
                const on = active === tab.key;
                const Icon = tab.icon;
                return (
                  <li key={tab.key}>
                    <Link
                      href={tab.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-h-14 items-center gap-3 rounded-[var(--radius-sharp)] border px-3 py-2 text-sm font-medium transition-colors ${
                        on
                          ? "border-[var(--border-2)] bg-[var(--panel-2)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                      }`}
                    >
                      <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={on ? 2 : 1.7} />
                      <span className="truncate">{tab.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
