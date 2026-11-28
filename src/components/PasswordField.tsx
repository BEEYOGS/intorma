"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

function strength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: "" };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;
  const labels = ["Sangat lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"];
  return { score: Math.min(5, score), label: labels[Math.min(4, Math.max(0, score - 1))] };
}

export function PasswordField({
  id,
  name,
  required = true,
  placeholder = "",
  showStrength = false,
  className = "input",
  ...rest
}: {
  id?: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  showStrength?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const fallbackId = useId();
  const inputId = id || fallbackId;
  const [visible, setVisible] = useState(false);
  const value = typeof rest.value === "string" ? rest.value : "";
  const meter = showStrength ? strength(value) : null;

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          id={inputId}
          name={name}
          required={required}
          placeholder={placeholder}
          className={`${className} pr-12`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-tag-sm text-[var(--text-3)] transition-colors hover:text-[var(--text)] sm:size-10"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
      {meter && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${index < meter.score ? (meter.score <= 2 ? "bg-danger" : meter.score === 3 ? "bg-accent" : "bg-accent") : "bg-[var(--border)]"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--text-3)]">Kekuatan: {meter.label}</p>
        </div>
      )}
    </div>
  );
}
