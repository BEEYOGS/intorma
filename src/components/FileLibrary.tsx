"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

export type FileItem = {
  id: number;
  code: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
  orderCode: string | null;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function FileLibrary({ files }: { files: FileItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal mengunggah file.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">File saya</p>
          <p className="mt-0.5 text-xs text-mute">
            Original, tanpa kompresi. Maksimal 4 MB per file.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                window.location.href = `/api/files/zip?ids=${selected.join(",")}`;
              }}
              className="btn btn-primary !h-9 text-xs"
            >
              Download ZIP ({selected.length})
            </button>
          )}
          <label className="btn btn-ghost !h-9 cursor-pointer text-xs">
            {uploading ? "Mengunggah…" : "+ Upload file"}
            <input type="file" onChange={upload} disabled={uploading} className="sr-only" />
          </label>
        </div>
      </div>

      {error && <p role="alert" className="px-4 pt-3 text-xs text-danger">{error}</p>}

      {files.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-mute">Belum ada file. Upload di sini atau lewat halaman pesan.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                checked={selected.includes(file.id)}
                onChange={() => toggle(file.id)}
                aria-label={`Pilih ${file.name}`}
                className="size-4 shrink-0 accent-[var(--text)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--text)]">{file.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-mute">
                  {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("id-ID")}
                  {file.orderCode && ` · ${file.orderCode}`}
                </p>
              </div>
              <a
                href={`/api/upload/${file.code}?download=1`}
                className="btn btn-ghost !h-9 shrink-0 !px-3 text-xs"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
