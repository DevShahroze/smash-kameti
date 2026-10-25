"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QUERY_GC_MS, QUERY_STALE_MS } from "@/lib/api/query-config";
import { replaySessionGetQueries } from "@/lib/api/replay-queries";
import { SaveNavigationGuard } from "@/components/providers/save-navigation-guard";

export function QueryProvider({ children }) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: QUERY_STALE_MS,
          gcTime: QUERY_GC_MS,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: true,
          structuralSharing: true,
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
    });
    if (typeof window !== "undefined") {
      void replaySessionGetQueries(qc);
    }
    return qc;
  });

  return (
    <QueryClientProvider client={client}>
      <SaveNavigationGuard />
      {children}
    </QueryClientProvider>
  );
}
