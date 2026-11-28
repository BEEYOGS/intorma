"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Archive, Download, Eye, Upload, X } from "lucide-react";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";
import { uploadFileToStorage, type UploadProgress } from "@/lib/upload-client";
import { ACCEPT_ATTR } from "@/lib/upload-rules";

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

function fileMeta(file: FileItem) {
  const ext = (file.name.split(".").pop() ?? "file").toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "webp", "gif"];
  const designExts = ["ai", "psd", "cdr", "eps"];
  const kind = imageExts.includes(ext) || file.mime.startsWith("image/")
    ? "image"
    : ext === "pdf" || file.mime === "application/pdf"
      ? "pdf"
      : designExts.includes(ext)
        ? "design"
        : ext === "zip"
          ? "zip"
          : "other";
  return { ext, kind, previewable: kind === "image" || kind === "pdf" };
}

function FileThumb({ file }: { file: FileItem }) {
  const { ext, kind } = fileMeta(file);
  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/upload/${file.code}`}
        alt={file.name}
        className="size-10 shrink-0 rounded-[var(--radius-sharp)] border border-line bg-sand object-cover"
      />
    );
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-line bg-sand">
      <span className="mono text-[10px] font-semibold uppercase text-mute">
        {ext.slice(0, 4)}
      </span>
    </span>
  );
}

export function FileLibrary({
  files,
  driveReady = false,
  uploadToken = "",
  customerName = "",
}: {
  files: FileItem[];
  driveReady?: boolean;
  uploadToken?: string;
  customerName?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  useOverlayRegistration("file-preview", Boolean(preview), () => setPreview(null));
  const previewRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!preview) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = previewRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => {
      const focusables = panel?.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      (focusables?.[0] ?? panel)?.focus();
    }, 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

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
    setProgress(null);
    try {
      await uploadFileToStorage(file, {
        customerName,
        uploadToken,
        onProgress: setProgress,
      });
      setProgress(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file.");
      setProgress(null);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const previewMeta = preview ? fileMeta(preview) : null;

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">File saya</p>
            <p className="mt-0.5 text-xs text-mute">
              Original, tanpa kompresi. Klik file untuk pratinjau.{" "}
              {driveReady
                ? "Semua file tersimpan di Google Drive, bukan di database."
                : "Google Drive belum aktif. Hubungi admin sebelum mengunggah."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <a
                href={`/api/files/zip?ids=${selected.join(",")}`}
                download
                className="btn btn-primary min-h-11 sm:min-h-0 !h-9 text-xs"
              >
                <Archive aria-hidden className="size-4" /> Unduh ZIP ({selected.length})
              </a>
            )}
            <label
              className={`btn btn-ghost min-h-11 sm:min-h-0 !h-9 text-xs ${driveReady ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
            >
              <Upload aria-hidden className="size-4" />
              {uploading ? "Mengunggah…" : driveReady ? "Upload file" : "Drive nonaktif"}
              <input
                type="file"
                onChange={upload}
                disabled={uploading || !driveReady}
                accept={ACCEPT_ATTR}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {error && <p role="alert" className="px-4 pt-3 text-xs text-danger">{error}</p>}
        {progress && (
          <div className="px-4 pb-3">
            <UploadProgressBar
              progress={progress}
              label={
                progress.percent >= 100 ? "Menyimpan file…" : "Mengunggah ke Google Drive"
              }
            />
          </div>
        )}

        {files.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-mute">Belum ada file. Upload di sini atau lewat halaman pesan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {files.map((file) => {
              const meta = fileMeta(file);
              return (
                <li key={file.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.02]">
                  <input
                    type="checkbox"
                    checked={selected.includes(file.id)}
                    onChange={() => toggle(file.id)}
                    aria-label={`Pilih ${file.name}`}
                    className="size-4 shrink-0 accent-[var(--text)]"
                  />
                  <button type="button" onClick={() => setPreview(file)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <FileThumb file={file} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[var(--text)]">
                        {file.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-mute">
                        <span className="mono uppercase">{meta.ext}</span> · {formatSize(file.size)} ·{" "}
                        {new Date(file.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}
                        {file.orderCode && ` · ${file.orderCode}`}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {meta.previewable && (
                      <button
                        type="button"
                        onClick={() => setPreview(file)}
                        className="btn btn-ghost min-h-11 sm:min-h-0 !h-9 !px-3 text-xs"
                      >
                        <Eye aria-hidden className="size-3.5" /> Pratinjau
                      </button>
                    )}
                    <a
                      href={`/api/upload/${file.code}?download=1`}
                      download
                      className="btn btn-ghost min-h-11 sm:min-h-0 !h-9 !px-3 text-xs"
                    >
                      <Download aria-hidden className="size-3.5" /> Unduh
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {preview && previewMeta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${preview.name}`}
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            ref={previewRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-sharp)] border border-[var(--border-2)] bg-[var(--panel)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] outline-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileThumb file={preview} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{preview.name}</p>
                  <p className="mono text-[11px] uppercase text-mute">
                    {previewMeta.ext} · {formatSize(preview.size)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/api/upload/${preview.code}?download=1`}
                  download
                  className="btn btn-ghost min-h-11 sm:min-h-0 !h-9 !px-3 text-xs"
                >
                  <Download aria-hidden className="size-3.5" /> Unduh
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Tutup pratinjau"
                  className="grid size-9 place-items-center rounded-[var(--radius-sharp)] border border-[var(--border)] text-mute transition-colors hover:text-[var(--text)]"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--bg)] p-4">
              {previewMeta.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/upload/${preview.code}`}
                  alt={preview.name}
                  className="max-h-[70dvh] max-w-full object-contain"
                />
              ) : previewMeta.kind === "pdf" ? (
                <iframe
                  src={`/api/upload/${preview.code}`}
                  title={preview.name}
                  className="h-[70dvh] w-full rounded-[var(--radius-sharp)] border border-[var(--border)]"
                />
              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium text-[var(--text)]">Pratinjau tidak tersedia</p>
                  <p className="mt-1 text-xs text-mute">
                    Format {previewMeta.ext.toUpperCase()} tidak bisa ditampilkan di browser. Silakan download.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
