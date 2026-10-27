import { memo } from "react";
import { formatPKR } from "@/lib/money";

export const Money = memo(function Money({ paisa, className = "", whole = false }) {
  return (
    <span className={className}>{formatPKR(paisa || 0, { whole })}</span>
  );
});
