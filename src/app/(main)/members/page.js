"use client";

import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [open, setOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [guestFormName, setGuestFormName] = useState("");
  const [guestFormNotes, setGuestFormNotes] = useState("");
  const [deleteGuestTarget, setDeleteGuestTarget] = useState(null);
  const [bankDialogMember, setBankDialogMember] = useState(null);
  const [bankAccountInfo, setBankAccountInfo] = useState("");

  async function copyBankInfo(member) {
    const text = member.bankAccountInfo?.trim();
    if (!text) {
      return;
    }
    const payload = `${member.fullName}\n${text}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Bank info copied");
    } catch (e) {
      toast.error(e.message);
    }
  }

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

  function closeGuestDialog() {
    setGuestDialogOpen(false);
    setEditingGuest(null);
    setGuestFormName("");
    setGuestFormNotes("");
  }

  function openAddGuest() {
    setEditingGuest(null);
    setGuestFormName("");
    setGuestFormNotes("");
    setGuestDialogOpen(true);
  }

  function openEditGuest(guest) {
    setEditingGuest(guest);
    setGuestFormName(guest.name);
    setGuestFormNotes(guest.notes || "");
    setGuestDialogOpen(true);
  }

  const saveGuestMutation = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({
        name: guestFormName.trim(),
        notes: guestFormNotes,
      });
      if (editingGuest) {
        return apiFetch(`/api/guests/${editingGuest._id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiFetch("/api/guests", { method: "POST", body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests });
      closeGuestDialog();
      toast.success(editingGuest ? "Guest updated" : "Guest added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGuestMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/guests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests });
      setDeleteGuestTarget(null);
      toast.success("Guest deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const bankMutation = useMutation({
    mutationFn: ({ id, bankAccountInfo: info }) =>
      apiFetch(`/api/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ bankAccountInfo: info }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      setBankDialogMember(null);
      setBankAccountInfo("");
      toast.success("Bank info saved");
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

      <Dialog
        open={Boolean(bankDialogMember)}
        onOpenChange={(next) => {
          if (!next) {
            setBankDialogMember(null);
            setBankAccountInfo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bank account — {bankDialogMember?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="bank-account-info">Account details</Label>
              <Textarea
                id="bank-account-info"
                rows={5}
                placeholder="Bank name, account title, account / IBAN number…"
                value={bankAccountInfo}
                onChange={(e) => setBankAccountInfo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Visible to all members on this page. Anyone can copy it for
                transfers.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBankDialogMember(null);
                  setBankAccountInfo("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={bankMutation.isPending}
                onClick={() =>
                  bankMutation.mutate({
                    id: bankDialogMember._id,
                    bankAccountInfo,
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <TableHead className={appTableHeadClass}>Bank account</TableHead>
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
                  <TableCell className={appTableCellClass}>
                    <div className="flex max-w-xs items-start gap-1">
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-xs",
                          m.bankAccountInfo?.trim()
                            ? "text-foreground whitespace-pre-wrap"
                            : "text-muted-foreground",
                        )}
                      >
                        {m.bankAccountInfo?.trim()
                          ? m.bankAccountInfo.trim()
                          : "—"}
                      </span>
                      {m.bankAccountInfo?.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Copy bank info for ${m.fullName}`}
                          onClick={() => copyBankInfo(m)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      ) : null}
                      <AdminOnly>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit bank info for ${m.fullName}`}
                          onClick={() => {
                            setBankDialogMember(m);
                            setBankAccountInfo(m.bankAccountInfo || "");
                          }}
                        >
                          <Pencil />
                        </Button>
                      </AdminOnly>
                    </div>
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

      <AppPanel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">Guests</h2>
            <p className="text-xs text-muted-foreground">
              Guests can join outings; assign them on the outing form.
            </p>
          </div>
          <AdminOnly>
            <Button type="button" size="sm" onClick={openAddGuest}>
              Add guest
            </Button>
          </AdminOnly>
        </div>
        {guests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No guests yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={appTableHeadRowClass}>
                <TableHead className={appTableHeadClass}>Name</TableHead>
                <TableHead className={appTableHeadClass}>Notes</TableHead>
                {isAdmin ? (
                  <TableHead className={cn(appTableHeadClass, "text-right w-36")}>
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g._id}>
                  <TableCell className={cn(appTableCellClass, "font-medium")}>
                    {g.name}
                  </TableCell>
                  <TableCell
                    className={cn(
                      appTableCellClass,
                      "max-w-md text-muted-foreground",
                    )}
                  >
                    {g.notes?.trim() ? g.notes.trim() : "—"}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className={cn(appTableCellClass, "text-right")}>
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit guest ${g.name}`}
                          onClick={() => openEditGuest(g)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete guest ${g.name}`}
                          onClick={() => setDeleteGuestTarget(g)}
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
        )}
      </AppPanel>

      <Dialog
        open={guestDialogOpen}
        onOpenChange={(next) => {
          if (!next) {
            closeGuestDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Edit guest" : "Add guest"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                value={guestFormName}
                onChange={(e) => setGuestFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-notes">Notes</Label>
              <Textarea
                id="guest-notes"
                rows={3}
                value={guestFormNotes}
                onChange={(e) => setGuestFormNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeGuestDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!guestFormName.trim() || saveGuestMutation.isPending}
                onClick={() => saveGuestMutation.mutate()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteGuestTarget)}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteGuestTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete guest?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGuestTarget ? (
                <>
                  Remove{" "}
                  <span className="font-medium text-foreground">
                    {deleteGuestTarget.name}
                  </span>{" "}
                  from the guest list. This only works if they are not on any
                  saved outing.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteGuestTarget &&
                deleteGuestMutation.mutate(deleteGuestTarget._id)
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
