"use client";

import { formatBytes, type UploadProgress } from "@/lib/upload-rules";

export function UploadProgressBar({
  progress,
  label,
}: {
  progress: UploadProgress | null;
  label?: string;
}) {
  if (!progress) return null;
  const percent = Math.max(0, Math.min(100, progress.percent));
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs text-mute">
        <span className="truncate">{label ?? "Mengunggah file"}</span>
        <span className="shrink-0 tabular-nums">
          {percent}% · {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
          {progress.speed > 0 ? ` · ${formatBytes(progress.speed)}/s` : ""}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-[var(--text)] transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
