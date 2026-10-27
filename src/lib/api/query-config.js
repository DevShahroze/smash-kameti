import { apiFetch } from "@/lib/api/client";

/** Default React Query timings (ms). */
export const QUERY_STALE_MS = 5 * 60_000;
export const QUERY_GC_MS = 30 * 60_000;
export const QUERY_STALE_SETTLEMENTS_MS = 10 * 60_000;

export const queryKeys = {
  members: ["members"],
  guests: ["guests"],
  venues: ["venues"],
  outings: ["outings"],
  outingsList: (page, pageSize) => ["outings", "list", page, pageSize],
  dashboard: ["dashboard"],
  settlements: ["settlements"],
  transactions: ["transactions"],
  transactionsHistory: (page, pageSize) => [
    "transactions",
    "history",
    page,
    pageSize,
  ],
  settings: ["settings"],
  kametiRotations: ["kameti-rotations"],
  kametiRotation: (id) => ["kameti-rotation", id],
  kametiTurns: (rotationId) => ["kameti-turns", rotationId],
  kametiTurn: (turnId) => ["kameti-turn", turnId],
  outing: (id) => ["outing", id],
  member: (id) => ["member", id],
};

/** Refetch Kameti list, rotation detail, and turns after bills or rotation edits. */
export function invalidateKametiQueries(queryClient, options = {}) {
  const { rotationId, turnId } = options;
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.kametiRotations }),
    queryClient.invalidateQueries({ queryKey: ["kameti-rotation"] }),
    queryClient.invalidateQueries({ queryKey: ["kameti-turns"] }),
    queryClient.invalidateQueries({ queryKey: ["kameti-turn"] }),
  ];
  if (rotationId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.kametiRotation(rotationId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.kametiTurns(rotationId),
      }),
    );
  }
  if (turnId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.kametiTurn(turnId) }),
    );
  }
  return Promise.all(invalidations);
}

/** Outings, dashboard, settlements, transactions, and Kameti caches. */
export function invalidateOutingFinancials(queryClient, options = {}) {
  const { outingId, rotationId, turnId } = options;
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.outings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
    invalidateKametiQueries(queryClient, { rotationId, turnId }),
  ];
  if (outingId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.outing(outingId) }),
    );
  }
  return Promise.all(invalidations);
}

export const catalogQueries = [
  {
    queryKey: queryKeys.members,
    queryFn: () => apiFetch("/api/members"),
  },
  {
    queryKey: queryKeys.guests,
    queryFn: () => apiFetch("/api/guests"),
  },
  {
    queryKey: queryKeys.venues,
    queryFn: () => apiFetch("/api/venues"),
  },
];
