import { Suspense } from "react";
import EditOutingClient from "./edit-outing-client";

export default async function EditOutingPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading outing…</p>}>
      <EditOutingClient id={id} />
    </Suspense>
  );
}
