import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorNote, Modal, PageHeader, PageLoader } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { useData } from "../../lib/useData";
import JobForm from "./JobForm";

export default function Jobs() {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, error, loading } = useData(`/jobs?q=${encodeURIComponent(q)}`);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Jobs" description="Post roles and see applicants ranked by how well they fit."
                  action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Post a job</button>} />
      <input className="input mb-5 max-w-sm" placeholder="Search by title, team or location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : data?.length === 0 ? (
        <EmptyState icon={Briefcase} title={q ? "No jobs match that search" : "No jobs yet"}
                    action={!q && <button className="btn-primary" onClick={() => setCreating(true)}>Post your first job</button>}>
          {!q && "Post a job and share the careers page. Every resume gets scored the moment it arrives."}
        </EmptyState>
      ) : (
        <div className="panel divide-y divide-line">
          {data?.map((j) => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-pine-50 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{j.title}</p>
                  {j.status === "closed" && <span className="chip bg-canvas text-muted">Closed</span>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <span>{j.department || "No team"}</span>
                  {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>}
                  <span>Posted {fmtDate(j.created_at)}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium"><Users className="h-4 w-4 text-pine" />{j.applicant_count} applicants</span>
            </Link>
          ))}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Post a job" wide>
        <JobForm onSaved={(job) => navigate(`/jobs/${job.id}`)} />
      </Modal>
    </>
  );
}
