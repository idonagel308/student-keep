"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const dialog = open && (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" className="dialog">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="dialog-title" style={{ margin: 0 }}>
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
