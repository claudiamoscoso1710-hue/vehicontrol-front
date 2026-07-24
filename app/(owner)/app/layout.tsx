import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { OwnerShell } from "@/components/owner/owner-shell";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const org = user
    ? await getActiveOrganization(supabase, user.id)
    : null;

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-8">
        <p className="text-sm text-muted-foreground">
          No tienes una organización operativa asignada.
        </p>
      </div>
    );
  }

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
