import type { Service } from "@/lib/db";
import { DeleteActionButton, GroupForm, OptionBadge, OptionForm } from "@/components/OptionForms";
import { deleteOption, deleteOptionGroup } from "@/app/actions";

export function OptionEditor({ service }: { service: Service }) {
  return (
    <section className="border-t border-[var(--border)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Opsi &amp; finishing</p>
          <p className="mt-1 text-xs text-mute">
            Grup seperti bahan, ukuran, atau finishing. Harga opsi otomatis masuk ke total.
          </p>
        </div>
        <details className="w-full sm:w-auto">
          <summary className="btn btn-ghost !h-9 cursor-pointer text-xs">+ Tambah grup</summary>
          <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] p-4">
            <GroupForm serviceId={service.id} />
          </div>
        </details>
      </div>

      {service.option_groups.length === 0 ? (
        <p className="mt-5 rounded-[var(--radius)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-mute">
          Belum ada opsi. Pelanggan akan melihat harga dasar layanan ini saja.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {service.option_groups.map((group) => (
            <details key={group.id} className="card overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="font-medium text-[var(--text)]">{group.label}</span>
                <span className="mono text-xs text-mute">
                  {group.code} · {group.select_type === "multi" ? "banyak" : "satu"} · {group.options.length} opsi
                  {!group.active && " · nonaktif"}
                </span>
              </summary>
              <div className="space-y-5 border-t border-[var(--border)] p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <GroupForm serviceId={service.id} group={group} />
                  <DeleteActionButton action={deleteOptionGroup} id={group.id} label="Hapus grup" />
                </div>

                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  {group.options.length === 0 && (
                    <p className="text-xs text-mute">Belum ada nilai opsi di grup ini.</p>
                  )}
                  {group.options.map((option) => (
                    <details key={option.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)]">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                        <span className="text-[var(--text)]">
                          {option.label}
                          {option.is_default && <span className="ml-2 text-[10px] text-mute">(default)</span>}
                          {!option.active && <span className="ml-2 text-[10px] text-danger">(nonaktif)</span>}
                        </span>
                        <OptionBadge amount={option.price_delta} basis={option.delta_basis} />
                      </summary>
                      <div className="space-y-4 border-t border-[var(--border)] p-3">
                        <OptionForm groupId={group.id} option={option} />
                        <DeleteActionButton action={deleteOption} id={option.id} label="Hapus opsi" />
                      </div>
                    </details>
                  ))}
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
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
