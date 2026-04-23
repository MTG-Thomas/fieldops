import { useEffect, useMemo, useRef, useState } from "react";
import {
  disconnectHalo,
  getActionTypes,
  getOutcomes,
  getSession,
  getTicketDetail,
  getTickets,
  postTimeEntry,
  startHaloConnect,
  syncQueuedItems,
  uploadPhoto,
} from "./lib/api";
import { deleteQueuedItems, enqueueSyncItem, getQueuedItems, loadJobDraft, saveJobDraft } from "./lib/storage";
import type {
  ActivityEntry,
  FieldOpsSession,
  JobDraft,
  LookupOption,
  PhotoUploadCommand,
  TicketDetail,
  TicketSummary,
  TimeEntryCommand,
} from "../shared/contracts";

type Tab = "dashboard" | "activity" | "settings";
type Toast = { id: string; text: string; tone: "info" | "success" | "error" | "warning" };

function createId(): string {
  return crypto.randomUUID();
}

function formatTime(iso?: string): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return "0 min";
  const mins = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toInputTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function jobPhase(job: JobDraft | null): "none" | "ready" | "traveling" | "arrived" | "onsite" | "done" {
  if (!job) return "none";
  if (job.onsiteEnd) return "done";
  if (job.onsiteStart) return "onsite";
  if (job.travelEnd) return "arrived";
  if (job.travelStart) return "traveling";
  return "ready";
}

function createDraft(ticket: TicketSummary): JobDraft {
  return {
    ticketId: ticket.id,
    ticketSummary: ticket.summary,
    notes: [],
    photos: [],
  };
}

