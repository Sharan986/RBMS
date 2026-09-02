import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { fetchFpcDetail } from "@/rbms/api";
import { DataTable } from "@/rbms/components/DataTable";
import { agentColumns, shgColumns } from "@/rbms/components/tables";
import {
  Breadcrumbs,
  ErrorState,
  Input,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  ProgressRow,
  StatusPill,
  Tabs,
  toneForStatus,
} from "@/rbms/components/ui";
import { TASK_DEFINITIONS } from "@/rbms/types";

export const Route = createFileRoute("/_rbms/fpcs/$fpcId")({
  head: () => ({
    meta: [
      { title: "FPC Detail — DigiKrishi RBMS" },
      {
        name: "description",
        content: "Agents, SHGs, completion metrics and exceptions for a single Farmer Producer Company.",
      },
      { property: "og:title", content: "FPC Detail — DigiKrishi RBMS" },
      { property: "og:description", content: "Drill into an FPC's Agents, SHGs and field completion." },
    ],
  }),
  component: FpcDetailPage,
});

function FpcDetailPage() {
  const { fpcId } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("agents");
  const [agentSearch, setAgentSearch] = useState("");
  const [shgSearch, setShgSearch] = useState("");

  const query = useQuery({ queryKey: ["fpc", fpcId], queryFn: () => fetchFpcDetail(fpcId) });
  const data = query.data;

  const agents = (data?.agents ?? []).filter((a) => a.name.toLowerCase().includes(agentSearch.toLowerCase()));
  const shgs = (data?.shgs ?? []).filter((s) =>
    `${s.name} ${s.agentName} ${s.leadFarmerName}`.toLowerCase().includes(shgSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "FPCs", to: "/fpcs" },
          { label: data?.fpc.name ?? "FPC" },
        ]}
      />

      {query.isLoading && <LoadingState label="Loading FPC…" />}
      {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {data && (
        <>
          <PageHeader
            title={data.fpc.name}
            subtitle={`${data.fpc.districtName} district`}
            actions={<StatusPill tone={toneForStatus(data.fpc.status)}>{data.fpc.status}</StatusPill>}
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="Agents" value={data.counts.agents} context="Working under this FPC" />
            <MetricCard label="SHGs" value={data.counts.shgs} context="Groups under this FPC" />
            <MetricCard
              label="Farmers"
              value={data.counts.farmers.toLocaleString("en-IN")}
              context="Across all SHGs"
            />
            <MetricCard
              label="Overall Progress"
              value={`${data.progress.overall}%`}
              context={`${data.progress.completed} of ${data.progress.total} tasks completed`}
              tone={data.progress.overall >= 80 ? "green" : data.progress.overall >= 60 ? "amber" : "red"}
            />
          </div>

          <Panel title="Task completion" subtitle="Completed task instances / applicable task instances">
            <div className="grid gap-3 md:grid-cols-3">
              {TASK_DEFINITIONS.map((t) => (
                <ProgressRow key={t.key} label={t.label} value={data.progress.byTask[t.key]} />
              ))}
            </div>
          </Panel>

          <Panel bodyClassName="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "agents", label: `Agents (${data.agents.length})` },
                  { key: "shgs", label: `SHGs (${data.shgs.length})` },
                ]}
              />

              <div className="w-full max-w-xs">
                {tab === "agents" ? (
                  <Input
                    placeholder="Search Agents…"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder="Search SHGs, Agent or Lead Farmer…"
                    value={shgSearch}
                    onChange={(e) => setShgSearch(e.target.value)}
                  />
                )}
              </div>
            </div>

            {tab === "agents" ? (
              <DataTable
                columns={agentColumns({ hideFpc: true })}
                rows={agents}
                emptyMessage="No Agents match this search."
                onRowClick={(r) => navigate({ to: "/agents/$agentId", params: { agentId: r.id } })}
                dense
              />
            ) : (
              <DataTable
                columns={shgColumns({ hideFpc: true })}
                rows={shgs}
                emptyMessage="No SHGs match this search."
                onRowClick={(r) => navigate({ to: "/shgs/$shgId", params: { shgId: r.id } })}
                dense
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
