"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { catalogQueries } from "@/lib/api/query-config";

/** Warm shared catalogs once per session so forms and lists reuse cache. */
export function QueryPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    for (const query of catalogQueries) {
      queryClient.prefetchQuery({
        ...query,
        staleTime: Infinity,
      });
    }
  }, [queryClient]);

  return null;
}
