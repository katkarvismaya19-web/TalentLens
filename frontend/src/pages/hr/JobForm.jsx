import { X } from "lucide-react";
import { useState } from "react";
import { ErrorNote, Field, Spinner } from "../../components/ui";
import { api } from "../../lib/api";

const EMPTY = { title: "", department: "", location: "", employment_type: "Full-time", description: "",
  required_skills: [], min_experience: 0, status: "open" };

export default function JobForm({ job, onSaved }) {
  const [form, setForm] = useState(job ? { ...EMPTY, ...job } : EMPTY);
  const [skill, setSkill] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSkill = () => {
    const parts = skill.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setForm((f) => ({ ...f, required_skills: [...new Set([...f.required_skills, ...parts.map((p) => p.toLowerCase())])] }));
    setSkill("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...form, min_experience: Number(form.min_experience) || 0 };
      const saved = await api(job ? `/jobs/${job.id}` : "/jobs", { method: job ? "PUT" : "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <Field label="Job title" htmlFor="title">
        <input id="title" className="input" value={form.title} onChange={set("title")} placeholder="Backend Developer" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor="dept"><input id="dept" className="input" value={form.department} onChange={set("department")} placeholder="Engineering" /></Field>
        <Field label="Location" htmlFor="loc"><input id="loc" className="input" value={form.location} onChange={set("location")} placeholder="Mumbai (Hybrid)" /></Field>
        <Field label="Type" htmlFor="type">
          <select id="type" className="input" value={form.employment_type} onChange={set("employment_type")}>
            {["Full-time", "Part-time", "Internship", "Contract"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Minimum experience (years)" htmlFor="exp">
          <input id="exp" type="number" min="0" max="40" step="0.5" className="input" value={form.min_experience} onChange={set("min_experience")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="desc" hint="Candidates are scored against this text, so describe the real work and tools.">
        <textarea id="desc" rows={6} className="input" value={form.description} onChange={set("description")} required />
      </Field>
      <Field label="Required skills" htmlFor="skill" hint="Press Enter after each skill, or paste a comma-separated list.">
        <div className="flex gap-2">
          <input id="skill" className="input" value={skill} onChange={(e) => setSkill(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="e.g. python, sql, docker" />
          <button type="button" className="btn-quiet" onClick={addSkill}>Add</button>
        </div>
        {form.required_skills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {form.required_skills.map((s) => (
              <span key={s} className="chip gap-1 bg-pine-soft pr-1 text-pine-dark">
                {s}
                <button type="button" aria-label={`Remove ${s}`} className="rounded-full p-0.5 hover:bg-white/60"
                        onClick={() => setForm((f) => ({ ...f, required_skills: f.required_skills.filter((x) => x !== s) }))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>
      {job && (
        <Field label="Status" htmlFor="status">
          <select id="status" className="input" value={form.status} onChange={set("status")}>
            <option value="open">Open, accepting applications</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-primary min-w-[140px]" disabled={busy}>
          {busy ? <Spinner className="text-white" /> : job ? "Save changes" : "Publish job"}
        </button>
      </div>
      {job && <p className="text-right text-xs text-muted">Saving re-scores everyone who applied.</p>}
    </form>
  );
}
