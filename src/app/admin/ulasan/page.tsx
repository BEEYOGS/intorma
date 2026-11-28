import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { tanggal } from "@/lib/format";
import { Star } from "lucide-react";
import { approveReview, deleteReview } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ulasan", robots: { index: false } };

type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string | Date;
  order_code: string | null;
  service: string | null;
};

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
  `) as unknown as Review[];

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <AdminShell active="reviews">
      <div>
        <p className="eyebrow">Ulasan klien</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Moderasi ulasan</h1>
        <p className="mt-2 text-sm text-mute">Ulasan baru menunggu persetujuan sebelum tampil di beranda.</p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Menunggu persetujuan ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-mute">Tidak ada ulasan baru.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((review) => (
              <li key={review.id} className="rounded-tag-lg border border-line bg-panel/40 p-5">
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Sudah tampil ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="mt-3 text-sm text-mute">Belum ada ulasan yang disetujui.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {approved.map((review) => (
              <li key={review.id} className="rounded-tag-lg border border-line bg-panel/40 p-5">
                <ReviewCard review={review} approved />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function ReviewCard({ review, approved = false }: { review: Review; approved?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{review.name}</span>
          <span className="flex items-center gap-0.5" role="img" aria-label={`${review.rating} dari 5`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                aria-hidden
                className="size-3.5"
                style={{ color: index < review.rating ? "var(--accent)" : "var(--text-3)", fill: index < review.rating ? "var(--accent)" : "transparent" }}
              />
            ))}
          </span>
          {review.order_code && (
            <span className="mono rounded-tag-sm border border-line px-2 py-0.5 text-xs text-mute">{review.order_code}</span>
          )}
          {review.service && <span className="text-xs text-mute">{review.service}</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-mute">{review.comment}</p>
        <p className="mt-2 text-xs text-mute">{tanggal(review.created_at)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        {!approved && (
          <form action={approveReview}>
            <input type="hidden" name="id" value={review.id} />
            <button type="submit" className="btn btn-primary min-h-9 px-3 text-xs">Setujui</button>
          </form>
        )}
        <form action={deleteReview}>
          <input type="hidden" name="id" value={review.id} />
          <button type="submit" className="btn btn-ghost min-h-9 px-3 text-xs text-danger">Hapus</button>
        </form>
      </div>
    </div>
  );
}
