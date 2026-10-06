import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ProviderButtons from "../components/ProviderButtons";
import { ErrorNote, Field, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import AuthShell from "./AuthShell";

export default function Login() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") || "");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api("/auth/providers").then((p) => setDemo(Boolean(p.demo))).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api("/auth/login", { method: "POST", body: { email, password } });
      signIn(session);
      navigate(params.get("next") || homeFor(session.user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail("candidate@talentlens.app");
    setPassword("Demo@1234");
  };

  return (
    <AuthShell>
      <h2 className="text-[28px] font-semibold">Sign in</h2>
      <p className="mt-1 text-muted">Find roles and track your applications.</p>

      <div className="mt-7"><ProviderButtons verb="Sign in" /></div>

      <div className="my-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="input" value={email}
                 onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy || !email || !password}>
          {busy ? <Spinner className="text-white" /> : "Sign in"}
        </button>
      </form>

      {demo && (
        <div className="mt-6 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm">
          <p className="text-muted">Exploring the demo?</p>
          <button type="button" className="mt-1 font-semibold text-pine hover:underline" onClick={fillDemo}>Fill in the demo candidate account</button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        New to TalentLens? <Link to="/signup" className="font-semibold text-pine hover:underline">Create an account</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        On the HR team? <Link to="/hr/login" className="font-semibold text-pine hover:underline">Go to the HR portal</Link>
      </p>
    </AuthShell>
  );
}
