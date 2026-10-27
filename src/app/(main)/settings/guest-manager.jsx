"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminOnly } from "@/components/auth/admin-only";

export function GuestManager() {
  const queryClient = useQueryClient();
  const { data: guests = [] } = useQuery({
    queryKey: ["guests"],
    queryFn: () => apiFetch("/api/guests"),
  });
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/guests", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setName("");
      toast.success("Guest added");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="home-stat-card max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Guests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Guests can attend outings and may be charged in American splits. They never join the Kameti rotation.
        </p>
        <AdminOnly>
          <div className="flex gap-2">
            <div className="grid flex-1 gap-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button
              className="mt-auto"
              size="sm"
              disabled={!name.trim()}
              onClick={() => createMutation.mutate()}
            >
              Add
            </Button>
          </div>
        </AdminOnly>
        <ul className="text-sm">
          {guests.map((g) => (
            <li key={g._id} className="border-b py-1 last:border-0">{g.name}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
