import { apiFetch } from "@/lib/api/client";
import { getSessionGetPaths } from "@/lib/api/interceptor";
import { queryKeys } from "@/lib/api/query-config";

export function querySpecForApiPath(path) {
  const qIndex = path.indexOf("?");
  const pathname = qIndex === -1 ? path : path.slice(0, qIndex);
  const search = qIndex === -1 ? "" : path.slice(qIndex + 1);
  const params = new URLSearchParams(search);

  const withFetch = (queryKey) => ({
    queryKey,
    queryFn: () => apiFetch(path),
  });

  if (pathname === "/api/members") {
    return withFetch(queryKeys.members);
  }
  if (pathname === "/api/guests") {
    return withFetch(queryKeys.guests);
  }
  if (pathname === "/api/venues") {
    return withFetch(queryKeys.venues);
  }
  if (pathname === "/api/outings") {
    return withFetch(queryKeys.outings);
  }
  if (pathname === "/api/dashboard") {
    return withFetch(queryKeys.dashboard);
  }
  if (pathname === "/api/settlements") {
    return withFetch(queryKeys.settlements);
  }
  if (pathname === "/api/transactions") {
    return withFetch(queryKeys.transactions);
  }
  if (pathname === "/api/settings") {
    return withFetch(queryKeys.settings);
  }
  if (pathname === "/api/kameti/rotations") {
    return withFetch(queryKeys.kametiRotations);
  }

  const outingMatch = pathname.match(/^\/api\/outings\/([^/]+)$/);
  if (outingMatch) {
    return withFetch(queryKeys.outing(outingMatch[1]));
  }

  const memberMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberMatch) {
    return withFetch(queryKeys.member(memberMatch[1]));
  }

  const rotationMatch = pathname.match(/^\/api\/kameti\/rotations\/([^/]+)$/);
  if (rotationMatch) {
    return withFetch(queryKeys.kametiRotation(rotationMatch[1]));
  }

  if (pathname === "/api/kameti/turns") {
    const rotationId = params.get("rotationId");
    if (rotationId) {
      return withFetch(queryKeys.kametiTurns(rotationId));
    }
  }

  const turnMatch = pathname.match(/^\/api\/kameti\/turns\/([^/]+)$/);
  if (turnMatch) {
    return withFetch(queryKeys.kametiTurn(turnMatch[1]));
  }

  return withFetch(["api", pathname, search]);
}

export async function replaySessionGetQueries(queryClient) {
  const paths = getSessionGetPaths();
  if (!paths.length) {
    return;
  }

  const seen = new Set();
  const tasks = [];

  for (const path of paths) {
    const spec = querySpecForApiPath(path);
    const key = JSON.stringify(spec.queryKey);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: spec.queryKey,
        queryFn: spec.queryFn,
        staleTime: 0,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
