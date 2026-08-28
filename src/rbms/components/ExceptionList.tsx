import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { RbmsException, Severity } from "../types";
import { StatusPill, formatDate, type Tone } from "./ui";

export const EXCEPTION_LABEL: Record<string, string> = {
  UNASSIGNED_SHG: "SHG without an Agent",
  MISSING_KYC: "Missing KYC documents",
  MISSING_GEO: "Geo plotting incomplete",
  UNVERIFIED_PAYMENT: "Payment awaiting verification",
  INCOMPLETE_SUBSCRIPTION: "Subscription incomplete",
};

export const severityTone = (s: Severity): Tone => (s === "HIGH" ? "red" : s === "MEDIUM" ? "amber" : "blue");

export function ExceptionList({ exceptions }: { exceptions: RbmsException[] }) {
  return (
    <ul className="space-y-1.5">
      {exceptions.map((e) => (
        <li key={e.id}>
          <ExceptionCard exception={e} />
        </li>
      ))}
    </ul>
  );
}

export function ExceptionCard({ exception: e }: { exception: RbmsException }) {
  const target = e.shgId
    ? { to: "/shgs/$shgId" as const, params: { shgId: e.shgId } }
    : { to: "/fpcs/$fpcId" as const, params: { fpcId: e.fpcId } };

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={severityTone(e.severity)}>{e.severity}</StatusPill>
          <span className="text-[12.5px] font-medium">{EXCEPTION_LABEL[e.type]}</span>
          <span className="text-[11px] text-muted-foreground">· {e.entityKind}</span>
        </div>
        <p className="mt-1 text-[12.5px] text-foreground">{e.description}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {e.entityName} · FPC: {e.fpcName} · Agent: {e.agentName} · Detected {formatDate(e.createdAt)}
        </p>
      </div>
      <Link
        to={target.to}
        params={target.params as never}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11.5px] font-medium text-primary hover:border-primary/40"
      >
        Investigate <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
