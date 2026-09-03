import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { changeLeadFarmer, fetchActivities, fetchPayments, fetchShgDetail } from "@/rbms/api";
import { ActivityFeed, ActivityTable } from "@/rbms/components/ActivityViews";
import { DataTable } from "@/rbms/components/DataTable";

import { PaymentTable } from "@/rbms/components/PaymentViews";
import { farmerColumns } from "@/rbms/components/tables";
import {
  Breadcrumbs,
  Button,
  ErrorState,
  Input,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  Panel,
  ProgressRow,
  Select,
  StatusPill,
  Tabs,
  inr,
  toneForStatus,
} from "@/rbms/components/ui";
import { useRbms } from "@/rbms/context/RbmsContext";
import { TASK_DEFINITIONS } from "@/rbms/types";
import { useInitialSearch } from "@/rbms/hooks/useListState";

export const Route = createFileRoute("/_rbms/shgs/$shgId/")({
  head: () => ({
    meta: [
      { title: "SHG Detail — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Farmer roster, Lead Farmer, task completion, payments awaiting verification and exceptions for a single Self-Help Group.",
      },
      { property: "og:title", content: "SHG Detail — DigiKrishi RBMS" },
      { property: "og:description", content: "Roster, payments and exceptions for one SHG." },
    ],
  }),
  component: ShgDetailPage,
});

