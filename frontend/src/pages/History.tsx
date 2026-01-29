import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Newspaper,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { WorkflowSummary, DashboardStats } from "@/types";
import { Link } from "react-router-dom";

const platformConfig: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  linkedin: {
    name: "LinkedIn",
    icon: () => (
      <svg role="img" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#0A66C2]">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
    color: "",
    bgColor: "bg-[#0A66C2]/10",
  },
  twitter: {
    name: "Twitter",
    icon: () => (
      <svg role="img" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-foreground">
        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
      </svg>
    ),
    color: "",
    bgColor: "bg-foreground/10",
  },
  x: {
    name: "X",
    icon: () => (
      <svg role="img" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-foreground">
        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
      </svg>
    ),
    color: "",
    bgColor: "bg-foreground/10",
  },
};

export default function History() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [workflowsData, statsData] = await Promise.all([
          api.getWorkflows(0, 50),
          api.getDashboardStats(),
        ]);
        setWorkflows(workflowsData);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = workflows.filter((item) => {
    // Basic search on ID for now since topic is missing
    const topic = item.title || `Untitled Post (${item.id.slice(0, 8)})`;
    const matchesSearch = topic.toLowerCase().includes(search.toLowerCase());

    // Status filter mapping: Backend uses 'created', 'in_progress', etc.
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    const matchesPlatform = platformFilter === "all" || item.platforms.includes(platformFilter);
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your past content creations.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed/Published</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="x">X</SelectItem>

              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.published_posts ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.active_drafts ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {/* Rejected count is not in stats, manually calculating only for loaded ones or we could add it to stats endpoint. 
                      For now let's just use the filtered list's rejected count or 0 to avoid discrepancies if we don't fetch all.
                       actually stats endpoint doesn't have rejected. Let's keep using client side for rejected or add it. 
                      Calculating from limit 50 is okay for rejected usually. */}
                  {workflows.filter((w) => w.status === "rejected" || w.status === "cancelled").length}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="glass rounded-2xl overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="flex h-full items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No posts found matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link to={`/review/${item.id}`} className="hover:underline">
                          <h3 className="font-semibold text-foreground truncate">
                            {item.title || `Untitled Post (${item.id.slice(0, 8)}...)`}
                          </h3>
                        </Link>
                        <StatusBadge status={item.status} />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {item.platforms.map((platform) => {
                            const config = platformConfig[platform.toLowerCase()] || platformConfig.linkedin; // Default to linkedin or handle unknown
                            return (
                              <div
                                key={platform}
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded",
                                  config.bgColor
                                )}
                                title={config.name}
                              >
                                <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                              </div>
                            );
                          })}
                        </div>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "warning" | "destructive" | "secondary"; icon: any }> = {
    completed: { variant: "success", icon: CheckCircle2 },
    published: { variant: "success", icon: CheckCircle2 },
    created: { variant: "secondary", icon: Clock },
    in_progress: { variant: "warning", icon: Clock },
    awaiting_review: { variant: "warning", icon: Clock },
    rejected: { variant: "destructive", icon: XCircle },
    cancelled: { variant: "destructive", icon: XCircle },
  };

  const { variant, icon: Icon } = config[status.toLowerCase()] || { variant: "secondary", icon: Clock };

  // Custom label overrides
  const labels: Record<string, string> = {
    in_progress: "Awaiting Human",
    awaiting_review: "Awaiting Human"
  };

  return (
    <Badge variant={variant} className="capitalize">
      <Icon className={cn("h-3 w-3 mr-1")} />
      {labels[status.toLowerCase()] || status.replace("_", " ")}
    </Badge>
  );
}
