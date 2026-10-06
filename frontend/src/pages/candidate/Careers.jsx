import { Briefcase, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SkillChip } from "../../components/Chips";
import { EmptyState, ErrorNote, PageHeader, PageLoader } from "../../components/ui";
import { timeAgo } from "../../lib/format";
import { useData } from "../../lib/useData";

export default function Careers() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useData(`/jobs?q=${encodeURIComponent(q)}`);
  return (
    <>
      <PageHeader title="Open roles" description="Apply with your resume. You'll get an email whenever your application moves forward." />
      <input className="input mb-6 max-w-md" placeholder="Search by role, team or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : data?.length === 0 ? (
        <EmptyState icon={Briefcase} title={q ? "No roles match that search" : "No open roles right now"}>
          {q ? "Try a broader search, like a skill or a city." : "Check back soon. New roles are posted here first."}
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((j) => (
            <Link key={j.id} to={`/careers/${j.id}`} className="panel flex flex-col p-5 transition-colors hover:border-pine/50">
              <p className="text-sm text-muted">{j.department}</p>
              <h2 className="mt-0.5 text-lg font-semibold">{j.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>}
                <span>{j.employment_type}</span><span>Posted {timeAgo(j.created_at)}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">{j.required_skills.slice(0, 5).map((s) => <SkillChip key={s}>{s}</SkillChip>)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
