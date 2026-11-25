"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [last, setLast] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setLast(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-mute">
      <RefreshCw aria-hidden className="size-3" />
      Auto-refresh tiap {Math.round(intervalMs / 1000)} dtk · terakhir {last.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}