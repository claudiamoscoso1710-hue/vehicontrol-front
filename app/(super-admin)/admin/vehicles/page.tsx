import { createClient } from "@/lib/supabase/server";
import { AdminVehicleList } from "@/components/admin/admin-vehicle-list";
import { CreateVehicleForm } from "@/components/admin/create-vehicle-form";
import { VehicleApprovalList } from "@/components/admin/vehicle-approval-list";
import { formatCurrency } from "@/lib/format";

export default async function AdminVehiclesPage() {
  const supabase = await createClient();

  const [
    { data: organizations },
    { data: allVehicles },
    { data: pendingVehicles },
    { data: plan },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("vehicles")
      .select(
        "id, plate, brand, vehicle_type, commercial_status, operational_status, organizations(name)"
      )
      .neq("commercial_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("vehicles")
      .select(
        "id, plate, brand, vehicle_type, commercial_status, organizations(name)"
      )
      .eq("commercial_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("plans")
      .select("price_per_vehicle")
      .order("name")
      .limit(1)
      .maybeSingle(),
  ]);

  const pricePerVehicle = Number(plan?.price_per_vehicle ?? 30000);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Vehículos</h1>
        <p className="text-sm text-muted-foreground">
          Tarifa referencia: {formatCurrency(pricePerVehicle)} / vehículo / mes
        </p>
      </header>

      <CreateVehicleForm organizations={organizations ?? []} />

      {(pendingVehicles ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 font-medium">Pendientes de aprobación</h2>
          <VehicleApprovalList
            vehicles={pendingVehicles ?? []}
            pricePerVehicle={pricePerVehicle}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-medium">Flota registrada</h2>
        <AdminVehicleList vehicles={allVehicles ?? []} />
      </section>
    </main>
  );
}
