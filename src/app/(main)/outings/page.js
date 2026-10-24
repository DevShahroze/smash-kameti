"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
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
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OutingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: outings = [], isLoading, error } = useQuery({
    queryKey: ["outings"],
    queryFn: () => apiFetch("/api/outings"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/outings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["kameti"] });
      toast.success("Outing deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-medium">Outings</h1>
        <AdminOnly>
          <Link href="/outings/new" className={cn(buttonVariants({ size: "sm" }))}>
            Add outing
          </Link>
        </AdminOnly>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>System</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Bill</TableHead>
            {isAdmin ? (
              <TableHead className="w-[88px] text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {outings.map((o) => (
            <TableRow key={o._id}>
              <TableCell>
                <Link
                  href={`/outings/${o._id}`}
                  className="font-medium hover:underline"
                >
                  {o.weekNumber}
                </Link>
              </TableCell>
              <TableCell>
                {o.actualDate || o.scheduledDate
                  ? format(
                      new Date(o.actualDate || o.scheduledDate),
                      "dd MMM yyyy",
                    )
                  : "—"}
              </TableCell>
              <TableCell>{o.venueNameSnapshot || "—"}</TableCell>
              <TableCell className="capitalize">{o.paymentSystem}</TableCell>
              <TableCell className="capitalize">
                {o.status}
                {o.settlementsIncluded === false ? (
                  <span className="ml-1 text-[10px] uppercase text-amber-600 dark:text-amber-500">
                    inactive
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <Money paisa={o.sharedBillPaisa} />
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-right">
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
