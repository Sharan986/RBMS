import { deriveKycDocuments, type KycDocument } from "../data/kycDocuments";
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  ActorRole,
  District,
  Farmer,
  Paged,
  Payment,
  PaymentStatus,
  ProgressSummary,
  RbmsException,
  Severity,
  ExceptionType,
} from "../types";
import { actorName, byId, db, DEMO, notifyStoreChanged } from "../data/store";
import { computeProgress } from "../data/progress";
import { deriveExceptions } from "../data/exceptions";

export { DEMO };

/** Mock latency so loading states are real. */
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/** Deterministic "flaky endpoint" hook — kept off by default. */
let failNext = false;
export function __failNextRequest() {
  failNext = true;
}
async function boundary<T>(fn: () => T, ms?: number): Promise<T> {
  await delay(ms);
  if (failNext) {
    failNext = false;
    throw new Error("Unable to reach the RBMS service. Please retry.");
  }
  return fn();
}

/* ------------------------------------------------------------------ */
/* Shared query shapes                                                 */
/* ------------------------------------------------------------------ */
export interface ListQuery {
  districtId: string;
  search?: string;
  status?: string;
  fpcId?: string;
  agentId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function paginate<T>(rows: T[], page = 1, pageSize = 10): Paged<T> {
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
}

function sortRows<T extends Record<string, unknown>>(rows: T[], sortBy?: string, dir: "asc" | "desc" = "asc") {
  if (!sortBy) return rows;
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortBy] as string | number | undefined;
    const bv = b[sortBy] as string | number | undefined;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av ?? "").localeCompare(String(bv ?? "")) * mul;
  });
}

const matches = (needle: string | undefined, ...haystack: (string | null | undefined)[]) =>
  !needle || haystack.some((h) => (h ?? "").toLowerCase().includes(needle.toLowerCase()));

/* ------------------------------------------------------------------ */
/* Row view models                                                     */
/* ------------------------------------------------------------------ */
export interface FpcRow extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
  agents: number;
  shgs: number;
  farmers: number;
  kyc: number;
  geo: number;
  subscription: number;
  overall: number;
  exceptions: number;
}

export interface AgentRow extends Record<string, unknown> {
  id: string;
  name: string;
  fpcId: string;
  fpcName: string;
  status: string;
  shgs: number;
  farmers: number;
  overall: number;
  exceptions: number;
}

export interface ShgRow extends Record<string, unknown> {
  id: string;
  name: string;
  fpcId: string;
  fpcName: string;
  agentId: string | null;
  agentName: string;
  leadFarmerId: string | null;
  leadFarmerName: string;
  leadFarmerPhone: string;
  farmers: number;
  kyc: number;
  geo: number;
  subscription: number;
  overall: number;
  exceptions: number;
  status: string;
}

export interface FarmerRow extends Record<string, unknown> {
  id: string;
  name: string;
  code: string;
  phone: string;
  shgId: string;
  kyc: boolean;
  geo: boolean;
  subscription: boolean;
  overall: number;
  lastActivity: string | null;
  isLeadFarmer: boolean;
}

export interface ActivityRow extends Record<string, unknown> {
  id: string;
  type: ActivityType;
  timestamp: string;
  status: ActivityStatus;
  farmerId: string;
  farmerName: string;
  shgId: string;
  shgName: string;
  fpcId: string;
  fpcName: string;
  agentId: string | null;
  agentName: string;
  performedByName: string;
  performedByRole: ActorRole;
  verifiedByName: string;
  verifiedAt: string | null;
  metadata: Record<string, string | number>;
  paymentId?: string | undefined;
}

