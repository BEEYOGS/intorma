import { sql } from "@/lib/db";

export type ProductStats = {
  services: number;
  orders: number;
  menunggu: number;
  dikerjakan: number;
  selesi: number;
};

export type LatestJob = {
  id: number;
  code: string;
  name: string;
  status: string;
  created_at: Date | string;
};

export async function getProductStats(): Promise<ProductStats> {
  const rows = await sql`
    select
      (select count(*)::int from services) as services,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from orders where status = 'menunggu') as menunggu,
      (select count(*)::int from orders where status = 'dikerjakan') as dikerjakan,
      (select count(*)::int from orders where status = 'selesai') as selesi`;
  const r = (rows[0] ?? {}) as Record<string, number>;
  return {
    services: Number(r.services ?? 0),
    orders: Number(r.orders ?? 0),
    menunggu: Number(r.menunggu ?? 0),
    dikerjakan: Number(r.dikerjakan ?? 0),
    selesi: Number(r.selesi ?? 0),
  };
}

export async function getLatestJobs(): Promise<LatestJob[]> {
  const rows = await sql`
    select id, code, name, status, created_at
    from orders
    order by id desc
    limit 6`;
  return (rows as Array<LatestJob>) ?? [];
}
