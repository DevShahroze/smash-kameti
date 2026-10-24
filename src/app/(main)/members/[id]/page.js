import { Suspense } from "react";
import MemberDetailClient from "./member-detail-client";

export default async function MemberDetailPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <MemberDetailClient id={id} />
    </Suspense>
  );
}
