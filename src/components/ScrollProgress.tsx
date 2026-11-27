"use client";

import { useEffect, useRef } from "react";

/**
 * Garis progres baca setipis hairline di bagian atas halaman.
 * Memakai transform, bukan lebar, supaya tidak memicu layout, dan tidak mengganggu
 * pembaca layar karena murni dekorasi.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]">
      <div
        ref={ref}
        style={{ transform: "scaleX(0)" }}
        className="h-full origin-left bg-[var(--accent)]"
      />
    </div>
  );
}
