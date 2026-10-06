import { CalendarClock, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { StageChip } from "../../components/Chips";
import { EmptyState, ErrorNote, PageHeader, PageLoader } from "../../components/ui";
import { fmtDate, fmtDateTime } from "../../lib/format";
import { useData } from "../../lib/useData";

const STEPS = ["applied", "shortlisted", "interview", "offer", "hired"];
const STEP_LABEL = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", offer: "Offer", hired: "Hired" };

function Progress({ stage }) {
  if (stage === "rejected") return <p className="text-sm text-muted">This role went to another candidate. Your profile stays on file for future openings.</p>;
  const current = STEPS.indexOf(stage);
  return (
    <ol className="flex items-center" aria-label="Application progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <span className={`h-3 w-3 rounded-full ${i <= current ? "bg-pine" : "border-2 border-line bg-white"}`} />
            <span className={`mt-1.5 text-xs ${i === current ? "font-semibold text-ink" : "text-muted"}`}>{STEP_LABEL[s]}</span>
          </div>
          {i < STEPS.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 ${i < current ? "bg-pine" : "bg-line"}`} />}
        </li>
      ))}
    </ol>
  );
}

export default function MyApplications() {
  const { data, error, loading } = useData("/applications/mine");
  return (
    <>
      <PageHeader title="My applications" description="Where each application stands. We also email you when anything changes." />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : data?.length === 0 ? (
        <EmptyState icon={FileText} title="You haven't applied anywhere yet" action={<Link to="/careers" className="btn-primary">Browse open roles</Link>}>
          Find a role that fits and apply with your resume. It takes about a minute.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {data?.map((a) => (
            <article key={a.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/careers/${a.job?.id}`} className="text-lg font-semibold hover:underline">{a.job?.title}</Link>
                  <p className="text-sm text-muted">{a.job?.department}, applied {fmtDate(a.created_at)}</p>
                </div>
                <StageChip stage={a.stage} />
              </div>
              <div className="mt-5"><Progress stage={a.stage} /></div>
              {a.interviews?.filter((i) => i.status === "scheduled").map((i) => (
                <div key={i.id} className="mt-4 flex items-start gap-3 rounded-[12px] bg-marigold-soft px-4 py-3">
                  <CalendarClock className="mt-0.5 h-5 w-5 text-marigold-dark" />
                  <div className="text-sm">
                    <p className="font-semibold">Interview on {fmtDateTime(i.starts_at)}</p>
                    <p className="text-muted">{i.duration_minutes} minutes, {i.mode === "video" ? "video call" : i.mode === "onsite" ? "in person" : "phone"}{i.location ? `: ${i.location}` : ""}</p>
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
