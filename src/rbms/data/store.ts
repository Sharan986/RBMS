import type {
  Activity,
  ActivityType,
  ActorRole,
  Agent,
  District,
  Farmer,
  Fpc,
  Payment,
  PaymentMethod,
  PaymentPlan,
  Shg,
  TaskKey,
  TaskState,
} from "../types";
import { TASK_DEFINITIONS } from "../types";

/* ------------------------------------------------------------------ *
 * Deterministic pseudo-random generator so the dataset is stable
 * across reloads (and identical between SSR and client).
 * ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260813);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;

const pad = (n: number, len = 3) => String(n).padStart(len, "0");

/* ------------------------------------------------------------------ *
 * Name pools
 * ------------------------------------------------------------------ */
const FIRST_NAMES = [
  "Harekrishna", "Ravi", "Suresh", "Anima", "Manuranjan", "Akshay", "Bipul", "Dipika",
  "Gokul", "Jyoti", "Kamala", "Lakhan", "Mukesh", "Nirmala", "Pankaj", "Rekha",
  "Sanjay", "Tapan", "Usha", "Vikash", "Bimal", "Chandan", "Deepak", "Ganesh",
  "Hemant", "Indrani", "Kailash", "Lalita", "Mohan", "Nabin", "Prakash", "Rina",
  "Sunita", "Tarun", "Uday", "Varsha", "Ashok", "Basanti", "Chitra", "Dinesh",
];
const LAST_NAMES = [
  "Mandal", "Kumar", "Boro", "Saikia", "Mohanta", "Mahato", "Munda", "Oraon",
  "Singh", "Das", "Sahu", "Tudu", "Hembrom", "Besra", "Kisku", "Soren",
  "Gope", "Nayak", "Patra", "Barla",
];
const SHG_NAMES = [
  "Mahabahu", "Kaberi", "Rani", "Jagriti", "Sarala", "Prerna", "Ujjwal", "Kalyani",
  "Nabajyoti", "Sonali", "Anmol", "Basundhara", "Chandini", "Disha", "Ekta",
  "Ganga", "Hariyali", "Indradhanu", "Jharna", "Kranti", "Lahar", "Meghna",
  "Navjeevan", "Oorja", "Pragati", "Roshni", "Sahyog", "Tarangini", "Umang",
  "Vasudha", "Sankalp", "Aarohi", "Bhoomi", "Chetna", "Dhara", "Sparsh",
];
const VILLAGES = [
  "Baharagora", "Ghatshila", "Potka", "Patamda", "Dhalbhumgarh", "Chakulia",
  "Musabani", "Golmuri", "Bahragora", "Jugsalai", "Chandil", "Nimdih",
];
const FPC_PREFIX = [
  "Suntali", "Sonari", "Adityapur", "Bagbera", "Kharsawan", "Chaibasa", "Dumaria",
  "Manoharpur", "Kolebira", "Silli", "Bundu", "Tamar", "Angara", "Namkum",
  "Ormanjhi", "Khunti", "Torpa", "Sisai", "Gumla", "Lohardaga", "Bero", "Ratu",
];
const FPC_SUFFIX = [
  "Maize Producer Company",
  "Farmer Producer Company",
  "Agro Producer Company",
  "Krishi Producer Company",
];

