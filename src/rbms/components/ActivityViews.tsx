import { useState } from "react";
import type { ActivityRow } from "../api";
import { DataTable, type Column } from "./DataTable";
import { Drawer, EmptyState, LoadingState, StatusPill, formatDateTime, inr, toneForStatus } from "./ui";

export const ACTIVITY_LABEL: Record<string, string> = {
  KYC: "KYC uploaded",
  GEO_PLOT: "Geo plot completed",
  SUBSCRIPTION: "Subscription submitted",
  PAYMENT: "Payment activity",
  OTHER: "Field update",
};

export const roleLabel = (role: string) => (role === "LEAD_FARMER" ? "Lead Farmer" : "Agent");

export function ActivityFeed({
  rows,
  isLoading,
  emptyMessage = "No activity matches the selected filters.",
}: {
  rows: ActivityRow[];
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) return <LoadingState />;
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <ul className="divide-y divide-border">
      {rows.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div>
            <p className="text-[12.5px] font-medium text-foreground">{ACTIVITY_LABEL[a.type]}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Farmer: {a.farmerName} · SHG: {a.shgName}
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Performed by: {roleLabel(a.performedByRole)} ({a.performedByName})
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-muted-foreground">{formatDateTime(a.timestamp)}</p>
            <div className="mt-1">
              <StatusPill tone={toneForStatus(a.status)}>{a.status}</StatusPill>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActivityTable({
  rows,
  isLoading,
  error,
  onRetry,
  page,
  pageSize,
  total,
  onPageChange,
  sort,
  onSortChange,
  columnsToHide = [],
}: {
  rows: ActivityRow[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  sort?: { sortBy: string; sortDir: "asc" | "desc" };
  onSortChange?: (s: { sortBy: string; sortDir: "asc" | "desc" }) => void;
  columnsToHide?: string[];
}) {
  const [selected, setSelected] = useState<ActivityRow | null>(null);

  const all: Column<ActivityRow>[] = [
    { key: "timestamp", header: "Date / Time", render: (r) => formatDateTime(r.timestamp) },
    {
      key: "type",
      header: "Activity",
      render: (r) => <span className="font-medium">{ACTIVITY_LABEL[r.type]}</span>,
    },
    { key: "farmerName", header: "Farmer", render: (r) => r.farmerName },
    { key: "shgName", header: "SHG", render: (r) => r.shgName },
    { key: "agentName", header: "Agent", render: (r) => r.agentName },
    { key: "performedByName", header: "Performed By", render: (r) => r.performedByName },
    {
      key: "performedByRole",
      header: "Role",
      render: (r) => <StatusPill tone={r.performedByRole === "AGENT" ? "blue" : "neutral"}>{roleLabel(r.performedByRole)}</StatusPill>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill>,
    },
    { key: "verifiedByName", header: "Verified By", render: (r) => r.verifiedByName },
  ];

  return (
    <>
      <DataTable
        columns={all.filter((c) => !columnsToHide.includes(c.key))}
        rows={rows}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyMessage="No activity matches the selected filters."
        onRowClick={setSelected}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        sort={sort}
        onSortChange={onSortChange}
        dense
      />
      <ActivityDetailDrawer activity={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export function ActivityDetailDrawer({
  activity,
  onClose,
}: {
  activity: ActivityRow | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={!!activity}
      onOpenChange={(v) => !v && onClose()}
      title={activity ? ACTIVITY_LABEL[activity.type]! : "Activity"}
      description={activity ? formatDateTime(activity.timestamp) : undefined}
      width="max-w-md"
    >
      {activity && (
        <div className="space-y-4">
          <Field label="Status">
            <StatusPill tone={toneForStatus(activity.status)}>{activity.status}</StatusPill>
          </Field>
          <Field label="Farmer">{activity.farmerName}</Field>
          <Field label="SHG">{activity.shgName}</Field>
          <Field label="FPC">{activity.fpcName}</Field>
          <Field label="Agent">{activity.agentName}</Field>
          <Field label="Performed by">
            {activity.performedByName} · {roleLabel(activity.performedByRole)}
          </Field>
          <Field label="Timestamp">{formatDateTime(activity.timestamp)}</Field>
          <Field label="Verification">
            {activity.verifiedAt
              ? `${activity.verifiedByName} · ${formatDateTime(activity.verifiedAt)}`
              : "Not verified yet"}
          </Field>
          {activity.type === "PAYMENT" && (
            <Field label="Payment">
              {typeof activity.metadata.amount === "number" ? inr(activity.metadata.amount) : "—"} ·{" "}
              {String(activity.metadata.method ?? "—")}
            </Field>
          )}
          <div>
            <p className="mb-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">Metadata</p>
            <div className="rounded-md border border-border bg-panel-2 p-2.5">
              {Object.entries(activity.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between py-0.5 text-[12px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
