const json = (body, init) => ({
  jsonBody: body,
  status: init?.status || 200,
  headers: {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  },
});

function handleError(error) {
  return json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 },
  );
}

module.exports = {
  json,
  handleError,
};
