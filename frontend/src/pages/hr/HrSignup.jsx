import { Check, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorNote, Field, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import HrShell from "./HrShell";

function SaveYourId({ session, onContinue }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const code = session.hr_code;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const text = `TalentLens HR portal\n\nName: ${session.user.name}\nHR ID: ${code}\nSign in at: ${window.location.origin}/hr/login\n\nKeep this ID private. You need it with your password to sign in.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `TalentLens-HR-ID-${code}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 className="text-[28px] font-semibold">Your HR account is ready</h2>
      <p className="mt-1 text-muted">From now on, sign in to the HR portal with this ID and your password.</p>

      <div className="mt-7 rounded-[14px] border-2 border-pine bg-pine-50 px-5 py-6 text-center">
        <p className="text-sm font-medium text-pine-dark">Your HR ID</p>
        <p className="mt-2 select-all font-display text-[34px] font-semibold tracking-[0.08em] text-ink">{code}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn-quiet" onClick={copy}>{copied ? <Check className="h-4 w-4 text-pine" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button>
          <button type="button" className="btn-quiet" onClick={download}><Download className="h-4 w-4" />Download</button>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">You'll also see it under your name in the sidebar. If you lose it, use "Forgot your HR ID?" on the sign-in page.</p>

      <label className="mt-6 flex items-start gap-2.5 text-sm font-medium">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-pine" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I've saved my HR ID somewhere safe
      </label>
      <button className="btn-primary mt-4 w-full py-3" disabled={!saved} onClick={onContinue}>Go to the HR dashboard</button>
    </div>
  );
}

export default function HrSignup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", company_code: "" });
  const [codeRequired, setCodeRequired] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api("/auth/providers").then((p) => setCodeRequired(p.company_code_required)).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const strong = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { setCreated(await api("/auth/hr/signup", { method: "POST", body: form })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (created) {
    return (
      <HrShell>
        <SaveYourId session={created} onContinue={() => { signIn(created); navigate("/dashboard", { replace: true }); }} />
      </HrShell>
    );
  }

  return (
    <HrShell>
      <h2 className="text-[28px] font-semibold">Create an HR account</h2>
      <p className="mt-1 text-muted">You'll get a personal HR ID to sign in with.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name" htmlFor="hname"><input id="hname" className="input" autoComplete="name" value={form.name} onChange={set("name")} required /></Field>
        <Field label="Work email" htmlFor="hemail" hint="Used only to recover your HR ID.">
          <input id="hemail" type="email" className="input" autoComplete="email" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Password" htmlFor="hpass" hint="At least 8 characters, with a letter and a number.">
          <input id="hpass" type="password" className="input" autoComplete="new-password" value={form.password} onChange={set("password")} required />
        </Field>
        {codeRequired && (
          <Field label="Company access code" htmlFor="ccode" hint="Your HR admin shares this so only your company can create HR accounts.">
            <input id="ccode" className="input" value={form.company_code} onChange={set("company_code")} required />
          </Field>
        )}
        <button className="btn-primary w-full py-3" disabled={busy || !form.name || !form.email || !strong || (codeRequired && !form.company_code)}>
          {busy ? <Spinner className="text-white" /> : "Create HR account"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an HR ID? <Link to="/hr/login" className="font-semibold text-pine hover:underline">Sign in</Link>
      </p>
    </HrShell>
  );
}
