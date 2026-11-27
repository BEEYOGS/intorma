import Link from "next/link";
import { redirect } from "next/navigation";
import { FileLibrary, type FileItem } from "@/components/FileLibrary";
import { TopBar } from "@/components/TopBar";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { driveEnabled } from "@/lib/drive";
import { createUploadToken } from "@/lib/upload-token";

export const dynamic = "force-dynamic";
export const metadata = { title: "File saya" };

type UploadRow = {
  id: number;
  code: string;
  file_name: string;
  mime: string;
  size: number;
  created_at: string | Date;
  order_code: string | null;
};

export default async function FilesPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/masuk");

  const rows = (await sql`
    select u.id, u.code, u.file_name, u.mime, u.size, u.created_at, o.code as order_code
    from uploads u left join orders o on o.id = u.order_id
    where u.customer_id = ${customer.id}
    order by u.created_at desc
    limit 100
  `) as unknown as UploadRow[];

  const files: FileItem[] = rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    name: String(row.file_name),
    mime: String(row.mime),
    size: Number(row.size),
    createdAt: new Date(row.created_at).toISOString(),
    orderCode: row.order_code ? String(row.order_code) : null,
  }));

  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-8 sm:py-10">
        <Link href="/portal" className="text-xs text-mute transition-colors hover:text-[var(--text)]">
          ← Kembali ke portal
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Portal klien</p>
            <h1 className="display text-2xl sm:text-3xl">File saya</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
              Semua file yang kamu unggah tersimpan di sini. Download per file atau pilih beberapa lalu
              unduh sekaligus sebagai ZIP. Isi file tetap original—tidak dikompresi atau diubah.
            </p>
          </div>
          <span className="mono text-xs text-mute">{files.length} file</span>
        </div>

        <div className="mt-7">
          <FileLibrary
            files={files}
            driveReady={driveEnabled()}
            uploadToken={createUploadToken(customer.id)}
            customerName={customer.name}
          />
        </div>
      </div>
    </div>
  );
}
