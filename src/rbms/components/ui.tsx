import * as Dialog from "@radix-ui/react-dialog";
import * as HoverCard from "@radix-ui/react-hover-card";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, X, LayoutDashboard, MapPin, Building2, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useRbms } from "@/rbms/context/RbmsContext";

/* ------------------------------- surfaces ------------------------------- */

function GlobalFilters() {
  const { districts, districtId, setDistrictId } = useRbms();
  
  return (
    <>
      <label className="relative flex cursor-pointer items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 transition-colors hover:bg-emerald-500/15">
        <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          className="appearance-none bg-transparent pr-4 text-[13px] font-medium text-emerald-950 dark:text-emerald-50 focus:outline-none"
        >
          {districts.map((d) => (
            <option key={d.id} value={d.id} className="bg-panel text-foreground">
              {d.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-emerald-600/70 dark:text-emerald-400/70" />
      </label>
    </>
  );
}

export function Panel({
  children,
  className,
  title,
  subtitle,
  action,
  bodyClassName,
}: {
  children?: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
}) {
  const { design } = useTheme();
  
  if (design === "classic") {
    return (
      <section className={cn("rounded-lg border border-border bg-panel", className)}>
        {(title || action) && (
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              {title && <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </header>
        )}
        <div className={cn("p-4", bodyClassName)}>{children}</div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-3xl border border-emerald-500/15 bg-card/60 shadow-sm", className)}>
      {(title || action) && (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-5 py-4 border-b border-border/50">
          <div>
            {subtitle && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{subtitle}</p>}
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { design } = useTheme();

  if (design === "classic") {
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <GlobalFilters />
          {actions && <div className="ml-2 flex items-center gap-2 border-l border-border pl-4">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-card to-violet-500/5 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            {subtitle && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                {subtitle}
              </p>
            )}
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GlobalFilters />
          {actions && <div className="ml-2 flex flex-wrap items-center gap-2 border-l border-border/50 pl-4">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- controls ------------------------------- */

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger" | "warning";
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-[11.5px]" : "h-8 px-3 text-[12.5px]",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border border-border bg-panel-2 text-foreground hover:bg-accent",
        variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:opacity-90",
        variant === "warning" && "bg-warning text-warning-foreground hover:opacity-90",
        className,
      )}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-panel-2 px-2.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Select({
  label,
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      {label && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      <select
        {...props}
        className={cn(
          "h-8 rounded-md border border-border bg-panel-2 px-2 text-[12.5px] text-foreground focus:border-primary focus:outline-none",
          className,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------- status -------------------------------- */

export type Tone = "green" | "amber" | "red" | "blue" | "neutral";

const toneClass: Record<Tone, string> = {
  green: "border-primary/30 bg-primary/12 text-primary",
  amber: "border-warning/30 bg-warning/12 text-warning",
  red: "border-destructive/30 bg-destructive/12 text-destructive",
  blue: "border-info/30 bg-info/12 text-info",
  neutral: "border-border bg-panel-2 text-muted-foreground",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

export function toneForStatus(status: string): Tone {
  switch (status) {
    case "ACTIVE":
    case "VERIFIED":
    case "COMPLETED":
      return "green";
    case "PENDING":
      return "amber";
    case "REJECTED":
    case "INACTIVE":
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "amber";
    case "LOW":
      return "blue";
    default:
      return "neutral";
  }
}

export function toneForProgress(pct: number): Tone {
  if (pct >= 80) return "green";
  if (pct >= 60) return "amber";
  return "red";
}

/* ------------------------------- progress ------------------------------- */

export function ProgressBar({
  value,
  tone,
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const t = tone ?? toneForProgress(value);
  const bar =
    t === "green" ? "bg-primary" : t === "amber" ? "bg-warning" : t === "blue" ? "bg-info" : "bg-destructive";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-accent", className)}>
      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${Math.max(value, 2)}%` }} />
    </div>
  );
}

export function ProgressRow({ label, value, completed, total }: { label: string; value: number; completed?: number; total?: number }) {
  const content = (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="tnum text-[13px] font-semibold text-foreground">{value}%</span>
      </div>
      <ProgressBar className="mt-1.5" value={value} />
    </div>
  );

  if (completed !== undefined && total !== undefined) {
    return (
      <HoverCard.Root openDelay={100} closeDelay={100}>
        <HoverCard.Trigger asChild>
          <div className="cursor-help">{content}</div>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content
            side="top"
            align="center"
            sideOffset={6}
            className="z-50 rounded-md border border-border bg-popover px-3 py-2 text-[12px] shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground tnum">{completed.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">of</span>
              <span className="font-semibold text-foreground tnum">{total.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">completed</span>
            </div>
            <HoverCard.Arrow className="fill-popover border-t border-l border-border" />
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    );
  }

  return content;
}

export function InlineProgress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <ProgressBar className="w-16" value={value} />
      <span className="tnum text-[12px] text-foreground">{value}%</span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  context,
  tone,
  to,
}: {
  label: string;
  value: ReactNode;
  context?: string;
  tone?: Tone;
  to?: string;
}) {
  const { design } = useTheme();

  const body = design === "classic" ? (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 transition-colors hover:border-primary/40">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tnum mt-1.5 text-[26px] font-semibold leading-none",
          tone === "red" && "text-destructive",
          tone === "amber" && "text-warning",
          tone === "green" && "text-primary",
        )}
      >
        {value}
      </p>
      {context && <p className="mt-1.5 text-[11px] text-muted-foreground">{context}</p>}
    </div>
  ) : (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/90 to-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:from-emerald-950/25">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tnum mt-1.5 text-[26px] font-bold leading-none md:text-3xl",
          tone === "red" && "text-destructive",
          tone === "amber" && "text-warning",
          tone === "green" && "text-primary",
        )}
      >
        {value}
      </p>
      {context && <p className="mt-1.5 text-xs text-muted-foreground">{context}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/* -------------------------------- states -------------------------------- */

export function EmptyState({ message, hint }: { message: string; hint?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-[13px] text-muted-foreground">{message}</p>
      {hint && <p className="text-[11.5px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: (() => void) | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-[13px] text-destructive">
        {error instanceof Error ? error.message : "Something went wrong."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ breadcrumbs ----------------------------- */

export interface Crumb {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[11.5px] text-muted-foreground">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
          {c.to ? (
            <Link to={c.to} params={c.params as never} className="hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* --------------------------------- tabs --------------------------------- */

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium transition-colors",
            value === t.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- drawer -------------------------------- */

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-panel shadow-2xl",
            width,
          )}
        >
          <div className="flex items-start justify-between border-b border-border px-4 py-3">
            <div>
              <Dialog.Title className="text-[15px] font-semibold text-foreground">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="rbms-scroll flex-1 overflow-y-auto p-4">{children}</div>
          {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-panel shadow-2xl",
            width,
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <Dialog.Title className="text-[15px] font-semibold text-foreground">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="mt-0.5 text-[11.5px] text-muted-foreground">
                {description}
              </Dialog.Description>
            )}
          </div>

          <div className="px-4 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------ misc format ----------------------------- */

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
