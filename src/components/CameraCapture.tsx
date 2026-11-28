"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera as CameraIcon,
  Check,
  Images,
  RotateCcw,
  X,
} from "lucide-react";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";
import { haptic } from "@/lib/haptics";

type Stage = "guide" | "camera" | "preview" | "denied" | "error";

const LOOK_TIMEOUT_MS = 9000;
const MAX_EDGE = 1600;

/**
 * Pengambilan foto untuk self-service. Tidak pernah membuka kamera otomatis:
 * pengguna melihat panduan + contoh dulu, lalu memilih kamera atau galeri.
 * Viewfinder memakai seluruh layar (100dvh) dengan kontrol di atas safe-area,
 * z-index di atas toast, focus trap, dan back button Android.
 */
export function CameraCapture({
  open,
  onClose,
  onCapture,
  title = "Ambil foto",
  guide = "Pastikan seluruh objek masuk kotak dan teksnya masih terbaca.",
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  title?: string;
  guide?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const lastStageRef = useRef<Stage>("guide");

  const [stage, setStage] = useState<Stage>("guide");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [busy, setBusy] = useState(false);
  const [canFlip, setCanFlip] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    capturedFileRef.current = null;
    setPreviewUrl("");
  }, []);

  const close = useCallback(() => {
    haptic("tap");
    stopStream();
    releasePreview();
    onClose();
  }, [onClose, releasePreview, stopStream]);

  useOverlayRegistration("camera-capture", open, close);

  useEffect(() => {
    if (!open) {
      stopStream();
      releasePreview();
      setStage("guide");
      setError("");
      setBusy(false);
      return;
    }
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (first ?? panel)?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusables.length) return;
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
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      stopStream();
      releasePreview();
      restoreFocusRef.current?.focus();
    };
  }, [close, open, releasePreview, stopStream]);

  // Kamera harus mati saat aplikasi ke background / halaman ditinggalkan.
  // Hanya bereaksi saat hidden, supaya kembali ke tab tidak mematikan stream
  // yang sengaja dibuka pengguna setelah ia mengetuk tombol kamera.
  useEffect(() => {
    const release = () => {
      if (document.visibilityState !== "hidden") return;
      stopStream();
      setStage((current) => (current === "camera" ? "guide" : current));
    };
    document.addEventListener("visibilitychange", release);
    window.addEventListener("pagehide", release);
    return () => {
      document.removeEventListener("visibilitychange", release);
      window.removeEventListener("pagehide", release);
    };
  }, [stopStream]);

  // Fokus mengikuti aksi utama tiap tahap. Ini penting untuk keyboard dan
  // screen reader: tombol yang memicu tahap baru tidak boleh kehilangan fokus.
  useEffect(() => {
    if (!open) {
      lastStageRef.current = "guide";
      return;
    }
    if (lastStageRef.current === stage) return;
    lastStageRef.current = stage;
    const frame = requestAnimationFrame(() => {
      footerRef.current?.querySelector<HTMLElement>("[data-primary-action]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, stage]);

  const startCamera = useCallback(
    async (direction: "environment" | "user" = facing) => {
      setError("");
      setBusy(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Kamera tidak tersedia di browser ini. Buka lewat HTTPS atau pakai galeri.");
          setStage("error");
          return;
        }
        if (navigator.permissions?.query) {
          const status = await navigator.permissions
            .query({ name: "camera" as PermissionName })
            .catch(() => null);
          if (status?.state === "denied") {
            setStage("denied");
            return;
          }
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new DOMException("Kamera terlalu lama merespons", "TimeoutError")),
            LOOK_TIMEOUT_MS,
          );
        });
        let stream: MediaStream;
        let accepted = false;
        const request = navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: direction },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        // Kalau pengguna mengabaikan prompt sampai timeout, stream yang
        // akhirnya dibuka tetap dimatikan—tidak boleh menyala diam-diam.
        void request
          .then((late) => {
            if (!accepted) late.getTracks().forEach((track) => track.stop());
          })
          .catch(() => undefined);
        try {
          stream = await Promise.race([request, timeout]);
          accepted = true;
        } finally {
          if (timer) clearTimeout(timer);
        }

        stopStream();
        streamRef.current = stream;
        // Izin bisa dicabut dari pengaturan browser/system selagi kamera aktif.
        // Jangan biarkan viewfinder menampilkan frame terakhir yang sudah mati.
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (streamRef.current !== stream) return;
            streamRef.current = null;
            stopStream();
            setError("Kamera berhenti karena izin dicabut atau perangkat tidak tersedia. Pakai galeri, ya.");
            setStage("denied");
          });
        });
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCanFlip((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput").length > 1);
        setFacing(direction);
        setStage("camera");
      } catch (caught) {
        const name = caught instanceof DOMException ? caught.name : "";
        if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
          setStage("denied");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError("Kamera tidak ditemukan di perangkat ini. Pakai galeri, ya.");
          setStage("error");
        } else if (name === "NotReadableError" || name === "AbortError") {
          setError("Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.");
          setStage("error");
        } else if (name === "TimeoutError") {
          setError("Kamera tidak merespons. Coba lagi atau pilih foto dari galeri.");
          setStage("error");
        } else {
          setError("Kamera gagal dibuka. Coba lagi atau pilih foto dari galeri.");
          setStage("error");
        }
      } finally {
        setBusy(false);
      }
    },
    [facing, stopStream],
  );

  function flipCamera() {
    haptic("tap");
    stopStream();
    void startCamera(facing === "environment" ? "user" : "environment");
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("Gambar belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }
    haptic("tap");
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Perangkat tidak bisa memproses gambar. Pakai galeri, ya.");
      return;
    }
    // Menggambar ulang lewat canvas membuang EXIF (termasuk lokasi GPS).
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Gagal membuat foto. Coba lagi.");
          return;
        }
        stopStream();
        releasePreview();
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        capturedFileRef.current = file;
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setStage("preview");
      },
      "image/jpeg",
      0.82,
    );
  }

  async function usePhoto() {
    const file = capturedFileRef.current;
    if (!file) {
      setError("Foto tidak bisa dibaca. Ambil ulang, ya.");
      return;
    }
    haptic("tap");
    await onCapture(file);
    close();
  }

  function retake() {
    haptic("tap");
    releasePreview();
    void startCamera();
  }

  function onGallery(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    haptic("tap");
    void onCapture(file);
    close();
  }

  if (!open) return null;

  const shell = "mx-auto w-full max-w-lg px-5";
  const action =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sharp)] border border-white/25 px-4 text-sm font-medium transition-colors hover:border-white/60 disabled:opacity-50";
  const primary = `${action} border-accent bg-accent font-semibold hover:border-accent-strong hover:bg-accent-strong`;
  // Setelah penolakan/kegagalan kamera, jangan memaksa izin lagi. Galeri
  // menjadi jalur utama yang bisa langsung dipakai pengguna.
  const galleryFirst =
    stage === "denied" ||
    (stage === "error" && /tidak ditemukan|tidak tersedia|terlalu lama|tidak merespons/.test(error));
  const announcement = busy
    ? "Membuka kamera. Izin bisa diminta oleh perangkat."
    : stage === "camera"
      ? "Kamera siap. Tekan tombol ambil foto."
      : stage === "preview"
        ? "Foto siap. Periksa, lalu gunakan atau ambil ulang."
        : stage === "denied"
          ? "Izin kamera tidak diberikan. Pilih foto dari galeri."
          : stage === "error"
            ? error
            : "";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
      aria-describedby="camera-guide"
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white outline-none"
    >
      <header className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <div className={`flex h-14 min-w-0 flex-1 items-center gap-2 ${shell}`}>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup pengambilan foto"
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-white/25 text-white transition-colors hover:border-white/60"
          >
            {stage === "camera" || stage === "preview" ? (
              <ArrowLeft aria-hidden className="size-5" />
            ) : (
              <X aria-hidden className="size-5" />
            )}
          </button>
          <h2 id="camera-title" className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </h2>
          {(stage === "camera" || stage === "preview") && canFlip && stage === "camera" ? (
            <button
              type="button"
              onClick={flipCamera}
              aria-label="Ganti kamera depan/belakang"
              className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-white/25 text-white transition-colors hover:border-white/60"
            >
              <RotateCcw aria-hidden className="size-5" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {stage === "camera" ? (
          <>
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className="absolute inset-0 size-full bg-black object-cover"
              aria-label="Pratinjau kamera"
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-5">
              <div className="relative aspect-[4/3] w-[min(86vw,25rem)]">
                <div className="absolute inset-0 border border-white/25" />
                <span className="absolute -top-px -left-px h-8 w-8 border-t-2 border-l-2 border-accent-strong" />
                <span className="absolute -top-px -right-px h-8 w-8 border-t-2 border-r-2 border-accent-strong" />
                <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-accent-strong" />
                <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-accent-strong" />
                <span className="absolute left-1/2 top-1/3 h-px w-full -translate-x-1/2 bg-white/10" />
                <span className="absolute left-1/2 top-2/3 h-px w-full -translate-x-1/2 bg-white/10" />
                <span className="absolute top-1/2 left-1/3 h-full w-px -translate-y-1/2 bg-white/10" />
                <span className="absolute top-1/2 left-2/3 h-full w-px -translate-y-1/2 bg-white/10" />
              </div>
            </div>
            <p className="pointer-events-none absolute inset-x-0 top-5 px-5 text-center text-xs text-white/85">
              {guide}
            </p>
          </>
        ) : stage === "preview" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Foto yang diambil" className="absolute inset-0 size-full object-contain" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-5">
              <div className="aspect-[4/3] w-[min(86vw,25rem)] border border-white/25" />
            </div>
          </>
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain pb-8">
            <div className={shell}>
              <GuideCard guide={guide} />
              {stage === "denied" ? (
                <div className="mt-4 rounded-[var(--radius-sharp)] border border-white/25 bg-white/5 p-4 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle aria-hidden className="size-4 shrink-0 text-accent-strong" />
                    Kamera tidak diaktifkan
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/70">
                    Kamu tidak memberi izin kamera, jadi fitur kamera tidak dipakai. Foto dari galeri
                    tetap bisa dikirim tanpa izin kamera. Kalau nanti ingin memakai kamera, izinkan
                    lewat Setelan → Aplikasi → in.torma → Izin → Kamera.
                  </p>
                </div>
              ) : null}
              {stage === "error" && error ? (
                <p role="alert" className="mt-4 rounded-[var(--radius-sharp)] border border-white/25 bg-white/5 p-4 text-sm text-white/85">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div
        ref={footerRef}
        className="relative z-10 shrink-0 border-t border-white/10 bg-black/90 px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]"
      >
        <div className={shell}>
          {stage === "camera" ? (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={close}
                className="min-h-12 rounded-[var(--radius-sharp)] px-3 text-sm text-white/75 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={capture}
                data-primary-action
                aria-label="Ambil foto"
                className="grid size-[72px] shrink-0 place-items-center rounded-full border-[3px] border-white bg-white/10 transition-transform active:scale-95"
              >
                <span className="size-[54px] rounded-full bg-white" />
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex min-h-12 items-center gap-2 px-3 text-sm text-white/75 hover:text-white"
              >
                <Images aria-hidden className="size-4" /> Galeri
              </button>
            </div>
          ) : stage === "preview" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={retake} className={action}>
                <RotateCcw aria-hidden className="size-4" /> Ambil ulang
              </button>
              <button type="button" onClick={() => void usePhoto()} data-primary-action className={primary}>
                <Check aria-hidden className="size-4" /> Gunakan foto
              </button>
              <button type="button" onClick={close} className={action}>
                Batal
              </button>
            </div>
          ) : galleryFirst ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                data-primary-action
                className={primary}
              >
                <Images aria-hidden className="size-4" /> Pilih dari galeri
              </button>
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={busy}
                className={action}
              >
                <CameraIcon aria-hidden className="size-4" />
                {busy ? "Membuka kamera…" : stage === "denied" ? "Coba kamera lagi" : "Coba lagi"}
              </button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={busy}
                data-primary-action
                className={primary}
              >
                <CameraIcon aria-hidden className="size-4" />
                {busy ? "Membuka kamera…" : "Ambil foto"}
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className={action}>
                <Images aria-hidden className="size-4" /> Pilih dari galeri
              </button>
            </div>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onGallery}
      />
    </div>
  );
}

function GuideCard({ guide }: { guide: string }) {
  const rules: Array<{ icon: ReactNode; text: string }> = [
    { icon: <Check aria-hidden className="size-4 shrink-0 text-accent-strong" />, text: "Seluruh objek masuk di dalam kotak bidik." },
    { icon: <Check aria-hidden className="size-4 shrink-0 text-accent-strong" />, text: "Cahaya cukup, jangan ada silau atau bayangan." },
    { icon: <Check aria-hidden className="size-4 shrink-0 text-accent-strong" />, text: "Tahan HP sebentar sampai gambar tidak buram." },
  ];
  return (
    <section id="camera-guide" className="pt-5 text-white">
      <p className="text-xs uppercase tracking-[0.18em] text-accent-strong">Panduan</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">{guide}</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ExampleCard
          good
          caption="Contoh baik"
          note="Rata, penuh, teks terbaca"
        />
        <ExampleCard
          caption="Hindari"
          note="Terpotong, miring, silau"
        />
      </div>
      <ul className="mt-5 space-y-2.5 text-sm text-white/80">
        {rules.map((rule) => (
          <li key={rule.text} className="flex items-start gap-2">
            {rule.icon}
            <span>{rule.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-white/55">
        Izin kamera diminta hanya setelah kamu mengetuk “Ambil foto”. Menolak izin tidak memblokir
        pesanan—galeri tetap bisa dipakai.
      </p>
      <p className="mt-2 text-xs leading-5 text-white/55">
        Foto diubah ke JPG dan metadata lokasi dibuang sebelum dikirim. Tidak ada popup atau kamera
        otomatis.
      </p>
    </section>
  );
}

function ExampleCard({ good = false, caption, note }: { good?: boolean; caption: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-sharp)] border border-white/20 bg-white/5 p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sharp)] bg-white/[0.06]">
        <div
          className={`absolute left-[18%] top-[16%] h-[68%] w-[64%] border border-white/40 bg-white/10 ${
            good ? "rotate-0" : "rotate-[-9deg] scale-110"
          }`}
        >
          <span className="absolute left-[10%] top-[14%] h-1 w-[50%] bg-white/45" />
          <span className="absolute left-[10%] top-[32%] h-1 w-[70%] bg-white/30" />
          <span className="absolute left-[10%] top-[50%] h-1 w-[58%] bg-white/30" />
          <span className="absolute left-[10%] top-[68%] h-1 w-[44%] bg-white/30" />
        </div>
        {!good ? <span className="absolute inset-y-0 left-[8%] w-[22%] bg-white/[0.14]" /> : null}
        <span
          className={`absolute bottom-2 right-2 grid size-6 place-items-center rounded-full border ${
            good ? "border-accent-strong text-accent-strong" : "border-danger text-danger"
          }`}
        >
          {good ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
        </span>
      </div>
      <p className="mt-2 text-xs font-medium">{caption}</p>
      <p className="text-[11px] text-white/60">{note}</p>
    </div>
  );
}
