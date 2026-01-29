import { useState, useEffect } from "react";
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
  ArrowRight,
  Sparkles,
  RotateCcw,
  Save,
  Download,
  Trash2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { Platform, Mode, ResourceInput, PostTemplate } from "@/types";

const platforms = [
  {
    id: "linkedin" as Platform,
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-[#0A66C2]",
    hint: "3,000 characters • Professional tone recommended",
  },
  {
    id: "x" as Platform,
    name: "X (Twitter)",
    icon: Twitter,
    color: "text-foreground",
    hint: "280 characters per post • Concise & punchy",
  },
];

export default function CreatePost() {
  useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Mode selection
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

  // Template Management State
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);

  // Shared state
  const [resources, setResources] = useState<Resource[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin"]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates", error);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setGoalOfPost(template.goal);
      setTargetAudience(template.audience);
      setKeyMessage(template.key_message);
      setDesiredTone(template.tone || "");
      setCallToAction(template.call_to_action || "");
      setKeywords(template.keywords ? template.keywords.join(", ") : "");
      setConstraints(template.constraints || "");

      toast({
        title: "Template Loaded",
        description: `Loaded "${template.name}"`,
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    if (!goalOfPost || !targetAudience || !keyMessage) {
      toast({
        title: "Missing Fields",
        description: "Goal, Audience, and Key Message are required to save a template.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.createTemplate({
        name: newTemplateName,
        goal: goalOfPost,
        audience: targetAudience,
        key_message: keyMessage,
        tone: desiredTone || undefined,
        keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(k => k) : [],
        constraints: constraints || undefined,
        call_to_action: callToAction || undefined,
      });

      toast({
        title: "Template Saved",
        description: `Saved "${newTemplateName}" to your library.`,
      });

      setIsSaveTemplateOpen(false);
      setNewTemplateName("");
      fetchTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await api.deleteTemplate(id);
      fetchTemplates();
      if (selectedTemplateId === id) setSelectedTemplateId("");
      toast({ title: "Template deleted" });
    } catch (error) {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

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
    setSelectedTemplateId("");
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
            improve_clarity: !keepWording && !matchStyle,
            rewrite_to_match_style: matchStyle,
            adapt_for_platforms: true,
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

              {/* Template Loader */}
              <div className="bg-secondary/30 rounded-xl p-4 flex items-center gap-4">
                <Download className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Load a saved template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value="none" disabled>No templates saved yet</SelectItem>
                      ) : (
                        templates.map(t => (
                          <div key={t.id} className="flex items-center justify-between w-full hover:bg-muted/50 rounded-sm">
                            <SelectItem value={t.id} className="flex-1 cursor-pointer">
                              {t.name}
                            </SelectItem>
                            <button
                              onClick={(e) => handleDeleteTemplate(e, t.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded mr-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Template Details</h3>
                  <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Save className="h-4 w-4" />
                        Save as Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Template</DialogTitle>
                        <DialogDescription>
                          Give your template a name to easily load these settings next time.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="templateName">Template Name</Label>
                        <Input
                          id="templateName"
                          value={newTemplateName}
                          onChange={e => setNewTemplateName(e.target.value)}
                          placeholder="e.g., Weekly LinkedIn Update"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSaveTemplate}>Save Template</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-4">
                  {/* Fields for Template */}
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

                  <div className="space-y-2">
                    <Label htmlFor="constraints" className="text-sm font-medium">
                      Constraints
                    </Label>
                    <Textarea
                      id="constraints"
                      placeholder="e.g. No emojis, keep it under 100 words"
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className="min-h-[60px]"
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
