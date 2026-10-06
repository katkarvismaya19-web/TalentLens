import { ArrowLeft, CheckCircle2, FileUp } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SkillChip, StageChip } from "../../components/Chips";
import { ErrorNote, Field, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useData } from "../../lib/useData";

export default function JobView() {
  const { id } = useParams();
  const { data: job, error, loading, reload } = useData(`/jobs/${id}`);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  if (loading && !job) return <PageLoader />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const pick = (f) => {
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) { setErr("Upload your resume as a PDF, DOCX or TXT file."); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("Resume is larger than 5 MB. Upload a smaller file."); return; }
    setErr("");
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const form = new FormData();
    form.append("resume", file);
    form.append("cover_note", note);
    try { await api(`/jobs/${id}/apply`, { method: "POST", form }); reload(); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  const applied = job.my_application;

  return (
    <>
      <Link to="/careers" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All roles</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <article>
          <p className="text-muted">{job.department}</p>
          <h1 className="text-[32px] font-semibold leading-tight">{job.title}</h1>
          <p className="mt-1 text-muted">{[job.location, job.employment_type, job.min_experience ? `${job.min_experience}+ years experience` : "Freshers welcome"].filter(Boolean).join(", ")}</p>
          <h2 className="mt-8 text-lg font-semibold">About the role</h2>
          <p className="mt-2 max-w-[68ch] whitespace-pre-line leading-[1.7]">{job.description}</p>
          {job.required_skills.length > 0 && <>
            <h2 className="mt-8 text-lg font-semibold">Skills we're looking for</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">{job.required_skills.map((s) => <SkillChip key={s}>{s}</SkillChip>)}</div>
          </>}
        </article>

        <aside className="panel h-fit p-5 lg:sticky lg:top-8">
          {applied ? (
            <div>
              <CheckCircle2 className="h-8 w-8 text-pine" />
              <h2 className="mt-3 text-lg font-semibold">You've applied</h2>
              <p className="mt-1 text-sm text-muted">Sent on {fmtDate(applied.created_at)} with {applied.resume_filename}.</p>
              <div className="mt-3 flex items-center gap-2 text-sm">Status: <StageChip stage={applied.stage} /></div>
              <Link to="/my-applications" className="btn-quiet mt-5 w-full">Track my applications</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-lg font-semibold">Apply for this role</h2>
              <ErrorNote>{err}</ErrorNote>
              <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                     onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                     className={`flex cursor-pointer flex-col items-center rounded-[12px] border-2 border-dashed px-4 py-7 text-center transition-colors ${
                       drag ? "border-pine bg-pine-50" : file ? "border-pine/50 bg-pine-50" : "border-line hover:border-pine/40"}`}>
                <FileUp className="h-6 w-6 text-pine" />
                <span className="mt-2 text-sm font-semibold">{file ? file.name : "Drop your resume here or browse"}</span>
                <span className="mt-0.5 text-xs text-muted">{file ? "Click to choose a different file" : "PDF, DOCX or TXT, up to 5 MB"}</span>
                <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
              </label>
              <Field label="Note to the hiring team (optional)" htmlFor="note">
                <textarea id="note" rows={4} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={3000}
                          placeholder="Why this role interests you" />
              </Field>
              <button className="btn-primary w-full py-3" disabled={!file || busy}>{busy ? <Spinner className="text-white" /> : "Send application"}</button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
