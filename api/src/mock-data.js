const tickets = [
  {
    id: 101,
    summary: "Server down at client site",
    status: "Open",
    priority: "High",
    clientName: "Acme Corp",
    siteName: "Main Office",
    assignedTo: "Thomas Bray",
    updatedAt: new Date().toISOString(),
    clientId: 10,
    siteId: 20,
    address: "123 Main St, Springfield, IL 62701",
    latestNotes: ["Reached client. Starting travel.", "Hardware diagnosis pending."],
  },
  {
    id: 102,
    summary: "Printer not working",
    status: "Open",
    priority: "Normal",
    clientName: "Contoso Legal",
    siteName: "South Branch",
    assignedTo: "Thomas Bray",
    updatedAt: new Date().toISOString(),
    clientId: 11,
    siteId: 21,
    address: "45 Court Ave, Denver, CO 80203",
    latestNotes: ["Likely consumables issue."],
  },
];

const actionTypes = [
  { id: "2", label: "On-site Work" },
  { id: "5", label: "Travel" },
  { id: "8", label: "Remote Support" },
];

const outcomes = [
  { id: "1", label: "Completed" },
  { id: "2", label: "Needs follow-up" },
];

module.exports = {
  tickets,
  actionTypes,
  outcomes,
};
