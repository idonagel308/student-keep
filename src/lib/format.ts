import { format, formatDistanceToNowStrict, isPast, isToday } from "date-fns";

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateInput(date: Date | string | null | undefined) {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd");
}

export function dueLabel(date: Date | string) {
  const d = new Date(date);
  if (isToday(d)) return "Due today";
  if (isPast(d)) return `Overdue by ${formatDistanceToNowStrict(d)}`;
  return `Due in ${formatDistanceToNowStrict(d)}`;
}

export function dueStatus(date: Date | string): "overdue" | "today" | "upcoming" {
  const d = new Date(date);
  if (isToday(d)) return "today";
  if (isPast(d)) return "overdue";
  return "upcoming";
}
