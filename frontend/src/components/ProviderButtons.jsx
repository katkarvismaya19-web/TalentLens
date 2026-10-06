import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PhoneSignIn from "./PhoneSignIn";
import { Modal } from "./ui";

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);
const MicrosoftLogo = () => (
  <svg viewBox="0 0 21 21" className="h-[18px] w-[18px]" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" /><rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" /><rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);
const PROVIDERS = [
  { id: "google", label: "Google", Logo: GoogleLogo },
];

export default function ProviderButtons({ verb = "Continue" }) {
  const [enabled, setEnabled] = useState(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  useEffect(() => { api("/auth/providers").then(setEnabled).catch(() => setEnabled({})); }, []);
  return (
    <div className="grid gap-2.5">
      {PROVIDERS.map(({ id, label, Logo }) => {
        const on = enabled?.[id];
        return (
          <a
            key={id}
            href={on ? `/api/auth/oauth/${id}/start` : undefined}
            aria-disabled={!on}
            title={on === false ? `${label} sign-in isn't set up on this server yet` : undefined}
            className={`btn-quiet w-full py-3 ${on ? "" : "pointer-events-none opacity-45"}`}
          >
            <Logo />
            <span>{verb} with {label}</span>
          </a>
        );
      })}
      <button type="button" onClick={() => setPhoneOpen(true)} disabled={!enabled?.phone}
              title={enabled?.phone === false ? "Phone sign-in isn't set up on this server yet" : undefined}
              className="btn-quiet w-full py-3">
        <Smartphone className="h-[18px] w-[18px] text-pine" />
        <span>{verb} with phone number</span>
      </button>
      <Modal open={phoneOpen} onClose={() => setPhoneOpen(false)} title="Use your phone number">
        <PhoneSignIn />
      </Modal>
    </div>
  );
}
