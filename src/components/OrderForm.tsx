"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createOrder, type OrderState } from "@/app/actions";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { DateField } from "@/components/DateField";
import type { Service, ServiceOptionGroup } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { calculateQuote, formatQty, optionPriceLabel, priceLabel } from "@/lib/pricing";
import { minDeadlineDate as minDeadlineDateWIB } from "@/lib/deadline";
import { searchServices } from "@/lib/catalog-search";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { BriefAssistant } from "@/components/BriefAssistant";
import { TimeField } from "@/components/TimeField";
import { ServiceIcon } from "@/components/ServiceIcon";
import { ArrowRight, Check } from "lucide-react";
import { uploadFileToStorage, type UploadProgress } from "@/lib/upload-client";
import { ACCEPT_ATTR } from "@/lib/upload-rules";
import type { UploadedFile } from "@/lib/drive";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

type PaymentInfo = {
  enabled: boolean;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  note: string;
};

type Selection = Record<string, string[]>;

type OrderDraft = {
  serviceId: string;
  qty: string;
  width: string;
  height: string;
  selection: Selection;
  at: number;
};

const DRAFT_KEY = "intorma-order-draft";

function defaultSelection(service: Service | undefined): Selection {
  const out: Selection = {};
  for (const group of service?.option_groups ?? []) {
    const defaults = group.options.filter((option) => option.is_default).map((option) => option.code);
    if (defaults.length) out[group.code] = defaults;
  }
  return out;
}

function parseSelection(raw: string | undefined, service: Service | undefined): Selection {
  if (!raw) return defaultSelection(service);
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Selection = {};
    for (const group of service?.option_groups ?? []) {
      const value = parsed[group.code];
      const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      const allowed = new Set(group.options.map((option) => option.code));
      const clean = list.filter((code): code is string => typeof code === "string" && allowed.has(code));
      if (clean.length) out[group.code] = clean;
    }
    return Object.keys(out).length ? out : defaultSelection(service);
  } catch {
    return defaultSelection(service);
  }
}

