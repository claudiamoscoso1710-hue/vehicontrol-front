import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleDollarSign,
  Clock,
  Route,
} from "lucide-react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import {
  ClientFreightList,
  type ClientFreightItem,
} from "@/components/owner/client-freight-list";
import { formatCurrency } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";

type Props = {
  params: Promise<{ id: string }>;
};

function mapFreight(trip: {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freight_value: number | null;
  freight_paid: boolean;
  freight_paid_at: string | null;
  started_at: string | null;
  closed_at: string | null;
  created_at: string;
  drivers: { full_name: string } | { full_name: string }[] | null;
  vehicles: { plate: string; brand: string | null } | { plate: string; brand: string | null }[] | null;
}): ClientFreightItem {
  const driver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
  const vehicle = Array.isArray(trip.vehicles) ? trip.vehicles[0] : trip.vehicles;

  return {
    id: trip.id,
    origin: trip.origin,
    destination: trip.destination,
    status: trip.status,
    freightValue: Number(trip.freight_value ?? 0),
    freightPaid: trip.freight_paid,
    freightPaidAt: trip.freight_paid_at,
    startedAt: trip.started_at,
    closedAt: trip.closed_at,
    createdAt: trip.created_at,
    vehiclePlate: vehicle?.plate ?? null,
    vehicleBrand: vehicle?.brand ?? null,
    driverName: driver?.full_name ?? null,
  };
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org } = ctx;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, tax_id, created_at")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!client) notFound();

  const { data: trips } = await supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, freight_paid, freight_paid_at, started_at, closed_at, created_at, drivers(full_name), vehicles(plate, brand)"
    )
    .eq("organization_id", org.organizationId)
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const freights = (trips ?? []).map(mapFreight);
  const closedFreights = freights.filter(
    (freight) => freight.status === "closed" && freight.freightValue > 0
  );
  const paidTotal = closedFreights
    .filter((freight) => freight.freightPaid)
    .reduce((sum, freight) => sum + freight.freightValue, 0);
  const pendingTotal = closedFreights
    .filter((freight) => !freight.freightPaid)
    .reduce((sum, freight) => sum + freight.freightValue, 0);
  const canManage = ["owner", "admin"].includes(org.role);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/app/clients"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>
      </div>

      <header className="space-y-1">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client.tax_id ? `NIT ${client.tax_id}` : "Sin NIT"} ·{" "}
              {org.organizationName}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Fletes cerrados"
          value={formatCurrency(paidTotal + pendingTotal)}
          icon={CircleDollarSign}
          trend="neutral"
        />
        <KpiCard
          label="Pagados"
          value={formatCurrency(paidTotal)}
          icon={Route}
          trend={paidTotal > 0 ? "up" : "neutral"}
        />
        <KpiCard
          label="Por cobrar"
          value={formatCurrency(pendingTotal)}
          icon={Clock}
          trend={pendingTotal > 0 ? "alert" : "neutral"}
        />
      </section>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Fletes del cliente</h2>
          <p className="text-sm text-muted-foreground">
            Cada viaje muestra el camión que lo hizo. Marca si el cliente ya
            pagó el flete cuando el viaje esté cerrado.
          </p>
        </CardHeader>
        <CardBody>
          <ClientFreightList
            organizationId={org.organizationId}
            freights={freights}
            canManagePayment={canManage}
          />
        </CardBody>
      </Card>
    </main>
  );
}
