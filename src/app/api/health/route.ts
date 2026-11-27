import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    await sql`select 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const ok = dbOk;
  return NextResponse.json(
    {
      ok,
      db: dbOk ? "up" : "down",
      time: new Date().toISOString(),
      latencyMs: Date.now() - started,
    },
    { status: ok ? 200 : 503 },
  );
}
