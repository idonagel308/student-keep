export type Outcome = "created" | "updated" | "removed";

export type SyncResult = {
  created: number;
  updated: number;
  removed: number;
  failed: number;
  /** The first error seen, so the caller can tell the user why. */
  firstError: unknown;
};

// A handful at a time: much faster than one by one for a semester's worth of
// lectures, while staying well inside Google's per-user rate limits.
const CONCURRENCY = 5;

/** Runs `work` over every item in small parallel batches; one failure never stops the rest. */
export async function runBatches<T>(
  items: T[],
  work: (item: T) => Promise<Outcome>,
  describe: (item: T) => string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, removed: 0, failed: 0, firstError: null };
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const settled = await Promise.allSettled(items.slice(i, i + CONCURRENCY).map(work));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        result[r.value]++;
      } else {
        result.failed++;
        result.firstError ??= r.reason;
        console.error(`[google sync] ${describe(items[i + j])} failed:`, r.reason);
      }
    });
  }
  return result;
}

/** One line for the Settings panel, e.g. "Lectures: 2 added, 17 updated, 1 failed". */
export function describeSyncResult(label: string, r: SyncResult): string {
  const parts: string[] = [];
  if (r.created) parts.push(`${r.created} added`);
  if (r.updated) parts.push(`${r.updated} updated`);
  if (r.removed) parts.push(`${r.removed} removed`);
  if (r.failed) parts.push(`${r.failed} failed`);
  return `${label}: ${parts.length ? parts.join(", ") : "nothing to sync (items need a date to sync)"}`;
}
