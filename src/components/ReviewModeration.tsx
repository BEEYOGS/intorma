"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { approveReview, deleteReview } from "@/app/actions";
import { tanggal } from "@/lib/format";

export type ReviewRow = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string | Date;
  order_code: string | null;
  service: string | null;
};

export function ReviewModeration({ reviews }: { reviews: ReviewRow[] }) {
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<number[]>([]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const out = reviews.filter((review) => {
      const matchText =
        !needle || `${review.name} ${review.comment} ${review.order_code ?? ""} ${review.service ?? ""}`.toLowerCase().includes(needle);
      const matchRating = rating === "all" || review.rating === Number(rating);
      const matchStatus =
        status === "all" || (status === "approved" ? review.approved : !review.approved);
      return matchText && matchRating && matchStatus;
    });
    return out.sort((a, b) => {
      const av = new Date(a.created_at).getTime();
      const bv = new Date(b.created_at).getTime();
      return sort === "oldest" ? av - bv : bv - av;
    });
  }, [reviews, query, rating, status, sort]);

  const pending = rows.filter((r) => !r.approved);
  const approved = rows.filter((r) => r.approved);

  function card(review: ReviewRow) {
    const long = review.comment.length > 180;
    const open = expanded.includes(review.id);
    const text = long && !open ? `${review.comment.slice(0, 180)}…` : review.comment;
    return (
      <li key={review.id} className="rounded-tag-lg border border-line bg-panel/40 p-5">
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
                    style={{
                      color: index < review.rating ? "var(--accent)" : "var(--text-3)",
                      fill: index < review.rating ? "var(--accent)" : "transparent",
                    }}
                  />
                ))}
              </span>
              {review.order_code && (
                <span className="mono rounded-tag-sm border border-line px-2 py-0.5 text-xs text-mute">
                  {review.order_code}
                </span>
              )}
              {review.service && <span className="text-xs text-mute">{review.service}</span>}
            </div>
            <p className="mt-2 text-sm leading-6 text-mute">{text}</p>
            {long && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((current) =>
                    current.includes(review.id) ? current.filter((id) => id !== review.id) : [...current, review.id],
                  )
                }
                aria-expanded={open}
                className="mt-1 inline-flex min-h-10 items-center text-xs font-medium text-accent underline underline-offset-4"
              >
                {open ? "Perpendek" : "Baca selengkapnya"}
              </button>
            )}
            <p className="mt-2 text-xs text-mute">{tanggal(review.created_at)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!review.approved && (
              <form action={approveReview}>
                <input type="hidden" name="id" value={review.id} />
                <button type="submit" className="btn btn-primary min-h-12 px-4 text-sm sm:min-h-10">Setujui</button>
              </form>
            )}
            <form action={deleteReview}>
              <input type="hidden" name="id" value={review.id} />
              <button type="submit" className="btn btn-ghost min-h-12 px-4 text-sm text-danger sm:min-h-10">Hapus</button>
            </form>
          </div>
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[12rem] flex-1">
          <span className="label">Cari ulasan</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama, isi, kode, atau layanan…"
            className="field"
          />
        </label>
        <label className="w-full sm:w-auto">
          <span className="label">Rating</span>
          <select value={rating} onChange={(event) => setRating(event.target.value)} className="field cursor-pointer">
            <option value="all">Semua</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} bintang</option>
            ))}
          </select>
        </label>
        <label className="w-full sm:w-auto">
          <span className="label">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="field cursor-pointer">
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Sudah tampil</option>
          </select>
        </label>
        <label className="w-full sm:w-auto">
          <span className="label">Urutan</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="field cursor-pointer">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </label>
        <span className="text-xs text-mute">{rows.length} dari {reviews.length} ulasan</span>
      </div>

      {(status === "all" || status === "pending") && (
        <section>
          <h2 className="text-sm font-semibold">Menunggu persetujuan ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Tidak ada ulasan baru.</p>
          ) : (
            <ul className="mt-4 space-y-3">{pending.map(card)}</ul>
          )}
        </section>
      )}

      {(status === "all" || status === "approved") && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold">Sudah tampil ({approved.length})</h2>
          {approved.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Belum ada ulasan yang disetujui.</p>
          ) : (
            <ul className="mt-4 space-y-3">{approved.map(card)}</ul>
          )}
        </section>
      )}
    </>
  );
}
