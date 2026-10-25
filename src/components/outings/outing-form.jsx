"use client";
/* eslint-disable react-hooks/set-state-in-effect -- sync loaded outing / kameti turn into form state */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  invalidateOutingFinancials,
  queryKeys,
} from "@/lib/api/query-config";
import {
  paisaFromRupees,
  rupeesFromPaisa,
  participantKey,
} from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Money } from "@/components/money";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AmericanOutingFields,
  AmericanGuestPaysShare,
} from "@/components/outings/american-outing-fields";

const attendanceOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "not_recorded", label: "Not recorded" },
];

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "postponed", label: "Postponed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const outingTypeOptions = [
  { value: "american", label: "Outing (American split)" },
  { value: "kameti", label: "Kameti (treat bill)" },
];

function memberLabel(m) {
  return m.nickname || m.fullName;
}

function refKey(kind, id) {
  return `${kind}:${String(id)}`;
}

function parseRefKey(val) {
  const i = val.indexOf(":");
  if (i < 0) {
    return { kind: "", id: "" };
  }
  return { kind: val.slice(0, i), id: val.slice(i + 1) };
}

function participantDisplayName(kind, id, activeMembers, outingGuests) {
  if (!kind || id === undefined || id === "") {
    return "";
  }
  const sid = String(id);
  if (kind === "member") {
    const m = activeMembers.find((x) => String(x._id) === sid);
    return m ? memberLabel(m) : "";
  }
  if (kind === "guest") {
    const g = outingGuests.find((x) => String(x.guestId) === sid);
    return g ? `${g.nameSnapshot} (guest)` : "";
  }
  return "";
}

