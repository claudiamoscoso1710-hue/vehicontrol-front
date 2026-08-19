const DB_NAME = "vehicontrol-offline";
const DB_VERSION = 1;

export type PendingExpense = {
  id: string;
  createdAt: string;
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
  evidence?: {
    name: string;
    type: string;
    buffer: ArrayBuffer;
  };
  status: "queued" | "syncing" | "error";
  lastError?: string;
};

export type DriverHomeSnapshot = {
  savedAt: string;
  data: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDriverHomeSnapshot(data: unknown) {
  const db = await openDb();
  await requestToPromise(
    db.transaction("snapshots", "readwrite").objectStore("snapshots").put({
      key: "driver-home",
      savedAt: new Date().toISOString(),
      data,
    })
  );
}

export async function loadDriverHomeSnapshot(): Promise<DriverHomeSnapshot | null> {
  const db = await openDb();
  const row = await requestToPromise<{ key: string; savedAt: string; data: unknown } | undefined>(
    db.transaction("snapshots").objectStore("snapshots").get("driver-home")
  );
  return row ? { savedAt: row.savedAt, data: row.data } : null;
}

export async function enqueueExpense(expense: PendingExpense) {
  const db = await openDb();
  await requestToPromise(
    db.transaction("outbox", "readwrite").objectStore("outbox").put(expense)
  );
}

export async function listQueuedExpenses(): Promise<PendingExpense[]> {
  const db = await openDb();
  const rows = await requestToPromise<PendingExpense[]>(
    db.transaction("outbox").objectStore("outbox").getAll()
  );
  return (rows ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateQueuedExpense(expense: PendingExpense) {
  await enqueueExpense(expense);
}

export async function removeQueuedExpense(id: string) {
  const db = await openDb();
  await requestToPromise(
    db.transaction("outbox", "readwrite").objectStore("outbox").delete(id)
  );
}

export async function pendingExpenseCount() {
  const rows = await listQueuedExpenses();
  return rows.length;
}
