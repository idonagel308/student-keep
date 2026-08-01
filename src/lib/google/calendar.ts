const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** YYYY-MM-DD in UTC — all-day events use a date, not a dateTime, so
 * there's no timezone decision to get wrong for "which day is this on." */
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextDay(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type LectureEventInput = {
  courseName: string;
  number: number;
  title: string | null;
  scheduledDate: Date;
};

export function buildEventBody(input: LectureEventInput) {
  const start = toDateOnly(input.scheduledDate);
  const summary = input.title
    ? `${input.courseName}: Lecture ${input.number} - ${input.title}`
    : `${input.courseName}: Lecture ${input.number}`;
  return {
    summary,
    // Google Calendar's all-day events use an exclusive end date (the day
    // after), same convention as most calendar APIs.
    start: { date: start },
    end: { date: nextDay(start) },
  };
}

async function callCalendar(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  return fetch(`${EVENTS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function createCalendarEvent(
  accessToken: string,
  input: LectureEventInput
): Promise<string> {
  const res = await callCalendar(accessToken, "POST", "", buildEventBody(input));
  if (!res.ok) {
    throw new Error(`Google Calendar create failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.id as string;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  input: LectureEventInput
): Promise<void> {
  const res = await callCalendar(accessToken, "PATCH", `/${eventId}`, buildEventBody(input));
  if (!res.ok) {
    throw new Error(`Google Calendar update failed (${res.status}): ${await res.text()}`);
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await callCalendar(accessToken, "DELETE", `/${eventId}`);
  // 404/410 means it's already gone (e.g. deleted by hand in Google
  // Calendar) - that's the desired end state, not a failure.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete failed (${res.status}): ${await res.text()}`);
  }
}
