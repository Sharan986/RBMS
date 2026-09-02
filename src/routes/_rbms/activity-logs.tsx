import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchActivities, fetchFpcOptions } from "@/rbms/api";
import { ActivityTable } from "@/rbms/components/ActivityViews";
import { Input, PageHeader, Panel, Select } from "@/rbms/components/ui";
import { useRbms } from "@/rbms/context/RbmsContext";
import { useListState } from "@/rbms/hooks/useListState";

export const Route = createFileRoute("/_rbms/activity-logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Chronological log of every field action — KYC, geo plotting, subscriptions and payments — recorded by Agents and Lead Farmers across the district.",
      },
      { property: "og:title", content: "Activity Logs — DigiKrishi RBMS" },
      { property: "og:description", content: "Every field action recorded by Agents and Lead Farmers." },
    ],
  }),
  component: ActivityLogsPage,
});

function ActivityLogsPage() {
  const { districtId, districtName } = useRbms();
  const [fpcId, setFpcId] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const list = useListState({ sortBy: "timestamp", sortDir: "desc", pageSize: 20 });

  const fpcOptions = useQuery({ queryKey: ["fpc-options", districtId], queryFn: () => fetchFpcOptions(districtId) });

  const query = useQuery({
    queryKey: ["activities", districtId, fpcId, type, role, status, list.debouncedSearch, list.sort, list.page],
    queryFn: () =>
      fetchActivities({
        districtId,
        fpcId,
        type,
        performedByRole: role,
        activityStatus: status,
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
        title="Activity Logs"
        subtitle={`Everything recorded in the field across ${districtName}, newest first.`}
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search farmer, SHG or actor…"
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
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "All types" },
              { value: "KYC", label: "KYC" },
              { value: "GEO_PLOT", label: "Geo plot" },
              { value: "SUBSCRIPTION", label: "Subscription" },
              { value: "PAYMENT", label: "Payment" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <Select
            label="Actor"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              list.setPage(1);
            }}
            options={[
              { value: "ALL", label: "Anyone" },
              { value: "AGENT", label: "Agent" },
              { value: "LEAD_FARMER", label: "Lead Farmer" },
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
              { value: "COMPLETED", label: "Completed" },
              { value: "PENDING", label: "Pending" },
              { value: "VERIFIED", label: "Verified" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
          <span className="ml-auto text-[11.5px] text-muted-foreground">
            {query.data ? `${query.data.total} records` : ""}
          </span>
        </div>

        <ActivityTable
          rows={query.data?.rows ?? []}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          sort={list.sort}
          onSortChange={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          total={query.data?.total ?? 0}
          onPageChange={list.setPage}
        />
      </Panel>
    </div>
  );
}
