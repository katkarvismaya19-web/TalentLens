import { CalendarClock, MapPin, Phone, Star, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, ErrorNote, Field, Modal, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtTime } from "../../lib/format";
import { useData } from "../../lib/useData";
import ScheduleForm from "./ScheduleForm";

const MODE_ICON = { video: Video, onsite: MapPin, phone: Phone };

function FeedbackForm({ interview, onSaved }) {
  const [feedback, setFeedback] = useState(interview.feedback || "");
  const [rating, setRating] = useState(interview.rating || 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (status) => {
    setBusy(true);
    try {
      onSaved(await api(`/interviews/${interview.id}`, { method: "PATCH",
        body: { status, feedback, ...(rating ? { rating } : {}) } }));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <div>
        <p className="label">Overall rating</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} out of 5`} onClick={() => setRating(n)}>
              <Star className={`h-7 w-7 ${n <= rating ? "fill-marigold text-marigold" : "text-line"}`} />
            </button>
          ))}
        </div>
      </div>
      <Field label="Notes" htmlFor="fb">
        <textarea id="fb" rows={5} className="input" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Strengths, concerns and a recommendation" />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {interview.status === "scheduled" && <button className="btn-danger" disabled={busy} onClick={() => save("cancelled")}>Cancel interview</button>}
        <button className="btn-primary" disabled={busy} onClick={() => save("completed")}>{busy ? <Spinner className="text-white" /> : "Save as completed"}</button>
      </div>
    </div>
  );
}

export default function Interviews() {
  const { data, error, loading, setData } = useData("/interviews");
  const candidates = useData("/applications");
  const [active, setActive] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [pickId, setPickId] = useState("");
  const [showPast, setShowPast] = useState(false);

  const groups = useMemo(() => {
    const now = Date.now() - 3600_000;
    const list = (data || []).filter((i) => (showPast ? new Date(i.starts_at) < now || i.status !== "scheduled"
                                                       : new Date(i.starts_at) >= now && i.status === "scheduled"));
    if (showPast) list.reverse();
    const map = new Map();
    list.forEach((i) => {
      const key = new Date(i.starts_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
      map.set(key, [...(map.get(key) || []), i]);
    });
    return [...map.entries()];
  }, [data, showPast]);

  const eligible = (candidates.data || []).filter((a) => !["hired", "rejected"].includes(a.stage));
  const picked = eligible.find((a) => String(a.id) === pickId);

  return (
    <>
      <PageHeader title="Interviews" description="Every booking checks both calendars, so nobody gets double-booked."
                  action={<button className="btn-primary" onClick={() => setScheduling(true)}>Schedule interview</button>} />
      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-white p-1" role="tablist">
        {[["Upcoming", false], ["Past and cancelled", true]].map(([label, past]) => (
          <button key={label} role="tab" aria-selected={showPast === past} onClick={() => setShowPast(past)}
                  className={`rounded-[8px] px-3.5 py-1.5 text-sm font-medium ${showPast === past ? "bg-pine text-white" : "text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : groups.length === 0 ? (
        <EmptyState icon={CalendarClock} title={showPast ? "Nothing here yet" : "No upcoming interviews"}>
          {!showPast && "Book one from a candidate's card in the pipeline, or use Schedule interview."}
        </EmptyState>
      ) : groups.map(([day, items]) => (
        <section key={day} className="mb-6">
          <h2 className="mb-2 font-sans text-sm font-semibold text-muted">{day}</h2>
          <ul className="panel divide-y divide-line">
            {items.map((i) => {
              const Icon = MODE_ICON[i.mode] || Video;
              return (
                <li key={i.id}>
                  <button onClick={() => setActive(i)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-pine-50">
                    <div className="w-24 shrink-0 whitespace-nowrap font-display text-lg font-semibold tabular-nums">{fmtTime(i.starts_at)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{i.candidate?.name}</p>
                      <p className="truncate text-sm text-muted">{i.job?.title}, with {i.interviewer?.name}, {i.duration_minutes} min</p>
                    </div>
                    <Icon className="h-4 w-4 shrink-0 text-muted" aria-label={i.mode} />
                    {i.status !== "scheduled" && <span className={`chip ${i.status === "completed" ? "bg-pine-soft text-pine-dark" : "bg-danger-soft text-danger"}`}>{i.status === "completed" ? "Completed" : "Cancelled"}</span>}
                    {i.rating && <span className="inline-flex items-center gap-0.5 text-sm font-semibold"><Star className="h-4 w-4 fill-marigold text-marigold" />{i.rating}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active ? `Interview with ${active.candidate?.name}` : ""}>
        {active && (
          <>
            {active.location && <p className="mb-4 break-words text-sm text-muted">Where: <span className="text-ink">{active.location}</span></p>}
            <FeedbackForm interview={active} onSaved={(u) => { setData((l) => l.map((x) => (x.id === u.id ? u : x))); setActive(null); }} />
          </>
        )}
      </Modal>

      <Modal open={scheduling} onClose={() => { setScheduling(false); setPickId(""); }} title="Schedule interview">
        <Field label="Candidate" htmlFor="pick">
          <select id="pick" className="input" value={pickId} onChange={(e) => setPickId(e.target.value)}>
            <option value="">Choose a candidate</option>
            {eligible.map((a) => <option key={a.id} value={a.id}>{a.candidate?.name}, {a.job?.title}</option>)}
          </select>
        </Field>
        {picked && <div className="mt-5 border-t border-line pt-5">
          <ScheduleForm key={picked.id} application={picked}
                        onSaved={(iv) => { setData((l) => [...l, iv].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))); setScheduling(false); setPickId(""); }} />
        </div>}
      </Modal>
    </>
  );
}
