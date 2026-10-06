import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScoreRing from "../../components/ScoreRing";
import { EmptyState, ErrorNote, Modal, PageHeader, PageLoader } from "../../components/ui";
import { api } from "../../lib/api";
import { STAGES, STAGE_LABEL, timeAgo } from "../../lib/format";
import { useData } from "../../lib/useData";
import CandidatePanel from "./CandidatePanel";

export default function Pipeline() {
  const [params] = useSearchParams();
  const [jobId, setJobId] = useState("");
  const jobs = useData("/jobs");
  const apps = useData(`/applications${jobId ? `?job_id=${jobId}` : ""}`);
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [error, setError] = useState("");
  const focus = params.get("stage");

  const update = (updated) => {
    apps.setData((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setSelected((s) => (s && s.id === updated.id ? { ...s, ...updated } : s));
  };

  const drop = async (stage, e) => {
    e.preventDefault();
    setDragOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    const app = apps.data.find((a) => a.id === id);
    if (!app || app.stage === stage) return;
    update({ ...app, stage }); // move immediately, roll back if the server refuses
    try {
      update(await api(`/applications/${id}/stage`, { method: "PATCH", body: { stage } }));
    } catch (err) {
      update(app);
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Pipeline" description="Drag a candidate to another column to move them, or open the card for details."
                  action={
                    <select className="input w-64" value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="Filter by job">
                      <option value="">All jobs</option>
                      {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>} />
      <ErrorNote>{error || apps.error}</ErrorNote>
      {apps.loading && !apps.data ? <PageLoader /> : apps.data?.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No candidates yet">Once people apply to your jobs, they show up here.</EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          <div className="grid min-w-[1080px] grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const items = apps.data?.filter((a) => a.stage === stage) || [];
              return (
                <section key={stage} aria-label={STAGE_LABEL[stage]}
                         onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                         onDragLeave={() => setDragOver(null)} onDrop={(e) => drop(stage, e)}
                         className={`flex min-h-[420px] flex-col rounded-panel p-2 transition-colors ${
                           dragOver === stage ? "bg-pine-soft" : focus === stage ? "bg-marigold-soft/60" : "bg-[#E9EFED]"}`}>
                  <h2 className="flex items-center justify-between px-2 pb-2 pt-1 font-sans text-sm font-semibold">
                    {STAGE_LABEL[stage]} <span className="tabular-nums text-muted">{items.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {items.map((a) => (
                      <button key={a.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                              onClick={() => setSelected(a)}
                              className="w-full cursor-grab rounded-[10px] border border-line bg-white p-3 text-left hover:border-pine/40 active:cursor-grabbing">
                        <p className="text-sm font-semibold leading-snug">{a.candidate?.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.job?.title}</p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <ScoreRing score={a.match_score} size={30} stroke={4} />
                          <span className="text-xs text-muted">{timeAgo(a.updated_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Candidate" wide>
        {selected && <CandidatePanel application={selected} onChange={update} />}
      </Modal>
    </>
  );
}
