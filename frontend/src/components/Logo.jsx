export default function Logo({ light = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <circle cx="16" cy="16" r="12.5" fill="none" stroke={light ? "rgba(255,255,255,.28)" : "#DCE3E1"} strokeWidth="5" />
        <path d="M16 3.5a12.5 12.5 0 0 1 11.9 8.6" fill="none" stroke="#E7A33E" strokeWidth="5" strokeLinecap="round" />
        <path d="M27.9 12.1A12.5 12.5 0 1 1 16 3.5" fill="none" stroke={light ? "#fff" : "#0E5A54"} strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className={`font-display text-[19px] font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        TalentLens
      </span>
    </span>
  );
}
