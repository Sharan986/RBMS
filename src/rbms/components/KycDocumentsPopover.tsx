import * as Popover from "@radix-ui/react-popover";
import { Check, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { KycDocument } from "@/rbms/data/kycDocuments";
import { formatDate } from "@/rbms/components/ui";

/**
 * Hover- or click-triggered breakdown of the required KYC document checklist.
 */
export function KycDocumentsPopover({
  documents,
  children,
}: {
  documents: KycDocument[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const uploaded = documents.filter((d) => d.uploaded).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded outline-none focus-visible:ring-1 focus-visible:ring-primary"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label="View KYC document status"
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="z-50 w-72 rounded-lg border border-border bg-panel p-0 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-[12.5px] font-semibold">KYC documents</p>
            <p className="tnum text-[11px] text-muted-foreground">
              {uploaded} of {documents.length} uploaded
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {documents.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-3 rounded px-1.5 py-1.5 hover:bg-panel-2"
              >
                <span className="flex items-center gap-2 text-[12px]">
                  {d.uploaded ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={d.uploaded ? "" : "text-muted-foreground"}>{d.label}</span>
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {d.uploaded ? formatDate(d.uploadedAt) : "Pending"}
                </span>
              </li>
            ))}
          </ul>
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
