import { HeartPulse, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RiskChip } from "../../components/Chips";
import { EmptyState, ErrorNote, Field, Modal, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { inr } from "../../lib/format";
import { useData } from "../../lib/useData";

const BLANK = { name: "", email: "", department: "", job_role: "", age: 28, monthly_income: 45000, years_at_company: 2,
  overtime: false, job_satisfaction: 3, work_life_balance: 3, environment_satisfaction: 3, distance_from_home: 10,
  years_since_last_promotion: 1, num_companies_worked: 1, percent_salary_hike: 12 };

const SCALE = ["", "Low", "Medium", "High", "Very high"];

function Scale({ label, value, onChange, id }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="grid grid-cols-4 gap-1" role="radiogroup" id={id}>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)}
                  className={`rounded-[8px] border px-1 py-2 text-xs font-medium ${value === n ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine/40"}`}>
            {SCALE[n]}
          </button>
        ))}
      </div>
    </Field>
  );
}

function EmployeeForm({ employee, onSaved, onDeleted }) {
  const [form, setForm] = useState(employee ? { ...BLANK, ...employee } : BLANK);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef();
  const set = (k, cast = (v) => v) => (e) => setForm((f) => ({ ...f, [k]: cast(e.target.value) }));
  const num = (v) => (v === "" ? "" : Number(v));

  const payload = () => {
    const { id, attrition_risk, risk_level, risk_factors, created_at, ...rest } = form;
    return { ...rest, name: rest.name || "Unnamed" };
  };

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api("/employees/predict", { method: "POST", body: payload() }).then(setPreview).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await api(employee ? `/employees/${employee.id}` : "/employees", { method: employee ? "PUT" : "POST", body: payload() }));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${employee.name}?`)) return;
    try { await api(`/employees/${employee.id}`, { method: "DELETE" }); onDeleted(employee.id); } catch (e) { setError(e.message); }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="n"><input id="n" className="input" value={form.name} onChange={set("name")} required /></Field>
          <Field label="Department" htmlFor="d"><input id="d" className="input" value={form.department} onChange={set("department")} /></Field>
          <Field label="Role" htmlFor="r"><input id="r" className="input" value={form.job_role} onChange={set("job_role")} /></Field>
          <Field label="Age" htmlFor="a"><input id="a" type="number" min="16" max="80" className="input" value={form.age} onChange={set("age", num)} /></Field>
          <Field label="Monthly salary (₹)" htmlFor="inc"><input id="inc" type="number" min="1" className="input" value={form.monthly_income} onChange={set("monthly_income", num)} /></Field>
          <Field label="Last salary hike (%)" htmlFor="hike"><input id="hike" type="number" min="0" max="100" className="input" value={form.percent_salary_hike} onChange={set("percent_salary_hike", num)} /></Field>
          <Field label="Years at company" htmlFor="yac"><input id="yac" type="number" min="0" step="0.5" className="input" value={form.years_at_company} onChange={set("years_at_company", num)} /></Field>
          <Field label="Years since last promotion" htmlFor="ysp"><input id="ysp" type="number" min="0" step="0.5" className="input" value={form.years_since_last_promotion} onChange={set("years_since_last_promotion", num)} /></Field>
          <Field label="Commute (km)" htmlFor="dist"><input id="dist" type="number" min="0" className="input" value={form.distance_from_home} onChange={set("distance_from_home", num)} /></Field>
          <Field label="Previous companies" htmlFor="nc"><input id="nc" type="number" min="0" max="40" className="input" value={form.num_companies_worked} onChange={set("num_companies_worked", num)} /></Field>
        </div>
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-pine" checked={form.overtime} onChange={(e) => setForm((f) => ({ ...f, overtime: e.target.checked }))} />
          Regularly works overtime
        </label>
        <Scale id="js" label="Job satisfaction" value={form.job_satisfaction} onChange={(v) => setForm((f) => ({ ...f, job_satisfaction: v }))} />
        <Scale id="wlb" label="Work-life balance" value={form.work_life_balance} onChange={(v) => setForm((f) => ({ ...f, work_life_balance: v }))} />
        <Scale id="env" label="Satisfaction with work environment" value={form.environment_satisfaction} onChange={(v) => setForm((f) => ({ ...f, environment_satisfaction: v }))} />
      </div>

      <aside className="h-fit rounded-[12px] bg-canvas p-4 md:sticky md:top-20">
        <p className="text-sm text-muted">Chance of leaving</p>
        <p className="mt-1 font-display text-[40px] font-semibold leading-none tabular-nums">{preview ? `${Math.round(preview.risk)}%` : "–"}</p>
        {preview && <div className="mt-2"><RiskChip level={preview.level} /></div>}
        <p className="mt-4 text-sm font-semibold">What's driving it</p>
        {preview?.drivers?.length ? (
          <ul className="mt-1.5 space-y-1.5 text-sm">{preview.drivers.map((d) => <li key={d.feature} className="border-l-2 border-danger/50 pl-2">{d.reason}</li>)}</ul>
        ) : <p className="mt-1 text-sm text-muted">No strong warning signs.</p>}
        <p className="mt-4 text-xs text-muted">Updates as you change the form, so you can test what a raise or a promotion would do.</p>
        <div className="mt-5 grid gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="text-white" /> : employee ? "Save changes" : "Add employee"}</button>
          {employee && <button type="button" className="btn-danger" onClick={remove}>Remove</button>}
        </div>
      </aside>
    </form>
  );
}

export default function Retention() {
  const { data, error, loading, setData, reload } = useData("/employees");
  const model = useData("/employees/model");
  const [editing, setEditing] = useState(null); // null | "new" | employee
  const [filter, setFilter] = useState("all");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef();

  const importCsv = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await api("/employees/import", { method: "POST", form });
      setImportMsg(`Imported ${r.added} employees${r.skipped ? `, skipped ${r.skipped} rows with missing values` : ""}.`);
      reload();
    } catch (e) { setImportMsg(e.message); }
    fileRef.current.value = "";
  };

  const rows = (data || []).filter((e) => filter === "all" || e.risk_level === filter);
  const close = () => setEditing(null);

  return (
    <>
      <PageHeader title="Retention" description="Predicts who might resign, and why, so you can talk to them before they hand in notice."
                  action={<>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => importCsv(e.target.files[0])} />
                    <button className="btn-quiet" onClick={() => fileRef.current.click()}><Upload className="h-4 w-4" />Import CSV</button>
                    <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add employee</button>
                  </>} />
      {importMsg && <p className="mb-4 text-sm text-muted">{importMsg}</p>}
      <ErrorNote>{error}</ErrorNote>

      {model.data && (
        <p className="mb-5 text-sm text-muted">
          Model: {model.data.algorithm}, trained on {model.data.rows.toLocaleString()} records ({model.data.trained_on}).
          Accuracy {model.data.accuracy}%, ROC AUC {model.data.roc_auc}.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[["all", "Everyone"], ["high", "High risk"], ["medium", "Medium risk"], ["low", "Low risk"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${filter === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/30"}`}>
            {label} <span className="tabular-nums opacity-70">{k === "all" ? data?.length ?? 0 : data?.filter((e) => e.risk_level === k).length ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && !data ? <PageLoader /> : rows.length === 0 ? (
        <EmptyState icon={HeartPulse} title="No employees here">Add employees one by one or import a CSV export from your HR system.</EmptyState>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-[15px]">
            <thead className="border-b border-line"><tr>
              <th className="table-head">Employee</th><th className="table-head">Department</th><th className="table-head">Salary</th>
              <th className="table-head">Main reason</th><th className="table-head">Risk</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => (
                <tr key={e.id} className="cursor-pointer hover:bg-pine-50" onClick={() => setEditing(e)}>
                  <td className="table-cell"><p className="font-semibold">{e.name}</p><p className="text-sm text-muted">{e.job_role}</p></td>
                  <td className="table-cell text-muted">{e.department}</td>
                  <td className="table-cell tabular-nums">{inr(e.monthly_income)}</td>
                  <td className="table-cell text-sm">{e.risk_factors?.[0]?.reason || <span className="text-muted">None</span>}</td>
                  <td className="table-cell"><RiskChip level={e.risk_level} value={e.attrition_risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={close} title={editing === "new" ? "Add employee" : editing?.name} wide>
        {editing && (
          <EmployeeForm employee={editing === "new" ? null : editing}
                        onSaved={(saved) => { setData((l) => [saved, ...l.filter((x) => x.id !== saved.id)].sort((a, b) => b.attrition_risk - a.attrition_risk)); close(); }}
                        onDeleted={(id) => { setData((l) => l.filter((x) => x.id !== id)); close(); }} />
        )}
      </Modal>
    </>
  );
}
