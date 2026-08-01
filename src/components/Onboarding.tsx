"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { completeOnboarding } from "@/app/actions/onboarding";
import { btnPrimary } from "@/components/ui";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

const STEPS = [
  { title: "onboarding1Title", body: "onboarding1Body" },
  { title: "onboarding2Title", body: "onboarding2Body" },
  { title: "onboarding3Title", body: "onboarding3Body" },
  { title: "onboarding4Title", body: "onboarding4Body" },
] as const;

export function Onboarding({ lang }: { lang: Lang }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  function finish() {
    setOpen(false);
    startTransition(() => {
      completeOnboarding();
    });
  }

  if (!mounted || !open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const dialog = (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" className="dialog">
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
          }}
        >
          {t(lang, "onboardingStepOf", step + 1, STEPS.length)}
        </div>
        <h2 className="dialog-title" style={{ margin: 0 }}>
          {t(lang, current.title)}
        </h2>
        <p className="dialog-body" style={{ margin: 0 }}>
          {t(lang, current.body)}
        </p>
        <div
          style={{ display: "flex", gap: 6, justifyContent: "center", margin: "4px 0" }}
          aria-hidden="true"
        >
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === step ? "var(--color-accent)" : "var(--color-divider)",
              }}
            />
          ))}
        </div>
        <div className="dialog-actions" style={{ justifyContent: "space-between" }}>
          <button type="button" onClick={finish} className="btn btn-secondary" disabled={pending}>
            {t(lang, "onboardingSkip")}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="btn btn-secondary"
                disabled={pending}
              >
                {t(lang, "onboardingBack")}
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className={btnPrimary}
              disabled={pending}
            >
              {isLast ? t(lang, "onboardingFinish") : t(lang, "onboardingNext")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
