"use client";

import { useState } from "react";
import type { Service } from "@/lib/db";
import { DeleteActionButton, GroupForm, OptionBadge, OptionForm } from "@/components/OptionForms";
import { deleteOption, deleteOptionGroup } from "@/app/actions";

export function OptionEditor({ service }: { service: Service }) {
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [openOption, setOpenOption] = useState<number | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);

  return (
    <section className="border-t border-[var(--border)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Opsi &amp; finishing</p>
          <p className="mt-1 text-xs text-mute">
            Grup seperti bahan, ukuran, atau finishing. Harga opsi otomatis masuk ke total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingGroup((v) => !v)}
          aria-expanded={addingGroup}
          className="btn btn-ghost !h-10 text-xs"
        >
          {addingGroup ? "Tutup" : "+ Tambah grup"}
        </button>
      </div>

      {addingGroup && (
        <div className="mt-3 rounded-[var(--radius-sharp)] border border-[var(--border)] bg-[var(--bg-2)] p-4">
          <GroupForm serviceId={service.id} />
        </div>
      )}

      {service.option_groups.length === 0 ? (
        <p className="mt-5 rounded-[var(--radius-sharp)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-mute">
          Belum ada opsi. Pelanggan akan melihat harga dasar layanan ini saja.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {service.option_groups.map((group) => {
            const expanded = openGroup === group.id;
            return (
              <div key={group.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroup(expanded ? null : group.id);
                    setOpenOption(null);
                  }}
                  aria-expanded={expanded}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left text-sm transition-colors hover:bg-white/[0.02]"
                >
                  <span className="font-medium text-[var(--text)]">{group.label}</span>
                  <span className="mono text-xs text-mute">
                    {group.code} · {group.select_type === "multi" ? "banyak" : "satu"} · {group.options.length} opsi
                    {!group.active && " · nonaktif"}
                    <span aria-hidden className="ml-2 inline-block">{expanded ? "−" : "+"}</span>
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-5 border-t border-[var(--border)] p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <GroupForm serviceId={service.id} group={group} />
                      <DeleteActionButton action={deleteOptionGroup} id={group.id} label="Hapus grup" />
                    </div>

                    <div className="space-y-2 border-t border-[var(--border)] pt-4">
                      {group.options.length === 0 && (
                        <p className="text-xs text-mute">Belum ada nilai opsi di grup ini.</p>
                      )}
                      {group.options.map((option) => {
                        const optionOpen = openOption === option.id;
                        return (
                          <div key={option.id} className="rounded-[var(--radius-sharp)] border border-[var(--border)] bg-[var(--bg-2)]">
                            <button
                              type="button"
                              onClick={() => setOpenOption(optionOpen ? null : option.id)}
                              aria-expanded={optionOpen}
                              className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/[0.02]"
                            >
                              <span className="text-[var(--text)]">
                                {option.label}
                                {option.is_default && <span className="ml-2 text-xs text-mute">(default)</span>}
                                {!option.active && <span className="ml-2 text-xs text-danger">(nonaktif)</span>}
                              </span>
                              <span className="flex items-center gap-3">
                                <OptionBadge amount={option.price_delta} basis={option.delta_basis} />
                                <span aria-hidden className="text-mute">{optionOpen ? "−" : "+"}</span>
                              </span>
                            </button>
                            {optionOpen && (
                              <div className="space-y-4 border-t border-[var(--border)] p-3">
                                <OptionForm groupId={group.id} option={option} />
                                <DeleteActionButton action={deleteOption} id={option.id} label="Hapus opsi" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <details className="border-t border-[var(--border)] pt-4">
                      <summary className="cursor-pointer text-xs font-medium text-mute hover:text-[var(--text)]">
                        + Tambah opsi
                      </summary>
                      <div className="mt-3">
                        <OptionForm groupId={group.id} />
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
