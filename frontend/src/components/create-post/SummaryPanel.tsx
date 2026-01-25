import { FileText, Layout, Globe, Linkedin, Twitter, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryPanelProps {
  mode: "idea" | "template";
  resourceCount: number;
  selectedPlatforms: string[];
  hasContent: boolean;
}

export function SummaryPanel({
  mode,
  resourceCount,
  selectedPlatforms,
  hasContent,
}: SummaryPanelProps) {
  const getPlatformIcon = (id: string) => {
    switch (id) {
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
      case "twitter":
        return <Twitter className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-foreground">How your post will be created</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Source</span>
          <span className="text-sm font-medium text-foreground">
            {mode === "idea" ? (hasContent ? "Manual post / Idea" : "Not provided") : "Structured template"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Template</span>
          <span className="text-sm font-medium text-foreground">
            {mode === "template" ? "Used" : "Not used"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">References attached</span>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{resourceCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Platforms</span>
          <div className="flex items-center gap-1.5">
            {selectedPlatforms.length > 0 ? (
              selectedPlatforms.map((id) => (
                <div
                  key={id}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary"
                >
                  {getPlatformIcon(id)}
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          selectedPlatforms.length > 0 && (mode === "template" || hasContent)
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Layout className="h-4 w-4" />
        <span className="text-sm font-medium">
          {selectedPlatforms.length > 0 && (mode === "template" || hasContent)
            ? "Ready to generate"
            : "Complete the form to continue"}
        </span>
      </div>
    </div>
  );
}
