"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Modal({
  trigger,
  title,
  children,
  closeLabel = "Close",
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  children: (close: () => void) => React.ReactNode;
  closeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    // One-time client-mount flag for createPortal (no DOM on the server) — no event to subscribe to instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Focus moves into the dialog, stays there while it's open, and goes back
    // to whatever opened it on close.
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? [])];
    // The dialog itself, not its first field: focusing a field would pop the phone keyboard.
    dialogRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const [head, tail] = [els[0], els[els.length - 1]];
      if (e.shiftKey && (document.activeElement === head || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [open]);

  const dialog = open && (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="dialog">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id={titleId} className="dialog-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-icon btn-ghost"
            aria-label={closeLabel}
          >
            <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
            </svg>
          </button>
        </div>
        {children(() => setOpen(false))}
      </div>
    </div>
  );

  return (
    <>
      {trigger(() => setOpen(true))}
      {/* Rendered via portal straight onto <body> so the dialog's `position:
          fixed` is always relative to the real viewport, never to some
          ancestor further up the tree that happens to have (or gains, e.g.
          mid CSS-animation-fill-mode) a transform — a transform on any
          ancestor creates a new containing block for fixed descendants,
          which would make the modal drift with page scroll instead of
          staying pinned to the screen. */}
      {mounted && dialog && createPortal(dialog, document.body)}
    </>
  );
}
