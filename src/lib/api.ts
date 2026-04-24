import type {
  FieldOpsSession,
  LookupOption,
  PhotoUploadCommand,
  SyncBatchRequest,
  SyncBatchResult,
  TicketDetail,
  TicketSummary,
  TimeEntryCommand,
} from "../../shared/contracts";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function getSession(): Promise<FieldOpsSession> {
  return parseResponse<FieldOpsSession>(await fetch("/api/session"));
}

export function startHaloConnect(): void {
  globalThis.location.assign("/api/halo/connect/start");
}

export async function disconnectHalo(): Promise<void> {
  await parseResponse<{ ok: boolean }>(
    await fetch("/api/halo/disconnect", { method: "POST" }),
  );
}

export async function getTickets(): Promise<TicketSummary[]> {
  return parseResponse<TicketSummary[]>(await fetch("/api/tickets"));
}

export async function getTicketDetail(ticketId: number): Promise<TicketDetail> {
  return parseResponse<TicketDetail>(await fetch(`/api/tickets/${ticketId}`));
}

export async function getActionTypes(ticketId?: number): Promise<LookupOption[]> {
  const search = ticketId ? `?ticketId=${ticketId}` : "";
  return parseResponse<LookupOption[]>(await fetch(`/api/action-types${search}`));
}

export async function getOutcomes(): Promise<LookupOption[]> {
  return parseResponse<LookupOption[]>(await fetch("/api/outcomes"));
}

export async function postTimeEntry(command: TimeEntryCommand): Promise<{ ok: boolean; queued?: boolean }> {
  return parseResponse<{ ok: boolean; queued?: boolean }>(
    await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    }),
  );
}

export async function uploadPhoto(command: PhotoUploadCommand): Promise<{ ok: boolean }> {
  return parseResponse<{ ok: boolean }>(
    await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    }),
  );
}

export async function syncQueuedItems(batch: SyncBatchRequest): Promise<SyncBatchResult> {
  return parseResponse<SyncBatchResult>(
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }),
  );
}
