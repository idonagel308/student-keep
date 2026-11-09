/** Upper bounds for free-form text and numbers accepted by server actions. */
export const MAX_NAME_LENGTH = 200;
export const MAX_NOTES_LENGTH = 5000;
export const MAX_CREDITS = 1000;

/** Throws if `value` is longer than `max` characters. */
export function checkLength(value: string | null, max: number, label: string): string | null {
  if (value !== null && value.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return value;
}

/** Course color: blank (none) or a #hex value, which is all the picker produces. */
export function parseColor(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) throw new Error("Invalid color.");
  return value;
}

/** Non-negative credits, capped so GPA math can't be pushed to Infinity/NaN. */
export function parseCreditValue(raw: string, label: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_CREDITS) {
    throw new Error(`${label} must be a number between 0 and ${MAX_CREDITS}.`);
  }
  return n;
}
