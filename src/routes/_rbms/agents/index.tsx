import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { fetchAgents, fetchFpcOptions } from "@/rbms/api";
import { DataTable } from "@/rbms/components/DataTable";
import { agentColumns } from "@/rbms/components/tables";
import { Input, MetricCard, PageHeader, Panel, Select } from "@/rbms/components/ui";
import { useRbms } from "@/rbms/context/RbmsContext";
import { useListState } from "@/rbms/hooks/useListState";

export const Route = createFileRoute("/_rbms/agents/")({
  head: () => ({
    meta: [
      { title: "Agents — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Track field Agents in your district: assigned SHGs, farmer coverage, task completion and open exceptions, with SHG allocation controls.",
      },
      { property: "og:title", content: "Agents — DigiKrishi RBMS" },
      { property: "og:description", content: "Monitor Agent workload, completion and SHG allocation." },
    ],
  }),
  component: AgentListPage,
});

function AgentListPage() {
  const { districtId, districtName } = useRbms();
  const navigate = useNavigate();
  const [fpcId, setFpcId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const list = useListState({ sortBy: "name" });

  const fpcOptions = useQuery({ queryKey: ["fpc-options", districtId], queryFn: () => fetchFpcOptions(districtId) });
  const query = useQuery({
    queryKey: ["agents", districtId, fpcId, status, list.debouncedSearch, list.sort, list.page],
    queryFn: () =>
      fetchAgents({
        districtId,
        fpcId,
        status,
        search: list.debouncedSearch,
        sortBy: list.sort.sortBy,
        sortDir: list.sort.sortDir,
        page: list.page,
        pageSize: list.pageSize,
      }),
  });

  const metrics = query.data?.metrics;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Field Agents"
        subtitle={`Agents operating across FPCs in ${districtName}. Open an Agent to allocate SHGs or review their work.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active Agents" value={metrics?.activeAgents ?? "—"} context="Currently in the field" tone="green" />
        <MetricCard label="Inactive Agents" value={metrics?.inactiveAgents ?? "—"} context="Not accepting new work" />
        <MetricCard label="Assigned SHGs" value={metrics?.assignedShgs ?? "—"} context="SHGs with an owning Agent" />
        <MetricCard
          label="Unassigned SHGs"
          value={metrics?.unassignedShgs ?? "—"}
          context="Need allocation to an Agent"
          tone={metrics && metrics.unassignedShgs > 0 ? "red" : "green"}
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search by name, email or phone…"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
            />
          </div>
          <Select
            label="FPC"
            value={fpcId}
            onChange={(e) => {
              setFpcId(e.target.value);
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "All FPCs" },
              ...(fpcOptions.data ?? []).map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "All" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
          <span className="ml-auto text-[11.5px] text-muted-foreground">
            {query.data ? `${query.data.total} agent${query.data.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <DataTable
          columns={agentColumns()}
          rows={query.data?.rows ?? []}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage="No Agents match these filters."
          emptyHint="Try a different FPC or clear the search."
          sort={list.sort}
          onSortChange={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          total={query.data?.total ?? 0}
          onPageChange={list.setPage}
          onRowClick={(r) => navigate({ to: "/agents/$agentId", params: { agentId: r.id } })}
        />
      </Panel>
    </div>
  );
}
