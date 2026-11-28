"use client";

import { CalendarPlus } from "lucide-react";
import { toast } from "@/components/Toast";

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function CalendarButton({
  code,
  deadline,
  title,
}: {
  code: string;
  deadline: string | null;
  title?: string | null;
}) {
  const date = deadline ? new Date(deadline) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  function download() {
    const start = date as Date;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const now = new Date();
    const summary = `Deadline pesanan ${code}`;
    const description = `Pesanan ${code}${title ? ` · ${title}` : ""}. Buka lacak: https://intorma-psi.vercel.app/lacak/${code}`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//in.torma//Order Deadline//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${code}-${start.getTime()}@intorma`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "LOCATION:in.torma",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Pengingat deadline pesanan",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    try {
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${code}-deadline.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("File kalender diunduh. Buka di aplikasi kalendermu.", "ok");
    } catch {
      toast("File kalender tidak bisa diunduh. Salin tanggal deadline secara manual.", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      aria-label={`Tambah deadline ${code} ke kalender`}
      className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
    >
      <CalendarPlus aria-hidden className="size-4" /> Tambah ke kalender
    </button>
  );
}
