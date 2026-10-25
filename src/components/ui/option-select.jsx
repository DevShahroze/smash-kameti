"use client";

import { cn } from "cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Single-select with Base UI `items` so the trigger shows labels, not raw values.
 */
export function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  triggerClassName,
  contentClassName,
  size,
}) {
  const normalizedValue =
    value === undefined || value === null || value === ""
      ? null
      : String(value);

  function handleValueChange(next) {
    if (next === null || next === undefined) {
      onValueChange?.("");
      return;
    }
    const str = String(next);
    if (str === normalizedValue) {
      return;
    }
    onValueChange?.(str);
  }

  return (
    <Select
      value={normalizedValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      items={options}
    >
      <SelectTrigger
        size={size}
        className={cn("w-full min-w-0", triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((opt) => (
          <SelectItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
