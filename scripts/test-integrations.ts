// Tes integrasi nyata: Google Drive (OAuth) + WhatsApp Gateway.
// Jalankan: npm run test:integrations
//
// Test tidak akan mengirim file besar. File uji kecil dibuat lewat sesi
// Resumable Upload, dicetak id/webViewLink-nya, lalu dihapus lagi.
import { existsSync } from "node:fs";

type Status = "PASS" | "FAIL" | "SKIP";
type Result = { name: string; status: Status; detail: string };

const results: Result[] = [];

function record(name: string, status: Status, detail: string) {
  results.push({ name, status, detail });
  const tag = status.padEnd(4, " ");
  console.log(`[${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(file);
      console.log(`Env dimuat: ${file}`);
      return;
    } catch (error) {
      console.warn(`Gagal memuat ${file}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

async function main() {
  loadEnv();

  const drive = await import("../src/lib/drive");
  const wa = await import("../src/lib/wa");

  console.log("\n=== Google Drive ===");
  const authMode = drive.driveAuthMode();
  const folderId = drive.driveFolderId();
  console.log(`Mode auth : ${authMode}`);
  console.log(`Folder ID : ${folderId || "(kosong)"}`);

  if (authMode === "none" || !folderId) {
    record(
      "Google Drive",
      "SKIP",
      "Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, dan GOOGLE_DRIVE_FOLDER_ID.",
    );
  } else {
    try {
      await drive.getDriveAccessToken();
      record("OAuth access token", "PASS", `mode ${authMode}`);
    } catch (error) {
      record("OAuth access token", "FAIL", error instanceof Error ? error.message : String(error));
    }

    try {
      const folder = await drive.driveFileMeta(folderId);
      record("Akses folder Drive", "PASS", `${folder.name} (${folder.id})`);
    } catch (error) {
      record("Akses folder Drive", "FAIL", error instanceof Error ? error.message : String(error));
    }

    try {
      const content = new TextEncoder().encode(`tes integrasi in.torma ${new Date().toISOString()}`);
      const name = `TEST_${Date.now()}_uji-drive.txt`;
      const session = await drive.driveInitResumable({
        name,
        mime: "text/plain",
        size: content.length,
        origin: process.env.NEXT_PUBLIC_SITE_URL || "https://intorma-psi.vercel.app",
      });
      record("Sesi resumable", "PASS", session.uploadUrl.slice(0, 72) + "…");

      const response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes 0-${content.length - 1}/${content.length}`,
          "Content-Type": "text/plain",
        },
        body: content,
      });
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; webViewLink?: string; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.id) {
        throw new Error(
          `Upload uji gagal (HTTP ${response.status})${payload?.error?.message ? `: ${payload.error.message}` : ""}`,
        );
      }
      record(
        "Upload resumable",
        "PASS",
        `id=${payload.id} webViewLink=${payload.webViewLink ?? "(tidak ada)"}`,
      );

      await drive.driveDelete(payload.id);
      record("Hapus file uji", "PASS", payload.id);
    } catch (error) {
      record("Upload resumable", "FAIL", error instanceof Error ? error.message : String(error));
    }
  }

  console.log("\n=== WhatsApp Gateway ===");
  const diagnostics = await wa.waDiagnostics();
  console.log(`Provider          : ${diagnostics.provider}`);
  console.log(`Configured        : ${diagnostics.configured}`);
  console.log(`Base URL          : ${diagnostics.baseUrl || "(kosong)"}`);
  console.log(`Session           : ${diagnostics.sessionName}`);
  console.log(`Gateway reachable : ${diagnostics.gatewayReachable} (HTTP ${diagnostics.httpStatus})`);
  console.log(`Session status    : ${diagnostics.sessionStatus ?? "(tidak ada)"}`);
  console.log(`Latency           : ${diagnostics.latencyMs} ms`);

  if (!diagnostics.configured) {
    record(
      "WhatsApp gateway",
      "SKIP",
      diagnostics.provider === "cloud"
        ? "Isi META_WA_TOKEN dan META_WA_PHONE_ID dari Meta App Dashboard."
        : diagnostics.provider === "fonnte"
          ? "Isi FONNTE_TOKEN dari dashboard Fonnte."
          : "Isi OPENWA_BASE_URL (URL publik HTTPS, bukan localhost) dan OPENWA_API_KEY.",
    );
  } else if (!diagnostics.gatewayReachable) {
    record("WhatsApp gateway", "FAIL", diagnostics.error ?? "Gateway tidak bisa dihubungi.");
  } else if (diagnostics.sessionStatus !== "ready") {
    record("WhatsApp gateway", "FAIL", `Sesi belum ready: ${diagnostics.sessionStatus ?? "unknown"}.`);
  } else {
    record("WhatsApp gateway", "PASS", `sesi ${diagnostics.sessionName} ready`);
  }

  const adminNumber = wa.adminWhatsApp();
  if (diagnostics.configured && diagnostics.gatewayReachable && diagnostics.sessionStatus === "ready") {
    if (!adminNumber) {
      record("Kirim pesan tes", "SKIP", "ADMIN_WHATSAPP_NUMBER belum diisi.");
    } else {
      const sent = await wa.waSendTest(
        adminNumber,
        `Tes integrasi in.torma berhasil.\nWaktu: ${new Date().toLocaleString("id-ID")}\nPesan ini dikirim oleh npm run test:integrations.`,
      );
      record(
        "Kirim pesan tes",
        sent.ok ? "PASS" : "FAIL",
        sent.ok
          ? `HTTP ${sent.status} → ${sent.phone ?? adminNumber}`
          : sent.error ?? `HTTP ${sent.status}`,
      );
    }
  }

  console.log("\n=== Ringkasan ===");
  for (const result of results) {
    console.log(`${result.status.padEnd(4, " ")}  ${result.name}: ${result.detail}`);
  }

  console.log("\nEnvironment yang wajib ada di Vercel:");
  console.log(
    [
      "  GOOGLE_CLIENT_ID",
      "  GOOGLE_CLIENT_SECRET",
      "  GOOGLE_REFRESH_TOKEN",
      "  GOOGLE_DRIVE_FOLDER_ID",
      "  WA_PROVIDER (cloud | fonnte | openwa)",
      "  META_WA_TOKEN dan META_WA_PHONE_ID (wajib kalau WA_PROVIDER=cloud)",
      "  META_WA_VERSION (opsional, default v25.0)",
      "  META_WA_VERIFY_TOKEN dan META_WA_APP_SECRET (opsional, untuk webhook Meta)",
      "  FONNTE_TOKEN (wajib kalau WA_PROVIDER=fonnte)",
      "  WA_WEBHOOK_SECRET",
      "  OPENWA_BASE_URL (HTTPS publik, bukan localhost — kalau openwa)",
      "  OPENWA_API_KEY (kalau openwa)",
      "  OPENWA_SESSION (kalau openwa)",
      "  ADMIN_WHATSAPP_NUMBER",
      "  ADMIN_PASSWORD",
      "  ADMIN_SECRET",
      "  DATABASE_URL",
      "  NEXT_PUBLIC_SITE_URL",
    ].join("\n"),
  );

  const failed = results.some((result) => result.status === "FAIL");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
