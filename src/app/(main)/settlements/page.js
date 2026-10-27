"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  QUERY_STALE_SETTLEMENTS_MS,
  queryKeys,
} from "@/lib/api/query-config";
import { SettlementTransferTable } from "@/components/settlements/settlement-transfer-table";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

export default function SettlementsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settlements,
    queryFn: () => apiFetch("/api/settlements"),
    staleTime: QUERY_STALE_SETTLEMENTS_MS,
  });

  const settleMutation = useMutation({
    mutationFn: (body) =>
      apiFetch("/api/settlements/rows", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const kametiTransfers = data?.kameti?.transfers || [];
  const americanTransfers = data?.american?.transfers || [];
  const overallTransfers =
    data?.overall?.transfers || data?.recommendations || [];
  const openCount =
    kametiTransfers.filter((r) => !r.settled).length +
    americanTransfers.filter((r) => !r.settled).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settlements"
        description={
          isLoading
            ? "Loading balances…"
            : error
              ? "Could not load settlements"
              : isAdmin
                ? `${openCount} open Kameti/American row${openCount === 1 ? "" : "s"} · mark Settled when paid`
                : `${openCount} open row${openCount === 1 ? "" : "s"} · view only`
        }
      />

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
      <SettlementTransferTable
        scope="kameti"
        title="Kameti settlement"
        description="Kameti nights: treat split among members with Pays share checked on each bill; host payment counts. Parcels stay personal."
        transfers={kametiTransfers}
        showSettledCheckbox={isAdmin}
        onSettledChange={
          isAdmin ? (body) => settleMutation.mutate(body) : undefined
        }
        settlePending={settleMutation.isPending}
      />

      <SettlementTransferTable
        scope="american"
        title="American settlement"
        description="American shared bills (chargeable members only) and personal parcels."
        transfers={americanTransfers}
        showSettledCheckbox={isAdmin}
        onSettledChange={
          isAdmin ? (body) => settleMutation.mutate(body) : undefined
        }
        settlePending={settleMutation.isPending}
      />

      <SettlementTransferTable
        title="Overall settlement"
        description="All Kameti and American expenses plus completed member-to-member transfers."
        transfers={overallTransfers}
      />
        </>
      )}
    </div>
  );
}
