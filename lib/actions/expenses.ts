"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type ExpenseActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitDriverExpense(
  formData: FormData
): Promise<ExpenseActionResult> {
  return callBackendForm("/api/actions/expenses/submit-driver", "", formData);
}

export async function submitDriverVehicleExpense(
  formData: FormData
): Promise<ExpenseActionResult> {
  return callBackendForm("/api/actions/expenses/submit-vehicle", "", formData);
}

export async function driverUpdateExpense(
  formData: FormData
): Promise<ExpenseActionResult> {
  return callBackendForm("/api/actions/expenses/update-driver", "", formData);
}

export async function reviewExpense(
  expenseId: string,
  organizationId: string,
  decision: "approved" | "rejected"
): Promise<ExpenseActionResult> {
  return callBackendJson("/api/actions/expenses/review", {
    expenseId,
    organizationId,
    decision,
  });
}
