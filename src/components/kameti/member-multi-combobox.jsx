"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";

function memberLabel(m) {
  return m.nickname || m.fullName;
}

export function MemberMultiCombobox({ members, value, onValueChange }) {
  const anchor = useComboboxAnchor();
  const labelById = useMemo(
    () => Object.fromEntries(members.map((m) => [m._id, memberLabel(m)])),
    [members],
  );

  const allSelected =
    members.length > 0 && members.every((m) => value.includes(m._id));

  function selectAllOrClear() {
    if (allSelected) {
      onValueChange([]);
      return;
    }
    onValueChange(members.map((m) => m._id));
  }

  return (
    <Combobox
      multiple
      value={value}
      onValueChange={onValueChange}
      itemToStringLabel={(id) => labelById[id] ?? ""}
      isItemEqualToValue={(a, b) => a === b}
    >
      <div ref={anchor} className="max-w-md">
        <ComboboxChips className="min-h-7 py-0.5 text-xs">
          <ComboboxValue>
            {(selected) => (
              <>
                {(selected ?? []).map((id) => (
                  <ComboboxChip key={id}>{labelById[id]}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder="Select members…" />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
      </div>
      <ComboboxContent anchor={anchor}>
        <div className="border-b p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 w-full justify-start font-medium"
            onClick={selectAllOrClear}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>
        <ComboboxList>
          {members.map((m) => (
            <ComboboxItem key={m._id} value={m._id}>
              {memberLabel(m)}
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No members found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
