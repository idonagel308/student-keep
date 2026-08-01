const TASKS_URL = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";

export type HomeworkTaskInput = {
  courseName: string;
  name: string;
  details: string | null;
  dueDate: Date;
  completed: boolean;
};

export function buildTaskBody(input: HomeworkTaskInput) {
  return {
    title: `${input.courseName}: ${input.name}`,
    notes: input.details ?? undefined,
    // Google Tasks' API wants a full RFC3339 timestamp even though its own
    // UI only ever displays the date part — midnight UTC on the due date
    // sidesteps the "what time is this due" question the same way the
    // Calendar events do.
    due: `${input.dueDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
    status: input.completed ? "completed" : "needsAction",
  };
}

async function callTasks(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  return fetch(`${TASKS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function createTask(accessToken: string, input: HomeworkTaskInput): Promise<string> {
  const res = await callTasks(accessToken, "POST", "", buildTaskBody(input));
  if (!res.ok) {
    throw new Error(`Google Tasks create failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.id as string;
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  input: HomeworkTaskInput
): Promise<void> {
  const res = await callTasks(accessToken, "PATCH", `/${taskId}`, buildTaskBody(input));
  if (!res.ok) {
    throw new Error(`Google Tasks update failed (${res.status}): ${await res.text()}`);
  }
}

export async function deleteTask(accessToken: string, taskId: string): Promise<void> {
  const res = await callTasks(accessToken, "DELETE", `/${taskId}`);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Google Tasks delete failed (${res.status}): ${await res.text()}`);
  }
}
