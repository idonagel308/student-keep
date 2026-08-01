function parseDate(raw: string, label: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label} is not a valid date.`);
  }
  return d;
}

/** Parses and validates both dates together so the range check (not just
 * each date's own validity) is enforced in one place for both actions. */
export function parseSemesterDates(startRaw: string, endRaw: string): { startDate: Date; endDate: Date } {
  const startDate = parseDate(startRaw, "Start date");
  const endDate = parseDate(endRaw, "End date");
  if (endDate <= startDate) {
    throw new Error("End date must be after start date.");
  }
  return { startDate, endDate };
}
