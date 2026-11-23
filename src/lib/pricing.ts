import type { PricingMode, Service, ServiceOption } from "./db";
import { rupiah } from "./format";

export type PriceResult = {
  price: number | null;
  qty: number | null;
  unitRate: number | null;
  error?: string;
};

export type QuoteSelection = Record<string, string[] | string | undefined>;

export type QuoteInput = {
  qty?: string | number | null;
  widthCm?: string | number | null;
  heightCm?: string | number | null;
  selected?: QuoteSelection | null;
};

export type QuoteLine = {
  label: string;
  detail?: string;
  amount: number;
};

export type QuoteOption = {
  group: string;
  group_label: string;
  code: string;
  label: string;
  amount: number;
};

export type QuoteSnapshot = {
  version: 1;
  mode: PricingMode;
  summary: string;
  qty: number | null;
  unit: string;
  width_cm: number | null;
  height_cm: number | null;
  area_m2: number | null;
  rate: number;
  base_amount: number;
  lines: QuoteLine[];
  options: QuoteOption[];
  subtotal: number;
  min_adjustment: number;
  rounding_adjustment: number;
  total: number;
};

export type QuoteResult = {
  price: number | null;
  subtotal: number | null;
  qty: number | null;
  unitRate: number | null;
  area: number | null;
  unit: string;
  lines: QuoteLine[];
  options: QuoteOption[];
  snapshot: QuoteSnapshot | null;
  error?: string;
};

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(String(value).replace(/[^\d.,]/g, "").replace(",", "."));
};

const round2 = (value: number) => Math.round(value * 100) / 100;

function normalizeSelection(selected: QuoteSelection | null | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!selected) return out;
  for (const [key, value] of Object.entries(selected)) {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    const clean = Array.from(new Set(list.filter((v): v is string => typeof v === "string" && v.length > 0)));
    if (clean.length) out[key] = clean;
  }
  return out;
}

/**
 * Satu-satunya tempat perhitungan harga. Dipakai form (pratinjau) dan server
 * action (harga final yang disimpan), jadi angka di layar sama dengan tagihan.
 */
export function calculateQuote(service: Service, input: QuoteInput = {}): QuoteResult {
  const mode: PricingMode = service.pricing_model ?? service.pricing_mode ?? "flat";
  const unit = service.unit_label || (mode === "area" ? "m²" : "unit");
  const rate = Number(service.price_from ?? 0);
  const groups = service.option_groups ?? [];
  const selected = normalizeSelection(input.selected);

  let multiplier = 1;
  let qty: number | null = null;
  let area: number | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (mode === "area") {
    width = toNumber(input.widthCm);
    height = toNumber(input.heightCm);
    if (!Number.isFinite(width) || width <= 0)
      return emptyQuote(unit, "Isi lebar dalam cm (contoh: 300).");
    if (!Number.isFinite(height) || height <= 0)
      return emptyQuote(unit, "Isi tinggi dalam cm (contoh: 100).");
    if (width > 2000 || height > 2000)
      return emptyQuote(unit, "Ukuran maksimal 2000 cm (20 meter) per sisi.");
    const minArea = Math.max(0.01, Number(service.min_area_m2 ?? 1));
    area = round2((width * height) / 10_000);
    multiplier = Math.max(minArea, area);
    qty = round2(multiplier);
  } else if (mode === "per_unit") {
    qty = toNumber(input.qty);
    const minQty = Number(service.min_qty ?? 1);
    const maxQty = Number(service.max_qty ?? 10000);
    if (!Number.isFinite(qty) || qty <= 0)
      return emptyQuote(unit, `Isi jumlah dalam ${unit}.`);
    if (qty < minQty) return emptyQuote(unit, `Minimal ${formatQty(minQty)} ${unit}.`);
    if (qty > maxQty) return emptyQuote(unit, `Maksimal ${formatQty(maxQty)} ${unit}.`);
    multiplier = qty;
  }

  if (rate <= 0) {
    return {
      price: null,
      subtotal: null,
      qty,
      unitRate: rate || null,
      area,
      unit,
      lines: [],
      options: [],
      snapshot: null,
    };
  }

  const baseAmount = Math.round(rate * multiplier);
  const lines: QuoteLine[] = [];
  const options: QuoteOption[] = [];

  if (mode === "area") {
    const billable = Number.isFinite(multiplier) ? formatQty(multiplier) : "—";
    lines.push({
      label: service.name,
      detail: `${billable} m² × ${rupiah(rate)}`,
      amount: baseAmount,
    });
  } else if (mode === "per_unit") {
    lines.push({
      label: service.name,
      detail: `${formatQty(multiplier)} ${unit} × ${rupiah(rate)}`,
      amount: baseAmount,
    });
  } else {
    lines.push({ label: service.name, detail: "Harga paket", amount: baseAmount });
  }

  for (const group of groups) {
    const chosen = selected[group.code]?.length
      ? selected[group.code]
      : group.options.filter((option) => option.is_default).map((option) => option.code);

    if (group.select_type === "single" && chosen.length > 1) {
      return emptyQuote(unit, `Pilih satu opsi untuk ${group.label}.`);
    }
    if (group.required && chosen.length === 0) {
      return emptyQuote(unit, `Pilih ${group.label.toLowerCase()} dulu.`);
    }

    for (const code of chosen) {
      const option = group.options.find((item) => item.code === code);
      if (!option) return emptyQuote(unit, `Opsi ${group.label} tidak dikenal.`);
      const basisMultiplier = option.delta_basis === "order" ? 1 : multiplier;
      const amount = Math.round(option.price_delta * basisMultiplier);
      options.push({
        group: group.code,
        group_label: group.label,
        code: option.code,
        label: option.label,
        amount,
      });
      // Opsi "Termasuk" tidak perlu memenuhi rincian dengan baris Rp0.
      if (amount !== 0) {
        lines.push({
          label: option.label,
          detail: optionDeltaDetail(option, mode, unit),
          amount,
        });
      }
    }
  }

  const optionsTotal = options.reduce((sum, option) => sum + option.amount, 0);
  const rawSubtotal = baseAmount + optionsTotal;
  let total = rawSubtotal;

  let minAdjustment = 0;
  const minPrice = Number(service.min_price ?? 0);
  if (minPrice > total) {
    minAdjustment = minPrice - total;
    total = minPrice;
    lines.push({ label: "Minimum order", amount: minAdjustment });
  }

  let roundingAdjustment = 0;
  const roundTo = Number(service.round_to ?? 0);
  if (roundTo > 0) {
    const rounded = Math.ceil((total - 0.000001) / roundTo) * roundTo;
    roundingAdjustment = rounded - total;
    if (roundingAdjustment > 0) {
      lines.push({ label: "Pembulatan", amount: roundingAdjustment });
      total = rounded;
    }
  }

  const measure: string[] = [];
  if (mode === "area" && width != null && height != null) {
    measure.push(`Ukuran: ${formatQty(width)} × ${formatQty(height)} cm (${formatQty(area ?? 0)} m²)`);
  } else if (mode === "per_unit" && qty != null) {
    measure.push(`Jumlah: ${formatQty(qty)} ${unit}`);
  }
  for (const group of groups) {
    const chosen = options.filter((option) => option.group === group.code);
    if (chosen.length) {
      measure.push(`${group.label}: ${chosen.map((option) => option.label).join(", ")}`);
    }
  }

  const snapshot: QuoteSnapshot = {
    version: 1,
    mode,
    summary: measure.join("\n"),
    qty,
    unit,
    width_cm: width,
    height_cm: height,
    area_m2: area,
    rate,
    base_amount: baseAmount,
    lines,
    options,
    subtotal: rawSubtotal,
    min_adjustment: minAdjustment,
    rounding_adjustment: roundingAdjustment,
    total,
  };

  return {
    price: total,
    subtotal: rawSubtotal,
    qty,
    unitRate: rate,
    area,
    unit,
    lines,
    options,
    snapshot,
  };
}

