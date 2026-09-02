import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fetchFpcs } from "@/rbms/api";
import { DataTable } from "@/rbms/components/DataTable";
import { fpcColumns } from "@/rbms/components/tables";
import { Input, MetricCard, PageHeader, Panel, Select } from "@/rbms/components/ui";
import { useRbms } from "@/rbms/context/RbmsContext";
import { useListState } from "@/rbms/hooks/useListState";
import { useState } from "react";

export const Route = createFileRoute("/_rbms/fpcs/")({
  head: () => ({
    meta: [
      { title: "FPCs — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Compare Farmer Producer Companies in your district by agents, SHGs, farmers, KYC, geo plotting, subscription progress and open exceptions.",
      },
      { property: "og:title", content: "FPCs — DigiKrishi RBMS" },
      { property: "og:description", content: "Compare FPC coverage and completion across your district." },
    ],
  }),
  component: FpcListPage,
});

function FpcListPage() {
  const { districtId, districtName } = useRbms();
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");
  const list = useListState({ sortBy: "name" });

  const query = useQuery({
    queryKey: ["fpcs", districtId, list.debouncedSearch, status, list.sort, list.page],
    queryFn: () =>
      fetchFpcs({
        districtId,
        search: list.debouncedSearch,
        status,
        sortBy: list.sort.sortBy,
        sortDir: list.sort.sortDir,
        page: list.page,
        pageSize: list.pageSize,
      }),
  });

  const summary = query.data?.summary;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Farmer Producer Companies"
        subtitle={`All FPCs operating in ${districtName}. Open an FPC to review its Agents and SHGs.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="FPCs" value={summary?.fpcs ?? "—"} context="Matching current filters" />
        <MetricCard label="Agents" value={summary?.agents ?? "—"} context="Across matching FPCs" />
        <MetricCard label="SHGs" value={summary?.shgs ?? "—"} context="Across matching FPCs" />
        <MetricCard
          label="Farmers"
          value={summary ? summary.farmers.toLocaleString("en-IN") : "—"}
          context="Across matching FPCs"
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search FPCs by name…"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
            />
          </div>
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
            {query.data ? `${query.data.total} result${query.data.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <DataTable
          columns={fpcColumns()}
          rows={query.data?.rows ?? []}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyMessage="No FPCs match your search."
          emptyHint="Try clearing the search or switching the status filter."
          sort={list.sort}
          onSortChange={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          total={query.data?.total ?? 0}
          onPageChange={list.setPage}
          onRowClick={(r) => navigate({ to: "/fpcs/$fpcId", params: { fpcId: r.id } })}
        />
      </Panel>
    </div>
  );
}
