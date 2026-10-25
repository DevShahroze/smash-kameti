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
  dashboard: ["dashboard"],
  settlements: ["settlements"],
  transactions: ["transactions"],
  settings: ["settings"],
  kametiRotations: ["kameti-rotations"],
  kametiRotation: (id) => ["kameti-rotation", id],
  kametiTurns: (rotationId) => ["kameti-turns", rotationId],
  kametiTurn: (turnId) => ["kameti-turn", turnId],
  outing: (id) => ["outing", id],
  member: (id) => ["member", id],
};

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
