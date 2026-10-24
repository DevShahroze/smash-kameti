"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { OutingForm } from "@/components/outings/outing-form";
import { OutingReadOnly } from "@/components/outings/outing-read-only";
import { useAuth } from "@/components/providers/auth-provider";

export default function EditOutingClient({ id }) {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["outing", id],
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
