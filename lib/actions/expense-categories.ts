"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type CategoryActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createExpenseCategory(
  organizationId: string,
  formData: FormData
): Promise<CategoryActionResult> {
  return callBackendForm(
    "/api/actions/expense-categories/create",
    organizationId,
    formData
  );
}

export async function deleteExpenseCategory(
  organizationId: string,
  categoryId: string
): Promise<CategoryActionResult> {
  return callBackendJson("/api/actions/expense-categories/delete", {
    organizationId,
    categoryId,
  });
}
