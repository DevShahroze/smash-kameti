"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  invalidateOutingFinancials,
  queryKeys,
} from "@/lib/api/query-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
import { Money } from "@/components/money";
import { PAYMENT_SYSTEMS } from "@/lib/constants";
import {
  kametiSplitPaisa,
  parcelTotalPaisa,
} from "@/lib/services/kameti-bill-stats";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppPanel,
  appTableCellClass,
  appTableHeadClass,
  appTableHeadRowClass,
} from "@/components/layout/app-panel";

function paymentSystemLabel(system) {
  return system === PAYMENT_SYSTEMS.KAMETI ? "Kameti" : "American";
}

const OUTINGS_PAGE_SIZE = 25;

function OutingsListPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  disabled,
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground"
    >
      <p>
        {total === 0
          ? "No outings"
          : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[7rem] text-center tabular-nums text-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function OutingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.outingsList(page, OUTINGS_PAGE_SIZE),
    queryFn: () =>
      apiFetch(`/api/outings?page=${page}&pageSize=${OUTINGS_PAGE_SIZE}`),
  });
  const outings = data?.items ?? [];
  const outingsTotal = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/outings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void invalidateOutingFinancials(queryClient);
      if (outings.length === 1 && page > 1) {
        setPage(page - 1);
      }
      toast.success("Outing deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outings"
        description={
          isLoading
            ? "Loading list…"
            : error
              ? "Could not load outings"
              : `${outingsTotal} recorded outing${outingsTotal === 1 ? "" : "s"}`
        }
      >
        <AdminOnly>
          <Link href="/outings/new" className={cn(buttonVariants({ size: "sm" }))}>
            Add outing
          </Link>
        </AdminOnly>
      </PageHeader>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      <AppPanel>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : outingsTotal === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No outings yet.{" "}
            <AdminOnly>
              <Link href="/outings/new" className="text-foreground underline">
                Add the first one
              </Link>
            </AdminOnly>
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow className={appTableHeadRowClass}>
                <TableHead className={appTableHeadClass}>Week</TableHead>
                <TableHead className={appTableHeadClass}>Date</TableHead>
                <TableHead className={appTableHeadClass}>Venue</TableHead>
                <TableHead className={appTableHeadClass}>System</TableHead>
                <TableHead className={appTableHeadClass}>Status</TableHead>
                <TableHead className={cn(appTableHeadClass, "text-right")}>
                  Bill
                </TableHead>
                <TableHead className={cn(appTableHeadClass, "text-right")}>
                  Kameti split
                </TableHead>
                {isAdmin ? (
                  <TableHead
                    className={cn(appTableHeadClass, "w-[88px] text-right")}
                  >
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {outings.map((o) => (
                <TableRow key={o._id}>
                  <TableCell className={appTableCellClass}>
                    <Link
                      href={`/outings/${o._id}`}
                      className="font-medium tabular-nums hover:underline"
                    >
                      {o.weekNumber}
                    </Link>
                  </TableCell>
                  <TableCell
                    className={cn(appTableCellClass, "text-muted-foreground")}
                  >
                    {o.actualDate || o.scheduledDate
                      ? format(
                          new Date(o.actualDate || o.scheduledDate),
                          "dd MMM yyyy",
                        )
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(appTableCellClass, "max-w-[12rem] truncate")}
                  >
                    {o.venueNameSnapshot || "—"}
                  </TableCell>
                  <TableCell className={appTableCellClass}>
                    <Badge variant="outline" className="font-normal">
                      {paymentSystemLabel(o.paymentSystem)}
                    </Badge>
                  </TableCell>
                  <TableCell className={appTableCellClass}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="font-normal capitalize">
                        {o.status}
                      </Badge>
                      {o.settlementsIncluded === false ? (
                        <Badge
                          variant="outline"
                          className="font-normal text-amber-700 dark:text-amber-500"
                        >
                          Excluded
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      appTableCellClass,
                      "text-right font-medium tabular-nums",
                    )}
                  >
                    <Money
                      paisa={
                        o.paymentSystem === PAYMENT_SYSTEMS.KAMETI
                          ? o.sharedBillPaisa || 0
                          : (o.sharedBillPaisa || 0) + parcelTotalPaisa(o)
                      }
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      appTableCellClass,
                      "text-right tabular-nums text-muted-foreground",
                    )}
                  >
                    {o.paymentSystem === PAYMENT_SYSTEMS.KAMETI ? (
                      <Money paisa={kametiSplitPaisa(o)} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className={cn(appTableCellClass, "text-right")}>
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <Link
                          href={`/outings/${o._id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          )}
                          aria-label={`Edit outing week ${o.weekNumber}`}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete outing week ${o.weekNumber}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleteTarget(o)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <OutingsListPagination
            page={page}
            pageCount={pageCount}
            total={outingsTotal}
            pageSize={OUTINGS_PAGE_SIZE}
            disabled={isFetching}
            onPageChange={setPage}
          />
          </>
        )}
      </AppPanel>

      <AdminOnly>
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open && !deleteMutation.isPending) {
              setDeleteTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this outing?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `Week ${deleteTarget.weekNumber}${
                      deleteTarget.venueNameSnapshot
                        ? ` · ${deleteTarget.venueNameSnapshot}`
                        : ""
                    } will be removed along with its allocations and synced transactions. Kameti turn links to this bill are cleared. This cannot be undone.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteMutation.isPending || !deleteTarget}
                onClick={() => {
                  if (deleteTarget?._id) {
                    deleteMutation.mutate(deleteTarget._id);
                  }
                }}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminOnly>
    </div>
  );
}
