"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/money";
import { toast } from "sonner";
import { AdminOnly } from "@/components/auth/admin-only";

export default function VenuesPage() {
  const queryClient = useQueryClient();
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: () => apiFetch("/api/venues"),
  });
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/venues", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      setName("");
      toast.success("Venue added");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">Venues</h1>
      <AdminOnly>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder="Restaurant name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!name.trim()}
            onClick={() => createMutation.mutate()}
          >
            Add
          </Button>
        </div>
      </AdminOnly>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Avg bill</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((v) => (
            <TableRow key={v._id}>
              <TableCell>{v.name}</TableCell>
              <TableCell>{v.stats?.visitCount || 0}</TableCell>
              <TableCell>
                <Money paisa={v.stats?.averageBillPaisa || 0} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
