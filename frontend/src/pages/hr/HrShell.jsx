import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

const POINTS = [
  { icon: KeyRound, title: "Your own HR ID", text: "Every HR member gets a personal ID when they sign up, used with a password to sign in." },
  { icon: ShieldCheck, title: "Kept separate from candidates", text: "HR accounts can't sign in from the candidate pages, and candidates can't open HR pages." },
  { icon: BadgeCheck, title: "Everything is logged", text: "Sign-ins and changes are recorded in the activity log." },
];

export default function HrShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <section className="relative hidden flex-col bg-ink px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo light />
          <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-xs font-semibold text-white/80">HR portal</span>
        </div>
        <div className="my-auto max-w-[440px]">
          <h1 className="font-display text-[42px] font-semibold leading-[1.06] text-white">The hiring desk, for your HR team only.</h1>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 h-fit shrink-0 self-start rounded-[10px] bg-white/10 p-2 text-marigold"><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50">Looking for a job? <Link to="/login" className="font-semibold text-white underline-offset-2 hover:underline">Go to candidate sign-in</Link></p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo /><span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">HR portal</span>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
