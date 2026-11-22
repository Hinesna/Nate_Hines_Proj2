async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: "same-origin", ...options });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty or non-JSON body
  }
  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

export function get(path) {
  return request(path);
}

export function post(path, body = {}) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
