import { minutesToTime, timeToMinutes } from "../lectureTime";

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

// Lecture times are wall-clock "HH:MM" with no timezone of their own, so
// Google needs one to place a timed event. Defaults to Israel time (where
// this app's users are); override with GOOGLE_EVENT_TIMEZONE (an IANA name
// like "Europe/London") if that ever changes.
const DEFAULT_EVENT_TIME_ZONE = "Asia/Jerusalem";

export function getEventTimeZone(): string {
  return process.env.GOOGLE_EVENT_TIMEZONE || DEFAULT_EVENT_TIME_ZONE;
}

// A lecture with a start time but no end time still needs an end for
// Google; an hour is a neutral placeholder, not something the app claims.
const DEFAULT_LECTURE_MINUTES = 60;

export type LectureEventInput = {
  courseName: string;
  number: number;
  title: string | null;
  scheduledDate: Date;
  /** Effective time (lecture override already resolved against the course). */
  startTime?: string | null;
  endTime?: string | null;
};

type EventDateTime = {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
};

export type EventBody = {
  summary: string;
  start: EventDateTime;
  end: EventDateTime;
};

export function buildEventBody(input: LectureEventInput): EventBody {
  const date = toDateOnly(input.scheduledDate);
  const summary = input.title
    ? `${input.courseName}: Lecture ${input.number} - ${input.title}`
    : `${input.courseName}: Lecture ${input.number}`;

  if (input.startTime) {
    const endTime =
      input.endTime ??
      minutesToTime(timeToMinutes(input.startTime) + DEFAULT_LECTURE_MINUTES);
    const timeZone = getEventTimeZone();
    return {
      summary,
      start: { dateTime: `${date}T${input.startTime}:00`, timeZone },
      end: { dateTime: `${date}T${endTime}:00`, timeZone },
    };
  }

  return {
    summary,
    // Google Calendar's all-day events use an exclusive end date (the day
    // after), same convention as most calendar APIs.
    start: { date },
    end: { date: nextDay(date) },
  };
}

/**
 * PATCH merges into the existing event, so an event that was all-day and
 * is now timed (or the reverse) would end up with both `date` and
 * `dateTime` set, which Google rejects. Explicitly nulling the other
 * shape's fields clears them. Only used for updates - creating an event
 * has nothing to clear.
 */
export function toPatchBody(body: EventBody): EventBody {
  const clearing = (part: EventDateTime): EventDateTime =>
    part.dateTime
      ? { ...part, date: null }
      : { ...part, dateTime: null, timeZone: null };
  return { ...body, start: clearing(body.start), end: clearing(body.end) };
}

export type ExamEventInput = {
  courseName: string;
  examDate: Date;
};

export function buildExamEventBody(input: ExamEventInput) {
  const start = toDateOnly(input.examDate);
  return {
    summary: `${input.courseName}: Final exam`,
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

async function createEvent(accessToken: string, body: unknown): Promise<string> {
  const res = await callCalendar(accessToken, "POST", "", body);
  if (!res.ok) {
    throw new Error(`Google Calendar create failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.id as string;
}

/**
 * Patches an event, or recreates it if Google no longer has it (404/410:
 * deleted by hand, or left over from a previous Google account). Returns the
 * id the caller should store, which differs from `eventId` only when the
 * event had to be recreated - without this, a stale id would fail every
 * future edit silently and the item would never sync again.
 */
async function updateOrRecreateEvent(
  accessToken: string,
  eventId: string,
  patchBody: unknown,
  createBody: unknown
): Promise<string> {
  const res = await callCalendar(accessToken, "PATCH", `/${eventId}`, patchBody);
  if (res.ok) return eventId;
  if (res.status === 404 || res.status === 410) return createEvent(accessToken, createBody);
  throw new Error(`Google Calendar update failed (${res.status}): ${await res.text()}`);
}

export async function createCalendarEvent(
  accessToken: string,
  input: LectureEventInput
): Promise<string> {
  return createEvent(accessToken, buildEventBody(input));
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  input: LectureEventInput
): Promise<string> {
  const body = buildEventBody(input);
  return updateOrRecreateEvent(accessToken, eventId, toPatchBody(body), body);
}

export async function createExamEvent(accessToken: string, input: ExamEventInput): Promise<string> {
  return createEvent(accessToken, buildExamEventBody(input));
}

export async function updateExamEvent(
  accessToken: string,
  eventId: string,
  input: ExamEventInput
): Promise<string> {
  const body = buildExamEventBody(input);
  return updateOrRecreateEvent(accessToken, eventId, body, body);
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await callCalendar(accessToken, "DELETE", `/${eventId}`);
  // 404/410 means it's already gone (e.g. deleted by hand in Google
  // Calendar) - that's the desired end state, not a failure.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete failed (${res.status}): ${await res.text()}`);
  }
}
