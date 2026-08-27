import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { assignShgs, fetchAllocatableShgs, type AllocatableShg } from "../api";
import { Button, Drawer, EmptyState, Input, LoadingState, Modal, StatusPill } from "./ui";

export function AllocationDrawer({
  open,
  onOpenChange,
  agentId,
  agentName,
  fpcId,
  fpcName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  agentName: string;
  fpcId: string;
  fpcName: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const list = useQuery({
    queryKey: ["allocatable-shgs", fpcId, search],
    queryFn: () => fetchAllocatableShgs(fpcId, search),
    enabled: open,
  });

  const rows = list.data ?? [];
  const selectedRows = useMemo(() => rows.filter((r) => selected.includes(r.id)), [rows, selected]);
  const reassignments = selectedRows.filter((r) => r.currentAgentId && r.currentAgentId !== agentId);
  const alreadyOwned = selectedRows.filter((r) => r.currentAgentId === agentId);
  const netNew = selectedRows.length - alreadyOwned.length;

  const mutation = useMutation({
    mutationFn: () => assignShgs({ agentId, shgIds: selected.filter((id) => !alreadyOwned.some((a) => a.id === id)) }),
    onSuccess: () => {
      toast.success(
        `${netNew} SHG${netNew === 1 ? "" : "s"} allocated to ${agentName}${reassignments.length ? ` · ${reassignments.length} reassigned from other Agents` : ""
        }`,
      );
      setConfirming(false);
      setSelected([]);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) setSelected([]);
          onOpenChange(v);
        }}
        title={`Allocate SHGs to ${agentName}`}
        description={`Only SHGs belonging to ${fpcName} can be allocated to this Agent.`}
        width="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              {selected.length} selected
              {reassignments.length > 0 && (
                <span className="ml-1.5 text-warning">· {reassignments.length} will be reassigned</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={netNew === 0} onClick={() => setConfirming(true)}>
                Review allocation
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Search SHGs or current Agent…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {list.isLoading && <LoadingState label="Loading SHGs…" />}
          {!list.isLoading && rows.length === 0 && <EmptyState message="No SHGs match this search." />}
          <ul className="space-y-1.5">
            {rows.map((s) => (
              <ShgOption
                key={s.id}
                shg={s}
                checked={selected.includes(s.id)}
                isCurrent={s.currentAgentId === agentId}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </ul>
        </div>
      </Drawer>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm SHG allocation"
        description={`${netNew} SHG${netNew === 1 ? "" : "s"} will be allocated to ${agentName}.`}
        width="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button
              variant={reassignments.length ? "warning" : "default"}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? "Allocating…"
                : reassignments.length
                  ? "Reassign and allocate"
                  : "Confirm allocation"}
            </Button>
          </>
        }
      >
        {reassignments.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-[12.5px] font-medium text-warning">
                  {reassignments.length} SHG{reassignments.length === 1 ? " is" : "s are"} currently owned by another
                  Agent
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Reassigning moves ongoing responsibility, including pending verifications and future activity, to{" "}
                  {agentName}. Completed history stays attributed to the original Agent.
                </p>
              </div>
            </div>
            <ul className="rounded-md border border-border">
              {reassignments.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-border px-2.5 py-2 text-[12.5px] last:border-b-0"
                >
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.currentAgentName} <span className="text-warning">→</span> {agentName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            All selected SHGs are currently unassigned. They will be allocated to {agentName}.
          </p>
        )}
      </Modal>
    </>
  );
}

function ShgOption({
  shg,
  checked,
  isCurrent,
  onToggle,
}: {
  shg: AllocatableShg;
  checked: boolean;
  isCurrent: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={
          "flex cursor-pointer items-center justify-between gap-3 rounded-md border px-2.5 py-2 " +
          (checked ? "border-primary/50 bg-primary/8" : "border-border bg-panel-2 hover:border-primary/30")
        }
      >
        <span className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            disabled={isCurrent}
            onChange={onToggle}
            className="h-3.5 w-3.5 accent-[#00a63c]"
          />
          <span>
            <span className="block text-[12.5px] font-medium">{shg.name}</span>
            <span className="block text-[11px] text-muted-foreground">{shg.farmers} farmers</span>
          </span>
        </span>
        {isCurrent ? (
          <StatusPill tone="green">Already assigned</StatusPill>
        ) : shg.currentAgentId ? (
          <StatusPill tone="amber">Assigned to {shg.currentAgentName}</StatusPill>
        ) : (
          <StatusPill tone="red">Unassigned</StatusPill>
        )}
      </label>
    </li>
  );
}
