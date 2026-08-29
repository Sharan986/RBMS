import type { Farmer, ProgressSummary, TaskKey } from "../types";
import { TASK_DEFINITIONS } from "../types";

const emptyByTask = () => {
  const acc = {} as Record<TaskKey, { completed: number; total: number }>;
  TASK_DEFINITIONS.forEach((t) => (acc[t.key] = { completed: 0, total: 0 }));
  return acc;
};

/**
 * Progress is always "completed applicable task instances / total applicable
 * task instances" — never an average of averages. The same counting is used at
 * farmer, SHG, agent, FPC and district level, so the numbers reconcile.
 */
export function computeProgress(farmers: Farmer[]): ProgressSummary {
  const byTaskCounts = emptyByTask();
  let completed = 0;
  let total = 0;

  farmers.forEach((farmer) => {
    TASK_DEFINITIONS.forEach((t) => {
      const done = farmer.tasks[t.key] === "COMPLETED";
      byTaskCounts[t.key].total += 1;
      total += 1;
      if (done) {
        byTaskCounts[t.key].completed += 1;
        completed += 1;
      }
    });
  });

  const byTask = {} as Record<TaskKey, number>;
  TASK_DEFINITIONS.forEach((t) => {
    const c = byTaskCounts[t.key];
    byTask[t.key] = c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100);
  });

  return {
    overall: total === 0 ? 0 : Math.round((completed / total) * 100),
    byTask,
    completed,
    total,
    counters: byTaskCounts,
  };
}

export function farmerProgress(farmer: Farmer): ProgressSummary {
  return computeProgress([farmer]);
}
