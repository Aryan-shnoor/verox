const BASE_URL = import.meta.env.VITE_API_URL;

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("Can't reach the server. Is it running?");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // an expired or invalid token: clear it and go back to login
    if (res.status === 401 && token && path !== "/auth/login") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error(data?.message || "Something went wrong.");
  }

  return data;
}

export function login(email, password) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

export function register(fullName, email, password) {
  return request("/auth/register", {
    method: "POST",
    body: { fullName, email, password },
  });
}

function toQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

// fetches a file with the login token and saves it in the browser
async function downloadFile(path, filename) {
  const token = localStorage.getItem("token");

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Can't reach the server. Is it running?");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "Download failed.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getDocuments(filters) {
  return request(`/documents${toQuery(filters)}`);
}

export function downloadDocumentsCsv(filters) {
  return downloadFile(
    `/reports/documents${toQuery(filters)}`,
    "verox-documents.csv",
  );
}

export function getDocument(id) {
  return request(`/documents/${id}`);
}

export function createDocument(data) {
  return request("/documents", { method: "POST", body: data });
}

export function updateDocument(id, data) {
  return request(`/documents/${id}`, { method: "PATCH", body: data });
}

export function getWorkflows() {
  return request("/workflows");
}

export function getApproval(id) {
  return request(`/documents/${id}/approval`);
}

export function submitDocument(id, comment) {
  return request(`/documents/${id}/submit`, {
    method: "POST",
    body: { comment },
  });
}

export function getAttachments(id) {
  return request(`/documents/${id}/attachments`);
}

export function uploadAttachment(id, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/documents/${id}/attachments`, {
    method: "POST",
    body: form,
  });
}

export function deleteAttachment(id, attachmentId) {
  return request(`/documents/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export function downloadAttachment(id, attachmentId, filename) {
  return downloadFile(`/documents/${id}/attachments/${attachmentId}`, filename);
}

export function getSummary() {
  return request("/reports/summary");
}

export function getPendingReviews() {
  return request("/reviews/pending");
}

export function getReviewSummary() {
  return request("/reviews/summary");
}

export function decide(id, action, comment) {
  return request(`/documents/${id}/decision`, {
    method: "POST",
    body: { action, comment },
  });
}