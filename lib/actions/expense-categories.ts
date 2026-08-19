"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";
import type { ExpenseCategoryScope } from "@/lib/expenses/expense-scope";

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

export async function updateExpenseCategory(
  organizationId: string,
  categoryId: string,
  formData: FormData
): Promise<CategoryActionResult> {
  formData.set("categoryId", categoryId);
  return callBackendForm(
    "/api/actions/expense-categories/update",
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

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  requires_evidence: boolean;
  scope: ExpenseCategoryScope;
};
