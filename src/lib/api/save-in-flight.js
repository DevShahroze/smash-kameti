const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let inFlightCount = 0;
const listeners = new Set();

export function isMutatingMethod(method) {
  return MUTATING_METHODS.has((method || "GET").toUpperCase());
}

export function isSaveInFlight() {
  return inFlightCount > 0;
}

export function subscribeSaveInFlight(listener) {
  listeners.add(listener);
  listener(inFlightCount);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener(inFlightCount);
  }
}

export function saveRequestStart() {
  if (typeof window === "undefined") {
    return;
  }
  inFlightCount += 1;
  notify();
}

export function saveRequestEnd() {
  if (typeof window === "undefined") {
    return;
  }
  inFlightCount = Math.max(0, inFlightCount - 1);
  notify();
}