export function OutingForm({ initialOuting = null, prefill = null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialOuting);

  const { data: members = [] } = useQuery({
    queryKey: queryKeys.members,
    queryFn: () => apiFetch("/api/members"),
  });
  const { data: venues = [] } = useQuery({
    queryKey: queryKeys.venues,
    queryFn: () => apiFetch("/api/venues"),
  });
  const { data: guests = [] } = useQuery({
    queryKey: queryKeys.guests,
    queryFn: () => apiFetch("/api/guests"),
  });
  const [weekNumber, setWeekNumber] = useState(() =>
    prefill?.weekNumber ? Number(prefill.weekNumber) : 1,
  );
  const [outingDate, setOutingDate] = useState(() =>
    prefill?.actualDate ? String(prefill.actualDate).slice(0, 10) : "",
  );
  const [venueId, setVenueId] = useState("");
  const [newVenueName, setNewVenueName] = useState("");
  const [paymentSystem, setPaymentSystem] = useState(
    () => prefill?.paymentSystem || "american",
  );
  const [status, setStatus] = useState(() => {
    if (prefill?.status) {
      return prefill.status;
    }
    if (prefill?.paymentSystem === "kameti") {
      return "completed";
    }
    return "planned";
  });
  const [sharedBill, setSharedBill] = useState("");
  const [notes, setNotes] = useState("");
  const [settlementsIncluded, setSettlementsIncluded] = useState(true);
  const [kametiTurnId, setKametiTurnId] = useState(
    () => prefill?.kametiTurnId || "",
  );
  const [hostMemberId, setHostMemberId] = useState(
    () => prefill?.hostMemberId || "",
  );
  const [attendance, setAttendance] = useState({});
  const [kametiPaysShare, setKametiPaysShare] = useState({});
  const [chargeable, setChargeable] = useState({});
  const [outingGuests, setOutingGuests] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [payerMemberId, setPayerMemberId] = useState(
    () => prefill?.hostMemberId || "",
  );
  const [guestPickerKey, setGuestPickerKey] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isKametiOuting = paymentSystem === "kameti";
  const isAmericanOuting = paymentSystem === "american";

  const fixedKametiTurnId =
    kametiTurnId || initialOuting?.kametiTurnId || prefill?.kametiTurnId || "";

  const { data: rotations = [] } = useQuery({
    queryKey: queryKeys.kametiRotations,
    queryFn: () => apiFetch("/api/kameti/rotations"),
    enabled: isKametiOuting && !fixedKametiTurnId,
  });

  const activeRotation = rotations.find((r) => r.active) || rotations[0];
  const { data: turns = [] } = useQuery({
    queryKey: queryKeys.kametiTurns(activeRotation?._id),
    queryFn: () =>
      apiFetch(`/api/kameti/turns?rotationId=${activeRotation._id}`),
    enabled:
      isKametiOuting && Boolean(activeRotation?._id) && !fixedKametiTurnId,
  });

  const { data: kametiTurnById } = useQuery({
    queryKey: queryKeys.kametiTurn(fixedKametiTurnId),
    queryFn: () => apiFetch(`/api/kameti/turns/${fixedKametiTurnId}`),
    enabled: isKametiOuting && Boolean(fixedKametiTurnId),
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.active),
    [members],
  );

  const memberOptions = useMemo(
    () =>
      activeMembers.map((m) => ({
        value: m._id,
        label: memberLabel(m),
      })),
    [activeMembers],
  );

  const venueOptions = useMemo(
    () => venues.map((v) => ({ value: v._id, label: v.name })),
    [venues],
  );

  const guestPickerOptions = useMemo(
    () => guests.map((g) => ({ value: g._id, label: g.name })),
    [guests],
  );

  const parcelOrderedByOptions = useMemo(() => {
    const opts = activeMembers.map((m) => ({
      value: refKey("member", m._id),
      label: memberLabel(m),
    }));
    for (const g of outingGuests) {
      if (g.guestId) {
        opts.push({
          value: refKey("guest", g.guestId),
          label: `${g.nameSnapshot} (guest)`,
        });
      }
    }
    return opts;
  }, [activeMembers, outingGuests]);

  const parcelPaidByOptions = useMemo(
    () =>
      activeMembers.map((m) => ({
        value: refKey("member", m._id),
        label: memberLabel(m),
      })),
    [activeMembers],
  );

  /** Kameti treat bill: turn + host come from Kameti → Bill (never pick again). */
  const isKametiTreatBill = Boolean(
    !initialOuting && paymentSystem === "kameti" && kametiTurnId,
  );

  const linkedKametiTurn = useMemo(() => {
    if (kametiTurnById) {
      return kametiTurnById;
    }
    return turns.find((t) => String(t._id) === String(kametiTurnId));
  }, [kametiTurnById, turns, kametiTurnId]);

  const linkedHost = useMemo(
    () => activeMembers.find((m) => String(m._id) === String(hostMemberId)),
    [activeMembers, hostMemberId],
  );

  const prefillApplied = useRef(false);
  const turnBillPrefilledFor = useRef("");

  useEffect(() => {
    if (initialOuting || !prefill || prefillApplied.current) {
      return;
    }
    prefillApplied.current = true;
    if (prefill.weekNumber) {
      setWeekNumber(Number(prefill.weekNumber));
    }
    if (prefill.paymentSystem) {
      setPaymentSystem(prefill.paymentSystem);
    }
    if (prefill.kametiTurnId) {
      setKametiTurnId(prefill.kametiTurnId);
    }
    if (prefill.hostMemberId) {
      setHostMemberId(prefill.hostMemberId);
      setPayerMemberId(prefill.hostMemberId);
    }
    if (prefill.actualDate) {
      setOutingDate(String(prefill.actualDate).slice(0, 10));
    }
    if (prefill.status) {
      setStatus(prefill.status);
    } else if (prefill.paymentSystem) {
      setStatus("completed");
    }
  }, [initialOuting, prefill]);

  useEffect(() => {
    if (initialOuting || paymentSystem !== "kameti" || !kametiTurnId) {
      return;
    }
    const turn = linkedKametiTurn;
    if (!turn) {
      return;
    }
    const hostId = String(turn.memberId?._id ?? turn.memberId ?? "");
    if (hostId) {
      setHostMemberId(hostId);
      setPayerMemberId(hostId);
    }
    const turnKey = String(kametiTurnId);
    const billTotal =
      turn.totalBillPaisa || turn.treatAmountPaisa || 0;
    if (turnKey !== turnBillPrefilledFor.current && billTotal > 0) {
      turnBillPrefilledFor.current = turnKey;
      setSharedBill(String(rupeesFromPaisa(billTotal)));
    }
  }, [initialOuting, paymentSystem, kametiTurnId, linkedKametiTurn]);

  useEffect(() => {
    if (!initialOuting) {
      return;
    }
    setWeekNumber(initialOuting.weekNumber);
    const savedDate = initialOuting.actualDate || initialOuting.scheduledDate;
    setOutingDate(
      savedDate ? new Date(savedDate).toISOString().slice(0, 10) : "",
    );
    setVenueId(initialOuting.venueId ? String(initialOuting.venueId) : "");
    setPaymentSystem(initialOuting.paymentSystem);
    setStatus(initialOuting.status);
    setSharedBill(String(rupeesFromPaisa(initialOuting.sharedBillPaisa)));
    setNotes(initialOuting.notes || "");
    setSettlementsIncluded(initialOuting.settlementsIncluded !== false);
    setKametiTurnId(
      initialOuting.kametiTurnId ? String(initialOuting.kametiTurnId) : "",
    );
    setHostMemberId(
      initialOuting.hostMemberId ? String(initialOuting.hostMemberId) : "",
    );
    const att = {};
    const pays = {};
    for (const row of initialOuting.attendance || []) {
      const id = String(row.memberId);
      att[id] = row.status;
      if (initialOuting.paymentSystem === "kameti") {
        pays[id] =
          row.paysShare === false
            ? false
            : row.paysShare === true
              ? true
              : row.status === "present";
      }
    }
    if (initialOuting.paymentSystem === "kameti") {
      setKametiPaysShare(pays);
    }
    setAttendance(att);
    const ch = {};
    for (const p of initialOuting.chargeableParticipants || []) {
      ch[`${p.kind}:${p.refId}`] = true;
    }
    setChargeable(ch);
    setOutingGuests(initialOuting.guests || []);
    setParcels(
      (initialOuting.parcels || []).map((p) => ({
        id: String(p._id),
        orderedByKind: p.orderedBy.kind,
        orderedById: String(p.orderedBy.refId),
        orderedByName: p.orderedBy.nameSnapshot,
        amount: String(rupeesFromPaisa(p.amountPaisa)),
        paidByKind: p.paidBy.kind,
        paidById: String(p.paidBy.refId),
        paidByName: p.paidBy.nameSnapshot,
        notes: p.notes || "",
      })),
    );
    const firstPayment = initialOuting.payments?.[0];
    if (firstPayment?.paidBy?.kind === "member") {
      setPayerMemberId(String(firstPayment.paidBy.refId));
    }
  }, [initialOuting]);

  useEffect(() => {
    if (initialOuting || !activeMembers.length) {
      return;
    }
    setAttendance((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const m of activeMembers) {
        const id = String(m._id);
        if (next[id] === undefined) {
          next[id] = "present";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (isAmericanOuting) {
      setChargeable((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const m of activeMembers) {
          const key = `member:${m._id}`;
          if (next[key] === undefined) {
            next[key] = false;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [activeMembers, isAmericanOuting, initialOuting]);

  const sharedBillPaisa = sharedBill ? paisaFromRupees(sharedBill) : 0;
  const parcelTotalPaisa = parcels.reduce(
    (s, p) => s + (p.amount ? paisaFromRupees(p.amount) : 0),
    0,
  );
  const kametiSplitPaisa = Math.max(0, sharedBillPaisa - parcelTotalPaisa);
  const grandTotalPaisa = isKametiOuting
    ? sharedBillPaisa
    : sharedBillPaisa + parcelTotalPaisa;

  const chargeableList = useMemo(() => {
    const list = [];
    for (const m of activeMembers) {
      if (chargeable[`member:${m._id}`]) {
        list.push({
          kind: "member",
          refId: m._id,
          nameSnapshot: memberLabel(m),
        });
      }
    }
    for (const g of outingGuests) {
      if (g.chargeableAmerican && g.guestId) {
        list.push({
          kind: "guest",
          refId: g.guestId,
          nameSnapshot: g.nameSnapshot,
        });
      }
    }
    return list;
  }, [activeMembers, chargeable, outingGuests]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return apiFetch(`/api/outings/${initialOuting._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/api/outings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      const turnId = fixedKametiTurnId ? String(fixedKametiTurnId) : undefined;
      const rotationId = kametiTurnById?.rotationId
        ? String(kametiTurnById.rotationId)
        : activeRotation?._id
          ? String(activeRotation._id)
          : undefined;
      void invalidateOutingFinancials(queryClient, {
        outingId:
          isEdit && initialOuting?._id
            ? String(initialOuting._id)
            : undefined,
        rotationId,
        turnId,
      });
      toast.success(isEdit ? "Outing updated" : "Outing created");
      router.push("/outings");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/outings/${initialOuting._id}`, { method: "DELETE" }),
    onSuccess: () => {
      const turnId = fixedKametiTurnId ? String(fixedKametiTurnId) : undefined;
      const rotationId = kametiTurnById?.rotationId
        ? String(kametiTurnById.rotationId)
        : activeRotation?._id
          ? String(activeRotation._id)
          : undefined;
      void invalidateOutingFinancials(queryClient, {
        rotationId,
        turnId,
        outingId: initialOuting?._id
          ? String(initialOuting._id)
          : undefined,
      });
      toast.success("Outing deleted");
      router.push("/outings");
    },
    onError: (err) => toast.error(err.message),
  });

  async function ensureVenue() {
    if (venueId) {
      const v = venues.find((x) => x._id === venueId);
      return { venueId, venueNameSnapshot: v?.name || "" };
    }
    if (!newVenueName.trim()) {
      return { venueId: null, venueNameSnapshot: "" };
    }
    const created = await apiFetch("/api/venues", {
      method: "POST",
      body: JSON.stringify({ name: newVenueName.trim() }),
    });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues });
    return {
      venueId: created._id,
      venueNameSnapshot: created.name,
    };
  }

  function buildAmericanPayments() {
    const payments = [];
    if (sharedBillPaisa > 0 && payerMemberId) {
      const payer = activeMembers.find((m) => m._id === payerMemberId);
      payments.push({
        paidBy: {
          kind: "member",
          refId: payerMemberId,
          nameSnapshot: memberLabel(payer),
        },
        amountPaisa: sharedBillPaisa,
        appliesTo: "shared",
      });
    }
    for (const parcel of parcels) {
      const amountPaisa = paisaFromRupees(parcel.amount);
      if (amountPaisa <= 0 || !parcel.paidById) {
        continue;
      }
      payments.push({
        paidBy: {
          kind: parcel.paidByKind,
          refId: parcel.paidById,
          nameSnapshot: parcel.paidByName,
        },
        amountPaisa,
        appliesTo: `parcel:${parcel.id}`,
      });
    }
    return payments;
  }

  function buildKametiPayments(hostRef) {
    const payments = [];
    for (const parcel of parcels) {
      const amountPaisa = paisaFromRupees(parcel.amount);
      if (amountPaisa <= 0 || !parcel.paidById) {
        continue;
      }
      payments.push({
        paidBy: {
          kind: parcel.paidByKind,
          refId: parcel.paidById,
          nameSnapshot: parcel.paidByName,
        },
        amountPaisa,
        appliesTo: `parcel:${parcel.id}`,
      });
    }
    if (sharedBillPaisa > 0 && hostRef) {
      payments.unshift({
        paidBy: hostRef,
        amountPaisa: sharedBillPaisa,
        appliesTo: "shared",
      });
    }
    return payments;
  }

  async function handleSubmit() {
    if (isKametiOuting && !kametiTurnId && !isEdit) {
      toast.error("Open Kameti and use Bill on a turn to record a treat.");
      return;
    }
    for (const p of parcels) {
      const amountPaisa = paisaFromRupees(p.amount);
      if (amountPaisa > 0 && (!p.paidById || !p.orderedById)) {
        toast.error("Each parcel needs who ordered, who paid, and an amount.");
        return;
      }
    }
    const venueInfo = await ensureVenue();
    const hostMember = activeMembers.find((m) => m._id === hostMemberId);
    const hostRef = hostMember
      ? {
          kind: "member",
          refId: hostMemberId,
          nameSnapshot: memberLabel(hostMember),
        }
      : null;

    const payload = {
      weekNumber: Number(weekNumber),
      scheduledDate: outingDate ? new Date(outingDate).toISOString() : null,
      actualDate: outingDate ? new Date(outingDate).toISOString() : null,
      venueId: venueInfo.venueId,
      venueNameSnapshot: venueInfo.venueNameSnapshot,
      paymentSystem,
      status,
      kametiTurnId: paymentSystem === "kameti" ? kametiTurnId || null : null,
      hostMemberId: paymentSystem === "kameti" ? hostMemberId || null : null,
      hostMemberNameSnapshot: hostMember ? memberLabel(hostMember) : "",
      sharedBillPaisa,
      additionalExpensesPaisa: 0,
      notes,
      settlementsIncluded,
      attendance: activeMembers.map((m) => ({
        memberId: m._id,
        memberNameSnapshot: memberLabel(m),
        status: attendance[m._id] || "present",
        paysShare: isKametiOuting ? kametiPaysShare[m._id] !== false : true,
      })),
      guests: outingGuests,
      chargeableParticipants: isAmericanOuting ? chargeableList : [],
      parcels: parcels.map((p) => ({
        _id: p.id,
        orderedBy: {
          kind: p.orderedByKind,
          refId: p.orderedById,
          nameSnapshot: p.orderedByName,
        },
        amountPaisa: paisaFromRupees(p.amount),
        paidBy: {
          kind: p.paidByKind,
          refId: p.paidById,
          nameSnapshot: p.paidByName,
        },
        notes: p.notes,
      })),
      payments: isKametiOuting
        ? buildKametiPayments(hostRef)
        : buildAmericanPayments(),
    };

    mutation.mutate(payload);
  }

  function addGuestFromList(guestId) {
    const guest = guests.find((g) => g._id === guestId);
    if (!guest) {
      return;
    }
    setOutingGuests((prev) => [
      ...prev,
      {
        guestId: guest._id,
        nameSnapshot: guest.name,
        attended: true,
        chargeableAmerican: false,
      },
    ]);
  }

  function defaultKametiParcelPayer() {
    if (!isKametiOuting || !hostMemberId) {
      return { paidByKind: "", paidById: "", paidByName: "" };
    }
    const id = String(hostMemberId);
    const host = activeMembers.find((m) => String(m._id) === id);
    const name =
      (host ? memberLabel(host) : "") ||
      linkedKametiTurn?.memberNameSnapshot ||
      prefill?.hostMemberName ||
      "";
    return {
      paidByKind: "member",
      paidById: id,
      paidByName: name,
    };
  }

  function addParcel() {
    const payer = defaultKametiParcelPayer();
    setParcels((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        orderedByKind: "",
        orderedById: "",
        orderedByName: "",
        amount: "",
        paidByKind: payer.paidByKind,
        paidById: payer.paidById,
        paidByName: payer.paidByName,
        notes: "",
      },
    ]);
  }

  return (
    <div className="relative space-y-3 pb-20">
      {isKametiTreatBill && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium">
            Kameti
            {weekNumber ? ` · Week ${weekNumber}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Host:{" "}
            {prefill?.hostMemberName ||
              linkedKametiTurn?.memberNameSnapshot ||
              "—"}
            {prefill?.weekNumber || linkedKametiTurn?.turnNumber
              ? ` · Turn #${prefill?.weekNumber || linkedKametiTurn?.turnNumber}`
              : ""}
          </p>
        </div>
      )}

        <section className="space-y-2 rounded-lg border p-3">
          <h2 className="text-sm font-medium">Outing details</h2>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Week</Label>
                <Input
                  className="h-8"
                  type="number"
                  min={1}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <OptionSelect
                  value={status}
                  onValueChange={setStatus}
                  options={statusOptions}
                  triggerClassName="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  className="h-8"
                  type="date"
                  value={outingDate}
                  onChange={(e) => setOutingDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Venue</Label>
                <OptionSelect
                  value={venueId}
                  onValueChange={setVenueId}
                  options={venueOptions}
                  placeholder="Select venue"
                  triggerClassName="h-8 w-full"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New venue</Label>
                <Input
                  className="h-8"
                  placeholder="Create new venue"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Outing type</Label>
              {isKametiTreatBill || (isEdit && isKametiOuting) ? (
                <p className="text-sm text-muted-foreground">
                  Kameti (treat bill)
                </p>
              ) : isEdit && isAmericanOuting ? (
                <p className="text-sm text-muted-foreground">
                  Outing (American split)
                </p>
              ) : (
                <OptionSelect
                  value={paymentSystem}
                  onValueChange={setPaymentSystem}
                  options={outingTypeOptions}
                  triggerClassName="h-8"
                />
              )}
            </div>
            {isKametiOuting && !kametiTurnId && !isEdit && (
              <p className="text-xs text-muted-foreground">
                To record a Kameti treat, open{" "}
                <Link href="/kameti" className="underline">
                  Kameti
                </Link>{" "}
                and tap <strong>Bill</strong> on a turn. American outings use
                type <strong>Outing (American split)</strong> above.
              </p>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id="settlements-included"
                checked={settlementsIncluded}
                onCheckedChange={(v) => setSettlementsIncluded(v === true)}
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="settlements-included"
                  className="text-xs font-medium leading-none"
                >
                  Include in settlements
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Uncheck to mark this outing inactive — its bill will not count
                  in Kameti, American, or overall settlements.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h2 className="text-sm font-medium">Attendance & guests</h2>
          <div className="space-y-2">
            {!hasMounted ? (
              <p className="text-xs text-muted-foreground">Loading members…</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeMembers.map((m) => (
                  <div
                    key={m._id}
                    className="flex min-w-0 flex-col gap-1 rounded-md border px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <span className="truncate text-xs font-medium">
                        {memberLabel(m)}
                      </span>
                      <OptionSelect
                        value={attendance[m._id] || "present"}
                        onValueChange={(v) =>
                          setAttendance((prev) => ({ ...prev, [m._id]: v }))
                        }
                        options={attendanceOptions}
                        triggerClassName="h-7 w-[7.25rem] shrink-0 text-xs"
                        size="sm"
                      />
                    </div>
                    {isKametiOuting ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Checkbox
                          checked={kametiPaysShare[m._id] !== false}
                          onCheckedChange={(v) =>
                            setKametiPaysShare((prev) => ({
                              ...prev,
                              [m._id]: v === true,
                            }))
                          }
                        />
                        Pays share of bill
                      </label>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <OptionSelect
                key={guestPickerKey}
                onValueChange={(guestId) => {
                  if (!guestId) {
                    return;
                  }
                  addGuestFromList(guestId);
                  setGuestPickerKey((k) => k + 1);
                }}
                options={guestPickerOptions}
                placeholder="Add guest"
                triggerClassName="h-8 w-48 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
            {outingGuests.map((g, idx) => (
              <div
                key={idx}
                className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1"
              >
                <span className="w-full truncate text-xs font-medium">
                  {g.nameSnapshot}
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={g.attended}
                    onCheckedChange={(v) => {
                      const next = [...outingGuests];
                      next[idx] = { ...g, attended: Boolean(v) };
                      setOutingGuests(next);
                    }}
                  />
                  Attended
                </label>
                {isAmericanOuting && (
                  <AmericanGuestPaysShare
                    guest={g}
                    guestIndex={idx}
                    setOutingGuests={setOutingGuests}
                    setChargeable={setChargeable}
                  />
                )}
              </div>
            ))}
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h2 className="text-sm font-medium">Bill, split & parcels</h2>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">
                {isKametiOuting
                  ? "Total bill paid (PKR)"
                  : "Shared restaurant bill (PKR)"}
              </Label>
              <Input
                className="h-8 max-w-xs"
                type="number"
                min={0}
                step="0.01"
                value={sharedBill}
                onChange={(e) => setSharedBill(e.target.value)}
              />
            </div>

            {isAmericanOuting && (
              <AmericanOutingFields
                activeMembers={activeMembers}
                memberLabel={memberLabel}
                memberOptions={memberOptions}
                chargeable={chargeable}
                setChargeable={setChargeable}
                payerMemberId={payerMemberId}
                setPayerMemberId={setPayerMemberId}
              />
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Parcel orders (personal)</Label>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={addParcel}
                >
                  Add parcel
                </Button>
              </div>
              {parcels.map((p, idx) => (
                <div
                  key={p.id}
                  className="space-y-2 rounded-md border p-2"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Ordered by
                      </Label>
                      <OptionSelect
                        value={
                          p.orderedByKind && p.orderedById
                            ? refKey(p.orderedByKind, p.orderedById)
                            : ""
                        }
                        onValueChange={(val) => {
                          const { kind, id } = parseRefKey(val);
                          const name = participantDisplayName(
                            kind,
                            id,
                            activeMembers,
                            outingGuests,
                          );
                          const next = [...parcels];
                          next[idx] = {
                            ...p,
                            orderedByKind: kind,
                            orderedById: id,
                            orderedByName: name,
                          };
                          setParcels(next);
                        }}
                        options={parcelOrderedByOptions}
                        placeholder="Who ordered"
                        triggerClassName="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Amount (PKR)
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={p.amount}
                        onChange={(e) => {
                          const next = [...parcels];
                          next[idx] = { ...p, amount: e.target.value };
                          setParcels(next);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Paid by (settlement)
                      </Label>
                      <OptionSelect
                        value={
                          p.paidByKind && p.paidById
                            ? refKey(p.paidByKind, p.paidById)
                            : ""
                        }
                        onValueChange={(val) => {
                          const { kind, id } = parseRefKey(val);
                          const name = participantDisplayName(
                            kind,
                            id,
                            activeMembers,
                            outingGuests,
                          );
                          const next = [...parcels];
                          next[idx] = {
                            ...p,
                            paidByKind: kind,
                            paidById: id,
                            paidByName: name,
                          };
                          setParcels(next);
                        }}
                        options={parcelPaidByOptions}
                        placeholder="Who paid"
                        triggerClassName="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="shrink-0"
                      onClick={() =>
                        setParcels((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="min-h-16 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isKametiOuting ? (
                <>
                  Total bill: <Money paisa={sharedBillPaisa} /> · Parcels
                  (within bill): <Money paisa={parcelTotalPaisa} /> · Kameti
                  split: <Money paisa={kametiSplitPaisa} />
                </>
              ) : (
                <>
                  Shared: <Money paisa={sharedBillPaisa} /> · Parcels:{" "}
                  <Money paisa={parcelTotalPaisa} /> · Total:{" "}
                  <Money paisa={grandTotalPaisa} />
                </>
              )}
            </p>
          </div>
        </section>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-44"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending || mutation.isPending}
                  />
                }
              >
                Delete outing
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this outing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the outing, its allocations, and synced
                    transactions. Kameti turn links to this bill are cleared.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={
              mutation.isPending ||
              deleteMutation.isPending ||
              (isKametiOuting && !kametiTurnId && !isEdit)
            }
          >
            {mutation.isPending
              ? "Saving…"
              : isEdit
                ? "Update outing"
                : isKametiTreatBill
                  ? "Save bill"
                  : "Save outing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
