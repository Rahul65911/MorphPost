import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CreationModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  accentColor?: "primary" | "accent";
}

export function CreationModeCard({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  accentColor = "primary",
}: CreationModeCardProps) {
  const colorClasses = {
    primary: {
      border: "border-primary",
      bg: "bg-primary/5",
      iconBg: "bg-primary/20",
      iconText: "text-primary",
      titleText: "text-primary",
    },
    accent: {
      border: "border-accent",
      bg: "bg-accent/5",
      iconBg: "bg-accent/20",
      iconText: "text-accent",
      titleText: "text-accent",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all text-center",
        selected
          ? `${colors.border} ${colors.bg}`
          : "border-border hover:border-muted-foreground/50"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl",
          selected ? colors.iconBg : "bg-secondary"
        )}
      >
        <Icon
          className={cn(
            "h-7 w-7",
            selected ? colors.iconText : "text-muted-foreground"
          )}
        />
      </div>
      <div>
        <p
          className={cn(
            "font-semibold text-lg",
            selected ? colors.titleText : "text-foreground"
          )}
        >
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
          selected ? colors.border : "border-muted-foreground"
        )}
      >
        {selected && (
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              accentColor === "primary" ? "bg-primary" : "bg-accent"
            )}
          />
        )}
      </div>
    </button>
  );
}
