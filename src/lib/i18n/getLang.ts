import "server-only";

import { cookies } from "next/headers";
import type { Lang } from "./dictionary";

/**
 * Reads the language cookie server-side so pages (Server Components) can
 * render the right language on the very first response — persisting the
 * preference in localStorage instead (like theme) would mean the server
 * always renders English first and the client has to swap text in after
 * hydration, which is a mismatch on every string on the page.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get("lang")?.value === "he" ? "he" : "en";
}
