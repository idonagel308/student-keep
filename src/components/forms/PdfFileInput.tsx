"use client";

import { useState } from "react";
import { PdfIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * A native <input type="file"> styled as plain text/no visible box is easy
 * to click by accident and gives no hint that it opens the OS file picker.
 * Wrapping it in a <label> gives the same click-to-open behavior with no JS
 * required for the core interaction — the useState below only drives the
 * "selected file" preview text.
 */
export function PdfFileInput({
  name,
  required,
  currentFileName,
  lang,
}: {
  name: string;
  required?: boolean;
  currentFileName?: string | null;
  lang: Lang;
}) {
  const [pickedName, setPickedName] = useState<string | null>(null);
  const shownName = pickedName ?? currentFileName ?? null;

  return (
    <label className="file-drop">
      <input
        type="file"
        name={name}
        accept="application/pdf"
        required={required}
        className="sr-only"
        onChange={(e) => setPickedName(e.target.files?.[0]?.name ?? null)}
      />
      <span className="file-drop-icon">
        <PdfIcon size={20} />
      </span>
      <span className="file-drop-text">
        <span className="file-drop-title">
          {shownName ?? t(lang, "pdfUploadPlaceholder")}
        </span>
        <span className="file-drop-hint">
          {shownName ? t(lang, "pdfReplaceHint") : t(lang, "pdfSizeHint")}
        </span>
      </span>
    </label>
  );
}
