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

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }

  const kametiTransfers = data.kameti?.transfers || [];
  const americanTransfers = data.american?.transfers || [];
  const overallTransfers = data.overall?.transfers || data.recommendations || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium">Settlements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Check Settled on Kameti/American rows when paid (admin only). Overall is read-only."
            : "Who owes whom — view only. Admin login required to mark settled or record payments."}
        </p>
      </div>

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
    </div>
  );
}
