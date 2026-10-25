"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { OutingReadOnly } from "@/components/outings/outing-read-only";
import { useAuth } from "@/components/providers/auth-provider";

const OutingForm = dynamic(
  () =>
    import("@/components/outings/outing-form").then((mod) => ({
      default: mod.OutingForm,
    })),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading form…</p>
    ),
  },
);

export default function EditOutingClient({ id }) {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.outing(id),
    queryFn: () => apiFetch(`/api/outings/${id}`),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading outing…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-medium">
        {isAdmin ? "Edit outing" : "View outing"}
      </h1>
      {isAdmin ? (
        <OutingForm initialOuting={data} />
      ) : (
        <OutingReadOnly outing={data} />
      )}
    </div>
  );
}
