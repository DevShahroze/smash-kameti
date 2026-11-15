"use client";

import { usePathname } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/lib/api/query-config";
import { bootstrapQueryForPath } from "@/lib/api/bootstrap-query";
import { AppLogo } from "@/components/brand/app-logo";

function BootstrapSplashMark() {
  const ringSize =
    "w-[min(92vw,22rem)] sm:w-[26rem] md:w-[30rem] max-w-[min(92vw,30rem)]";

  return (
    <div
      className={`relative aspect-square shrink-0 ${ringSize}`}
      aria-hidden
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          className="stroke-muted/40"
          strokeWidth="4.5"
        />
      </svg>
      <svg
        className="pointer-events-none absolute inset-0 size-full animate-spin"
        viewBox="0 0 120 120"
        style={{ animationDuration: "1.15s" }}
      >
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          className="stroke-primary"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="80 248"
        />
      </svg>
      <div className="absolute inset-[11%] flex items-center justify-center">
        <AppLogo
          pixelSize={512}
          priority
          className="size-full rounded-[1.35rem] object-contain sm:rounded-3xl"
        />
      </div>
    </div>
  );
}

export function AppBootstrapSplash({ children }) {
  const pathname = usePathname();
  const catalogs = useQueries({ queries: catalogQueries });
  const catalogsReady = catalogs.every((q) => q.isFetched);

  const routeSpec = bootstrapQueryForPath(pathname);
  const routeQuery = useQuery({
    queryKey: routeSpec?.queryKey ?? ["bootstrap", "idle"],
    queryFn: routeSpec?.queryFn ?? (async () => null),
    enabled: Boolean(routeSpec),
  });
  const routeReady = !routeSpec || routeQuery.isFetched;

  const showSplash = !catalogsReady || !routeReady;

  return (
    <>
      {children}
      {showSplash ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]"
          role="status"
          aria-busy="true"
          aria-label="Loading"
        >
          <BootstrapSplashMark />
        </div>
      ) : null}
    </>
  );
}