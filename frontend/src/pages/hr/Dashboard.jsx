import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RiskChip } from "../../components/Chips";
import { Avatar, ErrorNote, PageHeader, PageLoader, Stat } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { STAGE_LABEL, fmtDateTime } from "../../lib/format";
import { useData } from "../../lib/useData";

const FUNNEL_COLORS = { applied: "#9FB3B0", shortlisted: "#5E9A92", interview: "#E7A33E", offer: "#2F7A71", hired: "#0E5A54", rejected: "#D9A79D" };

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useData("/dashboard");
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const funnelMax = Math.max(1, ...data.funnel.map((f) => f.count));
  const a = data.attrition;

  return (
    <>
      <PageHeader title={`Good to see you, ${user.name.split(" ")[0]}`}
                  description="Where hiring stands today, and who on the team might need a conversation." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open jobs" value={data.open_jobs} />
        <Stat label="Candidates in progress" value={data.in_pipeline} note={`${data.total_applications} applications in total`} />
        <Stat label="Average match" value={data.avg_match != null ? `${Math.round(data.avg_match)}%` : null} />
        <Stat label="Days to hire" value={data.avg_time_to_hire_days ?? null} note={`${data.hired} hired so far`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="panel p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold">Hiring funnel</h2>
          <p className="text-sm text-muted">How many candidates sit at each step right now.</p>
          <div className="mt-5 space-y-3">
            {data.funnel.map((f) => (
              <Link to={`/pipeline?stage=${f.stage}`} key={f.stage} className="group grid grid-cols-[110px_1fr_36px] items-center gap-3">
                <span className="text-sm text-muted group-hover:text-ink">{STAGE_LABEL[f.stage]}</span>
                <span className="h-7 rounded-md bg-canvas">
                  <span className="block h-full rounded-md transition-[width] duration-700"
                        style={{ width: `${Math.max(f.count ? 4 : 0, (f.count / funnelMax) * 100)}%`, background: FUNNEL_COLORS[f.stage] }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{f.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Coming up</h2>
            <Link to="/interviews" className="text-sm font-semibold text-pine hover:underline">All interviews</Link>
          </div>
          {data.upcoming_interviews.length === 0 ? (
            <div className="mt-6 flex flex-col items-center text-center text-sm text-muted">
              <CalendarClock className="mb-2 h-6 w-6 text-pine" />
              No interviews scheduled. Shortlist a candidate and book a slot from the pipeline.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.upcoming_interviews.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <Avatar name={i.candidate?.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.candidate?.name}</p>
                    <p className="truncate text-sm text-muted">{i.job?.title}</p>
                  </div>
                  <p className="shrink-0 text-right text-sm tabular-nums text-muted">{fmtDateTime(i.starts_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="panel p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold">Applications per week</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly} margin={{ left: -24, right: 4 }}>
                <CartesianGrid vertical={false} stroke="#E6ECEA" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5B6B70" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5B6B70" }} />
                <Tooltip cursor={{ fill: "#F0F7F5" }} contentStyle={{ borderRadius: 10, border: "1px solid #DCE3E1" }} />
                <Bar dataKey="applications" name="Applications" fill="#0E5A54" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Retention watch</h2>
            <Link to="/retention" className="text-sm font-semibold text-pine hover:underline">Open</Link>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-canvas" aria-label="Risk split">
            {a.total > 0 && <>
              <span style={{ width: `${(a.high / a.total) * 100}%` }} className="bg-danger" />
              <span style={{ width: `${(a.medium / a.total) * 100}%` }} className="bg-marigold" />
              <span style={{ width: `${(a.low / a.total) * 100}%` }} className="bg-pine" />
            </>}
          </div>
          <p className="mt-2 text-sm text-muted">{a.high} high, {a.medium} medium and {a.low} low risk across {a.total} employees.</p>
          <ul className="mt-3 divide-y divide-line">
            {a.at_risk.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="truncate text-sm text-muted">{e.risk_factors?.[0]?.reason || e.department}</p>
                </div>
                <RiskChip level={e.risk_level} value={e.attrition_risk} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
