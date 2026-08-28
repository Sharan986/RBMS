import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { AgentRow, FarmerRow, FpcRow, ShgRow } from "../api";
import type { Column } from "./DataTable";
import { InlineProgress, StatusPill, formatDate, toneForStatus } from "./ui";

const openLink = (label = "Open") => (
  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary">
    {label} <ArrowRight className="h-3 w-3" />
  </span>
);

export function fpcColumns(): Column<FpcRow>[] {
  return [
    { key: "name", header: "FPC", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "agents", header: "Agents", align: "right", sortable: true, render: (r) => r.agents },
    { key: "shgs", header: "SHGs", align: "right", sortable: true, render: (r) => r.shgs },
    { key: "farmers", header: "Farmers", align: "right", sortable: true, render: (r) => r.farmers.toLocaleString("en-IN") },
    { key: "kyc", header: "KYC", align: "right", sortable: true, render: (r) => `${r.kyc}%` },
    { key: "geo", header: "Geo", align: "right", sortable: true, render: (r) => `${r.geo}%` },
    { key: "subscription", header: "Subscription", align: "right", sortable: true, render: (r) => `${r.subscription}%` },
    { key: "overall", header: "Overall", sortable: true, width: "140px", render: (r) => <InlineProgress value={r.overall} /> },
    { key: "status", header: "Status", render: (r) => <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill> },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <Link to="/fpcs/$fpcId" params={{ fpcId: r.id }} onClick={(e) => e.stopPropagation()}>
          {openLink()}
        </Link>
      ),
    },
  ];
}

export function agentColumns(options?: { hideFpc?: boolean }): Column<AgentRow>[] {
  const cols: Column<AgentRow>[] = [
    { key: "name", header: "Agent", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "fpcName", header: "FPC", sortable: true, render: (r) => r.fpcName },
    { key: "status", header: "Status", render: (r) => <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill> },
    { key: "shgs", header: "Assigned SHGs", align: "right", sortable: true, render: (r) => r.shgs },
    { key: "farmers", header: "Farmers", align: "right", sortable: true, render: (r) => r.farmers },
    { key: "overall", header: "Completion", sortable: true, width: "150px", render: (r) => <InlineProgress value={r.overall} /> },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <Link to="/agents/$agentId" params={{ agentId: r.id }} onClick={(e) => e.stopPropagation()}>
          {openLink()}
        </Link>
      ),
    },
  ];
  return options?.hideFpc ? cols.filter((c) => c.key !== "fpcName") : cols;
}

export function shgColumns(options?: { hideFpc?: boolean; hideAgent?: boolean }): Column<ShgRow>[] {
  const cols: Column<ShgRow>[] = [
    { key: "name", header: "SHG", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "fpcName", header: "FPC", sortable: true, render: (r) => r.fpcName },
    {
      key: "agentName",
      header: "Agent",
      sortable: true,
      render: (r) =>
        r.agentId ? (
          <Link
            to="/agents/$agentId"
            params={{ agentId: r.agentId }}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary"
          >
            {r.agentName}
          </Link>
        ) : (
          <StatusPill tone="red">Unassigned</StatusPill>
        ),
    },
    { key: "leadFarmerName", header: "Lead Farmer", sortable: true, render: (r) => r.leadFarmerName },
    { key: "leadFarmerPhone", header: "Phone", render: (r) => r.leadFarmerPhone },
    { key: "farmers", header: "Farmers", align: "right", sortable: true, render: (r) => r.farmers },
    { key: "kyc", header: "KYC", align: "right", sortable: true, render: (r) => `${r.kyc}%` },
    { key: "geo", header: "Geo", align: "right", sortable: true, render: (r) => `${r.geo}%` },
    { key: "subscription", header: "Subscription", align: "right", sortable: true, render: (r) => `${r.subscription}%` },
    { key: "overall", header: "Overall", sortable: true, width: "140px", render: (r) => <InlineProgress value={r.overall} /> },
    { key: "status", header: "Status", render: (r) => <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill> },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <Link to="/shgs/$shgId" params={{ shgId: r.id }} onClick={(e) => e.stopPropagation()}>
          {openLink()}
        </Link>
      ),
    },
  ];
  return cols.filter(
    (c) => !(options?.hideFpc && c.key === "fpcName") && !(options?.hideAgent && c.key === "agentName"),
  );
}

export function taskChip(done: boolean, label: string) {
  return <StatusPill tone={done ? "green" : "amber"}>{done ? label : `${label} pending`}</StatusPill>;
}

export function farmerColumns(shgId: string): Column<FarmerRow>[] {
  return [
    {
      key: "name",
      header: "Farmer",
      sortable: true,
      render: (r) => (
        <span className="font-medium">
          {r.name}
          {r.isLeadFarmer && <span className="ml-1.5 text-[10.5px] text-primary">Lead</span>}
        </span>
      ),
    },
    { key: "code", header: "Farmer Code", render: (r) => <span className="text-muted-foreground">{r.code}</span> },
    { key: "kyc", header: "KYC", render: (r) => taskChip(r.kyc, "KYC") },
    { key: "geo", header: "Geo", render: (r) => taskChip(r.geo, "Geo") },
    { key: "subscription", header: "Subscription", render: (r) => taskChip(r.subscription, "Subscription") },
    { key: "overall", header: "Overall Progress", width: "150px", sortable: true, render: (r) => <InlineProgress value={r.overall} /> },
    { key: "lastActivity", header: "Last Activity", render: (r) => formatDate(r.lastActivity) },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <Link
          to="/shgs/$shgId/farmers/$farmerId"
          params={{ shgId, farmerId: r.id }}
          onClick={(e) => e.stopPropagation()}
        >
          {openLink()}
        </Link>
      ),
    },
  ];
}
