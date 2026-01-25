import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-mesh text-foreground">
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Top Bar - Floating & Glassy */}
      <div
        className={cn(
          "fixed top-0 right-0 h-16 z-30 transition-all duration-300 pointer-events-none", // pointer-events-none allows clicking through if empty, but we have children
          collapsed ? "left-20" : "left-72"
        )}
      >
        <div className="flex items-center justify-between h-full px-8 pointer-events-auto">
          {/* Left side empty for now or breadcrumbs */}
          <div />
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main
        className={cn(
          "pt-20 px-8 pb-8 transition-all duration-300 min-h-screen",
          collapsed ? "pl-20" : "pl-72"
        )}
      >
        <div className="animate-fade-in max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
