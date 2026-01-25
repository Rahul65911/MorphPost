import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  PenLine,
  Zap,
  Settings,
  History,
  LayoutDashboard,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Post", href: "/create", icon: PenLine },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed, setCollapsed }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogoClick = () => {
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "fixed left-4 top-4 bottom-4 z-40 rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 ease-spring",
        "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50", // Glass effect
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col py-4">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 mb-8">
          {!collapsed && (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg group-hover:shadow-primary/50 transition-all duration-500">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                MorphPost
              </span>
            </button>
          )}
          {collapsed && (
            <button
              onClick={handleLogoClick}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg hover:shadow-primary/50 transition-all duration-500"
            >
              <Zap className="h-5 w-5 text-white" />
            </button>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {/* Active Background with Gradient */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-100 -z-10" />
                )}

                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "text-white")} />

                {!collapsed && (
                  <span className={cn("translate-x-0 opacity-100 transition-all duration-300", collapsed && "translate-x-4 opacity-0")}>
                    {item.name}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-border/50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Simple Toggle for Sidebar when collapsed (if we didn't show it at top) */}
        {collapsed && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}


        {/* User section */}
        <div className="px-3">
          <button
            onClick={handleLogout}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
