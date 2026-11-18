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
};

export async function getServices(): Promise<Service[]> {
  const rows = await sql`select id, name, blurb, price_from, days from services where active order by sort`;
  return rows as Service[];
}
