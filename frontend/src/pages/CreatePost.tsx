import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceUploader, Resource } from "@/components/create-post/ResourceUploader";
import {
  PenLine,
  FileText as TemplateIcon,
  Linkedin,
  Twitter,
  Newspaper,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { Platform, Mode, ResourceInput } from "@/types";

const platforms = [
  {
    id: "linkedin" as Platform,
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-[#0A66C2]",
    hint: "3,000 characters • Professional tone recommended",
  },
  {
    id: "x" as Platform,  // Fixed: Changed from "twitter" to "x"
    name: "X (Twitter)",
    icon: Twitter,
    color: "text-foreground",
    hint: "280 characters per post • Concise & punchy",
  },
];

export default function CreatePost() {
  useRequireAuth(); // Protect this route
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Primary mode selection - Fixed: Changed from "idea" to "manual"
  const [mode, setMode] = useState<Mode>("manual");

  // Manual mode state
  const [content, setContent] = useState("");
  const [keepWording, setKeepWording] = useState(false);
  const [improveClarity, setImproveClarity] = useState(false);
  const [matchStyle, setMatchStyle] = useState(true);

  // Template mode state
  const [goalOfPost, setGoalOfPost] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [desiredTone, setDesiredTone] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [keywords, setKeywords] = useState("");
  const [constraints, setConstraints] = useState("");

  // Shared state
  const [resources, setResources] = useState<Resource[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin"]);

  const togglePlatform = (platformId: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleReset = () => {
    setContent("");
    setKeepWording(false);
    setImproveClarity(true);
    setMatchStyle(false);
    setGoalOfPost("");
    setTargetAudience("");
    setKeyMessage("");
    setDesiredTone("");
    setCallToAction("");
    setKeywords("");
    setConstraints("");
    setResources([]);
    setUrlInput("");
    toast({
      title: "Form cleared",
      description: "All fields have been reset.",
    });
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        description: "Please select at least one platform.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "manual" && !content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter your content or idea.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "template" && !goalOfPost.trim()) {
      toast({
        title: "Goal required",
        description: "Please enter the goal of your post.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Build the request payload
      const resourceInputs: ResourceInput[] = resources.map(r => ({
        type: r.type,
        source: r.url,
        name: r.name,
      }));

      const payload = mode === "manual"
        ? {
          mode: "manual" as Mode,
          content,
          options: {
            keep_wording: keepWording,
            improve_clarity: !keepWording && !matchStyle, // Default behavior if neither is strictly selected, though UI forces one
            rewrite_to_match_style: matchStyle,
            adapt_for_platforms: true, // Defaulting to true as "Adapt" logic is core to the app now
          },
          platforms: selectedPlatforms,
          resources: resourceInputs,
        }
        : {
          mode: "template" as Mode,
          template: {
            goal: goalOfPost,
            audience: targetAudience,
            key_message: keyMessage,
            tone: desiredTone || undefined,
            call_to_action: callToAction || undefined,
            keywords: keywords ? keywords.split(",").map(k => k.trim()) : [],
            constraints: constraints || undefined,
          },
          platforms: selectedPlatforms,
          resources: resourceInputs,
        };

      const response = await api.createWorkflow(payload);

      toast({
        title: "Workflow created!",
        description: `Creating versions for ${selectedPlatforms.length} platform(s)`,
      });

      // Navigate to review workspace with workflow ID
      navigate(`/review/${response.workflow_id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: api.getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasContent = mode === "manual" ? content.trim().length > 0 : goalOfPost.trim().length > 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Post</h1>
          <p className="text-muted-foreground text-lg">
            Choose how you want to create your content.
          </p>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-3xl mx-auto">
          <Tabs
            defaultValue="manual"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Idea / Manual Post
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <TemplateIcon className="h-4 w-4" />
                Structured Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6">
              {/* Content Input */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-base font-medium">
                    Your Content or Idea
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Paste a full handwritten post&#10;OR write a rough draft&#10;OR just describe your idea&#10;&#10;AI will decide how to use it based on what you provide."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {content.length} characters
                  </p>
                </div>
              </div>

              {/* Content Handling Options */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Content Handling Strategy</h3>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all h-full",
                      keepWording ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                    )}>
                      <input
                        type="radio"
                        name="strategy"
                        className="mt-1"
                        checked={keepWording}
                        onChange={() => {
                          setKeepWording(true);
                          setMatchStyle(false);
                          setImproveClarity(false);
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Keep exact wording
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Preserve text exactly as written
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all h-full",
                      matchStyle ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                    )}>
                      <input
                        type="radio"
                        name="strategy"
                        className="mt-1"
                        checked={matchStyle}
                        onChange={() => {
                          setKeepWording(false);
                          setMatchStyle(true);
                          setImproveClarity(false);
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Rewrite to match style
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Apply your AI writing persona
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Reference Materials */}
              <ResourceUploader
                resources={resources}
                setResources={setResources}
                urlInput={urlInput}
                setUrlInput={setUrlInput}
              />
            </TabsContent>

            <TabsContent value="template" className="space-y-6">
              <div className="glass rounded-2xl p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Template Details</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal" className="text-sm font-medium">
                      Goal of the post <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="goal"
                      placeholder="e.g., Establish thought leadership in AI"
                      value={goalOfPost}
                      onChange={(e) => setGoalOfPost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience" className="text-sm font-medium">
                      Target audience
                    </Label>
                    <Input
                      id="audience"
                      placeholder="e.g., Tech founders, developers"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">
                      Key message
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="The main point you want to communicate..."
                      value={keyMessage}
                      onChange={(e) => setKeyMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tone" className="text-sm font-medium">
                        Desired tone
                      </Label>
                      <Input
                        id="tone"
                        placeholder="e.g., Professional, casual"
                        value={desiredTone}
                        onChange={(e) => setDesiredTone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cta" className="text-sm font-medium">
                        Call-to-action
                      </Label>
                      <Input
                        id="cta"
                        placeholder="e.g., Sign up, Learn more"
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords" className="text-sm font-medium">
                      Keywords
                    </Label>
                    <Input
                      id="keywords"
                      placeholder="Comma-separated keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Reference Materials */}
              <ResourceUploader
                resources={resources}
                setResources={setResources}
                urlInput={urlInput}
                setUrlInput={setUrlInput}
              />
            </TabsContent>
          </Tabs>

          {/* Platform Selection - Always Visible */}
          <div className="glass rounded-2xl p-6 space-y-4 mt-6">
            <h3 className="font-semibold text-foreground">
              Select Platforms <span className="text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <platform.icon className={cn("h-4 w-4", platform.color)} />
                    <span className="font-medium text-foreground text-sm">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="glass rounded-2xl p-5 space-y-3 mt-6">
            <Button
              size="lg"
              variant="gradient"
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !hasContent || selectedPlatforms.length === 0}
            >
              {isGenerating ? (
                <>
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  {mode === "manual" ? "Processing..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  {mode === "manual" ? "Process & Generate Posts" : "Generate Using Template"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              disabled={isGenerating}
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset Form
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
