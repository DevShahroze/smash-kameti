import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";

export const BOOTSTRAP_OUTINGS_PAGE_SIZE = 25;
export const BOOTSTRAP_TRANSACTIONS_PAGE_SIZE = 25;

/** Primary React Query for the current route (first paint / refresh). */
export function bootstrapQueryForPath(pathname) {
  if (!pathname?.startsWith("/")) {
    return null;
  }

  if (pathname === "/") {
    return {
      queryKey: queryKeys.dashboard,
      queryFn: () => apiFetch("/api/dashboard"),
    };
  }
  if (pathname === "/outings") {
    return {
      queryKey: queryKeys.outingsList(1, BOOTSTRAP_OUTINGS_PAGE_SIZE),
      queryFn: () =>
        apiFetch(
          `/api/outings?page=1&pageSize=${BOOTSTRAP_OUTINGS_PAGE_SIZE}`,
        ),
    };
  }
  const outingMatch = pathname.match(/^\/outings\/([^/]+)$/);
  if (outingMatch && outingMatch[1] !== "new") {
    const id = outingMatch[1];
    return {
      queryKey: queryKeys.outing(id),
      queryFn: () => apiFetch(`/api/outings/${id}`),
    };
  }
  if (pathname === "/kameti") {
    return {
      queryKey: queryKeys.kametiRotations,
      queryFn: () => apiFetch("/api/kameti/rotations"),
    };
  }
  const kametiMatch = pathname.match(/^\/kameti\/([^/]+)$/);
  if (kametiMatch && kametiMatch[1] !== "new") {
    const id = kametiMatch[1];
    return {
      queryKey: queryKeys.kametiRotation(id),
      queryFn: () =>
        apiFetch(`/api/kameti/rotations/${id}?include=turns`),
    };
  }
  if (pathname === "/settlements") {
    return {
      queryKey: queryKeys.settlements,
      queryFn: () => apiFetch("/api/settlements"),
    };
  }
  if (pathname === "/transactions") {
    return {
      queryKey: queryKeys.transactionsHistory(
        1,
        BOOTSTRAP_TRANSACTIONS_PAGE_SIZE,
      ),
      queryFn: () =>
        apiFetch(
          `/api/transactions?page=1&pageSize=${BOOTSTRAP_TRANSACTIONS_PAGE_SIZE}`,
        ),
    };
  }
  if (pathname === "/settings") {
    return {
      queryKey: queryKeys.settings,
      queryFn: () => apiFetch("/api/settings"),
    };
  }
  const memberMatch = pathname.match(/^\/members\/([^/]+)$/);
  if (memberMatch) {
    const id = memberMatch[1];
    return {
      queryKey: queryKeys.member(id),
      queryFn: () => apiFetch(`/api/members/${id}`),
    };
  }

  return null;
}