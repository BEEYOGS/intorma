import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL belum diisi");
}
export const sql = neon(process.env.DATABASE_URL ?? "");
