import { Suspense } from "react";
import NewOutingClient from "./new-outing-client";

export default function NewOutingPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading form…</p>}
    >
      <NewOutingClient />
    </Suspense>
  );
}
