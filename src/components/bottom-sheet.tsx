"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: Props) {
  const [vhPx, setVhPx] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    // Guardar el foco anterior y mover al dialog
    previousActive.current = document.activeElement as HTMLElement | null;
    setTimeout(() => dialogRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        // Focus trap simple
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const sync = () => {
      if (vv) setVhPx(vv.height);
    };
    window.addEventListener("keydown", onKey);
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    sync();
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      document.body.style.overflow = "";
      setVhPx(null);
      // Restaurar foco al cerrar
      previousActive.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  const maxH = vhPx ? Math.min(vhPx - 32, vhPx * 0.9) : null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4">
      <div
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Panel"}
        tabIndex={-1}
        style={maxH ? { maxHeight: `${maxH}px` } : undefined}
        className="glass-strong relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl text-popover-foreground shadow-2xl animate-in slide-in-from-bottom duration-200 outline-none motion-reduce:animate-none max-sm:landscape:max-h-[100dvh] max-sm:landscape:rounded-t-none md:max-h-[85vh] md:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-center rounded-t-3xl border-b border-[color-mix(in_oklab,var(--border)_50%,transparent)] p-4 max-sm:landscape:rounded-t-none">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border md:hidden" />
          {title && (
            <h2 id={titleId} className="mt-1 truncate pr-8 text-base font-semibold">{title}</h2>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
