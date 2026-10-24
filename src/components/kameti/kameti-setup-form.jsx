"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paisaFromRupees } from "@/lib/money";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { MemberMultiCombobox } from "@/components/kameti/member-multi-combobox";

function memberLabel(m) {
  return m.nickname || m.fullName;
}

export function KametiSetupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => apiFetch("/api/members"),
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.active),
    [members],
  );

  const [order, setOrder] = useState([]);
  const [done, setDone] = useState({});
  const [label, setLabel] = useState("Smash Kameti");
  const [dragMemberId, setDragMemberId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  function removeFromOrder(memberId) {
    setOrder((prev) => prev.filter((id) => id !== memberId));
    setDone((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  function handleRotationMembersChange(newIds) {
    setOrder((prev) => {
      const kept = prev.filter((id) => newIds.includes(id));
      const added = newIds.filter((id) => !prev.includes(id));
      return [...kept, ...added];
    });
    setDone((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(prev)) {
        if (!newIds.includes(id)) {
          delete next[id];
        }
      }
      return next;
    });
  }

  function reorderOrder(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      return;
    }
    setOrder((prev) => {
      const fromIndex = prev.indexOf(fromId);
      const toIndex = prev.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) {
        return prev;
      }
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      return next;
    });
  }

  function moveInOrder(memberId, direction) {
    setOrder((prev) => {
      const i = prev.indexOf(memberId);
      if (i < 0) {
        return prev;
      }
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const saveOngoingKameti = useMutation({
    mutationFn: () => {
      const pastTurns = order
        .filter((id) => done[id]?.completed)
        .map((id) => ({
          memberId: id,
          treatAmountPaisa: done[id]?.amount
            ? paisaFromRupees(done[id].amount)
            : 0,
        }));
      return apiFetch("/api/kameti/rotations", {
        method: "POST",
        body: JSON.stringify({
          label,
          memberIds: order,
          pastTurns,
        }),
      });
    },
    onSuccess: (rotation) => {
      queryClient.invalidateQueries({ queryKey: ["kameti-rotations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Kameti rotation saved");
      router.push(`/kameti/${rotation._id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const orderedMembers = order
    .map((id) => activeMembers.find((m) => m._id === id))
    .filter(Boolean);

  return (
    <section className="space-y-2.5 rounded-lg border p-3">
      <h2 className="text-sm font-medium">
        Add ongoing Kameti (rotation already decided)
      </h2>
      <p className="text-xs leading-snug text-muted-foreground">
        Match your agreed order (#1 hosts first). Mark past treats, then save.
      </p>

      <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Name (optional)</Label>
          <Input
            className="h-8"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 2026 Kameti"
          />
        </div>
        {activeMembers.length > 0 && (
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs">Members</Label>
            <MemberMultiCombobox
              members={activeMembers}
              value={order}
              onValueChange={handleRotationMembersChange}
            />
          </div>
        )}
      </div>

      {orderedMembers.length === 0 ? (
        <p className="text-xs text-muted-foreground">Select members above.</p>
      ) : (
        <ol className="space-y-1">
          {orderedMembers.map((m, index) => (
            <li
              key={m._id}
              draggable
              onDragStart={() => setDragMemberId(m._id)}
              onDragEnd={() => {
                setDragMemberId(null);
                setDropTargetId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragMemberId && dragMemberId !== m._id) {
                  setDropTargetId(m._id);
                }
              }}
              onDragLeave={() => {
                if (dropTargetId === m._id) {
                  setDropTargetId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragMemberId) {
                  reorderOrder(dragMemberId, m._id);
                }
                setDragMemberId(null);
                setDropTargetId(null);
              }}
              className={cn(
                "flex flex-wrap items-center gap-1 rounded-md border bg-background px-1.5 py-1 text-xs sm:flex-nowrap sm:text-sm",
                dragMemberId === m._id && "opacity-50",
                dropTargetId === m._id && "border-primary ring-1 ring-primary/30",
              )}
            >
              <button
                type="button"
                className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5"
                  disabled={index === 0}
                  aria-label="Move up"
                  onClick={() => moveInOrder(m._id, "up")}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5"
                  disabled={index === orderedMembers.length - 1}
                  aria-label="Move down"
                  onClick={() => moveInOrder(m._id, "down")}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <span className="w-5 shrink-0 text-center font-medium text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {memberLabel(m)}
              </span>
              <label className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <Checkbox
                  className="size-3.5"
                  checked={Boolean(done[m._id]?.completed)}
                  onCheckedChange={(v) =>
                    setDone((p) => ({
                      ...p,
                      [m._id]: { ...p[m._id], completed: Boolean(v) },
                    }))
                  }
                />
                <span className="text-xs">Done</span>
              </label>
              {done[m._id]?.completed && (
                <Input
                  className="h-7 w-20 px-2 text-xs"
                  type="number"
                  placeholder="PKR"
                  value={done[m._id]?.amount || ""}
                  onChange={(e) =>
                    setDone((p) => ({
                      ...p,
                      [m._id]: { ...p[m._id], amount: e.target.value },
                    }))
                  }
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Remove from rotation"
                onClick={() => removeFromOrder(m._id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Button
        type="button"
        size="sm"
        disabled={order.length === 0 || saveOngoingKameti.isPending}
        onClick={() => saveOngoingKameti.mutate()}
      >
        Save rotation
      </Button>
    </section>
  );
}
