"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/money";
import { toast } from "sonner";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
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
import { PageHeader } from "@/components/layout/page-header";
import {
  AppPanel,
  appTableCellClass,
  appTableHeadClass,
  appTableHeadRowClass,
} from "@/components/layout/app-panel";
import { cn } from "@/lib/utils";

export default function VenuesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: venues = [], isLoading } = useQuery({
    queryKey: queryKeys.venues,
    queryFn: () => apiFetch("/api/venues"),
  });
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/venues", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues });
      setName("");
      toast.success("Venue added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/venues/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues });
      setDeleteTarget(null);
      toast.success("Venue deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Venues"
        description={
          isLoading
            ? "Loading venues…"
            : `${venues.length} restaurant${venues.length === 1 ? "" : "s"}`
        }
      />

      <AdminOnly>
        <AppPanel className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">Add a venue for outings.</p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Restaurant name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!name.trim()}
              onClick={() => createMutation.mutate()}
            >
              Add
            </Button>
          </div>
        </AppPanel>
      </AdminOnly>

      <AppPanel>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : venues.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No venues yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={appTableHeadRowClass}>
                <TableHead className={appTableHeadClass}>Name</TableHead>
                <TableHead className={appTableHeadClass}>Visits</TableHead>
                <TableHead className={appTableHeadClass}>Avg bill</TableHead>
                {isAdmin ? (
                  <TableHead className={cn(appTableHeadClass, "text-right w-24")}>
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((v) => (
                <TableRow key={v._id}>
                  <TableCell className={appTableCellClass}>{v.name}</TableCell>
                  <TableCell className={cn(appTableCellClass, "tabular-nums")}>
                    {v.stats?.visitCount || 0}
                  </TableCell>
                  <TableCell className={cn(appTableCellClass, "tabular-nums")}>
                    <Money paisa={v.stats?.averageBillPaisa || 0} />
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className={cn(appTableCellClass, "text-right")}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={(v.stats?.visitCount || 0) > 0}
                        aria-label={`Delete ${v.name}`}
                        title={
                          (v.stats?.visitCount || 0) > 0
                            ? "Cannot delete while Visits is greater than zero"
                            : (v.stats?.linkedOutingCount || 0) > 0
                              ? "Unlink or remove draft outings before deleting"
                              : "Delete venue"
                        }
                        onClick={() => setDeleteTarget(v)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AppPanel>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete venue?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Remove{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget.name}
                  </span>{" "}
                  from the list. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget._id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
