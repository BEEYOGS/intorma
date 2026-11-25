import type { ReactNode } from "react";

/**
 * Ilustrasi produk monokrom (hitam / abu / putih) — satu gambar unik per layanan.
 * Bukan foto: semua bentuk digambar dengan SVG garis supaya tajam di semua ukuran
 * dan otomatis mengikuti tema terang/gelap lewat `currentColor`.
 */
function artwork(id: string): ReactNode {
  switch (id) {
    case "logo":
      return (
        <>
          <circle cx={48} cy={43} r={21} />
          <path d="M48 27 60 43 48 59 36 43Z" fill="currentColor" fillOpacity={0.09} />
          <circle cx={73} cy={51} r={17} opacity={0.45} />
          <path d="M86 14v13M79.5 20.5h13" opacity={0.55} />
          <path d="M20 72h80" opacity={0.22} strokeDasharray="3 5" />
        </>
      );

    case "poster":
      return (
        <>
          <rect x={23} y={11} width={74} height={64} rx={2} fill="currentColor" fillOpacity={0.04} />
          <path d="M31 63 50 39 63 52 72 43 89 63Z" fill="currentColor" fillOpacity={0.07} />
          <circle cx={77} cy={26} r={6} opacity={0.55} />
          <path d="M31 69h58" opacity={0.35} />
          <path d="M23 19h74" opacity={0.2} />
        </>
      );

    case "feed":
      return (
        <>
          <g opacity={0.42}>
            <rect x={17} y={20} width={26} height={50} rx={3} />
            <circle cx={27} cy={31} r={2.5} />
            <path d="m22 49 6-7 5 5 4-4 4 6" />
            <path d="M23 62h14" opacity={0.6} />
          </g>
          <g>
            <rect x={47} y={12} width={26} height={58} rx={3} fill="currentColor" fillOpacity={0.06} />
            <circle cx={57} cy={24} r={2.5} />
            <path d="m52 43 6-7 5 5 4-4 4 6" />
            <path d="M53 56h14" opacity={0.55} />
          </g>
          <g opacity={0.42}>
            <rect x={77} y={20} width={26} height={50} rx={3} />
            <circle cx={87} cy={31} r={2.5} />
            <path d="m82 49 6-7 5 5 4-4 4 6" />
            <path d="M83 62h14" opacity={0.6} />
          </g>
        </>
      );

    case "kemasan":
      return (
        <>
          <path d="M60 13 94 30v34L60 81 26 64V30Z" fill="currentColor" fillOpacity={0.05} />
          <path d="M26 30 60 47 94 30" />
          <path d="M60 47v34" />
          <path d="M26 47 60 64 94 47" opacity={0.45} />
          <path d="m44 55 16-6 16 6v10l-16 6-16-6Z" fill="currentColor" fillOpacity={0.13} />
          <path d="M52 60h16" opacity={0.5} />
        </>
      );

    case "thumbnail":
      return (
        <>
          <rect x={17} y={20} width={86} height={50} rx={5} fill="currentColor" fillOpacity={0.05} />
          <path d="M17 32h86M17 58h86" opacity={0.18} />
          <path d="M52 33 75 45 52 57Z" fill="currentColor" fillOpacity={0.15} />
          <path d="m28 14 4 5M92 14l-4 5" opacity={0.5} />
          <path d="M48 76h24" opacity={0.35} />
        </>
      );

    case "lain":
      return (
        <>
          <path
            d="M28 18h56a8 8 0 0 1 8 8v29a8 8 0 0 1-8 8H57L41 76V63h-13a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8Z"
            fill="currentColor"
            fillOpacity={0.05}
          />
          <path d="M50 33a10 10 0 1 1 14 9c-4 3-5 5-5 9" />
          <circle cx={59} cy={58} r={1.7} fill="currentColor" stroke="none" />
          <path d="M95 13v11M89.5 18.5h11" opacity={0.5} />
          <path d="M20 74h10" opacity={0.35} />
        </>
      );

    case "spanduk-flexi":
      return (
        <>
          <path
            d="M20 22c14 6 28-6 42 0s28 6 38 0v34c-10 6-24-6-38 0s-28-6-42 0Z"
            fill="currentColor"
            fillOpacity={0.06}
          />
          <path d="M16 13v64M104 13v64" opacity={0.55} />
          <circle cx={27} cy={30} r={1.7} fill="currentColor" stroke="none" />
          <circle cx={93} cy={30} r={1.7} fill="currentColor" stroke="none" />
          <path d="M40 41h40M40 50h28" opacity={0.42} />
          <path d="M40 59h18" opacity={0.25} />
        </>
      );

    case "poster-a3":
      return (
        <>
          <path d="M30 12h46l14 14v52H30Z" fill="currentColor" fillOpacity={0.05} />
          <path d="M76 12v14h14" />
          <rect x={38} y={34} width={34} height={24} rx={2} />
          <path d="m38 51 10-9 7 6 6-5 11 11" />
          <circle cx={65} cy={40} r={2.5} />
          <path d="M38 66h34" opacity={0.35} />
          <path d="M38 72h22" opacity={0.2} />
        </>
      );

    case "kartu-nama":
      return (
        <>
          <rect x={22} y={25} width={60} height={42} rx={3} opacity={0.4} />
          <rect x={38} y={18} width={62} height={44} rx={3} fill="currentColor" fillOpacity={0.07} />
          <circle cx={54} cy={35} r={6} />
          <path d="M66 31h26M66 38h18" opacity={0.55} />
          <path d="M46 51h48" opacity={0.3} />
        </>
      );

    case "stiker-vinyl":
      return (
        <>
          <rect x={23} y={16} width={74} height={58} rx={4} />
          <rect x={29} y={22} width={62} height={46} rx={3} strokeDasharray="4 4" opacity={0.5} />
          <circle cx={60} cy={42} r={14} fill="currentColor" fillOpacity={0.08} />
          <path d="m50 47 7-8 6 5 5-6 6 9" />
          <path d="M83 69c8-2 12-7 12-15" opacity={0.5} />
        </>
      );

    case "x-banner":
      return (
        <>
          <path d="M32 78 88 28M88 78 32 28" opacity={0.5} />
          <rect x={28} y={18} width={64} height={40} rx={2} fill="currentColor" fillOpacity={0.06} />
          <path d="M40 32h40M40 41h30" opacity={0.45} />
          <path d="M40 50h20" opacity={0.28} />
          <circle cx={32} cy={28} r={2} fill="currentColor" stroke="none" />
          <circle cx={88} cy={28} r={2} fill="currentColor" stroke="none" />
        </>
      );

    case "poster-a2":
      return (
        <>
          <path d="M34 13h52v63H34Z" fill="currentColor" fillOpacity={0.05} />
          <path d="M34 20h52" opacity={0.28} />
          <path d="m44 61 14-21 9 11 7-7 10 17" />
          <circle cx={68} cy={32} r={4} opacity={0.5} />
          <rect x={26} y={72} width={68} height={6} rx={3} fill="currentColor" fillOpacity={0.13} />
        </>
      );

    case "kartu-pos":
      return (
        <>
          <rect x={22} y={26} width={76} height={48} rx={2} fill="currentColor" fillOpacity={0.05} />
          <path d="M22 26 60 55 98 26" opacity={0.42} />
          <rect x={76} y={32} width={14} height={12} rx={1} strokeDasharray="2 2" opacity={0.6} />
          <path d="M82 38h3" opacity={0.4} />
          <path d="M32 63h26" opacity={0.35} />
          <path d="M32 69h16" opacity={0.2} />
        </>
      );

    case "stiker-label":
      return (
        <>
          <path d="M52 13h16v9H52Z" />
          <path
            d="M48 22h24l6 10v42a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4V32Z"
            fill="currentColor"
            fillOpacity={0.05}
          />
          <rect x={44} y={42} width={32} height={20} rx={2} fill="currentColor" fillOpacity={0.13} />
          <path d="M50 49h20M50 55h14" opacity={0.5} />
          <circle cx={60} cy={70} r={2} opacity={0.45} />
        </>
      );

    case "foto-produk":
      return (
        <>
          <rect x={21} y={30} width={53} height={36} rx={4} fill="currentColor" fillOpacity={0.05} />
          <path d="m33 30 4-7h21l4 7" />
          <circle cx={47.5} cy={48} r={10} />
          <circle cx={47.5} cy={48} r={4} opacity={0.5} />
          <path d="M66 36h6" opacity={0.5} />
          <path d="M87 21v53M79 74h16" opacity={0.55} />
          <path d="M79 21h16l-8 12Z" fill="currentColor" fillOpacity={0.13} />
        </>
      );

    case "desain-web":
      return (
        <>
          <rect x={18} y={18} width={84} height={54} rx={3} fill="currentColor" fillOpacity={0.05} />
          <path d="M18 30h84" />
          <circle cx={26} cy={24} r={1.6} fill="currentColor" stroke="none" />
          <circle cx={33} cy={24} r={1.6} fill="currentColor" stroke="none" opacity={0.5} />
          <rect x={26} y={38} width={30} height={26} rx={2} opacity={0.55} />
          <path d="M64 40h28M64 48h20M64 56h24" opacity={0.45} />
          <path d="m77 57 3 13 4-4 5 8 3-2-5-8 6-1Z" fill="currentColor" fillOpacity={0.16} />
        </>
      );

    case "copywriting":
      return (
        <>
          <path d="M26 14h50l14 14v50H26Z" fill="currentColor" fillOpacity={0.05} />
          <path d="M76 14v14h14" />
          <path d="M36 38h44M36 47h44M36 56h30" opacity={0.5} />
          <path d="M36 65h20" opacity={0.28} />
          <path d="m70 70 22-22 6 6-22 22-8 2Z" fill="currentColor" fillOpacity={0.13} />
          <path d="m92 48 6 6" />
        </>
      );

    case "kaos-dtf":
      return (
        <>
          <path
            d="M44 16 30 23 20 38l10 7 6-7v34h48V38l6 7 10-7-10-15-14-7-8 6H52Z"
            fill="currentColor"
            fillOpacity={0.05}
          />
          <path d="M52 22c3 5 7 7 8 7s5-2 8-7" opacity={0.5} />
          <rect x={46} y={42} width={28} height={24} rx={2} strokeDasharray="4 4" opacity={0.65} />
          <path d="m54 54 6-6 6 6-6 6Z" fill="currentColor" fillOpacity={0.14} />
          <path d="m30 38-6 7" opacity={0.45} />
          <path d="M90 38l6 7" opacity={0.45} />
        </>
      );

    default:
      return (
        <>
          <rect x={30} y={16} width={54} height={60} rx={3} fill="currentColor" fillOpacity={0.05} />
          <path d="M42 32h30M42 42h30M42 52h20" opacity={0.45} />
          <path d="m78 60 12-12 5 5-12 12-7 2Z" fill="currentColor" fillOpacity={0.12} />
        </>
      );
  }
}

export function ProductIllustration({
  service,
  className = "h-28 w-full",
}: {
  service: { id: string };
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 90"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g vectorEffect="non-scaling-stroke">{artwork(service.id)}</g>
    </svg>
  );
}
