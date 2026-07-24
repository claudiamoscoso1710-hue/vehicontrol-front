const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Reportado",
  rejected: "Rechazado",
  in_progress: "En curso",
  planned: "Planificado",
  closed: "Cerrado",
  active: "Activo",
  inactive: "Inactivo",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}
