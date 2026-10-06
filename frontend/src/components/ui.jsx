import { AlertCircle, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

let openModals = 0;

export function Spinner({ className = "" }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-pine ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-4 rounded-full bg-pine-soft p-3 text-pine"><Icon className="h-6 w-6" /></div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-md text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    openModals += 1;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
           onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, note }) {
  return (
    <div className="panel px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-[30px] font-semibold leading-none tabular-nums">{value ?? "–"}</p>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function Avatar({ name, url, size = 36 }) {
  const init = (name || "?").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  if (url) return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-pine-soft font-semibold text-pine-dark"
          style={{ width: size, height: size, fontSize: size * 0.38 }}>{init}</span>
  );
}
