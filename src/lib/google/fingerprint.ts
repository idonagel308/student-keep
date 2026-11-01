import { createHash } from "node:crypto";
import { buildEventBody, buildExamEventBody, type LectureEventInput, type ExamEventInput } from "./calendar";
import { buildTaskBody, type HomeworkTaskInput } from "./tasks";

/**
 * A short digest of exactly what we send to Google for an item. It is stored
 * next to the Google id after every successful write, so Save can skip items
 * whose digest is unchanged instead of re-sending all of them. Hashing the
 * real request body (not the app's fields) means anything that would change
 * the event or task - title, date, time, time zone, completed - changes it.
 */
const digest = (body: unknown) => createHash("sha256").update(JSON.stringify(body)).digest("hex");

export const lectureFingerprint = (input: LectureEventInput) => digest(buildEventBody(input));
export const examFingerprint = (input: ExamEventInput) => digest(buildExamEventBody(input));
export const taskFingerprint = (input: HomeworkTaskInput) => digest(buildTaskBody(input));
