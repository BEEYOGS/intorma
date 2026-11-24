import { rupiah } from "./format";
import { formatQty } from "./pricing";

/** Dipakai bersama oleh halaman nota dan endpoint unduh PDF supaya isinya sama. */
export type NotaSnapshot = {
  lines?: { label: string; detail?: string; amount: number | null }[];
  summary?: string;
  qty?: number | null;
  unit?: string;
  mode?: string;
  width_cm?: number | null;
  height_cm?: number | null;
};

export type NotaOrder = {
  code: string;
  name: string;
  status: string;
  paid: boolean | number;
  service: string | null;
  price: number | string | null;
  options: unknown;
  brief: string | null;
  created_at: string | Date;
  qty: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
};

export type NotaRow = { name: string; qty: string; amount: string };

const num = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Ukuran masuk ke nama item, jumlah selalu dalam pcs. */
export function notaRows(order: NotaOrder, snapshot: NotaSnapshot | null): NotaRow[] {
  const width = num(snapshot?.width_cm ?? order.width_cm);
  const height = num(snapshot?.height_cm ?? order.height_cm);
  const meter = (cm: number) => formatQty(Math.round((cm / 100) * 100) / 100);
  const size =
    width > 0 && height > 0
      ? `${meter(Math.min(width, height))}x${meter(Math.max(width, height))} m`
      : "";
  // Mode ukuran menyimpan luas (m²) di qty; jumlah fisiknya satu buah.
  const pieces = snapshot?.mode === "area" ? 1 : num(order.qty ?? snapshot?.qty ?? 1);
  const qty = `${formatQty(pieces || 1)} pcs`;

  const source = snapshot?.lines?.length
    ? snapshot.lines
    : [{ label: order.service ?? "Pesanan", amount: order.price as number | null }];

  const rows = source.map((line, index) => ({
    name: index === 0 && size ? `${line.label} ${size}` : line.label,
    qty,
    amount: line.amount == null ? "-" : rupiah(line.amount),
  }));

  // Baris kosong mengikuti bentuk nota asli supaya tabel tetap rapi saat dicetak.
  while (rows.length < 6) rows.push({ name: "", qty: "", amount: "" });
  return rows;
}

export function notaTotal(order: NotaOrder): string {
  return order.price == null ? "-" : rupiah(num(order.price));
}
