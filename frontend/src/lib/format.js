export const STAGES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"];

export const STAGE_LABEL = {
  applied: "Applied", shortlisted: "Shortlisted", interview: "Interviewing",
  offer: "Offer", hired: "Hired", rejected: "Not selected",
};

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "");

export const inr = (n) =>
  n == null ? "" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

export const timeAgo = (v) => {
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(v);
};
