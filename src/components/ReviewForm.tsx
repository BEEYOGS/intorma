"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "@/components/Toast";

export function ReviewForm({
  code,
  name,
  accessToken,
}: {
  code: string;
  name: string;
  accessToken?: string | null;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (comment.trim().length < 10) {
      toast("Ulasan minimal 10 karakter.", "error");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, rating, comment: comment.trim(), accessToken }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast(data.error || "Gagal mengirim ulasan.", "error");
        return;
      }
      setDone(true);
      toast("Terima kasih! Ulasanmu menunggu persetujuan admin.", "ok");
    } catch {
      toast("Gagal mengirim ulasan.", "error");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-tag-sm border border-accent/25 bg-accent/[0.06] p-4 text-sm text-mute">
        Ulasanmu sudah terkirim dan akan tampil setelah disetujui admin.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <span className="label">Rating</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} bintang`}
                onClick={() => setRating(value)}
                className="grid size-12 place-items-center rounded-tag-sm transition-colors hover:bg-white/[0.04]"
              >
                <Star
                  aria-hidden
                  className="size-5"
                  style={{ color: value <= rating ? "var(--accent)" : "var(--text-3)", fill: value <= rating ? "var(--accent)" : "transparent" }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="label">Ulasan</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          minLength={10}
          maxLength={1000}
          required
          placeholder="Ceritakan pengalamanmu: kualitas, kecepatan, dan komunikasi."
          className="field resize-y"
        />
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary min-h-10 px-4 text-sm">
        {pending ? "Mengirim…" : "Kirim ulasan"}
      </button>
    </form>
  );
}
