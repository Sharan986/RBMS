import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { fetchFarmerDetail } from "@/rbms/api";
import { ActivityFeed } from "@/rbms/components/ActivityViews";
import { KycDocumentsPopover } from "@/rbms/components/KycDocumentsPopover";
import { PaymentTable } from "@/rbms/components/PaymentViews";
import {
  Breadcrumbs,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  ProgressRow,
  StatusPill,
  formatDate,
  inr,
} from "@/rbms/components/ui";
import { TASK_DEFINITIONS, type TaskKey } from "@/rbms/types";

export const Route = createFileRoute("/_rbms/shgs/$shgId/farmers/$farmerId")({
  head: () => ({
    meta: [
      { title: "Farmer Detail — DigiKrishi RBMS" },
      {
        name: "description",
        content:
          "Individual farmer record: KYC, geo plotting, subscription and payment status, plus the activity trail recorded in the field.",
      },
      { property: "og:title", content: "Farmer Detail — DigiKrishi RBMS" },
      { property: "og:description", content: "KYC, geo, subscription and payment status for one farmer." },
    ],
  }),
  component: FarmerDetailPage,
});

const TASK_HINT: Record<TaskKey, string> = {
  kyc: "Identity documents captured and uploaded",
  geo: "All plots mapped with GPS boundaries",
  subscription: "Plan activated and payment collected",
};

function FarmerDetailPage() {
  const { shgId, farmerId } = Route.useParams();
  const query = useQuery({ queryKey: ["farmer", farmerId], queryFn: () => fetchFarmerDetail(farmerId) });
  const data = query.data;

  const verified = (data?.payments ?? [])
    .filter((p) => p.status === "VERIFIED")
    .reduce((s, p) => s + p.amount, 0);
  const pending = (data?.payments ?? []).filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const totalArea = (data?.farmer.plots ?? []).reduce((s, p) => s + p.area, 0);
  const plotted = (data?.farmer.plots ?? []).filter((p) => p.plotted).length;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "SHGs", to: "/shgs" },
          { label: data?.farmer.shgName ?? "SHG", to: "/shgs/$shgId", params: { shgId } },
          { label: data?.farmer.name ?? "Farmer" },
        ]}
      />

      {query.isLoading && <LoadingState label="Loading farmer…" />}
      {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {data && (
        <>
          <PageHeader
            title={data.farmer.name}
            subtitle={`${data.farmer.code} · ${data.farmer.shgName} · ${data.farmer.fpcName} · Agent: ${data.farmer.agentName}`}
            actions={data.farmer.isLeadFarmer ? <StatusPill tone="green">Lead Farmer</StatusPill> : null}
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Task Completion"
              value={`${data.progress.overall}%`}
              context={`${data.progress.completed} of ${data.progress.total} tasks done`}
              tone={data.progress.overall === 100 ? "green" : data.progress.overall >= 50 ? "amber" : "red"}
            />
            <MetricCard
              label="Land Holding"
              value={`${totalArea.toFixed(2)} ac`}
              context={`${plotted} of ${data.farmer.plots.length} plots geo-plotted`}
            />
            <MetricCard
              label="Payments Verified"
              value={inr(verified)}
              context={pending > 0 ? `${inr(pending)} awaiting verification` : "Nothing pending"}
              tone={pending > 0 ? "amber" : "green"}
            />
            <MetricCard
              label="Activity Records"
              value={data.activity.length}
              context={
                data.farmer.lastActivity ? `Last update ${formatDate(data.farmer.lastActivity)}` : "No field activity yet"
              }
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Onboarding checklist" subtitle="Each task counts once toward completion">
              <div className="space-y-2.5">
                {TASK_DEFINITIONS.map((t) => {
                  const done = Boolean(data.farmer[t.key]);
                  const pill = <StatusPill tone={done ? "green" : "red"}>{done ? "Complete" : "Pending"}</StatusPill>;
                  return (
                    <div
                      key={t.key}
                      className="flex items-center justify-between rounded-md border border-border bg-panel-2 px-2.5 py-2"
                    >
                      <div>
                        <p className="text-[12.5px] font-medium">{t.label}</p>
                        <p className="text-[11px] text-muted-foreground">{TASK_HINT[t.key]}</p>
                      </div>
                      {t.key === "kyc" ? (
                        <KycDocumentsPopover documents={data.kycDocuments}>{pill}</KycDocumentsPopover>
                      ) : (
                        pill
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Record">
              <dl className="space-y-2 text-[12.5px]">
                {[
                  ["Farmer code", data.farmer.code],
                  ["Phone", data.farmer.phone],
                  ["SHG", data.farmer.shgName],
                  ["Lead Farmer", data.farmer.leadFarmerName],
                  ["FPC", data.farmer.fpcName],
                  ["Agent", data.farmer.agentName],
                  ["District", data.farmer.districtName],
                  ["Joined", formatDate(data.farmer.joinedAt)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Plots" subtitle="Geo plotting must cover every plot to count as complete">
              {data.farmer.plots.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">No plots recorded for this farmer.</p>
              ) : (
                <div className="space-y-2">
                  {data.farmer.plots.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-border bg-panel-2 px-2.5 py-2 text-[12.5px]"
                    >
                      <span>
                        {p.crop} · <span className="tnum">{p.area.toFixed(2)} ac</span>
                      </span>
                      <StatusPill tone={p.plotted ? "green" : "amber"}>
                        {p.plotted ? "Plotted" : "Not plotted"}
                      </StatusPill>
                    </div>
                  ))}
                  <ProgressRow
                    label="Plots mapped"
                    value={Math.round((plotted / data.farmer.plots.length) * 100)}
                  />
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Payments" subtitle="Collected by the Agent or Lead Farmer" bodyClassName="p-0">
            <PaymentTable rows={data.payments} hideShg />
          </Panel>

          <Panel title="Activity trail" subtitle="Every field update recorded against this farmer">
            <ActivityFeed rows={data.activity} emptyMessage="No field activity recorded for this farmer." />
          </Panel>
        </>
      )}
    </div>
  );
}
