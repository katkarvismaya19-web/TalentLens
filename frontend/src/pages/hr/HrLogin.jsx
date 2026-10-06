import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorNote, Field, Modal, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import HrShell from "./HrShell";

function RecoverId() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { setCode((await api("/auth/hr/recover", { method: "POST", body: { email, password } })).hr_code); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  if (code) return (
    <div className="text-center">
      <p className="text-muted">Your HR ID is</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-wider">{code}</p>
      <p className="mt-3 text-sm text-muted">Close this window and sign in with it.</p>
    </div>
  );
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">Confirm it's you with the work email and password you signed up with.</p>
      <ErrorNote>{error}</ErrorNote>
      <Field label="Work email" htmlFor="remail"><input id="remail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      <Field label="Password" htmlFor="rpass"><input id="rpass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
      <button className="btn-primary w-full" disabled={busy || !email || !password}>{busy ? <Spinner className="text-white" /> : "Show my HR ID"}</button>
    </form>
  );
}

export default function HrLogin() {
  const [params] = useSearchParams();
  const [hrCode, setHrCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") || "");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api("/auth/providers").then((p) => setDemo(Boolean(p.demo))).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api("/auth/hr/login", { method: "POST", body: { hr_code: hrCode, password } });
      signIn(session);
      navigate(params.get("next") || "/dashboard", { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <HrShell>
      <h2 className="text-[28px] font-semibold">HR sign in</h2>
      <p className="mt-1 text-muted">Use the HR ID you got when you created your account.</p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="HR ID" htmlFor="hrcode">
          <input id="hrcode" className="input font-display text-lg uppercase tracking-wider" autoComplete="username"
                 placeholder="HR-XXXX-XXXX" value={hrCode} onChange={(e) => setHrCode(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="hrpass">
          <input id="hrpass" type="password" className="input" autoComplete="current-password" value={password}
                 onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy || !hrCode || !password}>
          {busy ? <Spinner className="text-white" /> : "Sign in"}
        </button>
        <button type="button" className="w-full text-center text-sm font-semibold text-pine hover:underline" onClick={() => setRecovering(true)}>
          Forgot your HR ID?
        </button>
      </form>

      {demo && (
        <div className="mt-6 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm">
          <p className="text-muted">Exploring the demo?</p>
          <button type="button" className="mt-1 font-semibold text-pine hover:underline"
                  onClick={() => { setHrCode("HR-DEMO-0001"); setPassword("Demo@1234"); }}>
            Fill in the demo HR account
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        New to the HR team? <Link to="/hr/signup" className="font-semibold text-pine hover:underline">Create an HR account</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted lg:hidden">
        Looking for a job? <Link to="/login" className="font-semibold text-pine hover:underline">Candidate sign-in</Link>
      </p>

      <Modal open={recovering} onClose={() => setRecovering(false)} title="Find your HR ID"><RecoverId /></Modal>
    </HrShell>
  );
}
