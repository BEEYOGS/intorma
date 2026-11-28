"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";
import { haptic } from "@/lib/haptics";

const CLOSE_DISTANCE = 104;
const CLOSE_VELOCITY = 0.45; // px/ms

type DragState = {
  pointerId: number;
  startY: number;
  time: number;
  dy: number;
};

/**
 * Bottom sheet dengan geser-ke-bawah untuk menutup, focus trap, kunci scroll,
 * dan dukungan back button Android. Di desktop bisa dipakai sebagai drawer kanan.
 */
export function MobileSheet({
  open,
  onClose,
  header,
  children,
  side = "bottom",
  titleId,
  ariaLabel,
  panelClassName = "",
  bodyClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
  side?: "bottom" | "right";
  titleId?: string;
  ariaLabel?: string;
  panelClassName?: string;
  bodyClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const swipeable = side === "bottom";

  const close = useCallback(() => {
    haptic("tap");
    onClose();
  }, [onClose]);

  useOverlayRegistration(titleId ?? "sheet", open, close);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      return;
    }
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
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
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus();
    };
  }, [close, open]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeable || !event.isPrimary || event.pointerType === "mouse") return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      time: performance.now(),
      dy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.dy = Math.max(0, event.clientY - state.startY);
    // Sedikit resistance supaya panel tidak terasa “lepast”.
    setDragY(state.dy * 0.85);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const velocity = state.dy / Math.max(1, performance.now() - state.time);
    dragRef.current = null;
    setDragging(false);
    setDragY(0);
    if (state.dy > CLOSE_DISTANCE || (state.dy > 28 && velocity > CLOSE_VELOCITY)) close();
  }

  function onPointerCancel() {
    dragRef.current = null;
    setDragging(false);
    setDragY(0);
  }

  if (!open) return null;

  const labelProps = titleId ? { "aria-labelledby": titleId } : { "aria-label": ariaLabel ?? "Dialog" };

  return (
    <div data-mobile-chrome className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
      <button
        type="button"
        aria-label="Tutup dialog"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...labelProps}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : undefined } : undefined}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[12px] border border-line bg-[var(--bg)] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] outline-none transition-transform ${
          side === "right"
            ? "sm:h-dvh sm:max-h-none sm:w-[min(34rem,100vw)] sm:rounded-tl-[12px] sm:rounded-tr-none sm:rounded-bl-none sm:rounded-br-none"
            : ""
        } ${panelClassName}`}
      >
        {swipeable && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="grid h-10 shrink-0 touch-none cursor-grab place-items-center active:cursor-grabbing sm:hidden"
            aria-hidden
          >
            <span className="h-1 w-10 rounded-full bg-[var(--border-2)]" />
          </div>
        )}
        {header}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pt-5 sm:px-5 ${bodyClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
