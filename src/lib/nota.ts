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
  id?: number;
  code: string;
  access_token?: string | null;
  customer_id?: number | null;
  name: string;
  status: string;
  paid: boolean | number;
  service: string | null;
  price: number | string | null;
  options: unknown;
  brief: string | null;
  created_at: string | Date;
  deadline?: string | Date | null;
  deadline_at?: string | Date | null;
  qty: number | string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  promo_code?: string | null;
  discount_amount?: number | string | null;
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

  // Order lama belum punya baris promo di snapshot; tampilkan dari kolom order.
  const discount = num(order.discount_amount);
  const shownDiscount = rows.some((row) => /promo/i.test(row.name))
    ? 0
    : discount;
  if (shownDiscount > 0) {
    rows.push({
      name: `Promo ${order.promo_code ?? ""}`.trim(),
      qty: "-",
      amount: `-${rupiah(shownDiscount)}`,
    });
  }

  // Baris kosong mengikuti bentuk nota asli supaya tabel tetap rapi saat dicetak.
  while (rows.length < 6) rows.push({ name: "", qty: "", amount: "" });
  return rows;
}

export function notaTotal(order: NotaOrder): string {
  return order.price == null ? "-" : rupiah(num(order.price));
}