export function OrderForm({
  services,
  preselect,
  payment,
  customer,
  driveReady = false,
  uploadToken = "",
  initialPromo = "",
}: {
  services: Service[];
  preselect?: string;
  payment: PaymentInfo;
  customer?: { name: string; wa: string };
  driveReady?: boolean;
  uploadToken?: string;
  initialPromo?: string;
}) {
  const [state, action, pending] = useActionState<OrderState, FormData>(createOrder, null);
  const formRef = useRef<HTMLFormElement>(null);
  const filesFieldRef = useRef<HTMLInputElement>(null);
  const bypassRef = useRef(false);
  const v = state?.values ?? {};
  const initial = services.find((service) => service.id === (v.service ?? preselect)) ?? services[0];
  const [selectedId, setSelectedId] = useState(initial?.id ?? "");
  const [qty, setQty] = useState(v.qty || String(initial?.min_qty ?? 1));
  const [width, setWidth] = useState(v.width || "");
  const [height, setHeight] = useState(v.height || "");
  const [selection, setSelection] = useState<Selection>(() => parseSelection(v.selection, initial));
  const [fileLink, setFileLink] = useState(v.file || "");
  const [uploadedName, setUploadedName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refUploading, setRefUploading] = useState(false);
  const [refProgress, setRefProgress] = useState(0);
  const [refError, setRefError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "design" | "print" | "other">("all");
  const [brief, setBrief] = useState(v.brief || "");
  const [promoCode, setPromoCode] = useState(initialPromo);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoPending, setPromoPending] = useState(false);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // Reset promo bila spesifikasi berubah.
  useEffect(() => {
    if (promoCode) {
      setPromoCode("");
      setPromoDiscount(0);
      setPromoMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, qty, width, height, selection]);

  // Pulihkan draf spesifikasi yang tersimpan (tanpa data pribadi).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderDraft;
        const fresh = !parsed?.at || Date.now() - parsed.at <= 24 * 60 * 60 * 1000;
        if (fresh && parsed?.serviceId && services.some((service) => service.id === parsed.serviceId)) {
          setDraft(parsed);
        } else if (!fresh) {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      // Abaikan penyimpanan yang rusak.
    }
    setDraftHydrated(true);
  }, [services]);

  // Simpan draf otomatis setelah pengguna mulai mengubah spesifikasi.
  useEffect(() => {
    if (!interacted || !selectedId) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            serviceId: selectedId,
            qty,
            width,
            height,
            selection,
            at: Date.now(),
          } satisfies OrderDraft),
        );
      } catch {
        // Private mode / quota penuh; abaikan.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [interacted, selectedId, qty, width, height, selection]);

  const [submitted, setSubmitted] = useState(false);
  // Idempotency submit: double klik/retry jaringan tidak membuat dua pesanan.
  const [requestId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "",
  );

  // Bersihkan draf setelah pesanan berhasil dibuat; pertahankan bila ada error.
  useEffect(() => {
    if (!submitted) return;
    if (state?.error) {
      setSubmitted(false);
      return;
    }
    if (!pending) {
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Abaikan.
      }
      setDraft(null);
      setSubmitted(false);
    }
  }, [submitted, state, pending]);

  // Kedaluwarsa draf lama.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderDraft;
        if (parsed?.at && Date.now() - parsed.at > 24 * 60 * 60 * 1000) {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      // Abaikan.
    }
  }, []);

  function restoreDraft() {
    if (!draft) return;
    const next = services.find((service) => service.id === draft.serviceId);
    if (!next) {
      ignoreDraft();
      return;
    }
    setSelectedId(draft.serviceId);
    setQty(draft.qty || String(next.min_qty ?? 1));
    setWidth(draft.width);
    setHeight(draft.height);
    setSelection(draft.selection ?? defaultSelection(next));
    setInteracted(true);
    setDraft(null);
  }

  function ignoreDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Abaikan.
    }
    setDraft(null);
  }

  const chosen = services.find((service) => service.id === selectedId);
  const isArea = chosen?.pricing_model === "area";
  const isPerUnit = chosen?.pricing_model === "per_unit";
  // Sama persis dengan aturan di server: hari kalender WIB, bukan 24 jam berjalan.
  const minDeadlineISO = chosen ? minDeadlineDateWIB(chosen.days ?? 3) : undefined;
  const unit = chosen?.unit_label || (isArea ? "m²" : "unit");
  const quote = chosen
    ? calculateQuote(chosen, { qty, widthCm: width, heightCm: height, selected: selection })
    : null;
  const total = quote?.price ?? null;
  const finalTotal = total != null ? Math.max(0, total - promoDiscount) : null;
  const hasPriceError = Boolean(quote?.error);
  const activeStep = !chosen ? 0 : hasPriceError || total == null ? 1 : 2;
  const relatedServices = chosen
    ? services
        .filter((service) => service.id !== chosen.id)
        .sort(
          (a, b) =>
            Number(a.category === chosen.category) - Number(b.category === chosen.category) ||
            a.sort - b.sort,
        )
        .slice(0, 3)
    : [];
  const briefMin = chosen?.category === "print" ? 10 : 15;

  const normalizedQuery = query.trim().toLowerCase();
  const visible = searchServices(services, query).filter((service) => {
    const matchFilter = filter === "all" || service.category === filter;
    return matchFilter;
  });
  const serviceGroups = [
    { key: "design", label: "Desain & branding", items: visible.filter((service) => service.category === "design") },
    { key: "print", label: "Cetak & produksi", items: visible.filter((service) => service.category === "print") },
    { key: "other", label: "Lainnya", items: visible.filter((service) => service.category === "other") },
  ];

  function pick(id: string) {
    const next = services.find((service) => service.id === id);
    setSelectedId(id);
    setQty(String(next?.min_qty ?? 1));
    setWidth("");
    setHeight("");
    setSelection(defaultSelection(next));
    setInteracted(true);
  }

  function stepQty(delta: number) {
    const current = Number(qty) || 0;
    const min = chosen?.min_qty ?? 1;
    const max = chosen?.max_qty ?? 10000;
    const next = Math.min(max, Math.max(min, current + delta));
    setQty(String(next));
    setInteracted(true);
  }

  function toggleOption(group: ServiceOptionGroup, code: string) {
    setInteracted(true);
    setSelection((previous) => {
      const current = previous[group.code] ?? [];
      if (group.select_type === "single") {
        return { ...previous, [group.code]: [code] };
      }
      const next = current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code];
      return { ...previous, [group.code]: next };
    });
  }

  async function uploadFile(fileOrEvent: File | ChangeEvent<HTMLInputElement>) {
    const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    if (!file) return;
    const formName = formRef.current
      ? String(new FormData(formRef.current).get("name") ?? "").trim()
      : "";
    setUploading(true);
    setUploadError("");
    setUploadProgress(null);
    setDragging(false);
    try {
      const data = await uploadFileToStorage(file, {
        customerName: formName || customer?.name || "",
        uploadToken,
        onProgress: setUploadProgress,
      });
      setFileLink(data.url);
      setUploadedName(data.name || file.name);
      setUploadProgress(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah file.");
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (!(fileOrEvent instanceof File) && fileOrEvent.target) fileOrEvent.target.value = "";
    }
  }

  function addReferenceFiles(list: FileList | null) {
    if (!list?.length) return;
    setRefError("");
    setRefFiles((previous) => [...previous, ...Array.from(list)].slice(0, 12));
  }

  function removeReferenceFile(index: number) {
    setRefFiles((previous) => previous.filter((_, i) => i !== index));
  }

  /** Unggah langsung ke Google Drive memakai token singkat dari /api/upload/token. */
  async function uploadReferenceOne(file: File, token: string, folder: string): Promise<UploadedFile> {
    const init = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-upload-content-type": file.type || "application/octet-stream",
          "x-upload-content-length": String(file.size),
        },
        body: JSON.stringify({ name: file.name, parents: [folder] }),
      },
    );
    if (!init.ok) throw new Error(`Gagal memulai unggahan (HTTP ${init.status}).`);
    const sessionUrl = init.headers.get("location");
    if (!sessionUrl) throw new Error("Sesi unggahan tidak dibuat.");

    if (file.size === 0) {
      const response = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-range": "bytes */0" },
      });
      if (!response.ok) throw new Error(`Unggahan gagal (HTTP ${response.status}).`);
      const data = (await response.json().catch(() => null)) as { id?: string } | null;
      if (!data?.id) throw new Error("Unggahan selesai tanpa id file.");
      return { id: data.id, name: file.name, size: 0, mime: file.type };
    }

    const chunkSize = Math.max(4 * 1024 * 1024, Math.ceil(file.size / 30));
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const response = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-range": `bytes ${offset}-${end - 1}/${file.size}` },
        body: file.slice(offset, end),
      });
      if (response.status === 308) {
        offset = end;
        continue;
      }
      if (response.ok) {
        const data = (await response.json().catch(() => null)) as { id?: string } | null;
        if (!data?.id) throw new Error("Unggahan selesai tanpa id file.");
        return { id: data.id, name: file.name, size: file.size, mime: file.type };
      }
      throw new Error(`Unggahan gagal (HTTP ${response.status}).`);
    }
    throw new Error("Unggahan tidak selesai.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassRef.current) {
      bypassRef.current = false;
      setSubmitted(true);
      return;
    }
    if (!refFiles.length) {
      setSubmitted(true);
      return;
    }

    event.preventDefault();
    setRefUploading(true);
    setRefError("");
    setRefProgress(0);
    const totalBytes = refFiles.reduce((sum, file) => sum + file.size, 0);
    try {
      const response = await fetch("/api/upload/token", { cache: "no-store" });
      if (!response.ok) throw new Error("Upload belum tersedia. Pakai kolom link referensi, atau coba lagi nanti.");
      const { token, folder } = (await response.json()) as { token: string; folder: string };
      if (!token || !folder) throw new Error("Sesi upload tidak valid. Coba lagi.");

      let done = 0;
      const uploaded: UploadedFile[] = [];
      for (const file of refFiles) {
        uploaded.push(await uploadReferenceOne(file, token, folder));
        done += file.size;
        setRefProgress(totalBytes ? Math.round((done / totalBytes) * 100) : 100);
      }
      if (filesFieldRef.current) {
        filesFieldRef.current.value = uploaded
          .map((file) => [file.id, file.name.replace(/[|;]/g, "_"), file.size, file.mime].join("|"))
          .join(";");
      }
      bypassRef.current = true;
      formRef.current?.requestSubmit();
      setRefUploading(false);
    } catch (error) {
      setRefError(error instanceof Error ? error.message : "Gagal mengunggah file referensi.");
      setRefUploading(false);
    }
  }

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code || total == null) return;
    setPromoPending(true);
    setPromoMessage("");
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount: total }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        discount?: number;
      };
      if (!response.ok) {
        setPromoDiscount(0);
        setPromoMessage(data.error || "Kode promo tidak valid.");
        return;
      }
      setPromoCode(data.code || code);
      setPromoDiscount(data.discount || 0);
      setPromoMessage(`Diskon ${rupiah(data.discount || 0)} diterapkan.`);
    } catch {
      setPromoDiscount(0);
      setPromoMessage("Gagal memvalidasi kode promo.");
    } finally {
      setPromoPending(false);
    }
  }

  function serviceCard(service: Service) {
    const on = selectedId === service.id;
    const tone =
      service.category === "print"
        ? "border-dashed border-line bg-white/[0.015] text-[var(--text-2)] hover:bg-white/[0.035]"
        : service.category === "other"
          ? "border-line bg-transparent text-[var(--text-3)] hover:bg-white/[0.025]"
          : "border-line bg-white/[0.045] text-[var(--text-2)] hover:bg-white/[0.07]";
    return (
      <label key={service.id} className="block cursor-pointer">
        <input
          type="radio"
          name="layanan-pilihan"
          value={service.id}
          checked={on}
          onChange={() => pick(service.id)}
          className="peer sr-only"
        />
        <span
          className={`relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-tag-sm border px-2.5 py-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
            on
              ? "border-[var(--border-2)] bg-white/[0.09] text-[var(--text)]"
              : tone
          }`}
        >
          {on && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-[var(--text)]" />}
          <span
            aria-hidden
            className={`grid size-8 shrink-0 place-items-center rounded-[4px] border transition-colors ${
              on
                ? "border-[var(--border-2)] bg-white/[0.08] text-[var(--text)]"
                : service.category === "print"
                  ? "border-dashed border-line text-[var(--text-2)]"
                  : "border-line text-[var(--text-3)]"
            }`}
          >
            <ServiceIcon service={service} className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{service.name}</span>
          <span className="mono shrink-0 text-xs text-[var(--text-3)]">{priceLabel(service)}</span>
          <span
            aria-hidden
            className={`grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
              on ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]" : "border-line text-transparent"
            }`}
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        </span>
      </label>
    );
  }

  const draftService = draft ? services.find((service) => service.id === draft.serviceId) : null;

  return (
    <>
      {draftHydrated && draft && draftService && !interacted && (
        <div role="status" aria-live="polite" className="mb-6 flex flex-col gap-3 rounded-tag-sm border border-accent/30 bg-accent/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Lanjutkan spesifikasi terakhir?</p>
            <p className="mt-1 text-xs text-mute">
              {draftService.name} · {draft.qty || "1"} {draftService.unit_label || "unit"}
              {draft.width && draft.height ? ` · ${draft.width}×${draft.height} cm` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={restoreDraft} className="btn btn-primary min-h-10 px-4 text-sm">
              Pulihkan
            </button>
            <button type="button" onClick={ignoreDraft} className="btn btn-ghost min-h-10 px-4 text-sm">
              Abaikan
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-14">
        <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-10">
          <input ref={filesFieldRef} type="hidden" name="files" defaultValue="" />
          <input type="hidden" name="service" value={selectedId} />
          <input type="hidden" name="qty" value={isPerUnit ? qty : ""} />
          <input type="hidden" name="width" value={isArea ? width : ""} />
          <input type="hidden" name="height" value={isArea ? height : ""} />
          <input type="hidden" name="selection" value={JSON.stringify(selection)} />
          <input type="hidden" name="promo" value={promoCode} />
          <input type="hidden" name="requestId" value={requestId} />

          <ol className="flex flex-wrap items-center gap-2 border-b border-line pb-5 text-[12px]">
            {[
              ["01", "Pilih layanan"],
              ["02", "Atur spesifikasi"],
              ["03", "Buat & bayar"],
            ].map(([n, label], index) => {
              const done = index < activeStep;
              const current = index === activeStep;
              return (
                <li key={n} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-tag-sm border px-3 py-1.5 font-semibold transition-colors ${
                      current
                        ? "border-accent/50 bg-accent/10 text-ink"
                        : done
                          ? "border-accent/30 bg-accent/[0.06] text-ink"
                          : "border-line bg-white/[0.03] text-mute opacity-60"
                    }`}
                    aria-current={current ? "step" : undefined}
                  >
                    {done ? (
                      <Check aria-hidden className="size-3.5 text-accent" />
                    ) : (
                      <span className={`font-mono text-xs ${current ? "text-accent" : "text-mute"}`}>{n}</span>
                    )}
                    <span className="hidden xs:inline">{label}</span>
                    <span className="xs:hidden">{label.split(" ")[0]}</span>
                  </span>
                  {index < 2 && <span aria-hidden className="text-mute/35">/</span>}
                </li>
              );
            })}
          </ol>

          <div className="flex items-start gap-3 rounded-tag-sm border border-accent/20 bg-accent/[0.05] px-4 py-3.5">
            <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
              i
            </span>
            <p className="text-sm leading-6 text-ink/75">
              <span className="font-semibold text-ink">Harga dihitung otomatis.</span> Pilih bahan, ukuran,
              finishing, dan jumlah—totalnya langsung terlihat sebelum kamu membuat pesanan.
            </p>
          </div>

          {state?.error && (
            <div role="alert" className="flex gap-3 rounded-tag-sm border border-danger/35 bg-danger/[0.08] px-4 py-3.5 text-sm text-danger">
              <span aria-hidden className="mt-0.5 font-bold">!</span>
              <p>{state.error}</p>
            </div>
          )}

          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Pilih layanan</legend>
            <p className="mb-4 text-sm text-mute">
              Desain punya paket, cetak punya bahan dan finishing. Semua harga sudah tampil di sini.
            </p>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block flex-1">
                <span className="sr-only">Cari layanan</span>
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mute">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.2-3.2" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari layanan, misalnya spanduk atau kartu nama…"
                  className="field !pl-10"
                />
              </label>
              <div className="flex shrink-0 gap-1.5" role="group" aria-label="Filter kategori">
                {([
                  ["all", "Semua"],
                  ["design", "Desain"],
                  ["print", "Cetak"],
                  ["other", "Lainnya"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={`min-h-10 rounded-[var(--radius-sharp)] border px-3 text-xs font-medium transition-colors ${
                      filter === value
                        ? value === "print"
                          ? "border-dashed border-[var(--border-2)] bg-white/[0.06] text-[var(--text)]"
                          : value === "other"
                            ? "border-[var(--border-2)] bg-transparent text-[var(--text)]"
                            : "border-[var(--border-2)] bg-white/[0.09] text-[var(--text)]"
                        : "border-line bg-transparent text-[var(--text-3)] hover:text-[var(--text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-4 text-xs text-mute">
              Menampilkan {visible.length} dari {services.length} layanan
            </p>

            <div className="space-y-5">
              {visible.length === 0 && (
                <p className="rounded-[var(--radius-sharp)] border border-dashed border-line p-6 text-center text-sm text-mute">
                  Tidak ada layanan yang cocok. Coba kata kunci lain atau pilih “Semua”.
                </p>
              )}
              {serviceGroups.map((group) =>
                group.items.length === 0 ? null : (
                  <div key={group.key}>
                    <p className="mb-2 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-3)]">
                      <span
                        aria-hidden
                        className={`size-2 shrink-0 ${
                          group.key === "print"
                            ? "border border-dashed border-[var(--text-2)]"
                            : group.key === "other"
                              ? "rounded-full border border-[var(--text-3)]"
                              : "bg-[var(--text-2)]"
                        }`}
                      />
                      {group.label}
                      <span aria-hidden className="h-px flex-1 bg-line" />
                      <span className="mono font-normal tracking-normal">{group.items.length}</span>
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">{group.items.map(serviceCard)}</div>
                  </div>
                )
              )}
              {chosen && (
                <p className="flex items-center gap-2 rounded-tag-sm border border-line bg-white/[0.02] px-3 py-2 text-xs text-[var(--text-3)]">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--text-2)]" />
                  <span className="min-w-0">{chosen.blurb}</span>
                  <span className="mono ml-auto shrink-0">± {chosen.days} hari</span>
                </p>
              )}
            </div>
          </fieldset>

          {chosen && (
            <fieldset>
              <legend className="mb-1 text-xl font-semibold tracking-tight">Atur spesifikasi</legend>
              <p className="mb-5 text-sm text-mute">
                {isArea
                  ? "Masukkan ukuran jadi dalam cm. Harga dihitung per m², minimal 1 m²."
                  : isPerUnit
                    ? `Isi jumlah ${unit}. Harga otomatis menyesuaikan.`
                    : "Pilih paket dan tambahan yang kamu butuhkan."}
              </p>

              <div className="card space-y-6 p-5">
                {isArea && (
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="label">Lebar (cm)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="10"
                          max="2000"
                          step="any"
                          value={width}
                          onChange={(event) => { setWidth(event.target.value); setInteracted(true); }}
                          placeholder="300"
                          className="field min-h-12 text-lg font-semibold tabular-nums"
                        />
                      </label>
                      <label className="block">
                        <span className="label">Tinggi (cm)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="10"
                          max="2000"
                          step="any"
                          value={height}
                          onChange={(event) => { setHeight(event.target.value); setInteracted(true); }}
                          placeholder="100"
                          className="field min-h-12 text-lg font-semibold tabular-nums"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-mute">Cepat:</span>
                      {[
                        ["1 × 1 m", 100, 100],
                        ["2 × 1 m", 200, 100],
                        ["3 × 1 m", 300, 100],
                        ["4 × 2 m", 400, 200],
                      ].map(([label, w, h]) => (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={() => {
                            setWidth(String(w));
                            setHeight(String(h));
setInteracted(true);
                          }}
                          className="rounded-tag-sm border border-line px-2.5 py-1 text-xs font-semibold text-ink/65 transition-colors hover:border-accent/40 hover:text-accent"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-mute">
                      {quote?.area != null
                        ? `Luas ${formatQty(quote.area)} m² · ditagihkan minimal ${formatQty(chosen.min_area_m2)} m².`
                        : `Minimal ${formatQty(chosen.min_area_m2)} m².`}
                    </p>
                  </div>
                )}

                {isPerUnit && (
                  <label className="block">
                    <span className="label">Jumlah ({unit})</span>
                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => stepQty(-1)}
                        aria-label={`Kurangi ${unit}`}
                        className="grid size-12 shrink-0 place-items-center rounded-tag-sm border border-line text-lg text-ink/70 transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={chosen.min_qty}
                        max={chosen.max_qty}
                        value={qty}
                        onChange={(event) => { setQty(event.target.value); setInteracted(true); }}
                        className="field min-h-12 flex-1 text-center text-lg font-semibold tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => stepQty(1)}
                        aria-label={`Tambah ${unit}`}
                        className="grid size-12 shrink-0 place-items-center rounded-tag-sm border border-line text-lg text-ink/70 transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        +
                      </button>
                    </div>
                    <span className="mt-2 block text-xs text-mute">
                      Minimal {formatQty(chosen.min_qty)} {unit} · maksimal {formatQty(chosen.max_qty)} {unit}
                    </span>
                  </label>
                )}

                {chosen.option_groups.map((group) => (
                  <div key={group.code} className="border-t border-line pt-5 first:border-0 first:pt-0">
                    <p className="font-semibold">{group.label}</p>
                    {group.help && <p className="mt-0.5 text-xs leading-5 text-mute">{group.help}</p>}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {group.options.map((option) => {
                        const active = (selection[group.code] ?? []).includes(option.code);
                        const single = group.select_type === "single";
                        return (
                          <label key={option.code} className="cursor-pointer">
                            <input
                              type={single ? "radio" : "checkbox"}
                              checked={active}
                              onChange={() => toggleOption(group, option.code)}
                              className="peer sr-only"
                            />
                            <span
                              className={`flex h-full items-start justify-between gap-3 rounded-tag-sm border p-3.5 text-[13px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                                active
                                  ? "border-accent/55 bg-accent/[0.08]"
                                  : "border-line bg-white/[0.02] hover:border-accent/30"
                              }`}
                            >
                              <span className="flex items-start gap-2.5">
                                <span
                                  aria-hidden
                                  className={`mt-0.5 grid size-4 shrink-0 place-items-center border text-xs font-bold ${
                                    single ? "rounded-full" : "rounded-[3px]"
                                  } ${active ? "border-accent bg-accent text-white" : "border-line text-transparent"}`}
                                >
                                  ✓
                                </span>
                                <span>
                                  <span className="block font-medium leading-5">{option.label}</span>
                                  {option.description && (
                                    <span className="mt-0.5 block text-xs leading-5 text-mute">{option.description}</span>
                                  )}
                                </span>
                              </span>
                              <span className={`shrink-0 text-xs font-semibold ${active ? "text-accent" : "text-mute"}`}>
                                {optionPriceLabel(chosen, option)}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="border-t border-line pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-mute">
                        {isArea
                          ? "Harga per m² + opsi"
                          : isPerUnit
                            ? `Harga per ${unit} + opsi`
                            : "Harga paket + opsi"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink/70">{priceLabel(chosen)}</p>
                    </div>
                    <div className="text-right">
                      <p className="eyebrow">Total</p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-accent">
                        {finalTotal != null ? rupiah(finalTotal) : "—"}
                      </p>
                      {chosen.price_note && (
                        <p className="mt-1 max-w-xs text-xs leading-4 text-mute">{chosen.price_note}</p>
                      )}
                    </div>
                  </div>
                  {quote?.error && <p role="alert" className="mt-3 text-sm text-danger">{quote.error}</p>}
                </div>
              </div>
            </fieldset>
          )}

          <div className="card p-5 lg:hidden">
            <p className="eyebrow">Ringkasan</p>
            <p className="mt-2 font-semibold">{chosen?.name ?? "Pilih layanan"}</p>
            {quote?.lines.map((line, index) => (
              <p key={index} className="mt-1 flex justify-between gap-3 text-sm text-mute">
                <span>{line.label}</span>
                <span className="tabular-nums">{rupiah(line.amount)}</span>
              </p>
            ))}
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-accent">
              {total != null ? rupiah(total) : "Belum dihitung"}
            </p>
          </div>

          {chosen && activeStep < 2 && (
            <div className="rounded-tag-sm border border-line bg-white/[0.03] px-4 py-3 text-sm text-mute">
              Lengkapi spesifikasi dulu agar bisa lanjut ke data dan pembayaran.
            </div>
          )}

          {activeStep === 2 && (
            <>
          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Data kamu</legend>
            <p className="mb-5 text-sm text-mute">Dipakai untuk mengirim kode pesanan dan kabar progres lewat WhatsApp.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="label">Nama</span>
                <input name="name" defaultValue={v.name || customer?.name || ""} autoComplete="name" className="field" required placeholder="Nama kamu" />
              </label>
              <label className="block">
                <span className="label">Nomor WhatsApp</span>
                <input name="wa" defaultValue={v.wa || customer?.wa || ""} inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" className="field" required />
              </label>
            </div>
          </fieldset>

          {chosen?.requires_file && (
            <fieldset>
              <legend className="mb-1 text-xl font-semibold tracking-tight">File siap cetak</legend>
              <p className="mb-5 text-sm text-mute">
                {driveReady
                  ? "Upload langsung di sini—semua file (kecil maupun besar) tersimpan di Google Drive, jadi database tidak penuh. Bisa juga tempel link Google Drive/WeTransfer."
                  : "Google Drive belum aktif, jadi unggah dinonaktifkan. Hubungi admin atau tempel link Google Drive/WeTransfer."}{" "}
                Format aman: PDF, JPG, PNG, AI, PSD, CDR, TIFF, atau ZIP.
              </p>
              <div
                onDragOver={(e) => {
                  if (!driveReady || uploading) return;
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  if (!driveReady || uploading) return;
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) uploadFile(file);
                }}
                className={`relative rounded-tag-sm border-2 border-dashed p-4 transition-colors ${
                  dragging
                    ? "border-accent bg-accent/[0.08]"
                    : "border-line bg-panel/30 hover:border-accent/40"
                } ${!driveReady ? "opacity-50" : ""}`}
              >
                <label className="block">
                  <span className="label">Upload dari perangkat</span>
                  <input
                    type="file"
                    onChange={(e) => uploadFile(e)}
                    disabled={uploading || !driveReady}
                    accept={ACCEPT_ATTR}
                    className="sr-only"
                  />
                  <span className="mt-2 flex cursor-pointer items-center justify-center rounded-[var(--radius-sharp)] border border-line bg-sand px-4 py-3 text-xs font-medium transition-colors hover:border-accent/40">
                    {uploading ? "Mengunggah…" : "Pilih file atau seret ke sini"}
                  </span>
                  <span className="mt-1.5 block text-xs text-mute">
                    {uploading
                      ? "Mengunggah langsung ke Google Drive…"
                      : fileLink.startsWith("/api/upload/") && uploadedName
                        ? `Tersimpan: ${uploadedName}`
                        : "File kecil maupun besar didukung. Format PDF, gambar, atau file desain."}
                  </span>
                </label>
                <UploadProgressBar
                  progress={uploadProgress}
                  label={
                    uploadProgress && uploadProgress.percent >= 100
                      ? "Menyimpan file…"
                      : "Mengunggah ke Google Drive"
                  }
                />
                {fileLink.startsWith("/api/upload/") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileLink("");
                      setUploadedName("");
                      setUploadProgress(null);
                      setUploadError("");
                    }}
                    className="mt-1 text-xs font-medium text-mute underline underline-offset-4 hover:text-ink"
                  >
                    Hapus file
                  </button>
                )}
                {uploadError && <span role="alert" className="mt-1 block text-xs text-danger">{uploadError}</span>}
              </div>
                <label className="block">
                  <span className="label">Link file</span>
                  <input
                    name="file"
                    value={fileLink}
                    onChange={(event) => setFileLink(event.target.value)}
                    placeholder="https://drive.google.com/... atau hasil upload"
                    className="field"
                    required={Boolean(chosen?.requires_file)}
                  />
                  <span className="mt-1.5 block text-xs text-mute">
                    Pastikan admin bisa membuka link ini. Belum punya file? Chat kami dulu lewat WhatsApp.
                  </span>
                </label>
            </fieldset>
          )}

          {driveReady && (
            <fieldset>
              <legend className="mb-1 text-xl font-semibold tracking-tight">File referensi</legend>
              <p className="mb-5 text-sm text-mute">
                Opsional — logo lama, foto produk, atau referensi. Maksimal 12 file, dikirim langsung ke
                Google Drive saat pesanan dibuat.
              </p>
              <label
                className={`flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-tag-sm border border-dashed px-6 py-8 text-center transition-colors ${
                  refFiles.length ? "border-accent/50 bg-accent/[0.05]" : "border-line hover:border-accent/40"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPT_ATTR}
                  className="sr-only"
                  onChange={(event) => addReferenceFiles(event.target.files)}
                  disabled={refUploading || pending}
                />
                <span className="text-sm font-semibold text-ink">
                  + Pilih file{refFiles.length ? ` (${refFiles.length} dipilih)` : ""}
                </span>
                <span className="text-xs text-mute">Gambar, PDF, atau ZIP — tersimpan di Drive studio.</span>
              </label>

              {refFiles.length > 0 && (
                <ul className="mt-3 divide-y divide-line rounded-tag-sm border border-line bg-panel/30 px-4">
                  {refFiles.map((file, index) => (
                    <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{file.name}</span>
                        <span className="mono block text-[11px] text-mute">{formatBytes(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReferenceFile(index)}
                        disabled={refUploading || pending}
                        className="min-h-11 px-2 text-xs font-medium text-mute transition-colors hover:text-ink disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {refUploading && (
                <div className="mt-3 rounded-tag-sm border border-line bg-panel/30 px-4 py-3">
                  <div className="flex items-center justify-between font-mono text-xs text-mute">
                    <span>Mengunggah ke Google Drive…</span>
                    <span className="tabular-nums">{refProgress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-accent transition-all duration-200" style={{ width: `${refProgress}%` }} />
                  </div>
                </div>
              )}
              {refError && <p role="alert" className="mt-3 text-sm text-danger">{refError}</p>}
            </fieldset>
          )}

          <BriefAssistant
            category={chosen?.category ?? "design"}
            dimensions={isArea && width && height ? `${width} × ${height} cm` : undefined}
            onApply={setBrief}
          />

          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">
              {chosen?.category === "print" ? "Catatan pesanan" : "Brief"}
            </legend>
            <p className="mb-5 text-sm text-mute">
              {chosen?.category === "print"
                ? "Tulis instruksi cetak: warna, lipatan, mata ayam, atau hal lain yang perlu kami tahu."
                : "Ceritakan singkat: untuk apa desainnya, siapa yang melihat, dan gaya yang kamu suka."}
            </p>
            <label className="block">
              <span className="sr-only">Brief</span>
              <textarea
                name="brief"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={5}
                className="field resize-y"
                required
                minLength={briefMin}
                placeholder={
                  chosen?.category === "print"
                    ? "Contoh: cetak sesuai file, warna cerah, mata ayam di setiap sudut. Ambil di toko."
                    : "Contoh: butuh logo untuk kedai kopi kecil, kesannya hangat dan sederhana. Suka warna earthy, tidak suka yang ramai."
                }
              />
            </label>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Deadline pengerjaan</legend>
            <p className="mb-5 text-sm text-mute">
              Kapan pesanan ini harus selesai? Tanggal dan jam wajib diisi supaya antrean produksi jelas.
            </p>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="block">
                <span className="label">
                  Tanggal <span className="text-[var(--quiet)]">*</span>
                </span>
                <DateField name="deadline" defaultValue={v.deadline} placeholder="Pilih tanggal deadline" min={minDeadlineISO} />
              </label>
              <label className="block">
                <span className="label">
                  Jam <span className="text-[var(--quiet)]">*</span>
                </span>
                <TimeField name="deadlineTime" defaultValue={v.deadlineTime || "17:00"} />
              </label>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-mute">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--quiet)]" />
              Deadline otomatis masuk ke nota, halaman lacak, dan pesan WhatsApp ke kamu serta admin.
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Detail tambahan</legend>
            <p className="mb-5 text-sm text-mute">Opsional. Boleh dikosongkan kalau belum ada.</p>
            <label className="block">
              <span className="label">Link referensi</span>
              <input name="ref" type="url" defaultValue={v.ref} placeholder="https://" className="field" />
            </label>
          </fieldset>

          <div className="flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={pending || uploading || refUploading || hasPriceError || total == null}
              className="btn btn-primary w-full sm:w-auto"
            >
              {refUploading ? "Mengunggah referensi…" : pending ? "Membuat pesanan…" : "Buat pesanan & lihat pembayaran"}
              {!pending && !refUploading && <ArrowRight aria-hidden className="size-4" />}
            </button>
            <p className="text-sm leading-6 text-mute sm:max-w-[20rem] sm:text-right">
              Setelah dibuat, kamu langsung melihat total dan instruksi pembayaran. Kode pesanan juga
              dikirim lewat WhatsApp.
            </p>
          </div>
            </>
          )}
        </form>

        <aside aria-label="Ringkasan pesanan" className="hidden lg:sticky lg:top-24 lg:block">
          <div className="card p-6">
            <p className="eyebrow">Ringkasan</p>
            <p className="mt-4 text-lg font-semibold leading-snug">{chosen?.name ?? "Pilih layanan"}</p>
            <p className="mt-1 text-sm text-mute">{chosen?.blurb ?? "Belum ada layanan dipilih."}</p>

            <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
              {quote?.lines.map((line, index) => (
                <div key={index} className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">
                    {line.label}
                    {line.detail && <span className="mt-0.5 block text-xs text-mute">{line.detail}</span>}
                  </dt>
                  <dd className="shrink-0 font-semibold tabular-nums">{rupiah(line.amount)}</dd>
                </div>
              ))}
              {!quote?.lines.length && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Pengerjaan</dt>
                  <dd className="font-semibold">± {chosen?.days ?? 3} hari</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="text-mute">Pengerjaan</dt>
                <dd className="font-semibold">± {chosen?.days ?? 3} hari</dd>
              </div>
              {payment.enabled && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Pembayaran</dt>
                  <dd className="font-semibold">{payment.bankName || "Transfer"}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 rounded-tag-sm border border-accent/20 bg-accent/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Total</p>
              {promoDiscount > 0 && (
                <div className="mt-2 flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-mute">Diskon promo</span>
                  <span className="mono font-semibold text-accent">-{rupiah(promoDiscount)}</span>
                </div>
              )}
              <p className="mt-1.5 text-4xl font-semibold tabular-nums tracking-tight text-accent" aria-live="polite" aria-atomic="true">
                {finalTotal != null ? rupiah(finalTotal) : "—"}
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="Kode promo"
                  className="field min-h-10 text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={promoPending || !promoCode.trim() || total == null}
                  className="btn btn-ghost min-h-10 px-3 text-xs"
                >
                  {promoPending ? "Cek…" : "Terapkan"}
                </button>
              </div>
              {promoMessage && (
                <p className={`mt-2 text-xs ${promoDiscount > 0 ? "text-accent" : "text-danger"}`}>{promoMessage}</p>
              )}
              {hasPriceError && <p className="mt-1 text-xs text-danger">{quote?.error}</p>}
              {!hasPriceError && total == null && (
                <p className="mt-1 text-xs text-mute">Lengkapi spesifikasi untuk melihat total.</p>
              )}
            </div>

            {relatedServices.length > 0 && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="eyebrow mb-3">Sering dipesan bersama</p>
                <div className="space-y-2">
                  {relatedServices.map((service) => (
                    <Link
                      key={service.id}
                      href={`/order?layanan=${service.id}`}
                      className="flex items-center justify-between gap-3 rounded-tag-sm border border-line px-3 py-2 text-xs transition-colors hover:border-accent/40 hover:bg-white/[0.03]"
                    >
                      <span className="font-medium">{service.name}</span>
                      <span className="mono text-mute">{priceLabel(service)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {payment.enabled && (payment.bankAccount || payment.note) && (
              <div className="mt-5 rounded-tag-sm border border-line bg-sand/60 px-4 py-3 text-[13px] leading-5 text-ink/70">
                {hasBankLogo(payment.bankName) && (
                  <span className="mb-2 inline-flex rounded-[0.5rem] border border-line bg-ink px-2.5 py-1.5 align-middle">
                    <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                  </span>
                )}
                <p className="font-semibold text-ink">Transfer {payment.bankName} {payment.bankAccount}</p>
                {payment.bankHolder && <p>a.n. {payment.bankHolder}</p>}
                {payment.note && <p className="mt-1 text-ink/55">{payment.note}</p>}
              </div>
            )}

            <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
              Butuh sesuatu yang belum ada di pilihan?{" "}
              <WhatsAppLink
                text="Halo in.torma, saya mau tanya soal layanan."
                className="inline-flex items-center gap-1 font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              >
                Tanya lewat WhatsApp <WhatsAppIcon className="size-3.5" />
              </WhatsAppLink>
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 px-4 pb-[var(--action-bar-padding)] pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-mute">{chosen?.name ?? "Pilih layanan"}</p>
            <p className="truncate text-xl font-semibold tabular-nums text-accent">
              {total != null ? rupiah(total) : "Belum dihitung"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={pending || uploading || refUploading || hasPriceError || total == null}
            className="btn btn-primary min-h-11 shrink-0 px-5 text-sm"
          >
            {refUploading ? "Mengunggah…" : pending ? "Membuat…" : "Buat pesanan"}
            {!pending && !refUploading && <ArrowRight aria-hidden className="size-4" />}
          </button>
        </div>
        {hasPriceError && (
          <p className="mt-1.5 truncate text-xs text-danger">{quote?.error}</p>
        )}
      </div>
    </>
  );
}
