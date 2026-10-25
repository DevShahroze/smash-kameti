/** Admin activity logs: fresh on each full page load; persisted in localStorage until refresh (guests do not log). */

const STORAGE_KEY = "sk_activity_logs";
const OPT_IN_KEY = "sk_activity_log_opt_in";
const MAX_ENTRIES = 1500;

const logs = [];
const listeners = new Set();
let loggingEnabled = false;
let userOptIn = true;

let currentViewId = crypto.randomUUID();
let pageEnteredAt = performance.now();
let currentPath = "";
let currentTab = "";
let tabEnteredAt = performance.now();

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readOptInFromStorage() {
  if (!canUseStorage()) {
    return true;
  }
  try {
    const value = localStorage.getItem(OPT_IN_KEY);
    if (value === null) {
      return true;
    }
    return value === "1" || value === "true";
  } catch {
    return true;
  }
}

function syncOptInFromStorage() {
  userOptIn = readOptInFromStorage();
}

function isRecording() {
  return loggingEnabled && userOptIn;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function clearStoredLogs() {
  logs.length = 0;
  if (!canUseStorage()) {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function persistToStorage() {
  if (!canUseStorage() || !isRecording()) {
    return;
  }
  try {
    let toSave = logs;
    if (logs.length > MAX_ENTRIES) {
      toSave = logs.slice(-MAX_ENTRIES);
      logs.length = 0;
      logs.push(...toSave);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
      } catch {
        /* ignore quota */
      }
    }
  }
}

function beginSession() {
  clearStoredLogs();
  currentViewId = crypto.randomUUID();
  pageEnteredAt = performance.now();
  currentPath = "";
  currentTab = "";
  tabEnteredAt = performance.now();
  push({
    type: "session",
    action: "start",
    viewId: currentViewId,
  });
}

export function setActivityLoggingEnabled(enabled) {
  if (enabled === loggingEnabled) {
    return;
  }
  loggingEnabled = enabled;
  if (!enabled) {
    logs.length = 0;
    notify();
    return;
  }

  syncOptInFromStorage();
  if (userOptIn) {
    beginSession();
  }
}

export function getActivityLogOptIn() {
  syncOptInFromStorage();
  return userOptIn;
}

export function setActivityLogOptIn(optIn) {
  const next = Boolean(optIn);
  if (next === userOptIn) {
    return;
  }
  userOptIn = next;
  if (canUseStorage()) {
    try {
      localStorage.setItem(OPT_IN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  if (!next) {
    clearStoredLogs();
  } else if (loggingEnabled) {
    beginSession();
  }
  notify();
}

export function isActivityLoggingEnabled() {
  return isRecording();
}

function push(entry) {
  if (!isRecording()) {
    return;
  }
  logs.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...entry,
  });
  persistToStorage();
  notify();
}

export function subscribeActivityLogs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActivityLogSnapshot() {
  return isRecording() ? logs.length : 0;
}

export function getCurrentViewId() {
  return currentViewId;
}

export function getActivityLogs() {
  return [...logs];
}

export function logPageView(pathname) {
  if (!isRecording()) {
    return;
  }
  const now = performance.now();
  if (currentPath && currentPath !== pathname) {
    push({
      type: "page",
      action: "leave",
      viewId: currentViewId,
      path: currentPath,
      durationMs: Math.round(now - pageEnteredAt),
    });
  }
  if (pathname !== currentPath) {
    if (currentPath) {
      currentViewId = crypto.randomUUID();
    }
    pageEnteredAt = now;
    currentPath = pathname;
    currentTab = "";
    tabEnteredAt = now;
    push({
      type: "page",
      action: "enter",
      viewId: currentViewId,
      path: pathname,
    });
  }
}

export function logTabView(pathname, tabValue) {
  if (!isRecording()) {
    return;
  }
  const now = performance.now();
  const tabKey = `${pathname}::${tabValue}`;
  const prevKey = currentTab ? `${currentPath}::${currentTab}` : "";
  if (currentTab && prevKey !== tabKey) {
    push({
      type: "tab",
      action: "leave",
      viewId: currentViewId,
      path: currentPath,
      tab: currentTab,
      durationMs: Math.round(now - tabEnteredAt),
    });
  }
  if (tabValue !== currentTab || currentPath !== pathname) {
    currentPath = pathname;
    currentTab = tabValue;
    tabEnteredAt = now;
    push({
      type: "tab",
      action: "enter",
      viewId: currentViewId,
      path: pathname,
      tab: tabValue,
    });
  }
}

export function logApiCall({
  method,
  url,
  durationMs,
  status,
  ok,
  viewId,
  error,
}) {
  if (!isRecording()) {
    return;
  }
  push({
    type: "api",
    viewId: viewId ?? currentViewId,
    path: currentPath || null,
    method,
    url,
    durationMs: Math.round(durationMs),
    status,
    ok,
    error: error || null,
  });
}

export function downloadActivityLogs() {
  if (!isRecording() || logs.length === 0) {
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    currentViewId,
    currentPath,
    currentTab: currentTab || null,
    entries: getActivityLogs(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `smash-kameti-activity-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
