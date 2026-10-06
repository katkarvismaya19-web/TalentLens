import { useEffect, useState } from "react";
import { ErrorNote, Field, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtTime } from "../../lib/format";

const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ScheduleForm({ application, onSaved }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState({ interviewer_id: "", day: tomorrow, starts_at: "", duration_minutes: 45, mode: "video", location: "" });
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api("/users?role=hr").then((users) => {
      setTeam(users);
      if (users[0]) setForm((f) => ({ ...f, interviewer_id: String(users[0].id) }));
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!form.interviewer_id || !form.day) return;
    setSlots(null);
    api("/interviews/suggest", { method: "POST", body: {
      application_id: application.id, interviewer_id: Number(form.interviewer_id), day: form.day,
      duration_minutes: Number(form.duration_minutes) } })
      .then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [form.interviewer_id, form.day, form.duration_minutes, application.id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await api("/interviews", { method: "POST", body: {
        application_id: application.id, interviewer_id: Number(form.interviewer_id), starts_at: form.starts_at,
        duration_minutes: Number(form.duration_minutes), mode: form.mode, location: form.location } });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">Interview with <span className="font-semibold text-ink">{application.candidate?.name}</span> for {application.job?.title}.</p>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Interviewer" htmlFor="iv">
          <select id="iv" className="input" value={form.interviewer_id} onChange={set("interviewer_id")} required>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Length" htmlFor="dur">
          <select id="dur" className="input" value={form.duration_minutes} onChange={set("duration_minutes")}>
            {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </Field>
        <Field label="Day" htmlFor="day">
          <input id="day" type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={form.day} onChange={set("day")} />
        </Field>
        <Field label="Mode" htmlFor="mode">
          <select id="mode" className="input" value={form.mode} onChange={set("mode")}>
            <option value="video">Video call</option><option value="onsite">In person</option><option value="phone">Phone</option>
          </select>
        </Field>
      </div>

      <div>
        <p className="label">Free times for both of them</p>
        {slots === null ? <Spinner /> : slots.length === 0 ? (
          <p className="text-sm text-muted">No free slots between 9:00 and 18:00 on this day. Try another day.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => {
              const value = toLocalInput(new Date(s));
              const active = form.starts_at === value;
              return (
                <button type="button" key={s} onClick={() => setForm((f) => ({ ...f, starts_at: value }))}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                          active ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine/50"}`}>
                  {fmtTime(s)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Field label="Or pick an exact time" htmlFor="start">
        <input id="start" type="datetime-local" className="input" value={form.starts_at} onChange={set("starts_at")} required />
      </Field>
      <Field label={form.mode === "video" ? "Meeting link" : form.mode === "onsite" ? "Address" : "Phone number"} htmlFor="loc">
        <input id="loc" className="input" value={form.location} onChange={set("location")}
               placeholder={form.mode === "video" ? "https://meet.google.com/..." : ""} />
      </Field>
      <div className="flex justify-end pt-1">
        <button className="btn-primary min-w-[160px]" disabled={busy || !form.starts_at}>
          {busy ? <Spinner className="text-white" /> : "Schedule interview"}
        </button>
      </div>
    </form>
  );
}
