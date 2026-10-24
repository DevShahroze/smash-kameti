"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { OptionSelect } from "@/components/ui/option-select";

/** American (split-bill) outing — not used for Kameti treat bills. */
export function AmericanOutingFields({
  activeMembers,
  memberLabel,
  memberOptions,
  chargeable,
  setChargeable,
  payerMemberId,
  setPayerMemberId,
  outingGuests,
  setOutingGuests,
}) {
  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Chargeable members (split)</Label>
        <div className="grid grid-cols-2 gap-1">
          {activeMembers.map((m) => (
            <label
              key={m._id}
              className="flex min-w-0 items-center gap-2 text-xs"
            >
              <Checkbox
                checked={Boolean(chargeable[`member:${m._id}`])}
                onCheckedChange={(v) =>
                  setChargeable((prev) => ({
                    ...prev,
                    [`member:${m._id}`]: Boolean(v),
                  }))
                }
              />
              <span className="truncate">{memberLabel(m)}</span>
            </label>
          ))}
        </div>
        <div className="space-y-1 pt-1">
          <Label className="text-xs">Who paid the shared bill?</Label>
          <OptionSelect
            value={payerMemberId}
            onValueChange={setPayerMemberId}
            options={memberOptions}
            placeholder="Select payer"
            triggerClassName="h-8 max-w-xs"
          />
        </div>
      </div>
    </>
  );
}

export function AmericanGuestPaysShare({
  guest,
  guestIndex,
  setOutingGuests,
  setChargeable,
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <Checkbox
        checked={guest.chargeableAmerican}
        onCheckedChange={(v) => {
          setOutingGuests((prev) => {
            const next = [...prev];
            next[guestIndex] = {
              ...guest,
              chargeableAmerican: Boolean(v),
            };
            return next;
          });
          if (guest.guestId) {
            setChargeable((prev) => ({
              ...prev,
              [`guest:${guest.guestId}`]: Boolean(v),
            }));
          }
        }}
      />
      Pays share
    </label>
  );
}
