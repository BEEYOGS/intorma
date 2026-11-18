import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL belum diisi");
}
export const sql = neon(process.env.DATABASE_URL ?? "");

export type PricingMode = "flat" | "per_unit";

export type Service = {
  id: string;
  name: string;
  blurb: string;
  price_from: number;
  days: number;
  sort: number;
  active: boolean;
  pricing_mode: PricingMode;
  unit_label: string;
  min_qty: number;
  max_qty: number;
};

const serviceColumns =
  "id, name, blurb, price_from, days, sort, active, pricing_mode, unit_label, min_qty, max_qty";

function normalizeService(row: Record<string, unknown>): Service {
  return {
    ...(row as unknown as Service),
    price_from: Number(row.price_from ?? 0),
    days: Number(row.days ?? 3),
    sort: Number(row.sort ?? 0),
    active: Boolean(row.active),
    pricing_mode: row.pricing_mode === "per_unit" ? "per_unit" : "flat",
    unit_label: String(row.unit_label ?? ""),
    min_qty: Number(row.min_qty ?? 1),
    max_qty: Number(row.max_qty ?? 10000),
  };
}

export async function getServices(): Promise<Service[]> {
  const rows = await sql.query(
    `select ${serviceColumns} from services where active order by sort, name`,
  );
  return (rows as Array<Record<string, unknown>>).map(normalizeService);
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
