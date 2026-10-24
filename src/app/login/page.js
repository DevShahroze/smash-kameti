"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function signInAdmin(e) {
    e.preventDefault();
    setPending(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ mode: "admin", email, password }),
      });
      const from = searchParams.get("from") || "/";
      router.replace(from.startsWith("/login") ? "/" : from);
      router.refresh();
      toast.success("Signed in as admin");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-medium">Admin login</h1>
          <p className="text-xs text-muted-foreground">
            Use your admin email and password (stored hashed in MongoDB).
          </p>
        </div>

        <form className="space-y-3" onSubmit={signInAdmin}>
          <div className="space-y-1">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="sm" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full")}
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
