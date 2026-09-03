import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { fetchAgentOptions, fetchFpcOptions, fetchShgs } from "@/rbms/api";
import { DataTable } from "@/rbms/components/DataTable";
import { shgColumns } from "@/rbms/components/tables";
import { Input, PageHeader, Panel, Select } from "@/rbms/components/ui";
import { useRbms } from "@/rbms/context/RbmsContext";
import { useInitialSearch, useListState } from "@/rbms/hooks/useListState";

export const Route = createFileRoute("/_rbms/shgs/")({
  head: () => ({
    meta: [
      { title: "SHGs — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Every Self-Help Group in your district with its owning Agent, Lead Farmer, farmer count, task completion and unresolved exceptions.",
      },
      { property: "og:title", content: "SHGs — DigiKrishi RBMS" },
      { property: "og:description", content: "Track SHG allocation, Lead Farmers and completion in one table." },
    ],
  }),
  component: ShgListPage,
});

function ShgListPage() {
  const { districtId, districtName } = useRbms();
  const navigate = useNavigate();
  const initial = useInitialSearch();
  const [fpcId, setFpcId] = useState(initial["fpcId"] ?? "ALL");
  const [agentId, setAgentId] = useState(initial["agentId"] ?? "ALL");
  const [status, setStatus] = useState("ALL");
  const list = useListState({ sortBy: "name" });

  const fpcOptions = useQuery({ queryKey: ["fpc-options", districtId], queryFn: () => fetchFpcOptions(districtId) });
  const agentOptions = useQuery({
    queryKey: ["agent-options", districtId, fpcId],
    queryFn: () => fetchAgentOptions(districtId, fpcId),
  });

  const query = useQuery({
    queryKey: ["shgs", districtId, fpcId, agentId, status, list.debouncedSearch, list.sort, list.page],
    queryFn: () =>
      fetchShgs({
        districtId,
        fpcId,
        agentId,
        status,
        search: list.debouncedSearch,
        sortBy: list.sort.sortBy,
        sortDir: list.sort.sortDir,
        page: list.page,
        pageSize: list.pageSize,
      }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Self-Help Groups"
        subtitle={`All SHGs in ${districtName}. Filter by FPC or Agent, or isolate the groups that still need allocation.`}
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search SHG, Agent or Lead Farmer…"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
            />
          </div>
          <Select
            label="FPC"
            value={fpcId}
            onChange={(e) => {
              setFpcId(e.target.value);
              setAgentId("ALL");
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "All FPCs" },
              ...(fpcOptions.data ?? []).map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
          <Select
            label="Agent"
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value);
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "All Agents" },
              { value: "UNASSIGNED", label: "Unassigned only" },
              ...(agentOptions.data ?? []).map((a) => ({ value: a.id, label: a.name })),
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
            {query.data ? `${query.data.total} SHG${query.data.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <DataTable
          columns={shgColumns()}
          rows={query.data?.rows ?? []}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage="No SHGs match these filters."
          emptyHint="Try switching the Agent filter back to “All Agents”."
          sort={list.sort}
          onSortChange={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          total={query.data?.total ?? 0}
          onPageChange={list.setPage}
          onRowClick={(r) => navigate({ to: "/shgs/$shgId", params: { shgId: r.id } })}
        />
      </Panel>
    </div>
  );
}
