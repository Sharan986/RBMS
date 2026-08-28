import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { rejectPayment, verifyPayment, type PaymentRow } from "../api";
import { useRbms } from "../context/RbmsContext";
import { DataTable, type Column } from "./DataTable";
import { Button, Modal, StatusPill, formatDateTime, inr, toneForStatus } from "./ui";
import { roleLabel } from "./ActivityViews";

export function PaymentTable({
  rows,
  isLoading,
  error,
  onRetry,
  page,
  pageSize,
  total,
  onPageChange,
  hideShg,
}: {
  rows: PaymentRow[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  hideShg?: boolean;
}) {
  const { currentUser } = useRbms();
  const [pending, setPending] = useState<{ row: PaymentRow; action: "verify" | "reject" } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ row, action }: { row: PaymentRow; action: "verify" | "reject" }) =>
      action === "verify" ? verifyPayment(row.id, currentUser.id) : rejectPayment(row.id, currentUser.id),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.action === "verify"
          ? `Payment of ${inr(vars.row.amount)} from ${vars.row.farmerName} verified`
          : `Payment of ${inr(vars.row.amount)} from ${vars.row.farmerName} rejected`,
      );
      setPending(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allColumns: Column<PaymentRow>[] = [
    { key: "farmerName", header: "Farmer", sortable: true, render: (r) => <span className="font-medium">{r.farmerName}</span> },
    { key: "shgName", header: "SHG", render: (r) => r.shgName },
    { key: "plan", header: "Plan", render: (r) => r.plan },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (r) => <span className="tnum">{inr(r.amount)}</span> },
    { key: "method", header: "Method", render: (r) => r.method },
    {
      key: "collectedByName",
      header: "Collected By",
      render: (r) => (
        <span>
          {r.collectedByName}
          <span className="ml-1 text-[11px] text-muted-foreground">({roleLabel(r.collectedByRole)})</span>
        </span>
      ),
    },
    { key: "collectedAt", header: "Collected On", sortable: true, render: (r) => formatDateTime(r.collectedAt) },
    { key: "status", header: "Status", render: (r) => <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill> },
    {
      key: "verifiedByName",
      header: "Verification",
      render: (r) => (r.verifiedAt ? `${r.verifiedByName} · ${formatDateTime(r.verifiedAt)}` : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) =>
        r.status === "PENDING" ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => setPending({ row: r, action: "verify" })}>
              Verify
            </Button>
            <Button size="sm" variant="danger" onClick={() => setPending({ row: r, action: "reject" })}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">No action needed</span>
        ),
    },
  ];
  const columns = allColumns.filter((c) => !(hideShg && c.key === "shgName"));

  return (
    <>
      <DataTable
        columns={columns}

        rows={rows}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyMessage="No payments recorded for this selection."
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        dense
      />
      <Modal
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending?.action === "reject" ? "Reject this payment?" : "Verify this payment?"}
        description={
          pending
            ? `${inr(pending.row.amount)} collected from ${pending.row.farmerName} (${pending.row.shgName}) by ${pending.row.collectedByName} via ${pending.row.method}.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={pending?.action === "reject" ? "danger" : "default"}
              disabled={mutation.isPending}
              onClick={() => pending && mutation.mutate(pending)}
            >
              {mutation.isPending
                ? "Saving…"
                : pending?.action === "reject"
                  ? "Reject payment"
                  : "Confirm verification"}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-muted-foreground">
          {pending?.action === "reject"
            ? "The payment will be marked rejected and the farmer's subscription task will stay incomplete. This action is recorded in the activity log."
            : "The payment will be marked verified against your name and recorded in the activity log. Related exceptions will clear automatically."}
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Verifying as <span className="text-foreground">{currentUser.name}</span> · {currentUser.email}
        </p>
      </Modal>
    </>
  );
}