function App() {
  const [session, setSession] = useState<FieldOpsSession | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(() => loadJobDraft());
  const [actionTypes, setActionTypes] = useState<LookupOption[]>([]);
  const [outcomes, setOutcomes] = useState<LookupOption[]>([]);
  const [timeForm, setTimeForm] = useState({
    start: "",
    end: "",
    note: "",
    workType: "onsite" as TimeEntryCommand["workType"],
    actionTypeId: "",
    outcomeId: "",
  });
  const [fieldNote, setFieldNote] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [todayActivity, setTodayActivity] = useState<ActivityEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveJobDraft(jobDraft);
  }, [jobDraft]);

  useEffect(() => {
    void hydrate();
    const handleOnline = () => {
      void flushQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  async function hydrate(): Promise<void> {
    setLoading(true);
    try {
      const [sessionData, ticketData, outcomeData] = await Promise.all([
        getSession(),
        getTickets(),
        getOutcomes().catch(() => []),
      ]);
      setSession(sessionData);
      setTickets(ticketData);
      setOutcomes(outcomeData);
      pushToast("Session ready", "success");
      await flushQueue();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load FieldOps", "error");
    } finally {
      setLoading(false);
    }
  }

  function pushToast(text: string, tone: Toast["tone"] = "info"): void {
    const toast = { id: createId(), text, tone };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 2600);
  }

  async function flushQueue(): Promise<void> {
    const queued = await getQueuedItems().catch(() => []);
    if (!queued.length) return;
    try {
      const result = await syncQueuedItems({ items: queued });
      const completed = result.results.filter((item) => item.ok).map((item) => item.id);
      if (completed.length) {
        await deleteQueuedItems(completed);
        pushToast(`Synced ${completed.length} queued item${completed.length === 1 ? "" : "s"}`, "success");
      }
    } catch {
      // Stay quiet when sync fails; the queue is the safety net.
    }
  }

  async function openTicket(ticket: TicketSummary): Promise<void> {
    const detail = await getTicketDetail(ticket.id);
    setSelectedTicket(detail);
    setActionTypes(detail.availableActionTypes ?? (await getActionTypes(ticket.id).catch(() => [])));
  }

  const currentPhase = useMemo(() => jobPhase(jobDraft), [jobDraft]);

  function ensureDraft(ticket: TicketSummary | TicketDetail): JobDraft {
    if (jobDraft && jobDraft.ticketId === ticket.id) return jobDraft;
    const next = createDraft(ticket);
    setJobDraft(next);
    return next;
  }

  function addActivity(type: ActivityEntry["type"], text: string, minutes?: number): void {
    const entry: ActivityEntry = { id: createId(), type, at: nowIso(), text, minutes };
    setTodayActivity((current) => [entry, ...current].slice(0, 50));
    setJobDraft((current) => {
      if (!current) return current;
      return { ...current, notes: [...current.notes, entry] };
    });
  }

  function updateJob(updater: (current: JobDraft) => JobDraft): void {
    setJobDraft((current) => (current ? updater(current) : current));
  }

  function handleJobAction(action: "startTravel" | "stopTravel" | "checkIn" | "checkOut"): void {
    if (!selectedTicket) return;
    const draft = ensureDraft(selectedTicket);
    if (action === "startTravel") {
      const startedAt = nowIso();
      setJobDraft({ ...draft, travelStart: startedAt });
      addActivity("travel", `Travel started for #${selectedTicket.id}`);
      return;
    }
    if (action === "stopTravel") {
      updateJob((current) => ({ ...current, travelEnd: nowIso() }));
      addActivity("travel", `Travel ended for #${selectedTicket.id}`);
      return;
    }
    if (action === "checkIn") {
      updateJob((current) => ({ ...current, onsiteStart: nowIso() }));
      addActivity("onsite", `Checked in on site for #${selectedTicket.id}`);
      return;
    }
    updateJob((current) => ({ ...current, onsiteEnd: nowIso() }));
    addActivity("onsite", `Checked out from #${selectedTicket.id}`);
  }

  async function handlePostTime(): Promise<void> {
    if (!selectedTicket) return;
    if (!timeForm.start || !timeForm.end) {
      pushToast("Start and end times are required", "warning");
      return;
    }

    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    const [startHour, startMinute] = timeForm.start.split(":").map(Number);
    const [endHour, endMinute] = timeForm.end.split(":").map(Number);
    start.setHours(startHour, startMinute, 0, 0);
    end.setHours(endHour, endMinute, 0, 0);

    if (end <= start) {
      pushToast("End time must be after start time", "warning");
      return;
    }

    const command: TimeEntryCommand = {
      ticketId: selectedTicket.id,
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      workType: timeForm.workType,
      note: timeForm.note,
      actionTypeId: timeForm.actionTypeId || undefined,
      outcomeId: timeForm.outcomeId || undefined,
      idempotencyKey: `${selectedTicket.id}-${start.toISOString()}-${end.toISOString()}`,
    };

    try {
      await postTimeEntry(command);
      addActivity("system", `Posted time entry for #${selectedTicket.id}`);
      setTimeForm({ start: "", end: "", note: "", workType: "onsite", actionTypeId: "", outcomeId: "" });
      pushToast("Time entry posted", "success");
    } catch (error) {
      await enqueueSyncItem({ id: command.idempotencyKey, type: "time-entry", command });
      pushToast(
        error instanceof Error ? `${error.message}. Saved for retry.` : "Saved for retry.",
        "warning",
      );
    }
  }

  function autofillFromTracker(): void {
    if (!jobDraft || !selectedTicket || jobDraft.ticketId !== selectedTicket.id) {
      pushToast("No tracker data for this ticket", "warning");
      return;
    }
    setTimeForm((current) => ({
      ...current,
      start: toInputTime(jobDraft.onsiteStart ?? jobDraft.travelStart),
      end: toInputTime(jobDraft.onsiteEnd ?? jobDraft.travelEnd),
    }));
    pushToast("Time fields filled from the active job", "info");
  }

  function addFieldNote(): void {
    if (!fieldNote.trim() || !selectedTicket) return;
    ensureDraft(selectedTicket);
    addActivity("note", fieldNote.trim());
    setFieldNote("");
    pushToast("Note logged", "success");
  }

  async function onPhotoPicked(file: File | undefined): Promise<void> {
    if (!file || !selectedTicket) return;
    if (file.size > 10 * 1024 * 1024) {
      pushToast("Photos must be smaller than 10 MB", "warning");
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve(value.split(",")[1] || "");
      };
      reader.readAsDataURL(file);
    });

    const command: PhotoUploadCommand = {
      ticketId: selectedTicket.id,
      filename: file.name,
      contentType: file.type || "image/jpeg",
      base64,
      note: `Captured in FieldOps for ticket ${selectedTicket.id}`,
    };

    await uploadPhoto(command);
    ensureDraft(selectedTicket);
    updateJob((current) => ({
      ...current,
      photos: [...current.photos, { id: createId(), name: file.name }],
    }));
    addActivity("photo", `Uploaded photo ${file.name}`);
    pushToast("Photo uploaded to Halo", "success");
  }

  async function handleDisconnect(): Promise<void> {
    await disconnectHalo();
    setSession((current) =>
      current
        ? {
            ...current,
            haloConnection: { ...current.haloConnection, connected: false, connectedAt: undefined, haloUserId: undefined },
          }
        : current,
    );
    pushToast("Halo connection removed", "success");
  }

  if (loading) {
    return <div className="splash">Loading FieldOps…</div>;
  }

  if (!session) {
    return <div className="splash">FieldOps could not load your session.</div>;
  }

  if (!session.haloConnection.connected) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">FieldOps on Azure</p>
          <h1>Connect Halo once, then work from here.</h1>
          <p className="lead">
            Signed in as <strong>{session.user.displayName}</strong>. Your Halo refresh token stays server-side in
            Azure.
          </p>
          <button className="primary-btn" onClick={() => void startHaloConnect()}>
            Connect Halo
          </button>
          <p className="muted">Option 2 viability is still under evaluation. v1 uses the secure per-user Halo OAuth flow.</p>
        </section>
        <ToastRack toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">FieldOps</div>
          <div className="subtle">Azure SWA Free pilot</div>
        </div>
        <div className="user-pill">
          <span>{session.user.displayName}</span>
          <span className="status-dot" />
          <span>{session.haloConnection.haloTenant ?? "Halo connected"}</span>
        </div>
      </header>

      {jobDraft && (
        <section className="job-banner">
          <div>
            <div className="banner-label">Active job</div>
            <strong>#{jobDraft.ticketId}</strong> {jobDraft.ticketSummary}
          </div>
          <div className="banner-phase">{currentPhase}</div>
        </section>
      )}

      <main className="content">
        <nav className="tabbar">
          {(["dashboard", "activity", "settings"] as Tab[]).map((item) => (
            <button
              key={item}
              className={item === tab ? "tab active" : "tab"}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <section>
            <div className="section-head">
              <h2>My Tickets</h2>
              <button className="ghost-btn" onClick={() => void hydrate()}>
                Refresh
              </button>
            </div>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <button key={ticket.id} className="ticket-card" onClick={() => void openTicket(ticket)}>
                  <div className="ticket-row">
                    <strong>#{ticket.id}</strong>
                    <span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                  </div>
                  <div className="ticket-summary">{ticket.summary}</div>
                  <div className="ticket-meta">
                    <span>{ticket.clientName}</span>
                    <span>{ticket.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "activity" && (
          <section>
            <h2>Today&apos;s activity</h2>
            <div className="activity-list">
              {todayActivity.length ? (
                todayActivity.map((entry) => (
                  <div key={entry.id} className="activity-entry">
                    <span>{formatTime(entry.at)}</span>
                    <span>{entry.text}</span>
                  </div>
                ))
              ) : (
                <div className="empty-card">No local activity yet.</div>
              )}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="settings-stack">
            <div className="settings-card">
              <h2>Session</h2>
              <p>{session.user.email ?? "No email claim was provided."}</p>
              <p>Connection mode: {session.haloConnection.mode}</p>
              <button className="danger-btn" onClick={() => void handleDisconnect()}>
                Disconnect Halo
              </button>
            </div>
            <div className="settings-card">
              <h2>Cost guardrails</h2>
              <ul className="compact-list">
                <li>SWA Free pilot; upgrade only if quotas or auth constraints force it.</li>
                <li>Functions Consumption plus server-side token refresh.</li>
                <li>Photos stream through to Halo with no long-term Azure copy.</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      {selectedTicket && (
        <section className="detail-sheet">
          <div className="detail-head">
            <div>
              <div className="subtle">Ticket #{selectedTicket.id}</div>
              <h3>{selectedTicket.summary}</h3>
            </div>
            <button className="ghost-btn" onClick={() => setSelectedTicket(null)}>
              Close
            </button>
          </div>

          <div className="detail-grid">
            <article className="panel">
              <h4>Job actions</h4>
              <div className="button-row">
                {currentPhase === "none" || currentPhase === "ready" ? (
                  <button className="ghost-btn" onClick={() => handleJobAction("startTravel")}>
                    Start travel
                  </button>
                ) : null}
                {currentPhase === "traveling" ? (
                  <button className="ghost-btn" onClick={() => handleJobAction("stopTravel")}>
                    Stop travel
                  </button>
                ) : null}
                {currentPhase === "arrived" || currentPhase === "ready" ? (
                  <button className="primary-btn" onClick={() => handleJobAction("checkIn")}>
                    Check in
                  </button>
                ) : null}
                {currentPhase === "onsite" ? (
                  <button className="primary-btn" onClick={() => handleJobAction("checkOut")}>
                    Check out
                  </button>
                ) : null}
              </div>
              <div className="job-summary">
                <div>Travel: {formatDuration(jobDraft?.travelStart, jobDraft?.travelEnd)}</div>
                <div>On-site: {formatDuration(jobDraft?.onsiteStart, jobDraft?.onsiteEnd)}</div>
              </div>
            </article>

            <article className="panel">
              <h4>Client & site</h4>
              <p>{selectedTicket.clientName}</p>
              <p>{selectedTicket.siteName}</p>
              <p>{selectedTicket.address ?? "No address available"}</p>
            </article>

            <article className="panel">
              <h4>Manual time entry</h4>
              <div className="time-grid">
                <label>
                  Start
                  <input
                    id="te-start"
                    type="time"
                    value={timeForm.start}
                    onChange={(event) => setTimeForm((current) => ({ ...current, start: event.target.value }))}
                  />
                </label>
                <label>
                  End
                  <input
                    id="te-end"
                    type="time"
                    value={timeForm.end}
                    onChange={(event) => setTimeForm((current) => ({ ...current, end: event.target.value }))}
                  />
                </label>
              </div>
              <label>
                Work type
                <select
                  value={timeForm.workType}
                  onChange={(event) =>
                    setTimeForm((current) => ({
                      ...current,
                      workType: event.target.value as TimeEntryCommand["workType"],
                    }))
                  }
                >
                  <option value="onsite">On-site</option>
                  <option value="travel">Travel</option>
                  <option value="remote">Remote</option>
                </select>
              </label>
              <label>
                Action type
                <select
                  value={timeForm.actionTypeId}
                  onChange={(event) => setTimeForm((current) => ({ ...current, actionTypeId: event.target.value }))}
                >
                  <option value="">Default</option>
                  {actionTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Outcome
                <select
                  value={timeForm.outcomeId}
                  onChange={(event) => setTimeForm((current) => ({ ...current, outcomeId: event.target.value }))}
                >
                  <option value="">Default</option>
                  {outcomes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Note
                <textarea
                  id="te-note"
                  rows={3}
                  value={timeForm.note}
                  onChange={(event) => setTimeForm((current) => ({ ...current, note: event.target.value }))}
                />
              </label>
              <div className="button-row">
                <button className="ghost-btn" onClick={autofillFromTracker}>
                  Autofill from tracker
                </button>
                <button className="primary-btn" id="btn-post-time" onClick={() => void handlePostTime()}>
                  Post to Halo
                </button>
              </div>
            </article>

            <article className="panel">
              <h4>Field notes & photos</h4>
              <textarea rows={3} value={fieldNote} onChange={(event) => setFieldNote(event.target.value)} />
              <div className="button-row">
                <button className="ghost-btn" onClick={addFieldNote}>
                  Log note
                </button>
                <button className="ghost-btn" onClick={() => fileInputRef.current?.click()}>
                  Add photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void onPhotoPicked(event.target.files?.[0] ?? undefined)}
              />
              <ul className="compact-list">
                {(jobDraft?.photos ?? []).map((photo) => (
                  <li key={photo.id}>{photo.name}</li>
                ))}
              </ul>
            </article>

            <article className="panel">
              <h4>Activity log</h4>
              <div className="activity-list">
                {(jobDraft?.notes ?? []).length ? (
                  jobDraft?.notes.map((entry) => (
                    <div key={entry.id} className="activity-entry">
                      <span>{formatTime(entry.at)}</span>
                      <span>{entry.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-card">No activity yet</div>
                )}
              </div>
            </article>
          </div>
        </section>
      )}

      <ToastRack toasts={toasts} />
    </div>
  );
}

function ToastRack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-rack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

export default App;
