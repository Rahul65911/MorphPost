import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Palette,
  Link as LinkIcon,
  Bell,
  User,
  Upload,
  Check,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Zap,
  MessageSquare,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type ConnectionStatus = "connected" | "expired" | "disconnected";

interface IntegrationState {
  status: ConnectionStatus;
  lastConnected?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Style settings
  const [tone, setTone] = useState([60]);
  const [emojiUsage, setEmojiUsage] = useState([30]);
  const [ctaStrength, setCtaStrength] = useState([70]);
  const [formality, setFormality] = useState([65]);

  // Integration states
  // Integration states
  const [linkedinState, setLinkedinState] = useState<IntegrationState>({
    status: "disconnected", // Default to disconnected until we have real state
  });
  const [twitterState, setTwitterState] = useState<IntegrationState>({
    status: "disconnected",
  });

  // Publishing preferences
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [defaultTone, setDefaultTone] = useState("professional");
  const [defaultCta, setDefaultCta] = useState("comment");

  const handleSave = () => {
    toast({
      title: "Settings saved!",
      description: "Your preferences have been updated.",
    });
  };

  const handleReanalyze = () => {
    navigate("/style-setup");
  };

  const handleConnect = async (platform: string) => {
    try {
      let url = "";
      if (platform === "X") {
        const res = await api.connectTwitter();
        url = res.url;
      } else if (platform === "LinkedIn") {
        const res = await api.connectLinkedIn();
        url = res.url;
      } else {
        toast({
          title: "Coming Soon",
          description: `${platform} integration is not yet available.`,
        });
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: `Could not initiate ${platform} connection.`,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = (platform: string) => {
    toast({
      title: `${platform} disconnected`,
      description: "You can reconnect anytime.",
    });
    if (platform === "LinkedIn") {
      setLinkedinState({ status: "disconnected" });
    } else if (platform === "X") {
      setTwitterState({ status: "disconnected" });
    }
  };

  const handleReconnect = (platform: string) => {
    // Reuses connect logic
    handleConnect(platform);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your style preferences, integrations, and publishing options.
          </p>
        </div>

        <Tabs defaultValue="style" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="style" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Style
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Style Settings */}
          <TabsContent value="style" className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Writing Style Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    Analyzed from your connected accounts.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReanalyze}>
                  <Upload className="h-4 w-4 mr-2" />
                  Re-analyze
                </Button>
              </div>

              {/* Visual Style Cards (Similar to StyleSetup) */}
              <div className="grid md:grid-cols-2 gap-4">
                <StyleCard
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="Tone"
                  value={tone[0] > 60 ? "Formal" : tone[0] < 40 ? "Casual" : "Balanced"}
                  description="General formality level"
                />
                <StyleCard
                  icon={<Zap className="h-5 w-5" />}
                  title="Formality"
                  value={`${formality[0]}%`}
                  description="Professional adherence"
                />
                <StyleCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Visual Flair"
                  value={emojiUsage[0] > 60 ? "Heavy" : emojiUsage[0] < 30 ? "Minimal" : "Moderate"}
                  description="Emoji usage preference"
                />
                <StyleCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Call to Action"
                  value={ctaStrength[0] > 60 ? "Strong" : "Subtle"}
                  description="Engagement driver intensity"
                />
              </div>


              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <Badge variant="secondary">Active Profile</Badge>
                <span className="text-sm text-muted-foreground">
                  Your style profile is automatically updated based on your content.
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Platform Connections</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage external platform connections and fix expired authorizations.
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Reconnect is only used for external permissions (OAuth).
                        Never use it for regeneration, retries, or workflow restarts.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-4">
                <IntegrationCard
                  name="LinkedIn"
                  icon={
                    <svg role="img" viewBox="0 0 24 24" className="h-5 w-5 fill-[#0A66C2]">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" />
                    </svg>
                  }
                  description="Publish posts to your LinkedIn profile"
                  state={linkedinState}
                  onConnect={() => handleConnect("LinkedIn")}
                  onDisconnect={() => handleDisconnect("LinkedIn")}
                  onReconnect={() => handleReconnect("LinkedIn")}
                />

                <IntegrationCard
                  name="X (Twitter)"
                  icon={
                    <svg role="img" viewBox="0 0 16 16" className="h-5 w-5 fill-foreground">
                      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
                    </svg>
                  }
                  description="Post tweets and threads to X"
                  state={twitterState}
                  onConnect={() => handleConnect("X")}
                  onDisconnect={() => handleDisconnect("X")}
                  onReconnect={() => handleReconnect("X")}
                />
              </div>
            </div>
          </TabsContent>



          {/* Account */}
          <TabsContent value="account" className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Account Details</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account information.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    placeholder="Your name"
                    value={user?.username || ""}
                    disabled
                    title="Username cannot be changed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Username is currently read-only.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Plan & Usage</h2>
                <p className="text-sm text-muted-foreground">
                  Your current subscription details.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <Badge variant="default" className="mb-2">Pro Plan</Badge>
                  <p className="text-sm text-muted-foreground">
                    500 posts/month • Unlimited platforms
                  </p>
                </div>
                <Button variant="outline">Manage Plan</Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="gradient" onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Save Account Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function SliderField({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-24">{leftLabel}</span>
        <Slider
          value={value}
          onValueChange={onChange}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-24 text-right">{rightLabel}</span>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  icon,
  description,
  state,
  onConnect,
  onDisconnect,
  onReconnect,
}: {
  name: string;
  icon: React.ReactNode;
  description: string;
  state: IntegrationState;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}) {
  const getStatusBadge = () => {
    switch (state.status) {
      case "connected":
        return (
          <Badge variant="success" className="text-xs">
            Connected
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="warning" className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case "connected":
        return `Connected and ready to publish${state.lastConnected ? ` • Connected ${state.lastConnected}` : ""}`;
      case "expired":
        return "Connection expired or permissions revoked";
      default:
        return "Not connected";
    }
  };

  const getActionButton = () => {
    switch (state.status) {
      case "connected":
        return (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        );
      case "expired":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" onClick={onReconnect}>
                  Reconnect
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Reconnect will re-authorize your account and restore publishing access.
                  Your drafts and history will not be affected.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <Button variant="default" size="sm" onClick={onConnect}>
            Connect
          </Button>
        );
    }
  };

  return (
    <div
      className={cn(
        "glass rounded-xl p-4",
        state.status === "expired" && "border border-warning/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              state.status === "connected"
                ? "bg-success/10"
                : state.status === "expired"
                  ? "bg-warning/10"
                  : "bg-secondary"
            )}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{name}</p>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">{getStatusText()}</p>
          </div>
        </div>
        {getActionButton()}
      </div>
    </div>
  );
}

function StyleCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-semibold text-foreground">{value}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
