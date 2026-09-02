import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, LayoutDashboard, ScrollText, Users, UsersRound, MapPin, ChevronDown } from "lucide-react";
import { RbmsProvider, useRbms } from "@/rbms/context/RbmsContext";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_rbms")({
  component: RbmsLayout,
});

const NAV = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Operations",
    items: [
      { to: "/fpcs", label: "FPCs", icon: Building2 },
      { to: "/agents", label: "Agents", icon: Users },
      { to: "/shgs", label: "SHGs", icon: UsersRound },
    ],
  },
  {
    group: "Insights",
    items: [{ to: "/activity-logs", label: "Activity Logs", icon: ScrollText }],
  },
];

const TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/$/, title: "Dashboard" },
  { match: /^\/fpcs\/[^/]+/, title: "FPC Detail" },
  { match: /^\/fpcs/, title: "FPCs" },
  { match: /^\/agents\/[^/]+/, title: "Agent Detail" },
  { match: /^\/agents/, title: "Agents" },
  { match: /^\/shgs\/[^/]+\/farmers\//, title: "Farmer Detail" },
  { match: /^\/shgs\/[^/]+/, title: "SHG Detail" },
  { match: /^\/shgs/, title: "SHGs" },
  { match: /^\/activity-logs/, title: "Activity Logs" },
];

function RbmsLayout() {
  return (
    <RbmsProvider>
      <Shell />
    </RbmsProvider>
  );
}

function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES.find((t) => t.match.test(pathname))?.title ?? "RBMS";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[60px] flex-col border-r border-sidebar-border bg-sidebar lg:w-[212px]">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-[13px] font-bold text-primary-foreground">
            D
          </span>
          <span className="hidden text-[13.5px] font-semibold tracking-tight lg:block">Digi Krishi</span>
        </div>
        <nav className="rbms-scroll flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="mb-1 hidden px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:block">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      title={item.label}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:text-primary"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="hidden lg:block">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border px-3 py-2.5 text-[10.5px] text-muted-foreground lg:block">
          RBMS · Field Operations
        </div>
      </aside>

      <div className="pl-[60px] lg:pl-[212px]">
        <Header title={title} />
        <main className="mx-auto max-w-[1500px] space-y-4 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  const { districts, districtId, setDistrictId, workspace, currentUser } = useRbms();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
      <h1 className="text-[14.5px] font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 xl:flex">
          <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[13px] font-medium text-emerald-950 dark:text-emerald-50">{workspace}</span>
          <ChevronDown className="h-3.5 w-3.5 text-emerald-600/70 dark:text-emerald-400/70" />
        </div>

        {/* Exceptions notification bell hidden for now */}

        <div className="flex items-center gap-2 rounded-md border border-border bg-panel-2 py-1 pl-1 pr-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            GY
          </span>
          <span className="hidden text-[11.5px] text-muted-foreground lg:block">{currentUser.email}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
