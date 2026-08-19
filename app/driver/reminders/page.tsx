import Link from "next/link";
import { BellRing, ChevronLeft } from "lucide-react";
import { ReminderCalendarClient } from "@/components/driver/reminder-calendar-client";
import { getDriverContext } from "@/lib/auth/cached-auth";
import { loadDriverVehicleExpenseReminders } from "@/lib/reports/load-vehicle-expense-reminders";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
} from "@/components/driver/driver-ui";

export default async function DriverRemindersPage() {
  const ctx = await getDriverContext();
  if (!ctx) {
    return (
      <DriverPageContainer>
        <DriverEmptyState
          icon={BellRing}
          title="Perfil no configurado"
          description="Contacta a tu empresa para vincular tu usuario como conductor."
        />
      </DriverPageContainer>
    );
  }

  const reminders = await loadDriverVehicleExpenseReminders(
    ctx.supabase,
    ctx.driver.id
  );

  return (
    <DriverPageContainer>
      <div className="mb-2">
        <Link
          href="/driver/vehicle-expenses"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a gastos del vehículo
        </Link>
      </div>

      <DriverPageHeader
        eyebrow="Recordatorios"
        title="Próximos vencimientos"
        subtitle="SOAT, tecnomecánica, rodamiento y otros pagos del carro"
      />

      <ReminderCalendarClient reminders={reminders} />
    </DriverPageContainer>
  );
}
