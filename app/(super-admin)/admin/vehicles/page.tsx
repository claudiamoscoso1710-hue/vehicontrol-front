import { createClient } from "@/lib/supabase/server";
import { VehicleApprovalList } from "@/components/admin/vehicle-approval-list";
import { formatCurrency } from "@/lib/format";

export default async function AdminVehiclesPage() {
  const supabase = await createClient();

  const { data: pendingVehicles } = await supabase
    .from("vehicles")
    .select(
      "id, plate, brand, vehicle_type, commercial_status, organizations(name)"
    )
    .eq("commercial_status", "pending")
    .order("created_at", { ascending: false });

  const { data: plan } = await supabase
    .from("plans")
    .select("price_per_vehicle")
    .order("name")
    .limit(1)
    .maybeSingle();

  const pricePerVehicle = Number(plan?.price_per_vehicle ?? 30000);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Vehículos pendientes</h1>
        <p className="text-sm text-muted-foreground">
          Tarifa referencia: {formatCurrency(pricePerVehicle)} / vehículo / mes
        </p>
      </header>

      <VehicleApprovalList
        vehicles={pendingVehicles ?? []}
        pricePerVehicle={pricePerVehicle}
      />
    </main>
  );
}
