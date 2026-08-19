import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

export type DriverTeamMember = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  email: string | null;
  password: string | null;
  commission_percent: number | null;
  assignedVehicle: { id: string; plate: string } | null;
};

export type VehicleTeamOption = {
  id: string;
  plate: string;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
};

export const loadDriverTeam = cache(async function loadDriverTeam(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  drivers: DriverTeamMember[];
  vehicles: VehicleTeamOption[];
}> {
  const [{ data: drivers }, { data: vehicles }, { data: passwords }] =
    await Promise.all([
      supabase
        .from("drivers")
        .select(
          "id, full_name, phone, status, user_id, commission_percent, profiles(email)"
        )
        .eq("organization_id", organizationId)
        .order("full_name", { ascending: true }),
      supabase
        .from("vehicles")
        .select("id, plate, assigned_driver_id, commercial_status")
        .eq("organization_id", organizationId)
        .eq("commercial_status", "active")
        .order("plate", { ascending: true }),
      supabase
        .from("organization_driver_passwords")
        .select("driver_id, password")
        .eq("organization_id", organizationId),
    ]);

  const userIds = [
    ...new Set(
      (drivers ?? [])
        .map((driver) => driver.user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [] as { id: string; email: string }[] };

  const emailByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.email])
  );

  const passwordByDriver = new Map(
    (passwords ?? []).map((row) => [row.driver_id, row.password])
  );

  const driverNameById = new Map(
    (drivers ?? []).map((driver) => [driver.id, driver.full_name])
  );

  const vehicleByDriver = new Map<string, { id: string; plate: string }>();
  for (const vehicle of vehicles ?? []) {
    if (vehicle.assigned_driver_id) {
      vehicleByDriver.set(vehicle.assigned_driver_id, {
        id: vehicle.id,
        plate: vehicle.plate,
      });
    }
  }

  const teamDrivers: DriverTeamMember[] = (drivers ?? []).map((driver) => {
    const profile = driver.profiles as { email: string } | { email: string }[] | null;
    const joinedEmail = Array.isArray(profile)
      ? profile[0]?.email
      : profile?.email;
    return {
      id: driver.id,
      full_name: driver.full_name,
      phone: driver.phone,
      status: driver.status,
      user_id: driver.user_id,
      email:
        joinedEmail ??
        (driver.user_id ? (emailByUserId.get(driver.user_id) ?? null) : null),
      password: passwordByDriver.get(driver.id) ?? null,
      commission_percent: driver.commission_percent,
      assignedVehicle: vehicleByDriver.get(driver.id) ?? null,
    };
  });

  const vehicleOptions: VehicleTeamOption[] = (vehicles ?? []).map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.plate,
    assigned_driver_id: vehicle.assigned_driver_id,
    assigned_driver_name: vehicle.assigned_driver_id
      ? (driverNameById.get(vehicle.assigned_driver_id) ?? null)
      : null,
  }));

  return { drivers: teamDrivers, vehicles: vehicleOptions };
});
