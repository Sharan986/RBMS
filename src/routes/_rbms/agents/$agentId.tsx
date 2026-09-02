import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { fetchActivities, fetchAgentDetail } from "@/rbms/api";
import { ActivityTable } from "@/rbms/components/ActivityViews";
import { AllocationDrawer } from "@/rbms/components/AllocationDrawer";
import { DataTable } from "@/rbms/components/DataTable";
import { shgColumns } from "@/rbms/components/tables";
import {
  Breadcrumbs,
  Button,
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
import { useRbms } from "@/rbms/context/RbmsContext";
import { TASK_DEFINITIONS } from "@/rbms/types";


export const Route = createFileRoute("/_rbms/agents/$agentId")({
  head: () => ({
    meta: [
      { title: "Agent Detail — DigiKrishi RBMS" },
      {
        name: "description",
        content: "Agent workload, allocated SHGs, field activity and exceptions, with SHG allocation and reassignment.",
      },
      { property: "og:title", content: "Agent Detail — DigiKrishi RBMS" },
      { property: "og:description", content: "Review an Agent's SHGs, activity and open exceptions." },
    ],
  }),
  component: AgentDetailPage,
});

function AgentDetailPage() {
  const { agentId } = Route.useParams();
  const { districtId } = useRbms();
  const navigate = useNavigate();
  const [tab, setTab] = useState("shgs");
  const [shgSearch, setShgSearch] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const query = useQuery({ queryKey: ["agent", agentId], queryFn: () => fetchAgentDetail(agentId) });
  const activity = useQuery({
    queryKey: ["agent-activity", agentId, districtId, activityPage],
    queryFn: () => fetchActivities({ districtId, agentId, page: activityPage, pageSize: 10 }),
    enabled: tab === "activity",
  });

  const data = query.data;
  const shgs = (data?.shgs ?? []).filter((s) =>
    `${s.name} ${s.leadFarmerName}`.toLowerCase().includes(shgSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Agents", to: "/agents" },
          { label: data?.agent.name ?? "Agent" },
        ]}
      />

      {query.isLoading && <LoadingState label="Loading Agent…" />}
      {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {data && (
        <>
          <PageHeader
            title={data.agent.name}
            subtitle={`${data.agent.fpcName} · ${data.agent.districtName} district`}
            actions={
              <>
                <StatusPill tone={toneForStatus(data.agent.status)}>{data.agent.status}</StatusPill>
                <Button onClick={() => setAllocating(true)}>
                  <Plus className="h-3.5 w-3.5" /> Allocate SHGs
                </Button>
              </>
            }
          />

          <div className="grid gap-3 lg:grid-cols-4">
            <Panel title="Agent details" className="lg:col-span-1">
              <div className="space-y-2 text-[12.5px]">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> <span className="text-foreground">{data.agent.email}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> <span className="text-foreground">{data.agent.phone}</span>
                </p>
                <p className="pt-1 text-muted-foreground">
                  FPC: <span className="text-foreground">{data.agent.fpcName}</span>
                </p>
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
              <MetricCard label="Assigned SHGs" value={data.counts.shgs} context="Owned by this Agent" />
              <MetricCard label="Farmers" value={data.counts.farmers} context="Across assigned SHGs" />
              <MetricCard
                label="Completion"
                value={`${data.progress.overall}%`}
                context={`${data.progress.completed} of ${data.progress.total} tasks`}
                tone={data.progress.overall >= 80 ? "green" : data.progress.overall >= 60 ? "amber" : "red"}
              />
            </div>
          </div>

          <Panel title="Task completion" subtitle="Across all farmers in this Agent's SHGs">
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
                  { key: "shgs", label: `Assigned SHGs (${data.shgs.length})` },
                  { key: "activity", label: "Activity" },

                ]}
              />
              {tab === "shgs" && (
                <div className="w-full max-w-xs">
                  <Input
                    placeholder="Search SHGs or Lead Farmers…"
                    value={shgSearch}
                    onChange={(e) => setShgSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {tab === "shgs" && (
              <DataTable
                columns={shgColumns({ hideAgent: true })}
                rows={shgs}
                emptyMessage="No SHGs are allocated to this Agent yet."
                emptyHint="Use “Allocate SHGs” to give this Agent responsibility for groups in their FPC."
                onRowClick={(r) => navigate({ to: "/shgs/$shgId", params: { shgId: r.id } })}
                dense
              />
            )}

            {tab === "activity" && (
              <ActivityTable
                rows={activity.data?.rows ?? []}
                isLoading={activity.isLoading}
                error={activity.error}
                onRetry={() => activity.refetch()}
                page={activityPage}
                pageSize={10}
                total={activity.data?.total ?? 0}
                onPageChange={setActivityPage}
                columnsToHide={["agentName"]}
              />
            )}

          </Panel>

          <AllocationDrawer
            open={allocating}
            onOpenChange={setAllocating}
            agentId={data.agent.id}
            agentName={data.agent.name}
            fpcId={data.agent.fpcId}
            fpcName={data.agent.fpcName}
          />
        </>
      )}
    </div>
  );
}
