const json = (body, init) => {
  const headers = init?.headers
    ? {
        "Content-Type": "application/json",
        ...init.headers,
      }
    : {
        "Content-Type": "application/json",
      };
  return {
    jsonBody: body,
    status: init?.status || 200,
    headers,
  };
};

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
