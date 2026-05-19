import React from "react";
import { Link, useLocation } from "wouter";
import { Film, History, BarChart2 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Generate", icon: Film },
    { href: "/history", label: "History", icon: History },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Film className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">AI STUDIO</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden h-16 flex items-center px-6 border-b border-border bg-card justify-between">
           <div className="flex items-center gap-2 text-primary">
            <Film className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">AI STUDIO</span>
          </div>
           <nav className="flex gap-4">
              {links.map(link => {
                  const isActive = location === link.href;
                  return (
                      <Link key={link.href} href={link.href} className={`text-sm ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {link.label}
                      </Link>
                  )
              })}
           </nav>
        </div>
        <div className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
