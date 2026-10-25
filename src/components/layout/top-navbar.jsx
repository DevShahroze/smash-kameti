"use client";

import { memo, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { AdminOnly } from "@/components/auth/admin-only";
import { ActivityLogControls } from "@/components/logging/activity-log-controls";
import { ConnectionStatus } from "@/components/layout/connection-status";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/outings", label: "Outings" },
  { href: "/kameti", label: "Kameti" },
  { href: "/members", label: "Members" },
  { href: "/venues", label: "Venues" },
  { href: "/settlements", label: "Settlements" },
  { href: "/transactions", label: "Transactions" },
];

const SidebarNav = memo(function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0 p-2">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
});

export const TopNavbar = memo(function TopNavbar({
  isGuest,
  onLogout,
  sidebarFooter,
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex h-11 items-center gap-2 px-3 md:px-4">
        <Sheet>
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "md:hidden shrink-0",
            )}
            aria-label="Open menu"
            data-allow-guest
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="flex w-44 flex-col p-0">
            <div className="border-b px-3 py-2.5 text-sm font-medium">
              Smash Kameti
            </div>
            <div className="flex-1 overflow-y-auto">
              <Suspense fallback={null}>
                <SidebarNav />
              </Suspense>
            </div>
            {sidebarFooter}
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="shrink-0 text-sm font-medium hover:text-foreground/90"
        >
          Smash Kameti
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ConnectionStatus />
          <AdminOnly>
            <ActivityLogControls className="h-8 text-xs" />
          </AdminOnly>
          {isGuest ? (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              data-allow-guest
            >
              Admin login
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              data-allow-guest
              onClick={onLogout}
            >
              Sign out
            </Button>
          )}
        </div>
      </div>
      {isGuest ? (
        <p className="border-t bg-muted/40 px-3 py-1 text-center text-[11px] text-muted-foreground md:hidden">
          View only — Admin login to edit.
        </p>
      ) : null}
    </header>
  );
});

export { SidebarNav };
