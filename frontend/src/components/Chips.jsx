import { STAGE_LABEL } from "../lib/format";

const STAGE_STYLE = {
  applied: "bg-slate-100 text-slate-700",
  shortlisted: "bg-sky-50 text-sky-800",
  interview: "bg-marigold-soft text-marigold-dark",
  offer: "bg-violet-50 text-violet-800",
  hired: "bg-pine-soft text-pine-dark",
  rejected: "bg-danger-soft text-danger",
};

export function StageChip({ stage }) {
  return <span className={`chip ${STAGE_STYLE[stage] || STAGE_STYLE.applied}`}>{STAGE_LABEL[stage] || stage}</span>;
}

const RISK_STYLE = {
  high: "bg-danger-soft text-danger",
  medium: "bg-marigold-soft text-marigold-dark",
  low: "bg-pine-soft text-pine-dark",
};

export function RiskChip({ level, value }) {
  return (
    <span className={`chip gap-1 ${RISK_STYLE[level]}`}>
      {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"}
      {value != null && <span className="tabular-nums opacity-80">{Math.round(value)}%</span>}
    </span>
  );
}

export function SkillChip({ children, tone = "neutral" }) {
  const styles = {
    neutral: "bg-canvas text-ink border border-line",
    match: "bg-pine-soft text-pine-dark",
    missing: "bg-white text-muted border border-dashed border-line line-through decoration-muted/50",
  };
  return <span className={`chip ${styles[tone]}`}>{children}</span>;
}
