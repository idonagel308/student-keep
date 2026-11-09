import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteRequest, rejectAllPending } from "@/app/actions/signupRequests";
import { ApproveRequestForm } from "@/components/ApproveRequestForm";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireAdmin();
  const requests = await prisma.signupRequest.findMany({
    where: { status: { not: "used" } },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="animate-in" style={{ padding: "40px 0", maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, margin: "0 0 24px" }}>Access requests</h1>
      {requests.length === 0 && <p>No open requests.</p>}
      {pendingCount > 1 && (
        <div style={{ marginBottom: 16 }}>
          <DeleteButton
            action={rejectAllPending}
            hidden={{}}
            label={`Reject all ${pendingCount} pending`}
            confirmMessage={`Delete all ${pendingCount} pending requests? Approved ones are kept.`}
          />
        </div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
        {requests.map((r) => {
          const live = r.status === "approved" && r.codeHash && r.expiresAt && r.expiresAt > new Date();
          return (
            <li key={r.id} style={{ display: "grid", gap: 8 }}>
              <strong>{r.email}</strong>
              <span style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>
                {r.status === "pending" ? "Waiting for approval" : live ? "Code issued" : "Code expired or locked"}
                {" · "}
                {r.createdAt.toLocaleDateString("en-GB")}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <ApproveRequestForm id={r.id} label={r.status === "pending" ? "Approve" : "New code"} />
                <DeleteButton
                  action={deleteRequest}
                  hidden={{ id: r.id }}
                  label="Reject"
                  confirmMessage="Delete this request?"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