function ShgDetailPage() {
  const { shgId } = Route.useParams();
  const { districtId } = useRbms();
  const navigate = useNavigate();
  const initial = useInitialSearch();
  const [tab, setTab] = useState(initial["tab"] ?? "farmers");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [changingLead, setChangingLead] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const query = useQuery({ queryKey: ["shg", shgId], queryFn: () => fetchShgDetail(shgId) });
  const payments = useQuery({
    queryKey: ["shg-payments", shgId, districtId],
    queryFn: () => fetchPayments({ districtId, shgId, pageSize: 100 }),
    enabled: tab === "payments",
  });
  const activity = useQuery({
    queryKey: ["shg-activity", shgId, districtId, activityPage],
    queryFn: () => fetchActivities({ districtId, shgId, page: activityPage, pageSize: 10 }),
    enabled: tab === "activity",
  });

  const data = query.data;
  const farmers = (data?.farmers ?? []).filter((f) =>
    `${f.name} ${f.code}`.toLowerCase().includes(farmerSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "SHGs", to: "/shgs" },
          { label: data?.shg.name ?? "SHG" },
        ]}
      />

      {query.isLoading && <LoadingState label="Loading SHG…" />}
      {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {data && (
        <>
          <PageHeader
            title={data.shg.name}
            subtitle={`${data.shg.village} · ${data.shg.fpcName} · ${data.shg.districtName} district`}
            actions={
              <>
                <StatusPill tone={toneForStatus(data.shg.status)}>{data.shg.status}</StatusPill>
                <Button variant="outline" onClick={() => setChangingLead(true)}>
                  <UserCog className="h-3.5 w-3.5" /> Change Lead Farmer
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="Farmers" value={data.shg.farmers} context="Members of this SHG" />
            <MetricCard
              label="Overall Progress"
              value={`${data.progress.overall}%`}
              context={`${data.progress.completed} of ${data.progress.total} tasks`}
              tone={data.progress.overall >= 80 ? "green" : data.progress.overall >= 60 ? "amber" : "red"}
            />
            <MetricCard
              label="Payments Verified"
              value={inr(data.paymentTotals.verified)}
              context={`${inr(data.paymentTotals.pending)} pending verification`}
              tone={data.paymentTotals.pending > 0 ? "amber" : "green"}
            />
            <MetricCard
              label="Owning Agent"
              value={
                data.shg.agentId ? (
                  <Link
                    to="/agents/$agentId"
                    params={{ agentId: data.shg.agentId }}
                    className="text-[16px] font-semibold hover:text-primary"
                  >
                    {data.shg.agentName}
                  </Link>
                ) : (
                  <span className="text-[16px] font-semibold text-destructive">Unassigned</span>
                )
              }
              context={data.shg.agentId ? "Responsible for this SHG" : "Allocate this SHG to an Agent"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Task completion" className="lg:col-span-2">
              <div className="space-y-3">
                <ProgressRow label="Overall" value={data.progress.overall} />
                {TASK_DEFINITIONS.map((t) => (
                  <ProgressRow key={t.key} label={t.label} value={data.progress.byTask[t.key]} />
                ))}
              </div>
            </Panel>

            <Panel title="Lead Farmer" subtitle="Acts on behalf of the Agent inside this SHG">
              {data.leadFarmer ? (
                <div className="space-y-2 text-[12.5px]">
                  <p className="text-[14px] font-semibold">{data.leadFarmer.name}</p>
                  <p className="text-muted-foreground">
                    {data.leadFarmer.code} · {data.shg.leadFarmerPhone}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      ["KYC uploads", data.leadFarmer.activityCounts["KYC"] ?? 0],
                      ["Geo plots", data.leadFarmer.activityCounts["GEO_PLOT"] ?? 0],
                      ["Subscriptions", data.leadFarmer.activityCounts["SUBSCRIPTION"] ?? 0],
                      ["Payments", data.leadFarmer.activityCounts["PAYMENT"] ?? 0],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md border border-border bg-panel-2 px-2 py-1.5">
                        <p className="tnum text-[16px] font-semibold">{value}</p>
                        <p className="text-[10.5px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">No Lead Farmer has been nominated yet.</p>
              )}
            </Panel>
          </div>

          <Panel bodyClassName="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "farmers", label: `Farmers (${data.farmers.length})` },
                  { key: "activity", label: "Activity" },
                  { key: "payments", label: "Payments" },
                  
                ]}
              />
              {tab === "farmers" && (
                <div className="w-full max-w-xs">
                  <Input
                    placeholder="Search farmers by name or code…"
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {tab === "farmers" && (
              <DataTable
                columns={farmerColumns(shgId)}
                rows={farmers}
                emptyMessage="No farmers match this search."
                onRowClick={(r) =>
                  navigate({ to: "/shgs/$shgId/farmers/$farmerId", params: { shgId, farmerId: r.id } })
                }
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
                columnsToHide={["shgName", "fpcName"]}
              />
            )}

            {tab === "payments" && (
              <PaymentTable
                rows={payments.data?.rows ?? []}
                isLoading={payments.isLoading}
                error={payments.error}
                onRetry={() => payments.refetch()}
                hideShg
              />
            )}

          </Panel>

          <Panel title="Recent activity" subtitle="Latest work recorded against this SHG">
            <ActivityFeed rows={data.recentActivity} emptyMessage="No activity recorded for this SHG yet." />
          </Panel>

          <ChangeLeadFarmerModal
            open={changingLead}
            onOpenChange={setChangingLead}
            shgId={shgId}
            shgName={data.shg.name}
            currentLeadName={data.shg.leadFarmerName}
            farmers={data.farmers.map((f) => ({ id: f.id, name: f.name, code: f.code }))}
          />
        </>
      )}
    </div>
  );
}

function ChangeLeadFarmerModal({
  open,
  onOpenChange,
  shgId,
  shgName,
  currentLeadName,
  farmers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shgId: string;
  shgName: string;
  currentLeadName: string;
  farmers: { id: string; name: string; code: string }[];
}) {
  const [selected, setSelected] = useState(farmers[0]?.id ?? "");
  const mutation = useMutation({
    mutationFn: () => changeLeadFarmer(shgId, selected),
    onSuccess: () => {
      const name = farmers.find((f) => f.id === selected)?.name ?? "Farmer";
      toast.success(`${name} is now the Lead Farmer of ${shgName}`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Change Lead Farmer"
      description={`${currentLeadName} is currently the Lead Farmer of ${shgName}.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="warning" disabled={!selected || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Updating…" : "Confirm change"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="New Lead Farmer"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full"
          options={farmers.map((f) => ({ value: f.id, label: `${f.name} · ${f.code}` }))}
        />
        <p className="text-[12px] text-muted-foreground">
          The Lead Farmer is an actor inside the SHG, not a parent of the farmers. Changing them affects who can record
          activity on behalf of the group; the SHG keeps its Agent and roster, and past activity stays attributed to the
          previous Lead Farmer.
        </p>
      </div>
    </Modal>
  );
}
