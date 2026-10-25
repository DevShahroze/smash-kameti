"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  invalidateKametiQueries,
  queryKeys,
} from "@/lib/api/query-config";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  kametiBillPath,
  rotationStartedOn,
  rotationTitle,
} from "@/lib/kameti-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettlementsSummary } from "@/components/settlements/settlements-summary";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
import { Money } from "@/components/money";

function KametiPerMemberPay({
  rows,
  payersCount,
  treatSharePerMemberPaisa,
}) {
  return (
    <div className="mt-3 space-y-1 rounded-md border bg-background/80 p-2 text-xs">
      <p className="font-medium">
        What each person pays
        {payersCount > 0 ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            (treat{" "}
            <Money paisa={treatSharePerMemberPaisa} className="inline" /> each
            for {payersCount} with Pays share)
          </span>
        ) : null}
      </p>
      <ul className="divide-y">
        {rows.map((row) => (
          <li
            key={row.memberId}
            className="flex flex-wrap items-center justify-between gap-x-2 py-1"
          >
            <span className="font-medium">{row.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {row.treatSharePaisa > 0 ? (
                <>
                  Treat <Money paisa={row.treatSharePaisa} className="inline" />
                </>
              ) : (
                <span>No treat share</span>
              )}
              {row.parcelPaisa > 0 ? (
                <>
                  {" · "}
                  Parcel <Money paisa={row.parcelPaisa} className="inline" />
                </>
              ) : null}
              <span className="text-foreground">
                {" "}
                = <Money paisa={row.totalPayPaisa} className="inline" />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Parcels are personal (American settlement). Host credit is on the full
        bill in Kameti settlement.
      </p>
    </div>
  );
}

export function KametiDetailView({ rotationId }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.kametiRotation(rotationId),
    queryFn: () =>
      apiFetch(
        `/api/kameti/rotations/${rotationId}?include=turns`,
      ),
  });
  const rotation = data?.rotation ?? (data && !data.turns ? data : null);
  const turns = data?.turns ?? [];

  const patchRotation = useMutation({
    mutationFn: (body) =>
      apiFetch(`/api/kameti/rotations/${rotationId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void invalidateKametiQueries(queryClient, { rotationId });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTurn = useMutation({
    mutationFn: ({ id, body }) =>
      apiFetch(`/api/kameti/turns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void invalidateKametiQueries(queryClient, { rotationId });
      queryClient.invalidateQueries({ queryKey: queryKeys.outings });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!rotation) {
    return (
      <p className="text-sm text-destructive">
        Kameti not found.{" "}
        <Link href="/kameti" className="underline">
          Back to list
        </Link>
      </p>
    );
  }

  const pending = turns.filter((t) => t.status === "pending");
  const completedTurns = turns.filter((t) => t.status === "completed");
  const totalBillPaidPaisa = turns.reduce(
    (sum, t) => sum + (t.totalBillPaisa || 0),
    0,
  );
  const totalTreatPaisa = turns.reduce(
    (sum, t) => sum + (t.treatAmountPaisa || 0),
    0,
  );
  const completedBillPaidPaisa = completedTurns.reduce(
    (sum, t) => sum + (t.totalBillPaisa || 0),
    0,
  );
  const completedTreatPaisa = completedTurns.reduce(
    (sum, t) => sum + (t.treatAmountPaisa || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-medium">{rotationTitle(rotation)}</h1>
        <AdminOnly>
        <div className="flex flex-wrap items-center gap-2">
          {rotation.settlementsIncluded === false ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={patchRotation.isPending}
              onClick={() =>
                patchRotation.mutate({ settlementsIncluded: true })
              }
            >
              Include in settlements again
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={patchRotation.isPending}
              onClick={() =>
                patchRotation.mutate({ settlementsIncluded: false })
              }
            >
              Mark Kameti settled
            </Button>
          )}
          {!rotation.active ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={patchRotation.isPending}
              onClick={() => patchRotation.mutate({ active: true })}
            >
              Set as current Kameti
            </Button>
          ) : null}
        </div>
        </AdminOnly>
        <p className="text-xs text-muted-foreground">
          Started {rotationStartedOn(rotation)} ·{" "}
          {rotation.active ? "Current" : "Not current"} ·{" "}
          {rotation.settlementsIncluded === false
            ? "Settled — excluded from settlements"
            : "Open in settlements"}{" "}
          · {rotation.memberIds?.length ?? turns.length} members
          {turns.length > 0 && (
            <>
              {" · "}
              {completedTurns.length}/{turns.length} treats done
            </>
          )}
        </p>
      </div>

      <section className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <p className="text-muted-foreground">Turns</p>
          <p className="font-medium tabular-nums">
            {completedTurns.length}/{turns.length} done
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total bills paid (all turns)</p>
          <p className="font-medium">
            <Money paisa={totalBillPaidPaisa} />
          </p>
          <p className="text-[10px] text-muted-foreground">
            Shared + parcels
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Kameti split (all turns)</p>
          <p className="font-medium">
            <Money paisa={totalTreatPaisa} />
          </p>
          <p className="text-[10px] text-muted-foreground">
            Bill minus parcels
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Completed — total paid</p>
          <p className="font-medium">
            <Money paisa={completedBillPaidPaisa} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Completed — Kameti split</p>
          <p className="font-medium">
            <Money paisa={completedTreatPaisa} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Current turn</p>
          <p className="font-medium">
            {pending[0]
              ? `Week ${pending[0].turnNumber} · ${pending[0].memberNameSnapshot}`
              : turns.length
                ? "Rotation complete"
                : "—"}
          </p>
        </div>
      </section>

      <SettlementsSummary compact />

      <>
          {pending[0] ? (
            <div className="rounded-lg border border-primary/25 bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Current turn: </span>
              <span className="font-medium">
                Week {pending[0].turnNumber} — {pending[0].memberNameSnapshot}
              </span>
              <div className="mt-2">
                {isAdmin ? (
                  <Link
                    href={kametiBillPath(pending[0])}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    {pending[0].outingId ? "Edit bill" : "Add bill for this turn"}
                  </Link>
                ) : pending[0].outingId ? (
                  <Link
                    href={`/outings/${pending[0].outingId}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                  >
                    View bill
                  </Link>
                ) : null}
              </div>
              {pending[0].perMemberPay?.length > 0 ? (
                <KametiPerMemberPay
                  rows={pending[0].perMemberPay}
                  payersCount={pending[0].payersCount}
                  treatSharePerMemberPaisa={pending[0].treatSharePerMemberPaisa}
                />
              ) : null}
            </div>
          ) : turns.length > 0 && completedTurns.length === turns.length ? (
            <p className="text-sm text-muted-foreground">
              Rotation complete — all treats recorded.
            </p>
          ) : null}

          {turns.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Rotation order</h2>
              <ol className="grid gap-1 sm:grid-cols-2">
                {turns.map((t) => (
                  <li
                    key={t._id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs",
                      t.status === "completed" && "opacity-70",
                      pending[0] &&
                        t._id === pending[0]._id &&
                        "border-primary ring-1 ring-primary/30",
                    )}
                  >
                    <span className="w-5 shrink-0 font-medium tabular-nums text-muted-foreground">
                      {t.turnNumber}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {t.memberNameSnapshot}
                    </span>
                    <span className="shrink-0 capitalize">{t.status}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="space-y-2 rounded-lg border p-3">
            <h2 className="text-sm font-medium">Turns</h2>
            {turns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No turns.</p>
            ) : (
              <Table className="text-xs [&_td]:py-1.5 [&_th]:h-8 [&_th]:py-1">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total paid</TableHead>
                    <TableHead>Kameti split</TableHead>
                    <TableHead>Each pays (treat)</TableHead>
                    {isAdmin ? <TableHead /> : <TableHead>Bill</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turns.map((t) => (
                    <TableRow key={t._id} className="align-top">
                      <TableCell>{t.turnNumber}</TableCell>
                      <TableCell>{t.memberNameSnapshot}</TableCell>
                      <TableCell className="capitalize">{t.status}</TableCell>
                      <TableCell>
                        <Money paisa={t.totalBillPaisa || 0} />
                      </TableCell>
                      <TableCell>
                        <Money paisa={t.treatAmountPaisa || 0} />
                      </TableCell>
                      <TableCell>
                        {t.payersCount > 0 ? (
                          <span className="tabular-nums">
                            <Money paisa={t.treatSharePerMemberPaisa || 0} />
                            <span className="text-muted-foreground">
                              {" "}
                              × {t.payersCount}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {isAdmin ? (
                          <span className="space-x-1">
                            <Link
                              href={kametiBillPath(t)}
                              className={cn(
                                buttonVariants({
                                  size: "xs",
                                  variant: "outline",
                                }),
                              )}
                            >
                              {t.outingId ? "Edit bill" : "Bill"}
                            </Link>
                            {t.status === "pending" ? (
                              <Button
                                size="xs"
                                onClick={() =>
                                  updateTurn.mutate({
                                    id: t._id,
                                    body: { status: "completed" },
                                  })
                                }
                              >
                                Done
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() =>
                                  updateTurn.mutate({
                                    id: t._id,
                                    body: { status: "pending" },
                                  })
                                }
                              >
                                Reopen
                              </Button>
                            )}
                          </span>
                        ) : t.outingId ? (
                          <Link
                            href={`/outings/${t.outingId}`}
                            className="text-xs underline"
                          >
                            View
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {completedTurns.some((t) => t.perMemberPay?.length > 0) ? (
              <div className="mt-4 space-y-3 border-t pt-3">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Per person by completed turn
                </h3>
                {completedTurns
                  .filter((t) => t.perMemberPay?.length > 0)
                  .map((t) => (
                    <div key={t._id} className="space-y-1">
                      <p className="text-xs font-medium">
                        Week {t.turnNumber} — {t.memberNameSnapshot}
                      </p>
                      <KametiPerMemberPay
                        rows={t.perMemberPay}
                        payersCount={t.payersCount}
                        treatSharePerMemberPaisa={t.treatSharePerMemberPaisa}
                      />
                    </div>
                  ))}
              </div>
            ) : null}
          </section>

          {rotation.notes ? (
            <p className="text-xs text-muted-foreground">{rotation.notes}</p>
          ) : null}
      </>
    </div>
  );
}
