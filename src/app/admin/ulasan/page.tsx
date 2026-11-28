import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ReviewModeration, type ReviewRow } from "@/components/ReviewModeration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ulasan", robots: { index: false } };


export default async function ReviewsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const reviews = (await sql`
    select r.id, r.name, r.rating, r.comment, r.approved, r.created_at,
      o.code as order_code, coalesce(s.name, o.service_label) as service
    from reviews r
    left join orders o on o.id = r.order_id
    left join services s on s.id = o.service_id
    order by r.approved asc, r.created_at desc
    limit 100
  `) as unknown as ReviewRow[];

  return (
    <AdminShell active="reviews">
      <div>
        <p className="eyebrow">Ulasan klien</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Moderasi ulasan</h1>
        <p className="mt-2 text-sm text-mute">Ulasan baru menunggu persetujuan sebelum tampil di beranda.</p>
      </div>

      <div className="mt-8">
        <ReviewModeration reviews={reviews} />
      </div>
    </AdminShell>
  );
}

