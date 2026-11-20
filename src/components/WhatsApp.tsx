"use client";

import type { MouseEvent, ReactNode } from "react";
import { waLink, waWebLink } from "@/lib/site";

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|WhatsApp/i.test(navigator.userAgent);
}

/**
 * Link WhatsApp yang pintar: di ponsel memakai wa.me (membuka aplikasi),
 * di desktop langsung membuka WhatsApp Web tanpa halaman perantara.
 * href tetap wa.me supaya tautan bisa di-copy, di-middle-click, dan dibaca bot.
 */
export function WhatsAppLink({
  text,
  className = "",
  children,
  ariaLabel,
  title,
}: {
  text?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (isMobileDevice()) return;
    event.preventDefault();
    const target = waWebLink(text);
    const opened = window.open(target, "_blank");
    if (opened) {
      opened.opener = null;
    } else {
      window.location.href = target;
    }
  }

  return (
    <a
      href={waLink(text)}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </a>
  );
}
