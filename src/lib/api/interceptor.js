const SESSION_PATHS_KEY = "sk_api_session_get_paths";
const MAX_SESSION_PATHS = 64;

const inflightCounts = new Map();

function readSessionPaths() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(SESSION_PATHS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessionPaths(paths) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(SESSION_PATHS_KEY, JSON.stringify(paths));
}

function rememberSessionPath(path) {
  const paths = readSessionPaths();
  if (paths.includes(path)) {
    return;
  }
  paths.push(path);
  while (paths.length > MAX_SESSION_PATHS) {
    paths.shift();
  }
  writeSessionPaths(paths);
}

function syncPendingSnapshot() {
  const merged = [
    ...new Set([...inflightCounts.keys(), ...readSessionPaths()]),
  ];
  writeSessionPaths(merged);
}

export function interceptApiGetStart(path) {
  if (typeof window === "undefined") {
    return;
  }
  inflightCounts.set(path, (inflightCounts.get(path) || 0) + 1);
  syncPendingSnapshot();
}

export function interceptApiGetEnd(path) {
  if (typeof window === "undefined") {
    return;
  }
  const next = (inflightCounts.get(path) || 0) - 1;
  if (next <= 0) {
    inflightCounts.delete(path);
  } else {
    inflightCounts.set(path, next);
  }
  rememberSessionPath(path);
  syncPendingSnapshot();
}

export function getSessionGetPaths() {
  return readSessionPaths();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", syncPendingSnapshot);
}
