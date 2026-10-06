import { useState } from "react";
import { Avatar, ErrorNote, PageHeader, PageLoader } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/format";
import { useData } from "../../lib/useData";

const PROVIDER = { email: "Email", google: "Google", microsoft: "Microsoft", phone: "Phone" };

export default function Team() {
  const { user } = useAuth();
  const { data, error, loading } = useData("/users");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("hr");

  const rows = (data || []).filter((u) => u.role === tab &&
    `${u.name} ${u.email || ""} ${u.phone || ""} ${u.hr_code || ""}`.toLowerCase().includes(q.toLowerCase()));
  const count = (role) => (data || []).filter((u) => u.role === role).length;

  return (
    <>
      <PageHeader title="People & access"
                  description="HR members join through the HR portal and sign in with their own HR ID. Candidates can never open HR pages." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-[10px] border border-line bg-white p-1" role="tablist">
          {[["hr", "HR team"], ["candidate", "Candidates"]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`rounded-[8px] px-3.5 py-1.5 text-sm font-medium ${tab === k ? "bg-pine text-white" : "text-muted hover:text-ink"}`}>
              {label} <span className="tabular-nums opacity-75">{count(k)}</span>
            </button>
          ))}
        </div>
        <input className="input max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-[15px]">
            <thead className="border-b border-line"><tr>
              <th className="table-head">Person</th><th className="table-head">{tab === "hr" ? "HR ID" : "Signs in with"}</th><th className="table-head">Joined</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="table-cell"><div className="flex items-center gap-3"><Avatar name={u.name} url={u.avatar_url} size={32} />
                    <div className="min-w-0"><p className="truncate font-semibold">{u.name}{u.id === user.id && <span className="font-normal text-muted"> (you)</span>}</p>
                    <p className="truncate text-sm text-muted">{u.email || u.phone}</p></div></div></td>
                  <td className="table-cell">{tab === "hr" ? <span className="font-semibold tracking-wide">{u.hr_code}</span> : <span className="text-muted">{PROVIDER[u.provider] || u.provider}</span>}</td>
                  <td className="table-cell text-muted">{fmtDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
