import { ErrorNote, PageHeader, PageLoader } from "../../components/ui";
import { fmtDateTime } from "../../lib/format";
import { useData } from "../../lib/useData";

export default function Activity() {
  const { data, error, loading } = useData("/audit");
  return (
    <>
      <PageHeader title="Activity log" description="A record of sign-ins and changes, newest first. Kept for accountability." />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data ? <PageLoader /> : (
        <ol className="panel divide-y divide-line">
          {data?.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-44 shrink-0 text-sm tabular-nums text-muted">{fmtDateTime(r.created_at)}</span>
              <span className="w-36 shrink-0 text-sm font-semibold">{r.user?.name || "System"}</span>
              <span className="min-w-0 flex-1 text-[15px]">{r.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
