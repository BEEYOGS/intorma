"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  saveOption,
  saveOptionGroup,
  type ActionResult,
} from "@/app/actions";
import type { ServiceOption, ServiceOptionGroup } from "@/lib/db";
import { rupiah } from "@/lib/format";

const input = "input";
const labelClass = "label";

function Result({ state }: { state: ActionResult }) {
  if (!state?.error) return null;
  return <p role="alert" className="text-xs text-danger">{state.error}</p>;
}

export function GroupForm({ serviceId, group }: { serviceId: string; group?: ServiceOptionGroup }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveOptionGroup, null);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="service_id" value={serviceId} />
      {group && <input type="hidden" name="id" value={group.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Kode grup</span>
          <input name="code" defaultValue={group?.code} placeholder="bahan" className={input} required pattern="[a-z0-9][a-z0-9-]{0,30}" />
        </label>
        <label className="block">
          <span className={labelClass}>Nama grup</span>
          <input name="label" defaultValue={group?.label} placeholder="Bahan" className={input} required />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Bantuan (opsional)</span>
        <input name="help" defaultValue={group?.help} placeholder="Pilih bahan yang sesuai kebutuhan." className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Pilihan</span>
          <select name="select_type" defaultValue={group?.select_type ?? "single"} className={input}>
            <option value="single">Satu saja</option>
            <option value="multi">Boleh banyak</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Urutan</span>
          <input name="sort" inputMode="numeric" defaultValue={group?.sort ?? 0} className={input} />
        </label>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" name="required" defaultChecked={group?.required ?? true} /> Wajib
          </label>
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" name="active" defaultChecked={group?.active ?? true} /> Aktif
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary !h-9 text-xs">
          {pending ? "Menyimpan…" : group ? "Simpan grup" : "Tambah grup"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function OptionForm({ groupId, option }: { groupId: number; option?: ServiceOption }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveOption, null);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="group_id" value={groupId} />
      {option && <input type="hidden" name="id" value={option.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Kode opsi</span>
          <input name="code" defaultValue={option?.code} placeholder="korea440" className={input} required pattern="[a-z0-9][a-z0-9-]{0,30}" />
        </label>
        <label className="block">
          <span className={labelClass}>Nama opsi</span>
          <input name="label" defaultValue={option?.label} placeholder="Flexi Korea 440gr" className={input} required />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Deskripsi (opsional)</span>
        <input name="description" defaultValue={option?.description} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Tambah harga (Rp)</span>
          <input name="price_delta" inputMode="numeric" defaultValue={option?.price_delta ?? 0} className={input} />
        </label>
        <label className="block">
          <span className={labelClass}>Dihitung</span>
          <select name="delta_basis" defaultValue={option?.delta_basis ?? "unit"} className={input}>
            <option value="unit">Per item / per m²</option>
            <option value="order">Sekali pesanan</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Urutan</span>
          <input name="sort" inputMode="numeric" defaultValue={option?.sort ?? 0} className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" name="is_default" defaultChecked={option?.is_default ?? false} /> Default
        </label>
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" name="active" defaultChecked={option?.active ?? true} /> Aktif
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary !h-9 text-xs">
          {pending ? "Menyimpan…" : option ? "Simpan opsi" : "Tambah opsi"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function DeleteActionButton({
  action,
  id,
  label,
}: {
  action: (prev: ActionResult, f: FormData) => Promise<ActionResult>;
  id: number;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  return (
    <form action={formAction} onSubmit={(event) => {
      if (!window.confirm(`${label}? Tindakan ini tidak bisa dibatalkan.`)) event.preventDefault();
    }} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="btn btn-danger !h-8 !px-3 text-xs">
        <Trash2 aria-hidden className="size-3.5" /> {pending ? "Menghapus…" : label}
      </button>
      <Result state={state} />
    </form>
  );
}

export function OptionBadge({ amount, basis }: { amount: number; basis: "unit" | "order" }) {
  if (amount === 0) return <span className="mono text-xs text-mute">Termasuk</span>;
  return <span className="mono text-xs text-mute">+{rupiah(amount)}{basis === "order" ? " sekali" : ""}</span>;
}
