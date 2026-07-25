import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ expenseId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { expenseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: evidence } = await supabase
    .from("expense_evidences")
    .select("storage_path, organization_id")
    .eq("expense_id", expenseId)
    .maybeSingle();

  if (!evidence) {
    return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("expense-evidences")
    .createSignedUrl(evidence.storage_path, 300);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo generar URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signed.signedUrl });
}
