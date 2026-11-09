"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { kametiTableToClipboardText } from "@/lib/kameti-clipboard";

export function CopyTableButton({
  ariaLabel,
  headers,
  rows,
  stopRowClick = false,
}) {
  async function onCopy(e) {
    if (stopRowClick) {
      e.stopPropagation();
    }
    const text =
      headers?.length && rows
        ? kametiTableToClipboardText(headers, rows)
        : "No data";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Table copied");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      onClick={onCopy}
    >
      <Copy />
    </Button>
  );
}
