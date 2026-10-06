import { CalendarPlus, ExternalLink, FileText, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { SkillChip } from "../../components/Chips";
import ScoreRing from "../../components/ScoreRing";
import { ErrorNote, Modal } from "../../components/ui";
import { api, openFile } from "../../lib/api";
import { STAGES, STAGE_LABEL, fmtDate } from "../../lib/format";
import ScheduleForm from "./ScheduleForm";

function Bar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-semibold tabular-nums">{value == null ? "n/a" : `${value}%`}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-full rounded-full bg-pine" style={{ width: `${value ?? 0}%` }} /></div>
    </div>
  );
}

export default function CandidatePanel({ application, onChange }) {
  const [error, setError] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const a = application;
  const p = a.parsed || {};
  const m = a.match_details || {};

  const move = async (stage) => {
    setError("");
    try {
      onChange(await api(`/applications/${a.id}/stage`, { method: "PATCH", body: { stage } }));
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={a.match_score} size={72} stroke={7} animate />
        <div className="min-w-0">
          <p className="text-xl font-semibold font-display">{a.candidate?.name}</p>
          <p className="text-sm text-muted">Applied for {a.job?.title} on {fmtDate(a.created_at)}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {(a.candidate?.email || p.email) && (
              <a className="inline-flex items-center gap-1 text-pine hover:underline" href={`mailto:${a.candidate?.email || p.email}`}><Mail className="h-3.5 w-3.5" />{a.candidate?.email || p.email}</a>)}
            {(a.candidate?.phone || p.phone) && (
              <a className="inline-flex items-center gap-1 text-muted hover:text-ink" href={`tel:${a.candidate?.phone || p.phone}`}><Phone className="h-3.5 w-3.5" />{a.candidate?.phone || p.phone}</a>)}
          </div>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div>
        <p className="label">Stage</p>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <button key={s} onClick={() => move(s)} aria-pressed={a.stage === s}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      a.stage === s ? (s === "rejected" ? "border-danger bg-danger text-white" : "border-pine bg-pine text-white")
                                    : "border-line bg-white hover:border-pine/50"}`}>
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-[12px] bg-canvas p-4 sm:grid-cols-3">
        <Bar label="Skills covered" value={m.skill_coverage} />
        <Bar label="Fits the description" value={m.text_similarity} />
        <Bar label="Experience" value={m.experience_fit} />
      </div>

      {(m.matched_skills?.length > 0 || m.missing_skills?.length > 0) && (
        <div>
          <p className="label">Required skills</p>
          <div className="flex flex-wrap gap-1.5">
            {m.matched_skills?.map((s) => <SkillChip key={s} tone="match">{s}</SkillChip>)}
            {m.missing_skills?.map((s) => <SkillChip key={s} tone="missing">{s}</SkillChip>)}
          </div>
          {m.missing_skills?.length > 0 && <p className="mt-1.5 text-xs text-muted">Crossed-out skills weren't found in the resume.</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label">Experience</p>
          <p>{p.experience_years ? `${p.experience_years} years` : "Not stated"}</p>
        </div>
        <div>
          <p className="label">Education</p>
          <p>{p.education?.length ? p.education.join(", ") : "Not detected"}</p>
        </div>
      </div>

      {p.skills?.length > 0 && (
        <div>
          <p className="label">All skills found in the resume</p>
          <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <SkillChip key={s}>{s}</SkillChip>)}</div>
        </div>
      )}

      {p.links?.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {p.links.map((l) => <a key={l} href={`https://${l}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pine hover:underline">{l}<ExternalLink className="h-3.5 w-3.5" /></a>)}
        </div>
      )}

      {a.cover_note && (
        <div>
          <p className="label">Note from the candidate</p>
          <p className="whitespace-pre-line rounded-[12px] border border-line p-3.5 text-[15px]">{a.cover_note}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        <button className="btn-quiet" onClick={() => openFile(`/applications/${a.id}/resume`).catch((e) => setError(e.message))}>
          <FileText className="h-4 w-4" />Open resume
        </button>
        {!["hired", "rejected"].includes(a.stage) && (
          <button className="btn-primary" onClick={() => setScheduling(true)}><CalendarPlus className="h-4 w-4" />Schedule interview</button>
        )}
      </div>

      <Modal open={scheduling} onClose={() => setScheduling(false)} title="Schedule interview">
        <ScheduleForm application={a} onSaved={() => { setScheduling(false); onChange({ ...a, stage: ["applied", "shortlisted"].includes(a.stage) ? "interview" : a.stage }); }} />
      </Modal>
    </div>
  );
}
