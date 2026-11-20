import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? "");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL kosong");
  process.exit(1);
}
const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
console.log(`tables: ${tables.map((t) => t.table_name).join(", ")}`);
const orders = await sql`select id, code, status from orders order by id desc limit 10`;
console.table(orders);
if (tables.some((t) => t.table_name === "orders")) {
  const jobs = await sql`select id, code, name, status, created_at from orders order by id desc limit 5`;
  console.table(jobs);
}
