import { getOwnerContext } from "@/lib/auth/cached-auth";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
import { AddMemberForm } from "@/components/owner/add-member-form";
import { ExpenseCategoryManager } from "@/components/owner/expense-category-manager";
import type { ExpenseCategoryRow } from "@/lib/actions/expense-categories";
import { filterCategoriesByScope } from "@/lib/expenses/expense-scope";
import { DriverCompensationSettings } from "@/components/owner/driver-compensation-settings";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";
import { PageHeader } from "@/components/ui/page-header";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
  driver: "Conductor",
  super_admin: "Super Admin",
};

export async function SettingsPageContent() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org } = ctx;

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
            .select("id, name, requires_evidence, scope")
            .eq("organization_id", org.organizationId)
            .order("name")
        : { data: [] as ExpenseCategoryRow[] },
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
      <p className="text-sm text-muted-foreground">Sin acceso a configuración.</p>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Configuración" subtitle={org.organizationName} />

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
          <div>
            <h2 className="font-medium">Categorías de gasto</h2>
            <p className="text-sm text-muted-foreground">
              Administra por separado las categorías de viaje y las del vehículo.
              Los gastos adicionales usan solo texto libre (sin categoría).
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ExpenseCategoryManager
              organizationId={org.organizationId}
              categories={filterCategoriesByScope(categories ?? [], "trip")}
              scope="trip"
              canManage
            />
            <ExpenseCategoryManager
              organizationId={org.organizationId}
              categories={filterCategoriesByScope(categories ?? [], "vehicle")}
              scope="vehicle"
              canManage
            />
          </div>
        </section>
      )}
    </div>
  );
}
