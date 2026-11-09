"use client";

import { ActionForm } from "@/components/ActionForm";
import { btnPrimary } from "@/components/ui";
import { approveRequest } from "@/app/actions/signupRequests";

export function ApproveRequestForm({ id, label }: { id: string; label: string }) {
  return (
    <ActionForm action={approveRequest} resetOnSuccess={false}>
      {(pending) => (
        <>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={pending} className={btnPrimary}>
            {label}
          </button>
        </>
      )}
    </ActionForm>
  );
}
