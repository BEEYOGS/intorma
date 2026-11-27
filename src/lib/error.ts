/**
 * Pesan error untuk UI/API. Detail mentah dari Neon, Google, atau Midtrans
 * hanya boleh tampil di development; di production cukup fallback yang aman.
 */
export function clientErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message) {
    return `${fallback} Detail: ${error.message.slice(0, 200)}`;
  }
  return fallback;
}
