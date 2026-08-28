import type { RbmsException, Severity } from "../types";
import { byId, db } from "./store";

/**
 * Exceptions are DERIVED from the store on every read — never persisted.
 * When the underlying condition is fixed (e.g. a payment is verified) the
 * exception disappears everywhere at once.
 */
export function deriveExceptions(districtId: string): RbmsException[] {
  const out: RbmsException[] = [];
  const shgs = db.shgs.filter((s) => s.districtId === districtId);

  shgs.forEach((shg) => {
    const fpc = byId.fpc.get(shg.fpcId);
    const agent = shg.agentId ? byId.agent.get(shg.agentId) : null;
    const farmers = db.farmers.filter((f) => f.shgId === shg.id);
    const base = {
      shgId: shg.id,
      fpcId: shg.fpcId,
      fpcName: fpc?.name ?? "—",
      agentId: shg.agentId,
      agentName: agent?.name ?? "Unassigned",
      districtId,
    };

    if (!shg.agentId) {
      out.push({
        ...base,
        id: `exc-unassigned-${shg.id}`,
        type: "UNASSIGNED_SHG",
        severity: "HIGH",
        entityKind: "SHG",
        entityId: shg.id,
        entityName: shg.name,
        description: `${shg.name} has no active Agent — ${farmers.length} farmers currently have nobody responsible for their field work.`,
        createdAt: farmers[0]?.joinedAt ?? new Date().toISOString(),
        href: `/rbms/shgs/${shg.id}`,
      });
    }

    const missingKyc = farmers.filter((f) => f.tasks.kyc !== "COMPLETED");
    if (missingKyc.length > 0) {
      out.push({
        ...base,
        id: `exc-kyc-${shg.id}`,
        type: "MISSING_KYC",
        severity: severityFromRatio(missingKyc.length, farmers.length),
        entityKind: "SHG",
        entityId: shg.id,
        entityName: shg.name,
        description: `${missingKyc.length} of ${farmers.length} farmers in ${shg.name} are missing required KYC documents.`,
        createdAt: missingKyc[0]!.joinedAt,
        href: `/rbms/shgs/${shg.id}`,
      });
    }

    const missingGeo = farmers.filter((f) => f.tasks.geo !== "COMPLETED");
    if (missingGeo.length > 0) {
      out.push({
        ...base,
        id: `exc-geo-${shg.id}`,
        type: "MISSING_GEO",
        severity: severityFromRatio(missingGeo.length, farmers.length),
        entityKind: "SHG",
        entityId: shg.id,
        entityName: shg.name,
        description: `Geo plotting is incomplete for ${missingGeo.length} of ${farmers.length} farmers in ${shg.name}.`,
        createdAt: missingGeo[0]!.joinedAt,
        href: `/rbms/shgs/${shg.id}`,
      });
    }

    const incompleteSub = farmers.filter((f) => f.tasks.subscription !== "COMPLETED");
    if (incompleteSub.length > 0) {
      out.push({
        ...base,
        id: `exc-sub-${shg.id}`,
        type: "INCOMPLETE_SUBSCRIPTION",
        severity: severityFromRatio(incompleteSub.length, farmers.length) === "HIGH" ? "MEDIUM" : "LOW",
        entityKind: "SHG",
        entityId: shg.id,
        entityName: shg.name,
        description: `${incompleteSub.length} of ${farmers.length} farmers in ${shg.name} have not completed their subscription.`,
        createdAt: incompleteSub[0]!.joinedAt,
        href: `/rbms/shgs/${shg.id}`,
      });
    }

    const pendingPayments = db.payments.filter((p) => p.shgId === shg.id && p.status === "PENDING");
    if (pendingPayments.length > 0) {
      const amount = pendingPayments.reduce((a, p) => a + p.amount, 0);
      out.push({
        ...base,
        id: `exc-pay-${shg.id}`,
        type: "UNVERIFIED_PAYMENT",
        severity: pendingPayments.length >= 3 ? "HIGH" : "MEDIUM",
        entityKind: "SHG",
        entityId: shg.id,
        entityName: shg.name,
        description: `${pendingPayments.length} payment${pendingPayments.length > 1 ? "s" : ""} totalling ₹${amount.toLocaleString("en-IN")} collected in ${shg.name} are awaiting verification.`,
        createdAt: pendingPayments[0]!.collectedAt,
        href: `/rbms/shgs/${shg.id}?tab=payments`,
      });
    }
  });

  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function severityFromRatio(part: number, whole: number): Severity {
  if (whole === 0) return "LOW";
  const ratio = part / whole;
  if (ratio >= 0.3 || part >= 6) return "HIGH";
  if (ratio >= 0.12 || part >= 3) return "MEDIUM";
  return "LOW";
}

export function severityRank(s: Severity) {
  return s === "HIGH" ? 0 : s === "MEDIUM" ? 1 : 2;
}

export function countExceptionsForShg(list: RbmsException[], shgId: string) {
  return list.filter((e) => e.shgId === shgId).length;
}
