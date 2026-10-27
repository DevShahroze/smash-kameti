import { cn } from "@/lib/utils";

export function AppPanel({ className, children }) {
  return (
    <div
      className={cn(
        "app-panel overflow-hidden ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const appTableHeadRowClass =
  "border-b bg-muted/40 hover:bg-muted/40";

export const appTableHeadClass = "px-3";

export const appTableCellClass = "px-3";
