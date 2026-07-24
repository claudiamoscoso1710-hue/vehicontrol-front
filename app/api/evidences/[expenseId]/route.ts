import { NextResponse } from "next/server";
import { getBackendEvidenceUrl } from "@/lib/api/backend";

type Params = { params: Promise<{ expenseId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { expenseId } = await params;

  try {
    const url = await getBackendEvidenceUrl(expenseId);
    if (!url) {
      return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}
