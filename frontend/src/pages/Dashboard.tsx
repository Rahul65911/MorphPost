import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PenLine,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { WorkflowSummary, DashboardStats } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [styleProfile, setStyleProfile] = useState<{ tone: string; emoji: string } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch individually to avoid one failure breaking both
        let workflowsData: WorkflowSummary[] = [];
        let statsData: DashboardStats | null = null;

        try {
          workflowsData = await api.getWorkflows(0, 5);
        } catch (e) {
          console.error("Failed to fetch workflows", e);
        }

        try {
          statsData = await api.getDashboardStats();
        } catch (e) {
          console.error("Failed to fetch stats", e);
        }

        setWorkflows(workflowsData || []);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    const storedStyle = localStorage.getItem("manual_style_preferences");
    if (storedStyle) {
      try {
        const parsed = JSON.parse(storedStyle);
        setStyleProfile({
          tone: parsed.tone > 60 ? "Formal & Professional" : parsed.tone < 40 ? "Casual & Friendly" : "Balanced",
          emoji: parsed.emojiUsage > 60 ? "Heavy emoji use" : parsed.emojiUsage < 30 ? "Minimal emoji use" : "Moderate emoji use"
        });
      } catch (e) {
        console.log("Error parsing style", e);
      }
    }

    fetchDashboardData();
  }, []);

  const statsConfig = [
    { label: "Posts Created", value: stats?.total_posts.toString() || "-", trend: "Total", icon: PenLine, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Published", value: stats?.published_posts.toString() || "-", trend: "Live", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Active Drafts", value: stats?.active_drafts.toString() || "-", trend: "In Progress", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Time Saved", value: stats ? `${stats.time_saved_hours}h` : "-", trend: "Est.", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <AppLayout>
      <div className="p-2 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Welcome back! Here's your creative overview.
            </p>
          </div>
          <Link to="/create">
            <Button variant="cosmic" size="lg" className="rounded-2xl px-8">
              <PenLine className="h-5 w-5 mr-2" />
              Create New Post
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsConfig.map((stat, index) => (
            <div
              key={stat.label}
              className={`glass-card rounded-2xl p-6 relative overflow-hidden group animate-fade-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold text-foreground tracking-tight">{loading ? "..." : stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-xl transition-colors", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-background/50 font-normal">
                  {stat.trend}
                </Badge>
              </div>
              {/* Decor - Glow on hover */}
              <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-white/10 blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <h2 className="text-xl font-semibold text-foreground">Start Creating</h2>

            <div className="space-y-4">
              <Link to="/create" className="block group">
                <div className="glass-card rounded-2xl p-5 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden">
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <PenLine className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        Quick Post
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Turn a rough idea into content
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                </div>
              </Link>

              <Link to="/create?mode=structured" className="block group">
                <div className="glass-card rounded-2xl p-5 hover:border-accent/50 transition-all cursor-pointer relative overflow-hidden">
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 group-hover:bg-accent/30 transition-colors">
                      <FileText className="h-7 w-7 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-foreground group-hover:text-accent-foreground transition-colors">
                        Structured Post
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Use a detailed template
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Style Profile Widget */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden mt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Your Style</h3>
                  <p className="text-xs text-muted-foreground">AI Personalization</p>
                </div>
              </div>

              <div className="bg-background/40 rounded-xl p-4 mb-4 border border-white/5">
                {styleProfile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tone</span>
                      <span className="font-medium">{styleProfile.tone}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Emoji</span>
                      <span className="font-medium">{styleProfile.emoji}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No style profile set yet.</p>
                )}
              </div>

              <Link to="/style-setup">
                <Button variant={styleProfile ? "outline" : "default"} className="w-full">
                  {styleProfile ? "Refine Style" : "Setup Style"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="lg:col-span-2 space-y-6 animate-fade-up" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="hover:bg-white/5">
                  View History
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden min-h-[400px] border-white/10">
              {loading ? (
                <div className="flex h-full items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                    <PenLine className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Ready to start your journey? Create your first post and watch the AI magic happen.
                  </p>
                  <Link to="/create">
                    <Button variant="cosmic">Create First Post</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {workflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      to={`/review/${workflow.id}`}
                      className="block p-5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-5">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-semibold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                              {workflow.title || `Untitled Post ${workflow.id.slice(0, 4)}`}
                            </p>
                            <StatusBadge status={workflow.status} />
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 bg-background/30 rounded-full px-3 py-1 border border-white/5">
                              {workflow.platforms.map((platform) => (
                                <PlatformIcon key={platform} platform={platform} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, React.ReactNode> = {
    linkedin: (
      <svg role="img" viewBox="0 0 24 24" className="h-4 w-4 fill-[#0A66C2]">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
    twitter: (
      <svg role="img" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-foreground">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    ),
    x: (
      <svg role="img" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-foreground">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    ),

  };
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded bg-secondary">
      {icons[platform.toLowerCase()] || <FileText className="h-4 w-4" />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  // Map backend statuses to UI visual states
  const config: Record<string, { variant: "success" | "warning" | "destructive" | "secondary"; icon: React.ReactNode }> = {
    completed: { variant: "success", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    published: { variant: "success", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> }, // Future proof
    in_progress: { variant: "warning", icon: <Clock3 className="h-3 w-3 mr-1" /> },
    created: { variant: "secondary", icon: <Clock3 className="h-3 w-3 mr-1" /> },
    awaiting_review: { variant: "warning", icon: <Clock3 className="h-3 w-3 mr-1" /> },
    cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
  };

  const { variant, icon } = config[status.toLowerCase()] || { variant: "secondary", icon: <Clock3 className="h-3 w-3 mr-1" /> };

  // Custom label overrides
  const labels: Record<string, string> = {
    in_progress: "Awaiting Human",
    awaiting_review: "Awaiting Human"
  };

  return (
    <Badge variant={variant} className="capitalize">
      {icon}
      {labels[status.toLowerCase()] || status.replace("_", " ")}
    </Badge>
  );
}
