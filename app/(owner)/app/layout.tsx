import { Suspense } from "react";
import { cookies } from "next/headers";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { readCachedOrg } from "@/lib/auth/org-cookie";
import { readCachedRoleEntryFromCookies } from "@/lib/auth/role-cookie";
import { OwnerShell } from "@/components/owner/owner-shell";
import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

async function OwnerLayoutWithContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOwnerContext();

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-8">
        <p className="text-sm text-muted-foreground">
          No tienes una organización operativa asignada.
        </p>
      </div>
    );
  }

  const { org, user } = ctx;

  return (
    <OwnerShell
      role={org.role}
      orgName={org.organizationName}
      userEmail={user?.email}
    >
      {children}
    </OwnerShell>
  );
}

function OwnerShellFallback() {
  return (
    <OwnerShell role="owner" orgName="Cargando…">
      <PageLoadingSkeleton title="Cargando panel" />
    </OwnerShell>
  );
}

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const roleEntry = readCachedRoleEntryFromCookies(cookieStore);
  const org = roleEntry ? readCachedOrg(cookieStore, roleEntry.userId) : null;

  if (roleEntry && org) {
    return (
      <OwnerShell role={org.role} orgName={org.organizationName}>
        {children}
      </OwnerShell>
    );
  }

  return (
    <Suspense fallback={<OwnerShellFallback />}>
      <OwnerLayoutWithContext>{children}</OwnerLayoutWithContext>
    </Suspense>
  );
}
