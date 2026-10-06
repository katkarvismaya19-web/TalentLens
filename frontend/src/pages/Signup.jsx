import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProviderButtons from "../components/ProviderButtons";
import { ErrorNote, Field, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import AuthShell from "./AuthShell";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const strong = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api("/auth/signup", { method: "POST", body: form });
      signIn(session);
      navigate(homeFor(session.user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-[28px] font-semibold">Create your candidate account</h2>
      <p className="mt-1 text-muted">Apply to jobs and follow every step. It takes less than a minute.</p>

      <div className="mt-6"><ProviderButtons verb="Sign up" /></div>
      <div className="my-5 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name" htmlFor="name">
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number.">
          <input id="password" type="password" className="input" autoComplete="new-password" value={form.password}
                 onChange={set("password")} required aria-invalid={form.password && !strong} />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy || !form.name || !form.email || !strong}>
          {busy ? <Spinner className="text-white" /> : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-pine hover:underline">Sign in</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Hiring for your company? <Link to="/hr/signup" className="font-semibold text-pine hover:underline">Create an HR account</Link>
      </p>
    </AuthShell>
  );
}
