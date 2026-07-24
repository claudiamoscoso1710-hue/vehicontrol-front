import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
import { AddMemberForm } from "@/components/owner/add-member-form";
import { ExpenseCategoryManager } from "@/components/owner/expense-category-manager";
import { DriverCompensationSettings } from "@/components/owner/driver-compensation-settings";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
  driver: "Conductor",
  super_admin: "Super Admin",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const caps = getOrgCapabilities(org.role);
  const isOwner = org.role === "owner";

  const [{ data: members }, { data: categories }, compensationConfig] =
    await Promise.all([
    caps?.canManageTeam
      ? supabase
          .from("organization_members")
          .select("id, role, status, profiles(full_name, email)")
          .eq("organization_id", org.organizationId)
          .order("created_at")
      : { data: [] },
    caps?.canManageCategories
      ? supabase
          .from("expense_categories")
          .select("id, name, requires_evidence")
          .eq("organization_id", org.organizationId)
          .order("name")
      : { data: [] },
    isOwner
      ? getOrganizationSetting(
          supabase,
          org.organizationId,
          DRIVER_COMPENSATION_SETTING_KEY,
          parseDriverCompensationConfig,
          DEFAULT_DRIVER_COMPENSATION
        )
      : Promise.resolve(DEFAULT_DRIVER_COMPENSATION),
  ]);

  if (!caps?.canManageTeam && !caps?.canManageCategories && !isOwner) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Sin acceso a configuración.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">{org.organizationName}</p>
      </header>

      {caps?.canManageTeam && (
        <section className="space-y-4">
          <h2 className="font-medium">Equipo</h2>
          <AddMemberForm organizationId={org.organizationId} />
          <ul className="space-y-2">
            {(members ?? []).map((member) => {
              const profile = Array.isArray(member.profiles)
                ? member.profiles[0]
                : member.profiles;

              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {(profile as { full_name: string } | null)?.full_name ||
                        (profile as { email: string } | null)?.email}
                    </p>
                    <p className="text-muted-foreground">
                      {(profile as { email: string } | null)?.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isOwner && (
        <section className="space-y-4">
          <h2 className="font-medium">Sueldo de conductores</h2>
          <DriverCompensationSettings
            organizationId={org.organizationId}
            config={compensationConfig}
          />
        </section>
      )}

      {caps?.canManageCategories && (
        <section className="space-y-4">
          <h2 className="font-medium">Categorías de gasto</h2>
          <ExpenseCategoryManager
            organizationId={org.organizationId}
            categories={categories ?? []}
            canManage
          />
        </section>
      )}
    </main>
  );
}
