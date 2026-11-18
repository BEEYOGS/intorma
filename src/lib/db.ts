import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL belum diisi");
}
export const sql = neon(process.env.DATABASE_URL ?? "");

export type Service = {
  id: string;
  name: string;
  blurb: string;
  price_from: number;
  days: number;
  sort: number;
  active: boolean;
};

const serviceColumns = "id, name, blurb, price_from, days, sort, active";

export async function getServices(): Promise<Service[]> {
  const rows = await sql.query(
    `select ${serviceColumns} from services where active order by sort, name`,
  );
  return rows as Service[];
}

export async function getAllServices(): Promise<Service[]> {
  const rows = await sql.query(
    `select ${serviceColumns} from services order by sort, name`,
  );
  return rows as Service[];
}

export async function getService(id: string): Promise<Service | null> {
  const rows = (await sql.query(
    `select ${serviceColumns} from services where id = $1`,
    [id],
  )) as Service[];
  return rows[0] ?? null;
}
