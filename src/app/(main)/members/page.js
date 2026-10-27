"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppPanel,
  appTableCellClass,
  appTableHeadClass,
  appTableHeadRowClass,
} from "@/components/layout/app-panel";
import { Badge } from "@/components/ui/badge";

export default function MembersPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.members,
    queryFn: () => apiFetch("/api/members"),
  });
  const { data: guests = [] } = useQuery({
    queryKey: queryKeys.guests,
    queryFn: () => apiFetch("/api/guests"),
  });

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [guestName, setGuestName] = useState("");
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (body) =>
      apiFetch("/api/members", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      setFullName("");
      setNickname("");
      setOpen(false);
      toast.success("Member added");
    },
    onError: (e) => toast.error(e.message),
  });

  const guestMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/guests", {
        method: "POST",
        body: JSON.stringify({ name: guestName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests });
      setGuestName("");
      toast.success("Guest added");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) =>
      apiFetch(`/api/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });

  const activeCount = members.filter((m) => m.active).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Members"
        description={
          isLoading
            ? "Loading roster…"
            : `${activeCount} active · ${members.length} total · ${guests.length} guest${guests.length === 1 ? "" : "s"}`
        }
      >
        <AdminOnly>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
            Add member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>
              <Button
                onClick={() =>
                  createMutation.mutate({ fullName, nickname, active: true })
                }
                disabled={!fullName.trim()}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </AdminOnly>
      </PageHeader>

      <AppPanel>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : members.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No members yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={appTableHeadRowClass}>
                <TableHead className={appTableHeadClass}>Name</TableHead>
                <TableHead className={appTableHeadClass}>Nickname</TableHead>
                <TableHead className={appTableHeadClass}>Status</TableHead>
                {isAdmin ? (
                  <TableHead className={cn(appTableHeadClass, "text-right")} />
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className={appTableCellClass}>{m.fullName}</TableCell>
                  <TableCell className={appTableCellClass}>
                    {m.nickname || "—"}
                  </TableCell>
                  <TableCell className={appTableCellClass}>
                    <Badge
                      variant={m.active ? "secondary" : "outline"}
                      className="font-normal"
                    >
                      {m.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className={cn(appTableCellClass, "text-right")}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleMutation.mutate({ id: m._id, active: !m.active })
                        }
                      >
                        {m.active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AppPanel>

      <AppPanel className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-medium">Guests</h2>
          <p className="text-xs text-muted-foreground">
            Guests can join outings; assign them on the outing form.
          </p>
        </div>
        <AdminOnly>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!guestName.trim()}
              onClick={() => guestMutation.mutate()}
            >
              Add guest
            </Button>
          </div>
        </AdminOnly>
        {guests.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {guests.map((g) => g.name).join(", ")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No guests yet.</p>
        )}
      </AppPanel>
    </div>
  );
}