export interface PaymentRow extends Record<string, unknown> {
  id: string;
  farmerId: string;
  farmerName: string;
  shgId: string;
  shgName: string;
  plan: string;
  amount: number;
  method: string;
  collectedByName: string;
  collectedByRole: ActorRole;
  collectedAt: string;
  status: PaymentStatus;
  verifiedByName: string;
  verifiedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Internal aggregation helpers                                        */
/* ------------------------------------------------------------------ */
const farmersOfShg = (shgId: string) => db.farmers.filter((f) => f.shgId === shgId);
const shgsOfFpc = (fpcId: string) => db.shgs.filter((s) => s.fpcId === fpcId);
const shgsOfAgent = (agentId: string) => db.shgs.filter((s) => s.agentId === agentId);
const farmersOfShgs = (shgIds: string[]) => {
  const set = new Set(shgIds);
  return db.farmers.filter((f) => set.has(f.shgId));
};

function toActivityRow(a: Activity): ActivityRow {
  return {
    id: a.id,
    type: a.type,
    timestamp: a.timestamp,
    status: a.status,
    farmerId: a.farmerId,
    farmerName: byId.farmer.get(a.farmerId)?.name ?? "—",
    shgId: a.shgId,
    shgName: byId.shg.get(a.shgId)?.name ?? "—",
    fpcId: a.fpcId,
    fpcName: byId.fpc.get(a.fpcId)?.name ?? "—",
    agentId: a.agentId,
    agentName: a.agentId ? (byId.agent.get(a.agentId)?.name ?? "—") : "Unassigned",
    performedByName: actorName(a.performedById),
    performedByRole: a.performedByRole,
    verifiedByName: actorName(a.verifiedById),
    verifiedAt: a.verifiedAt,
    metadata: a.metadata,
    paymentId: a.paymentId,
  };
}

function toPaymentRow(p: Payment): PaymentRow {
  return {
    id: p.id,
    farmerId: p.farmerId,
    farmerName: byId.farmer.get(p.farmerId)?.name ?? "—",
    shgId: p.shgId,
    shgName: byId.shg.get(p.shgId)?.name ?? "—",
    plan: p.plan,
    amount: p.amount,
    method: p.method,
    collectedByName: actorName(p.collectedById),
    collectedByRole: p.collectedByRole,
    collectedAt: p.collectedAt,
    status: p.status,
    verifiedByName: actorName(p.verifiedById),
    verifiedAt: p.verifiedAt,
  };
}

function buildShgRow(shgId: string, exceptions: RbmsException[]): ShgRow {
  const shg = byId.shg.get(shgId)!;
  const farmers = farmersOfShg(shgId);
  const progress = computeProgress(farmers);
  const lead = shg.leadFarmerId ? byId.farmer.get(shg.leadFarmerId) : null;
  return {
    id: shg.id,
    name: shg.name,
    fpcId: shg.fpcId,
    fpcName: byId.fpc.get(shg.fpcId)?.name ?? "—",
    agentId: shg.agentId,
    agentName: shg.agentId ? (byId.agent.get(shg.agentId)?.name ?? "—") : "Unassigned",
    leadFarmerId: shg.leadFarmerId,
    leadFarmerName: lead?.name ?? "—",
    leadFarmerPhone: lead?.phone ?? "—",
    farmers: farmers.length,
    kyc: progress.byTask.kyc,
    geo: progress.byTask.geo,
    subscription: progress.byTask.subscription,
    overall: progress.overall,
    exceptions: exceptions.filter((e) => e.shgId === shg.id).length,
    status: shg.status,
  };
}

function buildAgentRow(agentId: string, exceptions: RbmsException[]): AgentRow {
  const agent = byId.agent.get(agentId)!;
  const shgs = shgsOfAgent(agentId);
  const farmers = farmersOfShgs(shgs.map((s) => s.id));
  const progress = computeProgress(farmers);
  const shgIds = new Set(shgs.map((s) => s.id));
  return {
    id: agent.id,
    name: agent.name,
    fpcId: agent.fpcId,
    fpcName: byId.fpc.get(agent.fpcId)?.name ?? "—",
    status: agent.status,
    shgs: shgs.length,
    farmers: farmers.length,
    overall: progress.overall,
    exceptions: exceptions.filter((e) => e.shgId && shgIds.has(e.shgId)).length,
  };
}

function buildFpcRow(fpcId: string, exceptions: RbmsException[]): FpcRow {
  const fpc = byId.fpc.get(fpcId)!;
  const shgs = shgsOfFpc(fpcId);
  const farmers = farmersOfShgs(shgs.map((s) => s.id));
  const progress = computeProgress(farmers);
  return {
    id: fpc.id,
    name: fpc.name,
    status: fpc.status,
    agents: db.agents.filter((a) => a.fpcId === fpcId).length,
    shgs: shgs.length,
    farmers: farmers.length,
    kyc: progress.byTask.kyc,
    geo: progress.byTask.geo,
    subscription: progress.byTask.subscription,
    overall: progress.overall,
    exceptions: exceptions.filter((e) => e.fpcId === fpcId).length,
  };
}

function toFarmerRow(f: Farmer): FarmerRow {
  const last = db.activities.find((a) => a.farmerId === f.id) ?? null;
  return {
    id: f.id,
    name: f.name,
    code: f.code,
    phone: f.phone,
    shgId: f.shgId,
    kyc: f.tasks.kyc === "COMPLETED",
    geo: f.tasks.geo === "COMPLETED",
    subscription: f.tasks.subscription === "COMPLETED",
    overall: computeProgress([f]).overall,
    lastActivity: last?.timestamp ?? null,
    isLeadFarmer: f.isLeadFarmer,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */
export function fetchDistricts(): Promise<District[]> {
  return boundary(() => db.districts, 80);
}

export interface DashboardData {
  counts: { fpcs: number; agents: number; shgs: number; farmers: number };
  progress: ProgressSummary;
  exceptions: { high: number; medium: number; low: number; total: number; highlights: RbmsException[] };
  fpcs: FpcRow[];
  topAgents: AgentRow[];
  bottomAgents: AgentRow[];
  activity: ActivityRow[];
}

export function fetchDashboard(districtId: string): Promise<DashboardData> {
  return boundary(() => {
    const exceptions = deriveExceptions(districtId);
    const fpcs = db.fpcs.filter((f) => f.districtId === districtId);
    const agents = db.agents.filter((a) => a.districtId === districtId);
    const shgs = db.shgs.filter((s) => s.districtId === districtId);
    const farmers = db.farmers.filter((f) => f.districtId === districtId);
    const fpcRows = fpcs.map((f) => buildFpcRow(f.id, exceptions)).sort((a, b) => b.overall - a.overall);
    const agentRows = agents
      .map((a) => buildAgentRow(a.id, exceptions))
      .filter((a) => a.shgs > 0)
      .sort((a, b) => b.overall - a.overall);

    const grouped = groupExceptions(exceptions);

    return {
      counts: { fpcs: fpcs.length, agents: agents.length, shgs: shgs.length, farmers: farmers.length },
      progress: computeProgress(farmers),
      exceptions: {
        high: exceptions.filter((e) => e.severity === "HIGH").length,
        medium: exceptions.filter((e) => e.severity === "MEDIUM").length,
        low: exceptions.filter((e) => e.severity === "LOW").length,
        total: exceptions.length,
        highlights: grouped,
      },
      fpcs: fpcRows,
      topAgents: agentRows.slice(0, 5),
      bottomAgents: agentRows.slice(-5).reverse(),
      activity: db.activities
        .filter((a) => a.districtId === districtId)
        .slice(0, 8)
        .map(toActivityRow),
    };
  }, 320);
}

/** One representative, explained exception per type for the dashboard card. */
function groupExceptions(list: RbmsException[]): RbmsException[] {
  const types: ExceptionType[] = [
    "UNVERIFIED_PAYMENT",
    "MISSING_KYC",
    "MISSING_GEO",
    "UNASSIGNED_SHG",
    "INCOMPLETE_SUBSCRIPTION",
  ];
  return types
    .map((type) => {
      const of = list.filter((e) => e.type === type);
      if (of.length === 0) return null;
      const worst = of[0]!;
      const labels: Record<ExceptionType, string> = {
        UNVERIFIED_PAYMENT: `${of.length} SHGs have unverified payments`,
        MISSING_KYC: `${of.length} SHGs have farmers missing KYC documents`,
        MISSING_GEO: `${of.length} SHGs have incomplete geo plotting`,
        UNASSIGNED_SHG: `${of.length} SHGs do not have an active Agent`,
        INCOMPLETE_SUBSCRIPTION: `${of.length} SHGs have incomplete subscriptions`,
      };
      return { ...worst, description: labels[type], href: `/rbms/exceptions?type=${type}` };
    })
    .filter(Boolean) as RbmsException[];
}

export function fetchFpcs(q: ListQuery): Promise<Paged<FpcRow> & { summary: { fpcs: number; agents: number; shgs: number; farmers: number } }> {
  return boundary(() => {
    const exceptions = deriveExceptions(q.districtId);
    let rows = db.fpcs
      .filter((f) => f.districtId === q.districtId)
      .filter((f) => matches(q.search, f.name))
      .filter((f) => !q.status || q.status === "ALL" || f.status === q.status)
      .map((f) => buildFpcRow(f.id, exceptions));
    const summary = rows.reduce(
      (acc, r) => ({
        fpcs: acc.fpcs + 1,
        agents: acc.agents + r.agents,
        shgs: acc.shgs + r.shgs,
        farmers: acc.farmers + r.farmers,
      }),
      { fpcs: 0, agents: 0, shgs: 0, farmers: 0 },
    );
    rows = sortRows(rows, q.sortBy ?? "name", q.sortDir ?? "asc");
    return { ...paginate(rows, q.page, q.pageSize), summary };
  });
}

export interface FpcDetail {
  fpc: { id: string; name: string; status: string; districtName: string };
  counts: { agents: number; shgs: number; farmers: number };
  progress: ProgressSummary;
  exceptionCount: number;
  agents: AgentRow[];
  shgs: ShgRow[];
}

export function fetchFpcDetail(fpcId: string): Promise<FpcDetail> {
  return boundary(() => {
    const fpc = byId.fpc.get(fpcId);
    if (!fpc) throw new Error("FPC not found");
    const exceptions = deriveExceptions(fpc.districtId);
    const shgs = shgsOfFpc(fpcId);
    const farmers = farmersOfShgs(shgs.map((s) => s.id));
    const agents = db.agents.filter((a) => a.fpcId === fpcId);
    return {
      fpc: {
        id: fpc.id,
        name: fpc.name,
        status: fpc.status,
        districtName: byId.district.get(fpc.districtId)?.name ?? "—",
      },
      counts: { agents: agents.length, shgs: shgs.length, farmers: farmers.length },
      progress: computeProgress(farmers),
      exceptionCount: exceptions.filter((e) => e.fpcId === fpcId).length,
      agents: agents.map((a) => buildAgentRow(a.id, exceptions)).sort((a, b) => b.overall - a.overall),
      shgs: shgs.map((s) => buildShgRow(s.id, exceptions)).sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

export interface AgentMetrics {
  activeAgents: number;
  inactiveAgents: number;
  assignedShgs: number;
  unassignedShgs: number;
}

export function fetchAgents(q: ListQuery): Promise<Paged<AgentRow> & { metrics: AgentMetrics }> {
  return boundary(() => {
    const exceptions = deriveExceptions(q.districtId);
    const districtAgents = db.agents.filter((a) => a.districtId === q.districtId);
    const districtShgs = db.shgs.filter((s) => s.districtId === q.districtId);
    const metrics: AgentMetrics = {
      activeAgents: districtAgents.filter((a) => a.status === "ACTIVE").length,
      inactiveAgents: districtAgents.filter((a) => a.status === "INACTIVE").length,
      assignedShgs: districtShgs.filter((s) => s.agentId).length,
      unassignedShgs: districtShgs.filter((s) => !s.agentId).length,
    };
    let rows = districtAgents
      .filter((a) => !q.fpcId || q.fpcId === "ALL" || a.fpcId === q.fpcId)
      .filter((a) => !q.status || q.status === "ALL" || a.status === q.status)
      .filter((a) => matches(q.search, a.name, a.email, a.phone))
      .map((a) => buildAgentRow(a.id, exceptions));
    rows = sortRows(rows, q.sortBy ?? "name", q.sortDir ?? "asc");
    return { ...paginate(rows, q.page, q.pageSize), metrics };
  });
}

export interface AgentDetail {
  agent: {
    id: string;
    name: string;
    status: string;
    email: string;
    phone: string;
    fpcId: string;
    fpcName: string;
    districtId: string;
    districtName: string;
  };
  counts: { shgs: number; farmers: number };
  progress: ProgressSummary;
  exceptions: RbmsException[];
  shgs: ShgRow[];
}

export function fetchAgentDetail(agentId: string): Promise<AgentDetail> {
  return boundary(() => {
    const agent = byId.agent.get(agentId);
    if (!agent) throw new Error("Agent not found");
    const all = deriveExceptions(agent.districtId);
    const shgs = shgsOfAgent(agentId);
    const shgIds = new Set(shgs.map((s) => s.id));
    const farmers = farmersOfShgs([...shgIds]);
    return {
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        email: agent.email,
        phone: agent.phone,
        fpcId: agent.fpcId,
        fpcName: byId.fpc.get(agent.fpcId)?.name ?? "—",
        districtId: agent.districtId,
        districtName: byId.district.get(agent.districtId)?.name ?? "—",
      },
      counts: { shgs: shgs.length, farmers: farmers.length },
      progress: computeProgress(farmers),
      exceptions: all.filter((e) => e.shgId && shgIds.has(e.shgId)),
      shgs: shgs.map((s) => buildShgRow(s.id, all)),
    };
  });
}

export function fetchShgs(q: ListQuery): Promise<Paged<ShgRow>> {
  return boundary(() => {
    const exceptions = deriveExceptions(q.districtId);
    let rows = db.shgs
      .filter((s) => s.districtId === q.districtId)
      .filter((s) => !q.fpcId || q.fpcId === "ALL" || s.fpcId === q.fpcId)
      .filter((s) => {
        if (!q.agentId || q.agentId === "ALL") return true;
        if (q.agentId === "UNASSIGNED") return !s.agentId;
        return s.agentId === q.agentId;
      })
      .filter((s) => !q.status || q.status === "ALL" || s.status === q.status)
      .map((s) => buildShgRow(s.id, exceptions))
      .filter((r) => matches(q.search, r.name, r.agentName, r.leadFarmerName));
    rows = sortRows(rows, q.sortBy ?? "name", q.sortDir ?? "asc");
    return paginate(rows, q.page, q.pageSize);
  });
}

export interface ShgDetail {
  shg: ShgRow & { village: string; districtId: string; districtName: string };
  progress: ProgressSummary;
  exceptions: RbmsException[];
  leadFarmer: (FarmerRow & { activityCounts: Record<string, number> }) | null;
  farmers: FarmerRow[];
  recentActivity: ActivityRow[];
  paymentTotals: { total: number; verified: number; pending: number; rejected: number };
}

export function fetchShgDetail(shgId: string): Promise<ShgDetail> {
  return boundary(() => {
    const shg = byId.shg.get(shgId);
    if (!shg) throw new Error("SHG not found");
    const all = deriveExceptions(shg.districtId);
    const row = buildShgRow(shgId, all);
    const farmers = farmersOfShg(shgId);
    const lead = shg.leadFarmerId ? byId.farmer.get(shg.leadFarmerId) : null;
    const leadActivities = lead ? db.activities.filter((a) => a.performedById === lead.id) : [];
    const payments = db.payments.filter((p) => p.shgId === shgId);
    return {
      shg: {
        ...row,
        village: shg.village,
        districtId: shg.districtId,
        districtName: byId.district.get(shg.districtId)?.name ?? "—",
      },
      progress: computeProgress(farmers),
      exceptions: all.filter((e) => e.shgId === shgId),
      leadFarmer: lead
        ? {
            ...toFarmerRow(lead),
            activityCounts: {
              KYC: leadActivities.filter((a) => a.type === "KYC").length,
              GEO_PLOT: leadActivities.filter((a) => a.type === "GEO_PLOT").length,
              SUBSCRIPTION: leadActivities.filter((a) => a.type === "SUBSCRIPTION").length,
              PAYMENT: leadActivities.filter((a) => a.type === "PAYMENT").length,
              TOTAL: leadActivities.length,
            },
          }
        : null,
      farmers: farmers.map(toFarmerRow),
      recentActivity: db.activities
        .filter((a) => a.shgId === shgId)
        .slice(0, 6)
        .map(toActivityRow),
      paymentTotals: {
        total: payments.reduce((a, p) => a + p.amount, 0),
        verified: payments.filter((p) => p.status === "VERIFIED").reduce((a, p) => a + p.amount, 0),
        pending: payments.filter((p) => p.status === "PENDING").reduce((a, p) => a + p.amount, 0),
        rejected: payments.filter((p) => p.status === "REJECTED").reduce((a, p) => a + p.amount, 0),
      },
    };
  });
}

export interface FarmerDetail {
  farmer: FarmerRow & {
    shgName: string;
    fpcId: string;
    fpcName: string;
    agentId: string | null;
    agentName: string;
    leadFarmerName: string;
    districtName: string;
    joinedAt: string;
    plots: { id: string; area: number; crop: string; plotted: boolean }[];
  };
  progress: ProgressSummary;
  activity: ActivityRow[];
  payments: PaymentRow[];
  kycDocuments: KycDocument[];
}

export function fetchFarmerDetail(farmerId: string): Promise<FarmerDetail> {
  return boundary(() => {
    const farmer = byId.farmer.get(farmerId);
    if (!farmer) throw new Error("Farmer not found");
    const shg = byId.shg.get(farmer.shgId)!;
    const lead = shg.leadFarmerId ? byId.farmer.get(shg.leadFarmerId) : null;
    return {
      farmer: {
        ...toFarmerRow(farmer),
        shgName: shg.name,
        fpcId: farmer.fpcId,
        fpcName: byId.fpc.get(farmer.fpcId)?.name ?? "—",
        agentId: shg.agentId,
        agentName: shg.agentId ? (byId.agent.get(shg.agentId)?.name ?? "—") : "Unassigned",
        leadFarmerName: lead?.name ?? "—",
        districtName: byId.district.get(farmer.districtId)?.name ?? "—",
        joinedAt: farmer.joinedAt,
        plots: farmer.plots,
      },
      progress: computeProgress([farmer]),
      activity: db.activities.filter((a) => a.farmerId === farmerId).map(toActivityRow),
      payments: db.payments.filter((p) => p.farmerId === farmerId).map(toPaymentRow),
      kycDocuments: deriveKycDocuments(farmer),
    };
  });
}

export function fetchFarmers(q: ListQuery & { shgId?: string }): Promise<Paged<FarmerRow>> {
  return boundary(() => {
    let rows = db.farmers
      .filter((f) => f.districtId === q.districtId)
      .filter((f) => !q.shgId || f.shgId === q.shgId)
      .map(toFarmerRow)
      .filter((r) => matches(q.search, r.name, r.code));
    rows = sortRows(rows, q.sortBy ?? "name", q.sortDir ?? "asc");
    return paginate(rows, q.page, q.pageSize);
  });
}

export interface ActivityQuery extends ListQuery {
  shgId?: string;
  farmerId?: string;
  type?: string;
  performedByRole?: string;
  activityStatus?: string;
  from?: string;
  to?: string;
}

export function fetchActivities(q: ActivityQuery): Promise<Paged<ActivityRow>> {
  return boundary(() => {
    let rows = db.activities
      .filter((a) => a.districtId === q.districtId)
      .filter((a) => !q.fpcId || q.fpcId === "ALL" || a.fpcId === q.fpcId)
      .filter((a) => !q.agentId || q.agentId === "ALL" || a.agentId === q.agentId)
      .filter((a) => !q.shgId || q.shgId === "ALL" || a.shgId === q.shgId)
      .filter((a) => !q.farmerId || a.farmerId === q.farmerId)
      .filter((a) => !q.type || q.type === "ALL" || a.type === q.type)
      .filter((a) => !q.performedByRole || q.performedByRole === "ALL" || a.performedByRole === q.performedByRole)
      .filter((a) => !q.activityStatus || q.activityStatus === "ALL" || a.status === q.activityStatus)
      .filter((a) => !q.from || a.timestamp >= q.from)
      .filter((a) => !q.to || a.timestamp <= q.to)
      .map(toActivityRow)
      .filter((r) => matches(q.search, r.farmerName, r.shgName, r.agentName, r.performedByName));
    rows = sortRows(rows, q.sortBy ?? "timestamp", q.sortDir ?? "desc");
    return paginate(rows, q.page, q.pageSize);
  });
}

export interface PaymentQuery extends ListQuery {
  shgId?: string;
  paymentStatus?: string;
}

export function fetchPayments(q: PaymentQuery): Promise<Paged<PaymentRow>> {
  return boundary(() => {
    let rows = db.payments
      .filter((p) => p.districtId === q.districtId)
      .filter((p) => !q.shgId || p.shgId === q.shgId)
      .filter((p) => !q.fpcId || q.fpcId === "ALL" || p.fpcId === q.fpcId)
      .filter((p) => !q.paymentStatus || q.paymentStatus === "ALL" || p.status === q.paymentStatus)
      .map(toPaymentRow)
      .filter((r) => matches(q.search, r.farmerName, r.shgName, r.collectedByName));
    rows = sortRows(rows, q.sortBy ?? "collectedAt", q.sortDir ?? "desc");
    return paginate(rows, q.page, q.pageSize);
  });
}

export interface ExceptionQuery extends ListQuery {
  severity?: string;
  type?: string;
  entityKind?: string;
}

export function fetchExceptions(
  q: ExceptionQuery,
): Promise<Paged<RbmsException> & { counts: Record<Severity, number> }> {
  return boundary(() => {
    const all = deriveExceptions(q.districtId);
    const counts: Record<Severity, number> = {
      HIGH: all.filter((e) => e.severity === "HIGH").length,
      MEDIUM: all.filter((e) => e.severity === "MEDIUM").length,
      LOW: all.filter((e) => e.severity === "LOW").length,
    };
    const rows = all
      .filter((e) => !q.severity || q.severity === "ALL" || e.severity === q.severity)
      .filter((e) => !q.type || q.type === "ALL" || e.type === q.type)
      .filter((e) => !q.fpcId || q.fpcId === "ALL" || e.fpcId === q.fpcId)
      .filter((e) => !q.agentId || q.agentId === "ALL" || e.agentId === q.agentId)
      .filter((e) => !q.entityKind || q.entityKind === "ALL" || e.entityKind === q.entityKind)
      .filter((e) => matches(q.search, e.entityName, e.description, e.fpcName, e.agentName));
    return { ...paginate(rows, q.page, q.pageSize ?? 12), counts };
  });
}

/** SHGs offered in the allocation drawer, with their current owner. */
export interface AllocatableShg {
  id: string;
  name: string;
  farmers: number;
  currentAgentId: string | null;
  currentAgentName: string;
  status: string;
}

export function fetchAllocatableShgs(fpcId: string, search?: string): Promise<AllocatableShg[]> {
  return boundary(
    () =>
      shgsOfFpc(fpcId)
        .map((s) => ({
          id: s.id,
          name: s.name,
          farmers: farmersOfShg(s.id).length,
          currentAgentId: s.agentId,
          currentAgentName: s.agentId ? (byId.agent.get(s.agentId)?.name ?? "—") : "Unassigned",
          status: s.status,
        }))
        .filter((s) => matches(search, s.name, s.currentAgentName)),
    150,
  );
}

export function fetchFpcOptions(districtId: string): Promise<{ id: string; name: string }[]> {
  return boundary(
    () => db.fpcs.filter((f) => f.districtId === districtId).map((f) => ({ id: f.id, name: f.name })),
    60,
  );
}

export function fetchAgentOptions(districtId: string, fpcId?: string): Promise<{ id: string; name: string }[]> {
  return boundary(
    () =>
      db.agents
        .filter((a) => a.districtId === districtId)
        .filter((a) => !fpcId || fpcId === "ALL" || a.fpcId === fpcId)
        .map((a) => ({ id: a.id, name: a.name })),
    60,
  );
}

export function fetchShgOptions(districtId: string, fpcId?: string): Promise<{ id: string; name: string }[]> {
  return boundary(
    () =>
      db.shgs
        .filter((s) => s.districtId === districtId)
        .filter((s) => !fpcId || fpcId === "ALL" || s.fpcId === fpcId)
        .map((s) => ({ id: s.id, name: s.name })),
    60,
  );
}

/* ------------------------------------------------------------------ */
/* Mutations — write to the shared store                               */
/* ------------------------------------------------------------------ */
let mutationSeq = 0;
const newActivityId = () => `act-m${++mutationSeq}`;

export async function assignShgs(input: { agentId: string; shgIds: string[] }): Promise<void> {
  await delay(280);
  const agent = byId.agent.get(input.agentId);
  if (!agent) throw new Error("Agent not found");
  input.shgIds.forEach((shgId) => {
    const shg = byId.shg.get(shgId);
    if (!shg) return;
    shg.agentId = agent.id;
    // Activities follow the SHG's current responsible agent.
    db.activities.filter((a) => a.shgId === shgId).forEach((a) => (a.agentId = agent.id));
    db.payments.filter((p) => p.shgId === shgId).forEach((p) => (p.agentId = agent.id));
  });
  notifyStoreChanged();
}

export async function verifyPayment(paymentId: string, verifierId: string): Promise<void> {
  await delay(240);
  const payment = byId.payment.get(paymentId);
  if (!payment) throw new Error("Payment not found");
  payment.status = "VERIFIED";
  payment.verifiedById = verifierId;
  payment.verifiedAt = new Date().toISOString();
  const linked = db.activities.find((a) => a.paymentId === paymentId);
  if (linked) {
    linked.status = "VERIFIED";
    linked.verifiedById = verifierId;
    linked.verifiedAt = payment.verifiedAt;
  }
  db.activities.unshift({
    id: newActivityId(),
    type: "PAYMENT",
    farmerId: payment.farmerId,
    shgId: payment.shgId,
    fpcId: payment.fpcId,
    districtId: payment.districtId,
    agentId: payment.agentId,
    performedById: verifierId,
    performedByRole: "AGENT",
    timestamp: payment.verifiedAt,
    status: "VERIFIED",
    verifiedById: verifierId,
    verifiedAt: payment.verifiedAt,
    metadata: { action: "Payment verified", amount: payment.amount, method: payment.method },
    paymentId: payment.id,
  });
  notifyStoreChanged();
}

export async function rejectPayment(paymentId: string, verifierId: string): Promise<void> {
  await delay(240);
  const payment = byId.payment.get(paymentId);
  if (!payment) throw new Error("Payment not found");
  payment.status = "REJECTED";
  payment.verifiedById = verifierId;
  payment.verifiedAt = new Date().toISOString();
  const linked = db.activities.find((a) => a.paymentId === paymentId);
  if (linked) {
    linked.status = "REJECTED";
    linked.verifiedById = verifierId;
    linked.verifiedAt = payment.verifiedAt;
  }
  db.activities.unshift({
    id: newActivityId(),
    type: "PAYMENT",
    farmerId: payment.farmerId,
    shgId: payment.shgId,
    fpcId: payment.fpcId,
    districtId: payment.districtId,
    agentId: payment.agentId,
    performedById: verifierId,
    performedByRole: "AGENT",
    timestamp: payment.verifiedAt,
    status: "REJECTED",
    verifiedById: verifierId,
    verifiedAt: payment.verifiedAt,
    metadata: { action: "Payment rejected", amount: payment.amount, method: payment.method },
    paymentId: payment.id,
  });
  notifyStoreChanged();
}

export async function changeLeadFarmer(shgId: string, farmerId: string): Promise<void> {
  await delay(240);
  const shg = byId.shg.get(shgId);
  const farmer = byId.farmer.get(farmerId);
  if (!shg || !farmer || farmer.shgId !== shgId) throw new Error("Invalid Lead Farmer selection");
  db.farmers.filter((f) => f.shgId === shgId).forEach((f) => (f.isLeadFarmer = false));
  farmer.isLeadFarmer = true;
  shg.leadFarmerId = farmer.id;
  db.activities.unshift({
    id: newActivityId(),
    type: "OTHER",
    farmerId: farmer.id,
    shgId: shg.id,
    fpcId: shg.fpcId,
    districtId: shg.districtId,
    agentId: shg.agentId,
    performedById: shg.agentId ?? farmer.id,
    performedByRole: "AGENT",
    timestamp: new Date().toISOString(),
    status: "COMPLETED",
    verifiedById: null,
    verifiedAt: null,
    metadata: { action: "Lead Farmer changed", newLeadFarmer: farmer.name },
  });
  notifyStoreChanged();
}
