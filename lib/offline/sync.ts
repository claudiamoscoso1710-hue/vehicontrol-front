"use client";

import {
  enqueueExpense,
  listQueuedExpenses,
  removeQueuedExpense,
  updateQueuedExpense,
  type PendingExpense,
} from "@/lib/offline/db";
import {
  submitDriverExpense,
  submitDriverVehicleExpense,
} from "@/lib/actions/expenses";

export async function queueDriverExpense(input: {
  organizationId: string;
  tripId?: string;
  vehicleMode: boolean;
  categoryId: string;
  categoryName: string;
  amount: number;
  notes: string;
  customDescription: string;
  ownerPrepaid?: boolean;
  additionalTripExpense?: boolean;
  reminderEnabled?: boolean;
  reminderDueDate?: string;
  reminderRecurrenceUnit?: string;
  reminderRecurrenceInterval?: number;
  reminderAdvanceNoticeDays?: number;
  evidenceFile?: File | null;
}): Promise<PendingExpense> {
  const id = crypto.randomUUID();
  let evidence: PendingExpense["evidence"];
  if (input.evidenceFile && input.evidenceFile.size > 0) {
    evidence = {
      name: input.evidenceFile.name,
      type: input.evidenceFile.type || "image/jpeg",
      buffer: await input.evidenceFile.arrayBuffer(),
    };
  }

  const item: PendingExpense = {
    id,
    createdAt: new Date().toISOString(),
    organizationId: input.organizationId,
    tripId: input.tripId,
    vehicleMode: input.vehicleMode,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    amount: input.amount,
    notes: input.notes,
    customDescription: input.customDescription,
    ownerPrepaid: input.ownerPrepaid ?? false,
    additionalTripExpense: input.additionalTripExpense ?? false,
    reminderEnabled: input.reminderEnabled,
    reminderDueDate: input.reminderDueDate,
    reminderRecurrenceUnit: input.reminderRecurrenceUnit,
    reminderRecurrenceInterval: input.reminderRecurrenceInterval,
    reminderAdvanceNoticeDays: input.reminderAdvanceNoticeDays,
    evidence,
    status: "queued",
  };

  await enqueueExpense(item);
  return item;
}

function toFormData(item: PendingExpense) {
  const formData = new FormData();
  formData.set("organizationId", item.organizationId);
  formData.set("categoryId", item.categoryId);
  formData.set("amount", String(item.amount));
  formData.set("notes", item.notes);
  formData.set("customDescription", item.customDescription);
  formData.set("clientMutationId", item.id);
  if (item.ownerPrepaid) {
    formData.set("ownerPrepaid", "true");
  }
  if (item.additionalTripExpense) {
    formData.set("additionalTripExpense", "true");
  }
  if (item.reminderEnabled) {
    formData.set("reminderEnabled", "true");
    if (item.reminderDueDate) formData.set("reminderDueDate", item.reminderDueDate);
    if (item.reminderRecurrenceUnit) {
      formData.set("reminderRecurrenceUnit", item.reminderRecurrenceUnit);
    }
    if (item.reminderRecurrenceInterval) {
      formData.set("reminderRecurrenceInterval", String(item.reminderRecurrenceInterval));
    }
    if (item.reminderAdvanceNoticeDays) {
      formData.set("reminderAdvanceNoticeDays", String(item.reminderAdvanceNoticeDays));
    }
  }
  if (item.tripId) formData.set("tripId", item.tripId);
  if (item.evidence) {
    const file = new File([item.evidence.buffer], item.evidence.name, {
      type: item.evidence.type,
    });
    formData.set("evidence", file);
  }
  return formData;
}

export async function syncQueuedExpenses(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = (await listQueuedExpenses()).length;
    return { synced: 0, remaining };
  }

  const items = await listQueuedExpenses();
  let synced = 0;

  for (const item of items) {
    const syncing = { ...item, status: "syncing" as const, lastError: undefined };
    await updateQueuedExpense(syncing);
    try {
      const formData = toFormData(item);
      const result = item.vehicleMode
        ? await submitDriverVehicleExpense(formData)
        : await submitDriverExpense(formData);

      if (!result.success) {
        await updateQueuedExpense({
          ...item,
          status: "error",
          lastError: result.error,
        });
        continue;
      }

      await removeQueuedExpense(item.id);
      synced += 1;
    } catch (error) {
      await updateQueuedExpense({
        ...item,
        status: "error",
        lastError:
          error instanceof Error ? error.message : "No se pudo sincronizar.",
      });
    }
  }

  const remaining = (await listQueuedExpenses()).length;
  return { synced, remaining };
}
