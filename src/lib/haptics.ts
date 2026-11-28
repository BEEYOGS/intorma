/**
 * Haptic ringan untuk perangkat yang mendukung navigator.vibrate.
 * Bisa dimatikan pengguna lewat localStorage `intorma-haptics=0` dan selalu
 * mengikuti prefers-reduced-motion. Tidak ada efek sama sekali di desktop.
 */
export type HapticKind = "tap" | "success" | "warning";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  success: [10, 35, 16],
  warning: [24, 36, 24],
};

function enabled(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  try {
    if (window.localStorage.getItem("intorma-haptics") === "0") return false;
  } catch {
    /* storage bisa diblokir; tetap izinkan getaran. */
  }
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function haptic(kind: HapticKind = "tap") {
  if (!enabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* Beberapa browser menolak vibrate tanpa user gesture; abaikan. */
  }
}
