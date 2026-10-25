"use client";

import { memo, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GoBack } from "@/components/layout/go-back";
import { TopNavbar, SidebarNav } from "@/components/layout/top-navbar";
import { ROLES } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { ActivityNavigationLogger } from "@/components/logging/activity-navigation-logger";

const AuthFooter = memo(function AuthFooter({ isGuest }) {
  if (!isGuest) {
    return null;
  }
  return (
    <div className="border-t p-2">
      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-7 w-full text-xs",
        )}
        data-allow-guest
      >
        Admin login
      </Link>
    </div>
  );
});

export const AppShell = memo(function AppShell({ children, role }) {
  const router = useRouter();
  const isGuest = role === ROLES.GUEST;

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }, [router]);

  const sidebarFooter = <AuthFooter isGuest={isGuest} />;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavbar
        isGuest={isGuest}
        onLogout={logout}
        sidebarFooter={sidebarFooter}
      />
      <div className="flex min-h-0 flex-1 md:flex-row">
        <aside className="hidden w-44 shrink-0 border-r md:flex md:flex-col">
          <div className="border-b px-3 py-2.5">
            <p className="text-sm font-medium">Menu</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {isGuest ? "Guest" : "Admin"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={null}>
              <SidebarNav />
            </Suspense>
          </div>
          {sidebarFooter}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {isGuest ? (
            <div className="hidden border-b bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground md:block">
              View only — Admin login to add or edit.
            </div>
          ) : null}
          <main className="page-main mx-auto w-full max-w-5xl flex-1 px-3 py-3 md:px-4 md:py-4">
            <Suspense fallback={null}>
              <ActivityNavigationLogger />
            </Suspense>
            <GoBack />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
});
