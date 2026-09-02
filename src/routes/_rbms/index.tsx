import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { fetchDashboard } from "@/rbms/api";
import { useRbms } from "@/rbms/context/RbmsContext";
import { ActivityFeed } from "@/rbms/components/ActivityViews";
import { DataTable } from "@/rbms/components/DataTable";
import { agentColumns, fpcColumns } from "@/rbms/components/tables";
import { Button, ErrorState, LoadingState, MetricCard, PageHeader, Panel, ProgressRow } from "@/rbms/components/ui";
import { TASK_DEFINITIONS } from "@/rbms/types";

export const Route = createFileRoute("/_rbms/")({
  head: () => ({
    meta: [
      { title: "RBMS Dashboard — DigiKrishi Field Operations" },
      {
        name: "description",
        content:
          "District Manager control centre for DigiKrishi RBMS: FPC and Agent performance, SHG progress and field activity.",
      },
      { property: "og:title", content: "RBMS Dashboard — DigiKrishi Field Operations" },
      {
        property: "og:description",
        content: "Monitor FPCs, Agents, SHGs and field activity across your district.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { districtId, districtName } = useRbms();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["dashboard", districtId], queryFn: () => fetchDashboard(districtId) });
  const data = query.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${districtName} district overview`}
        subtitle="Field execution across all FPCs, Agents and SHGs in the selected district."
        actions={
          <>
            <span className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
              Last 30 days
            </span>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={query.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Refresh
            </Button>
          </>
        }
      />

      {query.isLoading && <LoadingState label="Loading district overview…" />}
      {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="FPCs" value={data.counts.fpcs} context="Producer companies in district" to="/fpcs" />
            <MetricCard label="Agents" value={data.counts.agents} context="Field agents across all FPCs" to="/agents" />
            <MetricCard label="SHGs" value={data.counts.shgs} context="Self-help groups monitored" to="/shgs" />
            <MetricCard
              label="Farmers"
              value={data.counts.farmers.toLocaleString("en-IN")}
              context="Registered in this district"
            />
            <MetricCard
              label="Overall Progress"
              value={`${data.progress.overall}%`}
              context={`${data.progress.completed.toLocaleString("en-IN")} of ${data.progress.total.toLocaleString("en-IN")} tasks completed`}
              tone={data.progress.overall >= 80 ? "green" : data.progress.overall >= 60 ? "amber" : "red"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel
              title="District Completion"
              subtitle="Completed task instances / total applicable task instances"
            >
              <div className="space-y-3">
                <ProgressRow 
                  label="Overall" 
                  value={data.progress.overall} 
                  completed={data.progress.completed} 
                  total={data.progress.total} 
                />
                {TASK_DEFINITIONS.map((t) => (
                  <ProgressRow 
                    key={t.key} 
                    label={t.label} 
                    value={data.progress.byTask[t.key]} 
                    completed={data.progress.counters?.[t.key]?.completed} 
                    total={data.progress.counters?.[t.key]?.total} 
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="FPC Performance"
              subtitle="Click a row to open the FPC and drill into its Agents and SHGs"
              className="lg:col-span-2"
              bodyClassName="p-0"
              action={
                <Link to="/fpcs" className="text-[11.5px] text-primary">
                  View all FPCs →
                </Link>
              }
            >
              <DataTable
                columns={fpcColumns()}
                rows={data.fpcs}
                onRowClick={(r) => navigate({ to: "/fpcs/$fpcId", params: { fpcId: r.id } })}
                emptyMessage="No FPCs found in this district."
                dense
              />
            </Panel>
          </div>

          <Panel
            title="Agent Performance"
            subtitle="Top and bottom performing Agents in this district"
            bodyClassName="p-0"
            action={
              <Link to="/agents" className="text-[11.5px] text-primary">
                View All Agents →
              </Link>
            }
          >
            <DataTable
              columns={agentColumns()}
              rows={[...data.topAgents, ...data.bottomAgents.filter((b) => !data.topAgents.some((t) => t.id === b.id))]}
              onRowClick={(r) => navigate({ to: "/agents/$agentId", params: { agentId: r.id } })}
              emptyMessage="No Agents found in this district."
              dense
            />
          </Panel>

          <Panel
            title="Recent Field Activity"
            subtitle="Work performed by Agents and Lead Farmers"
            action={
              <Link to="/activity-logs" className="text-[11.5px] text-primary">
                View activity logs →
              </Link>
            }
          >
            <ActivityFeed rows={data.activity} emptyMessage="No field activity recorded yet." />
          </Panel>
        </>
      )}
    </div>
  );
}
