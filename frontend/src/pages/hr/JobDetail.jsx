import { ArrowLeft, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SkillChip, StageChip } from "../../components/Chips";
import ScoreRing from "../../components/ScoreRing";
import { EmptyState, ErrorNote, Modal, PageLoader } from "../../components/ui";
import { api } from "../../lib/api";
import { useData } from "../../lib/useData";
import CandidatePanel from "./CandidatePanel";
import JobForm from "./JobForm";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = useData(`/jobs/${id}`);
  const apps = useData(`/jobs/${id}/applicants`);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  if (job.loading && !job.data) return <PageLoader />;
  if (job.error) return <ErrorNote>{job.error}</ErrorNote>;
  const j = job.data;

  const remove = async () => {
    if (!window.confirm(`Delete "${j.title}" and all of its applications? This can't be undone.`)) return;
    try { await api(`/jobs/${id}`, { method: "DELETE" }); navigate("/jobs"); } catch (e) { setError(e.message); }
  };

  const updateApp = (updated) => {
    apps.setData((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setSelected((s) => (s && s.id === updated.id ? { ...s, ...updated } : s));
  };

  return (
    <>
      <Link to="/jobs" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All jobs</Link>
      <ErrorNote>{error}</ErrorNote>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[28px] font-semibold leading-tight">{j.title}</h1>
          <p className="mt-1 text-muted">{[j.department, j.location, j.employment_type, j.min_experience ? `${j.min_experience}+ years` : "Freshers welcome"].filter(Boolean).join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{j.required_skills.map((s) => <SkillChip key={s}>{s}</SkillChip>)}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-quiet" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</button>
          <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" />Delete</button>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Applicants, best fit first</h2>
      {apps.loading && !apps.data ? <PageLoader /> : apps.data?.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet">
          Candidates apply from the careers page. Each resume is scored against this job as soon as it's uploaded.
        </EmptyState>
      ) : (
        <ol className="panel divide-y divide-line">
          {apps.data?.map((a, i) => (
            <li key={a.id}>
              <button onClick={() => setSelected(a)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-pine-50">
                <span className="hidden w-5 text-sm tabular-nums text-muted sm:block">{i + 1}</span>
                <ScoreRing score={a.match_score} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.candidate?.name}</p>
                  <p className="truncate text-sm text-muted">
                    {a.match_details?.matched_skills?.length ?? 0} of {j.required_skills.length} skills
                    {a.parsed?.experience_years ? `, ${a.parsed.experience_years} yrs experience` : ""}
                  </p>
                </div>
                <StageChip stage={a.stage} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit job" wide>
        <JobForm job={j} onSaved={(saved) => { job.setData(saved); setEditing(false); apps.reload(); }} />
      </Modal>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Candidate" wide>
        {selected && <CandidatePanel application={selected} onChange={updateApp} />}
      </Modal>
    </>
  );
}