function emptyQuote(unit: string, error: string): QuoteResult {
  return {
    price: null,
    subtotal: null,
    qty: null,
    unitRate: null,
    area: null,
    unit,
    lines: [],
    options: [],
    snapshot: null,
    error,
  };
}

function optionDeltaDetail(option: ServiceOption, mode: PricingMode, unit: string): string {
  if (option.delta_basis === "order" || mode === "flat") {
    return option.price_delta === 0 ? "Termasuk" : `+${rupiah(option.price_delta)} sekali`;
  }
  const suffix = mode === "area" ? "/m²" : `/${unit}`;
  return option.price_delta === 0 ? "Termasuk" : `+${rupiah(option.price_delta)}${suffix}`;
}

/** Harga satuan/opsi untuk label di UI, mis. "+Rp7.000/m²". */
export function optionPriceLabel(service: Service, option: ServiceOption): string {
  const mode = service.pricing_model ?? service.pricing_mode;
  if (option.price_delta === 0) return "Termasuk";
  if (option.delta_basis === "order" || mode === "flat") return `+${rupiah(option.price_delta)}`;
  return `+${rupiah(option.price_delta)}/${mode === "area" ? "m²" : service.unit_label || "unit"}`;
}

/**
 * Kompatibilitas dengan kode lama. Untuk layanan beropsi, opsi default ikut
 * dihitung supaya harga yang tampil tetap masuk akal.
 */
export function calculatePrice(service: Service, rawQty: string | number | null | undefined): PriceResult {
  const quote = calculateQuote(service, { qty: rawQty });
  return {
    price: quote.price,
    qty: quote.qty,
    unitRate: quote.unitRate,
    error: quote.error,
  };
}

export function formatQty(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

/** Teks ringkas untuk kartu layanan, mis. "Rp25.000/m²" atau "Mulai Rp350.000". */
export function priceLabel(service: Service): string {
  const rate = Math.round(Number(service.price_from ?? 0));
  const mode = service.pricing_model ?? service.pricing_mode;
  if (mode === "area") {
    return rate > 0 ? `${rupiah(rate)}/m²` : "Sesuai brief";
  }
  if (mode === "per_unit" && service.unit_label) {
    return rate > 0 ? `${rupiah(rate)}/${service.unit_label}` : "Hubungi kami";
  }
  return rate > 0 ? `Mulai ${rupiah(rate)}` : "Sesuai brief";
}

/** Baris detail yang tampil di halaman lacak dan editor admin (data lama). */
export function priceBreakdown(
  price: number | null,
  qty: number | null,
  unitRate: number | null,
  unitLabel: string,
  format: (n: number) => string = rupiah,
): string | null {
  if (qty == null || unitRate == null || price == null) return null;
  return `${formatQty(qty)} ${unitLabel || "unit"} × ${format(unitRate)}`;
}
