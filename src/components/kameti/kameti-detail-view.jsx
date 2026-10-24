"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { paisaFromRupees, rupeesFromPaisa } from "@/lib/money";
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

export function KametiDetailView({ rotationId }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: rotation, isLoading: rotationLoading } = useQuery({
    queryKey: ["kameti-rotation", rotationId],
    queryFn: () => apiFetch(`/api/kameti/rotations/${rotationId}`),
  });

  const { data: turns = [], isLoading: turnsLoading } = useQuery({
    queryKey: ["kameti-turns", rotationId],
    queryFn: () =>
      apiFetch(`/api/kameti/turns?rotationId=${rotationId}`),
    enabled: Boolean(rotationId),
  });

  const patchRotation = useMutation({
    mutationFn: (body) =>
      apiFetch(`/api/kameti/rotations/${rotationId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kameti-rotations"] });
      queryClient.invalidateQueries({ queryKey: ["kameti-rotation", rotationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
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
      queryClient.invalidateQueries({ queryKey: ["kameti-turns", rotationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (rotationLoading) {
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
  const isLoading = turnsLoading;

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

      <SettlementsSummary compact />

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading turns…</p>
      ) : (
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
                    <TableHead>Amount</TableHead>
                    {isAdmin ? <TableHead /> : <TableHead>Bill</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turns.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>{t.turnNumber}</TableCell>
                      <TableCell>{t.memberNameSnapshot}</TableCell>
                      <TableCell className="capitalize">{t.status}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Input
                            key={`${t._id}-${t.treatAmountPaisa}`}
                            className="h-7 w-20 px-2 text-xs"
                            type="number"
                            defaultValue={
                              rupeesFromPaisa(t.treatAmountPaisa) || ""
                            }
                            onBlur={(e) => {
                              const paisa = e.target.value
                                ? paisaFromRupees(e.target.value)
                                : 0;
                              if (paisa !== t.treatAmountPaisa) {
                                updateTurn.mutate({
                                  id: t._id,
                                  body: { treatAmountPaisa: paisa },
                                });
                              }
                            }}
                          />
                        ) : (
                          <Money paisa={t.treatAmountPaisa} />
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
          </section>

          {rotation.notes ? (
            <p className="text-xs text-muted-foreground">{rotation.notes}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
