Action Type discovery fails (no ActionTypes listing endpoint)

Summary:
The FieldOps PWA attempted to discover permitted Action Types for ticket #2948 by probing common endpoints; all returned 404 and discovery failed.

Diagnostics (from live app):
/Ticket/2948/ActionTypes — 404
/Tickets/2948/ActionTypes — 404
/Ticket/2948/ActionType — 404
/Tickets/2948/ActionType — 404
/Ticket/2948/AllowedActionTypes — 404
/Tickets/2948/AllowedActionTypes — 404
/Ticket/2948/AvailableActionTypes — 404
/Tickets/2948/AvailableActionTypes — 404
/ActionTypes?ticketId=2948 — 404
/ActionTypes/ForTicket/2948 — 404
/ActionType/ForTicket/2948 — 404
fallback:/ActionTypes — No action types endpoint returned a list

Swagger findings (vendor reference):
- The provided vendor swagger documents /Actions (list), /Actions/{id}, /Actions/reaction, /Actions/Review, /HaloIntegration/CreateAction and /Outcome, but does not expose an ActionTypes listing endpoint.
- Vendor swagger file: /home/thomas/agents/integrations/halopsa/vendor-reference/swagger-v2.json

Impact:
- The app cannot auto-discover permitted Action Types for tickets. Posting to Halo requires a valid actionType_id and may fail with "You do not have access to this Action" if the API agent lacks permission.

Suggested next steps:
- Ask HaloPSA admin to confirm whether an ActionTypes listing endpoint exists or enable per-ticket allowed ActionTypes for the API agent.
- Add a manual Action Type mapping UI in Settings and document the requirement in README.
- Optionally implement a safe "Test Action Type" button (manual opt-in) to attempt a POST and show raw response for triage.

Repro:
1. Configure the app for the tenant and authenticate
2. Open ticket #2948 in the app
3. Attempt "Post to Halo"
4. Observe discovery failures and diagnostics in Settings

Labels: bug, needs-investigation
