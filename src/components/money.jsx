import { formatPKR } from "@/lib/money";

export function Money({ paisa, className = "" }) {
  return <span className={className}>{formatPKR(paisa || 0)}</span>;
}
