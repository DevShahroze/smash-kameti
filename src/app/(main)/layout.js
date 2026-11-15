import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { AppBootstrapSplash } from "@/components/layout/app-bootstrap-splash";
import { QueryProvider } from "@/components/providers/query-provider";
import { QueryPrefetch } from "@/components/providers/query-prefetch";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { COOKIE_NAME, parseSessionToken, ROLES } from "@/lib/auth/session";

export default async function MainLayout({ children }) {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  const role = session?.role ?? ROLES.GUEST;

  return (
    <QueryProvider>
      <AuthProvider role={role}>
        <QueryPrefetch />
        <AppBootstrapSplash>
          <AppShell role={role}>{children}</AppShell>
        </AppBootstrapSplash>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryProvider>
  );
}
