export type Service = {
  id: string;
  name: string;
  blurb: string;
  price_from: number;
  days: number;
  sort: number;
  active: boolean;
  pricing_mode: string;
  unit_label: string;
  min_qty: number;
  max_qty: number;
};

export type PriceResult = {
  price: number | null;
  qty: number | null;
  unitRate: number | null;
  error?: string;
};

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(String(value).replace(/[^\d.,]/g, "").replace(",", "."));
};

/**
 * Satu-satunya tempat perhitungan harga. Dipakai form (pratinjau) dan server
 * action (harga final yang disimpan), jadi angka di layar sama dengan tagihan.
 */
export function calculatePrice(service: Service, rawQty: string | number | null | undefined): PriceResult {
  const rate = Number(service.price_from ?? 0);

  if (!service.pricing_mode || service.pricing_mode === "flat") {
    return {
      price: rate > 0 ? Math.round(rate) : null,
      qty: null,
      unitRate: rate > 0 ? Math.round(rate) : null,
    };
  }

  const unit = service.unit_label || "unit";
  const minQty = Number(service.min_qty ?? 1);
  const maxQty = Number(service.max_qty ?? 10000);
  const qty = toNumber(rawQty);

  if (!Number.isFinite(qty) || qty <= 0) {
    return { price: null, qty: null, unitRate: rate, error: `Isi jumlah dalam ${unit}.` };
  }
  if (qty < minQty) {
    return { price: null, qty: null, unitRate: rate, error: `Minimal ${formatQty(minQty)} ${unit}.` };
  }
  if (qty > maxQty) {
    return { price: null, qty: null, unitRate: rate, error: `Maksimal ${formatQty(maxQty)} ${unit}.` };
  }
  if (rate <= 0) {
    return { price: null, qty: null, unitRate: rate, error: "Harga per unit belum diatur admin." };
  }

  return {
    price: Math.round(rate * qty),
    qty,
    unitRate: Math.round(rate),
  };
}

export function formatQty(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

/** Teks ringkas untuk kartu layanan, mis. "Rp25.000/meter" atau "Mulai Rp350.000". */
export function priceLabel(service: Service): string {
  const rate = Math.round(Number(service.price_from ?? 0));
  const rupiah = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
  if (service.pricing_mode === "per_unit" && service.unit_label) {
    return rate > 0 ? `${rupiah(rate)}/${service.unit_label}` : "Hubungi kami";
  }
  return rate > 0 ? `Mulai ${rupiah(rate)}` : "Sesuai brief";
}

/** Baris detail yang tampil di halaman lacak dan editor admin. */
export function priceBreakdown(
  price: number | null,
  qty: number | null,
  unitRate: number | null,
  unitLabel: string,
  rupiah: (n: number) => string,
): string | null {
  if (qty == null || unitRate == null || price == null) return null;
  return `${formatQty(qty)} ${unitLabel || "unit"} × ${rupiah(unitRate)}`;
}
