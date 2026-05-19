import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Film, History, BarChart2, Crown, LogOut } from "lucide-react";
import { usePlan } from "@/context/plan";
import { UnlockDialog } from "@/components/unlock-dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { plan, clearPlan } = usePlan();
  const [unlockOpen, setUnlockOpen] = useState(false);

  const links = [
    { href: "/", label: "Generate", icon: Film },
    { href: "/history", label: "History", icon: History },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ];

  const planLabel = plan === "admin" ? "Creator" : plan === "premium" ? "Premium" : "Free";
  const planColor = plan === "admin"
    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : plan === "premium"
    ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
    : "bg-zinc-700/40 text-zinc-400 border-zinc-600/30";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      <aside className="w-60 border-r border-border bg-card flex-col hidden md:flex">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Film className="h-5 w-5" />
            <span className="font-bold text-base tracking-tight">VirgoAI</span>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-1">
          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Plan badge + unlock */}
        <div className="p-3 border-t border-border space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium ${planColor}`}>
            <Crown className="h-3.5 w-3.5" />
            {planLabel} Plan
          </div>
          {plan === "free" ? (
            <button
              data-testid="button-upgrade"
              onClick={() => setUnlockOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20"
            >
              <Crown className="h-3.5 w-3.5" />
              Unlock Premium
            </button>
          ) : (
            <button
              data-testid="button-logout-plan"
              onClick={clearPlan}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Switch to Free
            </button>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden h-14 flex items-center px-4 border-b border-border bg-card justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Film className="h-5 w-5" />
            <span className="font-bold text-base tracking-tight">VirgoAI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded border ${planColor}`}>{planLabel}</span>
            <nav className="flex gap-3">
              {links.map((link) => {
                const isActive = location === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={`${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} />
    </div>
  );
}
