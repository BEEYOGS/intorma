import {
  BarChart3,
  ClipboardList,
  History,
  Layers3,
  Settings2,
  ShieldCheck,
  Star,
  Tag,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AdminTabDefinition = {
  href: string;
  label: string;
  short: string;
  key: string;
  icon: LucideIcon;
};

export const adminTabs = [
  { href: "/admin", label: "Pesanan", short: "Pesanan", key: "orders", icon: ClipboardList },
  { href: "/admin/analitik", label: "Analitik", short: "Analitik", key: "analytics", icon: BarChart3 },
  { href: "/admin/pelanggan", label: "Pelanggan", short: "Pelanggan", key: "customers", icon: UsersRound },
  { href: "/admin/layanan", label: "Layanan & harga", short: "Layanan", key: "services", icon: Layers3 },
  { href: "/admin/audit", label: "Log aktivitas", short: "Audit", key: "audit", icon: History },
  { href: "/admin/ulasan", label: "Ulasan", short: "Ulasan", key: "reviews", icon: Star },
  { href: "/admin/promo", label: "Promo", short: "Promo", key: "promo", icon: Tag },
  { href: "/admin/akun", label: "Akun admin", short: "Akun", key: "accounts", icon: ShieldCheck },
  { href: "/admin/pengaturan", label: "Pengaturan", short: "Setelan", key: "settings", icon: Settings2 },
] as const satisfies readonly AdminTabDefinition[];

export type AdminTab = (typeof adminTabs)[number]["key"];

/** Maksimal lima destination di bar sesuai pedoman navigasi bawah platform. */
export const primaryAdminTabKeys = ["orders", "analytics", "customers", "services"] as const;
