export type TaskKey = "kyc" | "geo" | "subscription";

export interface TaskDefinition {
  key: TaskKey;
  label: string;
  shortLabel: string;
}

/**
 * Task categories are configuration, not hardcoded UI. Adding a new task type
 * here flows through progress calculation, tables and charts automatically.
 */
export const TASK_DEFINITIONS: TaskDefinition[] = [
  { key: "kyc", label: "KYC", shortLabel: "KYC" },
  { key: "geo", label: "Geo Plotting", shortLabel: "Geo" },
  { key: "subscription", label: "Subscription", shortLabel: "Subscription" },
];

export type TaskState = "COMPLETED" | "PENDING";

export type EntityStatus = "ACTIVE" | "INACTIVE";

export interface District {
  id: string;
  name: string;
  state: string;
}

export interface Fpc {
  id: string;
  name: string;
  districtId: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  fpcId: string;
  districtId: string;
  status: EntityStatus;
  email: string;
  phone: string;
}

export interface Shg {
  id: string;
  name: string;
  fpcId: string;
  districtId: string;
  /** An SHG has at most ONE active agent at a time. */
  agentId: string | null;
  leadFarmerId: string | null;
  status: EntityStatus;
  village: string;
}

export interface Farmer {
  id: string;
  name: string;
  code: string;
  phone: string;
  shgId: string;
  fpcId: string;
  districtId: string;
  isLeadFarmer: boolean;
  tasks: Record<TaskKey, TaskState>;
  plots: { id: string; area: number; crop: string; plotted: boolean }[];
  joinedAt: string;
}

export type ActivityType = "KYC" | "GEO_PLOT" | "SUBSCRIPTION" | "PAYMENT" | "OTHER";
export type ActorRole = "AGENT" | "LEAD_FARMER";
export type ActivityStatus = "COMPLETED" | "PENDING" | "VERIFIED" | "REJECTED";

export interface Activity {
  id: string;
  type: ActivityType;
  farmerId: string;
  shgId: string;
  fpcId: string;
  districtId: string;
  agentId: string | null;
  performedById: string;
  performedByRole: ActorRole;
  timestamp: string;
  status: ActivityStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
  metadata: Record<string, string | number>;
  paymentId?: string;
}

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PaymentPlan = "FULL" | "PARTIAL" | "SEASONAL";
export type PaymentMethod = "UPI QR" | "Cash" | "Bank Transfer";

export interface Payment {
  id: string;
  farmerId: string;
  shgId: string;
  fpcId: string;
  districtId: string;
  agentId: string | null;
  plan: PaymentPlan;
  amount: number;
  method: PaymentMethod;
  collectedById: string;
  collectedByRole: ActorRole;
  collectedAt: string;
  status: PaymentStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
}

export type ExceptionType =
  | "UNASSIGNED_SHG"
  | "MISSING_KYC"
  | "MISSING_GEO"
  | "UNVERIFIED_PAYMENT"
  | "INCOMPLETE_SUBSCRIPTION";

export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type ExceptionEntityKind = "FPC" | "AGENT" | "SHG" | "FARMER";

export interface RbmsException {
  id: string;
  type: ExceptionType;
  severity: Severity;
  entityKind: ExceptionEntityKind;
  entityId: string;
  entityName: string;
  shgId: string | null;
  fpcId: string;
  fpcName: string;
  agentId: string | null;
  agentName: string;
  districtId: string;
  /** Human-readable reason. Never just the type code. */
  description: string;
  createdAt: string;
  href: string;
}

export interface ProgressCounters {
  completed: number;
  total: number;
  byTask: Record<TaskKey, { completed: number; total: number }>;
}

export interface ProgressSummary {
  overall: number;
  byTask: Record<TaskKey, number>;
  completed: number;
  total: number;
  counters: Record<TaskKey, { completed: number; total: number }>;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}
