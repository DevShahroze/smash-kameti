import { memo } from "react";
import { formatPKR } from "@/lib/money";

export const Money = memo(function Money({ paisa, className = "" }) {
  return <span className={className}>{formatPKR(paisa || 0)}</span>;
});
