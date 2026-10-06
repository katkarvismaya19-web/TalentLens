import { Briefcase, CalendarClock, ClipboardList, FileText, HeartPulse, LayoutDashboard, LogOut, Menu,
  ScrollText, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Logo from "./Logo";
import { Avatar } from "./ui";

const HR_NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/pipeline", label: "Pipeline", icon: ClipboardList },
  { to: "/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/retention", label: "Retention", icon: HeartPulse },
  { to: "/team", label: "People & access", icon: Users },
  { to: "/activity", label: "Activity log", icon: ScrollText },
];

const CANDIDATE_NAV = [
  { to: "/careers", label: "Find jobs", icon: Search },
  { to: "/my-applications", label: "My applications", icon: FileText },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user.role === "hr" ? HR_NAV : CANDIDATE_NAV;

  useEffect(() => setOpen(false), [location.pathname]);

  const logout = () => { const hr = user.role === "hr"; signOut(); navigate(hr ? "/hr/login" : "/login"); };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6"><Logo /></div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors ${
              isActive ? "bg-pine-soft text-pine-dark" : "text-muted hover:bg-canvas hover:text-ink"}`}>
            {({ isActive }) => (<>
              {isActive && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-pine" />}
              <Icon className="h-[18px] w-[18px]" />{label}
            </>)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} url={user.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            {user.role === "hr" ? (
              <p className="text-xs text-muted">HR ID<br /><span className="select-all whitespace-nowrap text-[13px] font-semibold tracking-wide text-ink">{user.hr_code}</span></p>
            ) : <p className="truncate text-xs text-muted">Candidate</p>}
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-danger" aria-label="Sign out" title="Sign out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-canvas" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 hover:bg-canvas" aria-label="Close menu"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10"><Outlet /></main>
    </div>
  );
}
