function headers(apiKey) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
}

function baseUrl(url) {
  return (url || "").replace(/\/+$/, "");
}

export async function openwaListSessions(openwaUrl, apiKey) {
  const res = await fetch(baseUrl(openwaUrl) + "/api/sessions", {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error("OpenWA sessions: " + res.status);
  }
  return res.json();
}

export async function openwaGetSession(openwaUrl, apiKey, sessionId) {
  const res = await fetch(
    baseUrl(openwaUrl) + "/api/sessions/" + encodeURIComponent(sessionId),
    { headers: headers(apiKey) }
  );
  if (!res.ok) {
    throw new Error("OpenWA session: " + res.status);
  }
  return res.json();
}

export async function openwaStartSession(openwaUrl, apiKey, sessionId) {
  const res = await fetch(
    baseUrl(openwaUrl) +
      "/api/sessions/" +
      encodeURIComponent(sessionId) +
      "/start",
    { method: "POST", headers: headers(apiKey) }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error("OpenWA start: " + res.status + " " + text.slice(0, 120));
  }
  return res.json();
}

export async function openwaGetQr(openwaUrl, apiKey, sessionId) {
  const res = await fetch(
    baseUrl(openwaUrl) +
      "/api/sessions/" +
      encodeURIComponent(sessionId) +
      "/qr",
    { headers: headers(apiKey) }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error("OpenWA QR: " + res.status + " " + text.slice(0, 120));
  }
  return res.json();
}

export async function openwaCreateSession(openwaUrl, apiKey, name) {
  const res = await fetch(baseUrl(openwaUrl) + "/api/sessions", {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ name: name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("OpenWA create: " + res.status + " " + text.slice(0, 120));
  }
  return res.json();
}

export function isSessionOnline(status) {
  return status === "ready";
}

export function needsQrScan(status) {
  return (
    status === "qr_ready" ||
    status === "initializing" ||
    status === "authenticating"
  );
}

export function statusLabelKey(status) {
  if (status === "ready") return "WA status online";
  if (status === "disconnected" || status === "created")
    return "WA status offline";
  if (status === "qr_ready") return "WA status scan qr";
  if (status === "initializing" || status === "authenticating")
    return "WA status connecting";
  if (status === "failed") return "WA status failed";
  return "WA status unknown";
}

export async function openwaListWebhooks(openwaUrl, apiKey, sessionId) {
  const res = await fetch(
    baseUrl(openwaUrl) +
      "/api/sessions/" +
      encodeURIComponent(sessionId) +
      "/webhooks",
    { headers: headers(apiKey) }
  );
  if (!res.ok) {
    throw new Error("OpenWA webhooks: " + res.status);
  }
  return res.json();
}

export async function openwaRegisterWebhook(
  openwaUrl,
  apiKey,
  sessionId,
  webhookUrl,
  webhookSecret
) {
  const res = await fetch(
    baseUrl(openwaUrl) +
      "/api/sessions/" +
      encodeURIComponent(sessionId) +
      "/webhooks",
    {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        url: webhookUrl,
        events: ["message.received"],
        secret: webhookSecret || undefined,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error("OpenWA webhook: " + res.status + " " + text.slice(0, 120));
  }
  return res.json();
}
