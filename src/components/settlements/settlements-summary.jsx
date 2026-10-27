"use client";

import { memo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  QUERY_STALE_SETTLEMENTS_MS,
  queryKeys,
} from "@/lib/api/query-config";
import { Money } from "@/components/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Live group balances — works during an active Kameti rotation.
 * American splits & personal parcels update settlements; Kameti treat bills do not split the group.
 */
export const SettlementsSummary = memo(function SettlementsSummary({
  compact = false,
  className,
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settlements,
    queryFn: () => apiFetch("/api/settlements"),
    staleTime: QUERY_STALE_SETTLEMENTS_MS,
  });

  if (isLoading) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Loading balances…
      </p>
    );
  }
  if (error) {
    return (
      <p className={cn("text-xs text-destructive", className)}>
        {error.message}
      </p>
    );
  }

  const transfers = (
    data.overall?.transfers ||
    data.recommendations ||
    []
  ).filter((r) => !r.settled);

  return (
    <section
      className={cn(
        "app-panel space-y-2 p-3 text-sm ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">Settlements</h2>
          <p className="text-xs text-muted-foreground">
            Overall who pays whom (American + Kameti parcels + transfers).
          </p>
        </div>
        <Link
          href="/settlements"
          className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
        >
          Open
        </Link>
      </div>

      {transfers.length === 0 ? (
        <p className="text-xs text-muted-foreground">Everyone is settled.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {(compact ? transfers.slice(0, 4) : transfers).map((r, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>
                {r.fromName} → {r.toName}
              </span>
              <Money paisa={r.amountPaisa} whole />
            </li>
          ))}
          {compact && transfers.length > 4 && (
            <li className="text-muted-foreground">
              +{transfers.length - 4} more on Settlements
            </li>
          )}
        </ul>
      )}
    </section>
  );
});
