/* eslint-disable @next/next/no-img-element */
import type { PaymentSettings } from "@/lib/settings";

type BankLogoAsset = {
  keys: string[];
  src: string;
  alt: string;
};

const BANK_LOGOS: BankLogoAsset[] = [
  {
    keys: ["bca", "bankcentralasia"],
    src: "/logos/bca.svg",
    alt: "Logo Bank Central Asia (BCA)",
  },
  {
    keys: ["bni", "banknegaraindononesia"],
    src: "/logos/bni.svg",
    alt: "Logo Bank Negara Indonesia (BNI)",
  },
  {
    keys: ["bri", "bankrakyatindonesia"],
    src: "/logos/bri.svg",
    alt: "Logo Bank Rakyat Indonesia (BRI)",
  },
  {
    keys: ["permata", "permatabank", "bankpermataindononesia"],
    src: "/logos/permata.svg",
    alt: "Logo PermataBank",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Cari aset logo bank berdasarkan nama bank atau id metode pembayaran. */
export function findBankLogo(bank: string): BankLogoAsset | null {
  const key = normalize(bank);
  return BANK_LOGOS.find((logo) => logo.keys.some((candidate) => key.includes(candidate))) ?? null;
}

export function hasBankLogo(bank: string) {
  return Boolean(findBankLogo(bank));
}

/** Logo bank asli, disimpan lokal di public/logos. */
export function BankLogo({
  bank,
  className = "h-6 w-auto",
}: {
  bank: string | PaymentSettings["bankName"];
  className?: string;
}) {
  const logo = findBankLogo(bank);
  if (!logo) return null;
  return <img src={logo.src} alt={logo.alt} className={className} />;
}
