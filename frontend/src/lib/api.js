const TOKEN_KEY = "tl_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

function errorMessage(data, status) {
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => `${d.loc?.slice(-1)[0] ?? "field"}: ${d.msg}`).join("; ");
    }
  }
  if (typeof data === "string" && data) return data;
  return status >= 500 ? "The server ran into a problem. Try again in a moment." : "That request didn't work.";
}

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json() : await res.text();
  if (res.status === 401 && token) {
    setToken(null);
    window.location.assign("/login?error=" + encodeURIComponent("Your session expired. Sign in again."));
  }
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export async function openFile(path) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error("Couldn't open the file.");
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
