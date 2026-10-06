import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import { ErrorNote, Field, Spinner } from "./ui";

export default function PhoneSignIn() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const send = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("/auth/phone/send", { method: "POST", body: { phone } });
      setSent(r);
      setCode("");
      setWait(r.resend_in);
      setStep("code");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api("/auth/phone/verify", { method: "POST", body: { phone: sent.phone, code, name } });
      signIn(session);
      navigate(homeFor(session.user), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (step === "phone") {
    return (
      <form onSubmit={send} className="space-y-4">
        <p className="text-sm text-muted">We'll text you a 6-digit code. No password needed.</p>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Mobile number" htmlFor="phone" hint="Indian numbers can be typed without +91.">
          <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="input text-lg tracking-wide"
                 placeholder="98200 12345" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus required />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy || phone.replace(/\D/g, "").length < 8}>
          {busy ? <Spinner className="text-white" /> : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-sm text-muted">
        Enter the code sent to <span className="font-semibold text-ink">{sent.phone}</span>.{" "}
        <button type="button" className="font-semibold text-pine hover:underline" onClick={() => { setStep("phone"); setError(""); }}>Change number</button>
      </p>
      {sent.demo_code && (
        <p className="rounded-[10px] border border-dashed border-marigold bg-marigold-soft px-3.5 py-2.5 text-sm">
          Demo mode, no SMS is sent. Your code is <span className="font-display text-base font-semibold tracking-[0.2em]">{sent.demo_code}</span>
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>
      <Field label="6-digit code" htmlFor="otp">
        <input id="otp" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
               className="input text-center font-display text-2xl tracking-[0.5em]" value={code}
               onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
      </Field>
      {sent.is_new_user && (
        <Field label="Your full name" htmlFor="pname" hint="You're new here, so we'll create your account.">
          <input id="pname" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
      )}
      <button className="btn-primary w-full py-3" disabled={busy || code.length !== 6 || (sent.is_new_user && name.trim().length < 2)}>
        {busy ? <Spinner className="text-white" /> : sent.is_new_user ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        {wait > 0 ? `You can ask for a new code in ${wait}s` :
          <button type="button" className="font-semibold text-pine hover:underline" onClick={send} disabled={busy}>Send a new code</button>}
      </p>
    </form>
  );
}
