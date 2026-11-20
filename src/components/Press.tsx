"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------------------------------------------------------------------
   Bahasa visual monochrome intorma: registration mark, crop mark, chip nada abu,
   barcode Code39 asli untuk kode pesanan, reveal saat scroll, dan latar berlapis.
   Sudut khas: kiri-atas/kanan-atas/kanan-bawah rounded, kiri-bawah tajam.
   --------------------------------------------------------------------------- */

export function RegMark({ className = "size-4 text-ink" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 1v6M12 17v6M1 12h6M17 12h6" />
    </svg>
  );
}

export function CropCorners({ className = "border-ink/45" }: { className?: string }) {
  const base = `cropmark ${className}`;
  return (
    <>
      <span aria-hidden className={`${base} left-0 top-0 border-l border-t`} />
      <span aria-hidden className={`${base} right-0 top-0 border-r border-t`} />
      <span aria-hidden className={`${base} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden className={`${base} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

export function ToneChips({ className = "size-2.5" }: { className?: string }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-1">
      <span className={`${className} bg-ink`} />
      <span className={`${className} bg-silver`} />
      <span className={`${className} bg-steel`} />
      <span className={`${className} border border-line bg-paper`} />
    </span>
  );
}

/* Code39: 9 elemen per karakter (bar/space bergantian), 3 elemen lebar. */
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
  S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
  $: "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn",
};

export function Barcode({
  value,
  height = 44,
  className = "text-ink",
  label,
}: {
  value: string;
  height?: number;
  className?: string;
  label?: string;
}) {
  const clean = (value.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "-") || "INTORMA").slice(0, 24);
  const chars = `*${clean}*`;
  const unit = 2;
  const wide = 3;
  const quiet = 10 * unit;

  let x = quiet;
  const bars: Array<{ x: number; w: number }> = [];
  for (const ch of chars) {
    const pattern = CODE39[ch] ?? CODE39["-"];
    for (let i = 0; i < 9; i++) {
      const w = (pattern[i] === "w" ? wide : 1) * unit;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    }
    x += unit;
  }
  const width = x - unit + quiet;

  return (
    <svg
      role="img"
      aria-label={label ?? `Barcode ${clean}`}
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ maxHeight: height }}
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function Ticker({ items }: { items: string[] }) {
  const accents = ["text-ink", "text-silver", "text-steel", "text-ink/50"];
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="flex items-center">
          <span className="px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.28em] text-ink/70 sm:px-8">
            {item}
          </span>
          <span aria-hidden className={`text-sm ${accents[i % accents.length]}`}>✳</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee border-y border-line bg-sand/80 py-3.5">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function PressBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div
        className="dotgrid absolute inset-0"
        style={{ maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 75%)" }}
      />
      <div className="glow-drift absolute -left-48 -top-48 size-[44rem] rounded-full bg-ink/[0.07] blur-[120px]" />
      <div className="glow-drift-late absolute -right-56 top-[30%] size-[40rem] rounded-full bg-silver/[0.06] blur-[130px]" />
      <div className="glow-drift absolute -bottom-64 left-[20%] size-[36rem] rounded-full bg-steel/[0.04] blur-[130px]" />
      <div className="grain absolute inset-0 opacity-[0.05]" />
    </div>
  );
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-ink via-silver to-steel transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}