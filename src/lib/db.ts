import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL belum diisi");
}
export const sql = neon(process.env.DATABASE_URL ?? "");

export type PricingMode = "flat" | "per_unit" | "area";

export type ServiceOption = {
  id: number;
  code: string;
  label: string;
  description: string;
  price_delta: number;
  delta_basis: "unit" | "order";
  is_default: boolean;
  sort: number;
};

export type ServiceOptionGroup = {
  id: number;
  code: string;
  label: string;
  help: string;
  select_type: "single" | "multi";
  required: boolean;
  sort: number;
  options: ServiceOption[];
};

export type Service = {
  id: string;
  name: string;
  blurb: string;
  price_from: number;
  days: number;
  sort: number;
  active: boolean;
  /** Kolom lama, tetap dipakai aplikasi production. */
  pricing_mode: "flat" | "per_unit";
  /** Model harga baru; kalau kosong ikuti pricing_mode. */
  pricing_model: PricingMode;
  unit_label: string;
  min_qty: number;
  max_qty: number;
  category: string;
  min_price: number;
  round_to: number;
  min_area_m2: number;
  requires_file: boolean;
  price_note: string;
  option_groups: ServiceOptionGroup[];
};

const serviceColumns =
  "id, name, blurb, price_from, days, sort, active, pricing_mode, unit_label, min_qty, max_qty, " +
  "category, pricing_model, min_price, round_to, min_area_m2, requires_file, price_note";

function normalizePricingMode(row: Record<string, unknown>): PricingMode {
  const model = String(row.pricing_model ?? "");
  if (model === "area" || model === "per_unit" || model === "flat") return model;
  return row.pricing_mode === "per_unit" ? "per_unit" : "flat";
}

function normalizeService(row: Record<string, unknown>): Service {
  return {
    ...(row as unknown as Service),
    price_from: Number(row.price_from ?? 0),
    days: Number(row.days ?? 3),
    sort: Number(row.sort ?? 0),
    active: Boolean(row.active),
    pricing_mode: row.pricing_mode === "per_unit" ? "per_unit" : "flat",
    pricing_model: normalizePricingMode(row),
    unit_label: String(row.unit_label ?? ""),
    min_qty: Number(row.min_qty ?? 1),
    max_qty: Number(row.max_qty ?? 10000),
    category: String(row.category ?? "design"),
    min_price: Number(row.min_price ?? 0),
    round_to: Number(row.round_to ?? 0),
    min_area_m2: Number(row.min_area_m2 ?? 1),
    requires_file: Boolean(row.requires_file),
    price_note: String(row.price_note ?? ""),
    option_groups: [],
  };
}

function normalizeOption(row: Record<string, unknown>): ServiceOption {
  return {
    id: Number(row.id),
    code: String(row.code),
    label: String(row.label),
    description: String(row.description ?? ""),
    price_delta: Number(row.price_delta ?? 0),
    delta_basis: row.delta_basis === "order" ? "order" : "unit",
    is_default: Boolean(row.is_default),
    sort: Number(row.sort ?? 0),
  };
}

async function loadOptionGroups(serviceIds: string[]): Promise<Map<string, ServiceOptionGroup[]>> {
  const map = new Map<string, ServiceOptionGroup[]>();
  if (!serviceIds.length) return map;

  const groups = (await sql.query(
    `select id, service_id, code, label, help, select_type, required, sort
       from service_option_groups
      where active and service_id = any($1::text[])
      order by sort, id`,
    [serviceIds],
  )) as Array<Record<string, unknown>>;
  if (!groups.length) return map;

  const groupIds = groups.map((g) => Number(g.id));
  const options = (await sql.query(
    `select id, group_id, code, label, description, price_delta, delta_basis, is_default, sort
       from service_options
      where active and group_id = any($1::int[])
      order by sort, id`,
    [groupIds],
  )) as Array<Record<string, unknown>>;

  const optionsByGroup = new Map<number, ServiceOption[]>();
  for (const row of options) {
    const groupId = Number(row.group_id);
    const list = optionsByGroup.get(groupId) ?? [];
    list.push(normalizeOption(row));
    optionsByGroup.set(groupId, list);
  }

  for (const row of groups) {
    const serviceId = String(row.service_id);
    const list = map.get(serviceId) ?? [];
    list.push({
      id: Number(row.id),
      code: String(row.code),
      label: String(row.label),
      help: String(row.help ?? ""),
      select_type: row.select_type === "multi" ? "multi" : "single",
      required: Boolean(row.required),
      sort: Number(row.sort ?? 0),
      options: optionsByGroup.get(Number(row.id)) ?? [],
    });
    map.set(serviceId, list);
  }
  return map;
}

export async function getServices(): Promise<Service[]> {
  const rows = await sql.query(
    `select ${serviceColumns} from services where active order by sort, name`,
  );
  return (rows as Array<Record<string, unknown>>).map(normalizeService);
}

/** Untuk halaman pesan: layanan + seluruh opsi aktifnya. */
export async function getServicesWithOptions(): Promise<Service[]> {
  const services = await getServices();
  const groups = await loadOptionGroups(services.map((s) => s.id));
  return services.map((s) => ({ ...s, option_groups: groups.get(s.id) ?? [] }));
}

export async function getAllServices(): Promise<Service[]> {
  const rows = await sql.query(`select ${serviceColumns} from services order by sort, name`);
  return (rows as Array<Record<string, unknown>>).map(normalizeService);
}

export async function getService(id: string): Promise<Service | null> {
  const rows = (await sql.query(
    `select ${serviceColumns} from services where id = $1`,
    [id],
  )) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeService(rows[0]) : null;
}

/** Dipakai server action: baca ulang layanan + opsi langsung dari database. */
export async function getServiceWithOptions(id: string): Promise<Service | null> {
  const service = await getService(id);
  if (!service) return null;
  const groups = await loadOptionGroups([service.id]);
  return { ...service, option_groups: groups.get(service.id) ?? [] };
}
