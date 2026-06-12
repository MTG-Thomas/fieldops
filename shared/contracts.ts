export type ConnectionMode = "halo-oauth" | "entra-token-exchange-evaluation";

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  roles: string[];
}

export interface HaloConnectionStatus {
  connected: boolean;
  connectedAt?: string;
  haloUserId?: string;
  haloTenant?: string;
  mode: ConnectionMode;
}

export interface LookupOption {
  id: string;
  label: string;
  description?: string;
}

export interface FieldOpsSession {
  user: UserProfile;
  haloConnection: HaloConnectionStatus;
  capabilities: {
    canQueueOffline: boolean;
    canUploadPhotos: boolean;
    option2EvaluationPending: boolean;
  };
}

export interface TicketSummary {
  id: number;
  summary: string;
  status: string;
  priority: string;
  clientName: string;
  siteName?: string;
  assignedTo?: string;
  updatedAt?: string;
}

export interface ActivityEntry {
  id: string;
  type: "travel" | "onsite" | "note" | "photo" | "system";
  at: string;
  text: string;
  minutes?: number;
}

export interface TicketDetail extends TicketSummary {
  clientId?: number;
  siteId?: number;
  clientPhone?: string;
  sitePhone?: string;
  address?: string;
  website?: string;
  latestNotes?: string[];
  availableActionTypes?: LookupOption[];
  availableOutcomes?: LookupOption[];
}

export interface JobDraft {
  ticketId: number;
  ticketSummary: string;
  travelStart?: string;
  travelEnd?: string;
  onsiteStart?: string;
  onsiteEnd?: string;
  notes: ActivityEntry[];
  photos: {
    id: string;
    name: string;
    previewUrl?: string;
  }[];
}

export interface TimeEntryCommand {
  ticketId: number;
  startDatetime: string;
  endDatetime: string;
  workType: "travel" | "onsite" | "remote";
  note: string;
  actionTypeId?: string;
  outcomeId?: string;
  idempotencyKey: string;
}

export interface PhotoUploadCommand {
  ticketId: number;
  filename: string;
  contentType: string;
  base64: string;
  note?: string;
}

export interface SyncBatchItem {
  id: string;
  type: "time-entry";
  command: TimeEntryCommand;
}

export interface SyncBatchRequest {
  items: SyncBatchItem[];
}

export interface SyncBatchResultItem {
  id: string;
  ok: boolean;
  message: string;
}

export interface SyncBatchResult {
  results: SyncBatchResultItem[];
}
