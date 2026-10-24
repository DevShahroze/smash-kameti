"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { GoBack } from "@/components/layout/go-back";
import { ROLES } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/outings", label: "Outings" },
  { href: "/kameti", label: "Kameti" },
  { href: "/members", label: "Members" },
  { href: "/venues", label: "Venues" },
  { href: "/settlements", label: "Settlements" },
  { href: "/transactions", label: "Transactions" },
];

function NavLinks({ onNavigate }) {
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
}

function AuthFooter({ isGuest, onLogout }) {
  if (isGuest) {
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
  }
  return (
    <div className="border-t p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-full justify-start px-2.5 text-xs"
        data-allow-guest
        onClick={onLogout}
      >
        Sign out
      </Button>
    </div>
  );
}

export function AppShell({ children, role }) {
  const router = useRouter();
  const isGuest = role === ROLES.GUEST;

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-44 shrink-0 border-r md:block">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-medium">Smash Kameti</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {isGuest ? "Guest · view only" : "Admin"}
          </p>
        </div>
        <Suspense fallback={null}>
          <NavLinks />
        </Suspense>
        <AuthFooter isGuest={isGuest} onLogout={logout} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2 md:hidden">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
                aria-label="Open menu"
                data-allow-guest
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-44 p-0">
                <div className="border-b px-3 py-2.5 text-sm font-medium">
                  Smash Kameti
                </div>
                <Suspense fallback={null}>
                  <NavLinks />
                </Suspense>
                <AuthFooter isGuest={isGuest} onLogout={logout} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium">Smash Kameti</span>
          </div>
          {isGuest ? (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
              data-allow-guest
            >
              Admin login
            </Link>
          ) : (
            <span className="text-[10px] uppercase text-muted-foreground">
              Admin
            </span>
          )}
        </header>
        {isGuest ? (
          <div className="border-b bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground">
            View only — Admin login to add or edit.
          </div>
        ) : null}
        <main className="page-main mx-auto w-full max-w-5xl flex-1 px-3 py-3 md:px-4 md:py-4">
          <GoBack />
          {children}
        </main>
      </div>
    </div>
  );
}
