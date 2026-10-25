import { logApiCall } from "@/lib/logging/activity-logger";
import {
  isMutatingMethod,
  saveRequestEnd,
  saveRequestStart,
} from "@/lib/api/save-in-flight";

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const started = performance.now();
  let status = 0;
  let ok = false;
  let errorMessage = null;
  const trackSave =
    typeof window !== "undefined" && isMutatingMethod(method);

  if (trackSave) {
    saveRequestStart();
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    status = res.status;
    const json = await res.json().catch(() => ({}));
    ok = res.ok && json.ok !== false;
    if (!ok) {
      errorMessage = json.error || "Request failed";
      throw new Error(errorMessage);
    }
    return json.data;
  } catch (err) {
    if (!errorMessage) {
      errorMessage = err?.message || "Request failed";
    }
    throw err;
  } finally {
    if (trackSave) {
      saveRequestEnd();
    }
    logApiCall({
      method,
      url: path,
      durationMs: performance.now() - started,
      status,
      ok,
      error: ok ? null : errorMessage,
    });
  }
}
