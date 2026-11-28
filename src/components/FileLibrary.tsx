"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Archive, Camera, Download, Eye, Upload, X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";
import { CameraCapture } from "@/components/CameraCapture";
import { toast } from "@/components/Toast";
import { EmptyState } from "@/components/StateView";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const previewExts = ["jpg", "jpeg", "png", "webp", "gif"];
  const imageExts = [...previewExts, "bmp", "tif", "tiff", "heic", "heif", "svg"];
  const kind = imageExts.includes(ext) || file.mime.startsWith("image/")
    ? "image"
    : ext === "pdf" || file.mime === "application/pdf"
      ? "pdf"
      : ["ai", "psd", "cdr", "eps"].includes(ext)
        ? "design"
        : ext === "zip"
          ? "zip"
          : "other";
  // HEIC/HEIF dan SVG tidak bisa dirender <img> di banyak browser.
  const previewable =
    kind === "pdf" ||
    (kind === "image" && (previewExts.includes(ext) || ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mime)));
  return { ext, kind, previewable };
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
      <span className="mono text-xs font-semibold uppercase text-mute">
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
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  useOverlayRegistration("file-preview", Boolean(preview) && !isMobile, () => setPreview(null));
  const previewRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // MobileSheet sudah mengurus focus trap, Escape, dan fokus kembali di ponsel.
    if (!preview || isMobile) {
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
  }, [isMobile, preview]);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function selectAll() {
    setSelected(files.map((file) => file.id));
    if (files.length > 20) toast("Maksimal 20 file untuk satu ZIP. Pilih sebagian.", "info");
  }

  function movePreview(direction: -1 | 1) {
    if (!preview) return;
    const index = files.findIndex((file) => file.id === preview.id);
    if (index < 0) return;
    const next = files[(index + direction + files.length) % files.length];
    if (next) setPreview(next);
  }

  async function uploadFile(file: File) {
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
      toast("File tersimpan", "ok");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengunggah file.";
      setError(message);
      toast(message, "error");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadFile(file);
  }

  const previewMeta = preview ? fileMeta(preview) : null;

  const previewHead = preview && previewMeta ? (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileThumb file={preview} />
        <div className="min-w-0">
          <h3 id="file-preview-title" className="truncate text-sm font-medium text-[var(--text)]">{preview.name}</h3>
          <p className="mono text-xs uppercase text-mute">
            {previewMeta.ext} · {formatSize(preview.size)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {files.length > 1 && (
          <div className="flex items-center gap-1 rounded-tag-sm border border-line">
            <button
              type="button"
              onClick={() => movePreview(-1)}
              aria-label="File sebelumnya"
              className="grid size-12 place-items-center text-mute transition-colors hover:text-[var(--text)] sm:size-10"
            >
              ←
            </button>
            <span className="mono px-1 text-xs text-mute">
              {files.findIndex((file) => file.id === preview.id) + 1}/{files.length}
            </span>
            <button
              type="button"
              onClick={() => movePreview(1)}
              aria-label="File berikutnya"
              className="grid size-12 place-items-center text-mute transition-colors hover:text-[var(--text)] sm:size-10"
            >
              →
            </button>
          </div>
        )}
        <a
          href={`/api/upload/${preview.code}?download=1`}
          download
          className="btn btn-ghost min-h-12 !h-auto !px-3 text-xs sm:min-h-10"
        >
          <Download aria-hidden className="size-3.5" /> Unduh
        </a>
        <button
          type="button"
          onClick={() => setPreview(null)}
          aria-label="Tutup pratinjau"
          className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-[var(--border)] text-mute transition-colors hover:text-[var(--text)]"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  ) : null;

  const previewBody = preview && previewMeta ? (
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
  ) : null;

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
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => (selected.length === files.length ? setSelected([]) : selectAll())}
                className="inline-flex min-h-12 items-center rounded-tag-sm border border-line px-3 text-xs text-mute transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)] sm:min-h-10"
              >
                {selected.length === files.length ? "Kosongkan pilihan" : "Pilih semua"}
              </button>
            )}
            {selected.length > 0 && (
              <>
                <span className="text-xs text-mute">
                  {selected.length} dipilih ·{" "}
                  {formatSize(files.filter((file) => selected.includes(file.id)).reduce((sum, file) => sum + file.size, 0))}
                </span>
                <a
                  href={`/api/files/zip?ids=${selected.slice(0, 20).join(",")}`}
                  download
                  className="btn btn-primary min-h-12 px-4 text-sm sm:min-h-10"
                >
                  <Archive aria-hidden className="size-4" /> Unduh ZIP ({Math.min(selected.length, 20)})
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              disabled={uploading || !driveReady}
              className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera aria-hidden className="size-4" /> Ambil foto
            </button>
            <label
              className={`btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10 focus-within:ring-2 focus-within:ring-accent/60 ${driveReady ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
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
          <div className="p-4 sm:p-6">
            <EmptyState
              compact
              title="Belum ada file."
              description="Upload di sini atau lewat halaman pesan."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {files.map((file) => {
              const meta = fileMeta(file);
              return (
                <li key={file.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.02]">
                  <label className="grid size-12 shrink-0 place-items-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(file.id)}
                      onChange={() => toggle(file.id)}
                      aria-label={`Pilih ${file.name}`}
                      className="size-5 accent-[var(--text)]"
                    />
                  </label>
                  <button type="button" onClick={() => setPreview(file)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <FileThumb file={file} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[var(--text)]">
                        {file.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-mute">
                        <span className="mono uppercase">{meta.ext}</span> · {formatSize(file.size)} ·{" "}
                        {new Date(file.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}
                        {file.orderCode && ` · ${file.orderCode}`}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {file.orderCode && (
                      <Link
                        href={`/lacak/${encodeURIComponent(file.orderCode)}`}
                        className="inline-flex min-h-12 items-center rounded-tag-sm border border-line px-3 font-mono text-xs text-mute transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)] sm:min-h-10"
                      >
                        {file.orderCode}
                      </Link>
                    )}
                    {meta.previewable && (
                      <button
                        type="button"
                        onClick={() => setPreview(file)}
                        className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
                      >
                        <Eye aria-hidden className="size-3.5" /> Pratinjau
                      </button>
                    )}
                    <a
                      href={`/api/upload/${file.code}?download=1`}
                      download
                      className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
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

      {preview && previewMeta && !isMobile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="file-preview-title"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            ref={previewRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-sharp)] border border-[var(--border-2)] bg-[var(--panel)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] outline-none"
          >
            {previewHead}
            {previewBody}
          </div>
        </div>
      )}

      {preview && previewMeta && isMobile && (
        <MobileSheet
          open
          onClose={() => setPreview(null)}
          titleId="file-preview-title"
          bodyClassName="!px-0 !pt-2"
          header={previewHead}
        >
          {previewBody}
        </MobileSheet>
      )}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => void uploadFile(file)}
        title="Ambil foto file"
        guide="Foto seluruh permukaan dokumen dengan cahaya cukup dan teks terbaca."
      />
    </>
  );
}