const DISTRICT_SEED: { name: string; state: string }[] = [
  { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Ranchi", state: "Jharkhand" },
  { name: "East Singhbhum", state: "Jharkhand" },
  { name: "Saraikela-Kharsawan", state: "Jharkhand" },
  { name: "West Singhbhum", state: "Jharkhand" },
  { name: "Khunti", state: "Jharkhand" },
  { name: "Gumla", state: "Jharkhand" },
  { name: "Bokaro", state: "Jharkhand" },
  { name: "Dhanbad", state: "Jharkhand" },
  { name: "Hazaribagh", state: "Jharkhand" },
];

const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

/* ------------------------------------------------------------------ *
 * Dataset
 * ------------------------------------------------------------------ */
export interface RbmsDatabase {
  districts: District[];
  fpcs: Fpc[];
  agents: Agent[];
  shgs: Shg[];
  farmers: Farmer[];
  activities: Activity[];
  payments: Payment[];
}

const BASE_DATE = new Date("2026-08-08T11:00:00Z").getTime();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function isoAgo(hours: number) {
  return new Date(BASE_DATE - hours * HOUR).toISOString();
}

function build(): RbmsDatabase {
  const districts: District[] = DISTRICT_SEED.map((d, i) => ({
    id: `district-${pad(i + 1)}`,
    name: d.name,
    state: d.state,
  }));

  const fpcs: Fpc[] = [];
  const agents: Agent[] = [];
  const shgs: Shg[] = [];
  const farmers: Farmer[] = [];
  const activities: Activity[] = [];
  const payments: Payment[] = [];

  let fpcSeq = 0;
  let agentSeq = 0;
  let shgSeq = 0;
  let farmerSeq = 0;
  let activitySeq = 0;
  let paymentSeq = 0;

  const usedFpcNames = new Set<string>();
  const fpcName = (index: number) => {
    let name = `${FPC_PREFIX[index % FPC_PREFIX.length]} ${pick(FPC_SUFFIX)}`;
    let guard = 0;
    while (usedFpcNames.has(name) && guard++ < 20) {
      name = `${FPC_PREFIX[(index + guard) % FPC_PREFIX.length]} ${pick(FPC_SUFFIX)}`;
    }
    usedFpcNames.add(name);
    return name;
  };

  districts.forEach((district, dIdx) => {
    // Jamshedpur (the demo district) is the richest.
    const fpcCount = dIdx === 0 ? 6 : int(2, 4);

    for (let f = 0; f < fpcCount; f++) {
      fpcSeq += 1;
      const isAnchorFpc = dIdx === 0 && f === 0;
      const fpc: Fpc = {
        id: `fpc-${pad(fpcSeq)}`,
        name: isAnchorFpc ? "Suntali Maize Producer Company" : fpcName(fpcSeq),
        districtId: district.id,
        status: chance(0.92) ? "ACTIVE" : "INACTIVE",
        createdAt: isoAgo(int(400, 5000)),
      };
      fpcs.push(fpc);

      const agentCount = isAnchorFpc ? 4 : int(2, 4);
      const fpcAgents: Agent[] = [];
      for (let a = 0; a < agentCount; a++) {
        agentSeq += 1;
        const isAnchorAgent = isAnchorFpc && a === 0;
        const name = isAnchorAgent
          ? "Akshay"
          : isAnchorFpc && a === 1
            ? "Manuranjan Saikia"
            : fullName();
        const agent: Agent = {
          id: `agent-${pad(agentSeq)}`,
          name,
          fpcId: fpc.id,
          districtId: district.id,
          status: isAnchorAgent ? "ACTIVE" : chance(0.93) ? "ACTIVE" : "INACTIVE",
          email: isAnchorAgent
            ? "abhishekmohanta77@gmail.com"
            : `${name.toLowerCase().replace(/[^a-z]/g, ".")}@digikrishi.com`,
          phone: isAnchorAgent ? "9957704708" : `9${int(100000000, 899999999)}`,
        };
        agents.push(agent);
        fpcAgents.push(agent);
      }

      const shgCount = isAnchorFpc ? 18 : int(6, 12);
      for (let s = 0; s < shgCount; s++) {
        shgSeq += 1;
        const isAnchorShg = isAnchorFpc && s === 0;
        // A small number of SHGs are deliberately unassigned (exception source).
        const unassigned = !isAnchorShg && chance(0.06);
        const agent = unassigned ? null : isAnchorShg ? fpcAgents[0]! : pick(fpcAgents);
        const shg: Shg = {
          id: `shg-${pad(shgSeq)}`,
          name: isAnchorShg
            ? "Mahabahu"
            : `${SHG_NAMES[shgSeq % SHG_NAMES.length]} ${["SHG", "Mahila SHG", "Krishi SHG"][shgSeq % 3]}`,
          fpcId: fpc.id,
          districtId: district.id,
          agentId: agent ? agent.id : null,
          leadFarmerId: null,
          status: chance(0.95) ? "ACTIVE" : "INACTIVE",
          village: pick(VILLAGES),
        };
        shgs.push(shg);

        const farmerCount = isAnchorShg ? 22 : int(8, 24);
        const shgFarmers: Farmer[] = [];
        for (let m = 0; m < farmerCount; m++) {
          farmerSeq += 1;
          const isAnchorFarmer = isAnchorShg && m === 0;
          const tasks = {} as Record<TaskKey, TaskState>;
          TASK_DEFINITIONS.forEach((t) => {
            const base = t.key === "subscription" ? 0.86 : t.key === "kyc" ? 0.82 : 0.73;
            tasks[t.key] = chance(base) ? "COMPLETED" : "PENDING";
          });
          if (isAnchorFarmer) {
            tasks.kyc = "COMPLETED";
            tasks.geo = "COMPLETED";
            tasks.subscription = "COMPLETED";
          }
          const farmer: Farmer = {
            id: `farmer-${pad(farmerSeq, 4)}`,
            name: isAnchorFarmer ? "Harekrishna Mandal" : fullName(),
            code: `DK-${district.name.slice(0, 3).toUpperCase()}-${pad(farmerSeq, 5)}`,
            phone: `9${int(100000000, 899999999)}`,
            shgId: shg.id,
            fpcId: fpc.id,
            districtId: district.id,
            isLeadFarmer: m === 0,
            tasks,
            plots: Array.from({ length: int(1, 3) }, (_, p) => ({
              id: `plot-${farmerSeq}-${p + 1}`,
              area: Number((0.4 + rand() * 3).toFixed(2)),
              crop: pick(["Maize", "Paddy", "Mustard", "Pulses"]),
              plotted: tasks.geo === "COMPLETED" ? true : chance(0.3),
            })),
            joinedAt: isoAgo(int(200, 4000)),
          };
          farmers.push(farmer);
          shgFarmers.push(farmer);
        }
        shg.leadFarmerId = shgFarmers[0]!.id;

        /* ---------------- payments ---------------- */
        shgFarmers.forEach((farmer) => {
          if (farmer.tasks.subscription !== "COMPLETED" && !chance(0.2)) return;
          paymentSeq += 1;
          const role: ActorRole = chance(0.55) ? "LEAD_FARMER" : "AGENT";
          const collectedById = role === "LEAD_FARMER" ? shg.leadFarmerId! : (shg.agentId ?? shgFarmers[0]!.id);
          const status = chance(0.76) ? "VERIFIED" : chance(0.85) ? "PENDING" : "REJECTED";
          const collectedAt = isoAgo(int(1, 700));
          const payment: Payment = {
            id: `pay-${pad(paymentSeq, 4)}`,
            farmerId: farmer.id,
            shgId: shg.id,
            fpcId: fpc.id,
            districtId: district.id,
            agentId: shg.agentId,
            plan: pick(["FULL", "PARTIAL", "SEASONAL"] as PaymentPlan[]),
            amount: pick([450, 450, 600, 250, 900]),
            method: pick(["UPI QR", "Cash", "Bank Transfer"] as PaymentMethod[]),
            collectedById,
            collectedByRole: role,
            collectedAt,
            status,
            verifiedById: status === "VERIFIED" ? (shg.agentId ?? null) : null,
            verifiedAt: status === "VERIFIED" ? new Date(new Date(collectedAt).getTime() + HOUR * int(1, 40)).toISOString() : null,
          };
          payments.push(payment);

          activitySeq += 1;
          activities.push({
            id: `act-${pad(activitySeq, 4)}`,
            type: "PAYMENT",
            farmerId: farmer.id,
            shgId: shg.id,
            fpcId: fpc.id,
            districtId: district.id,
            agentId: shg.agentId,
            performedById: collectedById,
            performedByRole: role,
            timestamp: collectedAt,
            status: status === "VERIFIED" ? "VERIFIED" : status === "REJECTED" ? "REJECTED" : "PENDING",
            verifiedById: payment.verifiedById,
            verifiedAt: payment.verifiedAt,
            metadata: { amount: payment.amount, method: payment.method, plan: payment.plan },
            paymentId: payment.id,
          });
        });

        /* ---------------- task activities ---------------- */
        shgFarmers.forEach((farmer) => {
          const map: Record<TaskKey, ActivityType> = {
            kyc: "KYC",
            geo: "GEO_PLOT",
            subscription: "SUBSCRIPTION",
          };
          TASK_DEFINITIONS.forEach((t) => {
            if (farmer.tasks[t.key] !== "COMPLETED") return;
            if (!chance(0.55)) return;
            activitySeq += 1;
            const role: ActorRole = chance(0.5) ? "LEAD_FARMER" : "AGENT";
            const performedById = role === "LEAD_FARMER" ? shg.leadFarmerId! : (shg.agentId ?? shgFarmers[0]!.id);
            const verified = chance(0.7);
            const ts = isoAgo(int(1, 900));
            activities.push({
              id: `act-${pad(activitySeq, 4)}`,
              type: map[t.key],
              farmerId: farmer.id,
              shgId: shg.id,
              fpcId: fpc.id,
              districtId: district.id,
              agentId: shg.agentId,
              performedById,
              performedByRole: role,
              timestamp: ts,
              status: verified ? "VERIFIED" : "COMPLETED",
              verifiedById: verified ? (shg.agentId ?? null) : null,
              verifiedAt: verified ? new Date(new Date(ts).getTime() + HOUR * int(1, 30)).toISOString() : null,
              metadata:
                t.key === "kyc"
                  ? { document: pick(["Aadhaar", "Voter ID", "PAN"]), pages: int(1, 3) }
                  : t.key === "geo"
                    ? { plots: farmer.plots.length, area: farmer.plots.reduce((a, p) => a + p.area, 0).toFixed(2) }
                    : { plan: pick(["FULL", "PARTIAL"]) },
            });
          });
        });
      }
    }
  });

  activities.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return { districts, fpcs, agents, shgs, farmers, activities, payments };
}

export const db: RbmsDatabase = build();

/* ------------------------------------------------------------------ *
 * Indexes + lookup helpers (single source of truth)
 * ------------------------------------------------------------------ */
export const byId = {
  district: new Map(db.districts.map((d) => [d.id, d])),
  fpc: new Map(db.fpcs.map((f) => [f.id, f])),
  agent: new Map(db.agents.map((a) => [a.id, a])),
  shg: new Map(db.shgs.map((s) => [s.id, s])),
  farmer: new Map(db.farmers.map((f) => [f.id, f])),
  payment: new Map(db.payments.map((p) => [p.id, p])),
};

export const actorName = (id: string | null): string => {
  if (!id) return "—";
  return byId.agent.get(id)?.name ?? byId.farmer.get(id)?.name ?? "—";
};

export const nextActivityId = () => `act-${pad(db.activities.length + 9000, 4)}`;

export const DEMO = {
  districtId: "district-001",
  fpcId: "fpc-001",
  agentId: "agent-001",
  shgId: "shg-001",
};

/* ------------------------------------------------------------------ *
 * Change notification — mutations bump this so the query layer can
 * invalidate every dependent view.
 * ------------------------------------------------------------------ */
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeToStore(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function notifyStoreChanged() {
  listeners.forEach((l) => l());
}
