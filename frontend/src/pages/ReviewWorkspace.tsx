import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Send,
  Loader2,
  Newspaper,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { WorkflowView, PlatformStateView, ReviewAction } from "@/types";

const platformIcons = {
  linkedin: (props: any) => (
    <svg role="img" viewBox="0 0 24 24" className="h-4 w-4 fill-[#0A66C2]" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  ),
  x: (props: any) => (
    <svg role="img" viewBox="0 0 16 16" className="h-4 w-4 fill-foreground" {...props}>
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
    </svg>
  ),

};

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  generating: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  evaluating: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  awaiting_review: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  accepted: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  published: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function ReviewWorkspace() {
  useRequireAuth();
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [workflow, setWorkflow] = useState<WorkflowView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [feedbackInstructions, setFeedbackInstructions] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // Schedule/Publish state
  // Helper current time
  const now = new Date();
  const defaultTime = `${String(now.getHours() + 1).padStart(2, '0')}:00`;

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState(defaultTime);

  // Poll workflow status
  useEffect(() => {
    if (!workflowId) {
      navigate("/create");
      return;
    }

    let isMounted = true;

    const fetchWorkflow = async () => {
      try {
        const data = await api.getWorkflow(workflowId);
        if (isMounted) {
          setWorkflow(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Error",
            description: api.getErrorMessage(error),
            variant: "destructive",
          });
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchWorkflow();
  }, [workflowId, navigate, toast]);

  const handleReviewAction = async (
    platform: string,
    action: ReviewAction,
    content?: string,
    feedback?: string
  ) => {
    if (!workflowId) return;

    setSubmittingAction(platform);

    try {
      const response = await api.submitReviewAction({
        workflow_id: workflowId,
        platform,
        action,
        edited_content: content,
        feedback_instructions: feedback
      });

      toast({
        title: "Action submitted",
        description: `${action} action applied to ${platform}`,
      });

      // Refresh workflow
      const data = await api.getWorkflow(workflowId);

      // If response included a new draft, ensure local state is updated immediately
      if (response && response.draft && data) {
        const updatedPlatforms = data.platforms.map((p: any) => {
          if (p.platform === platform && response.draft) {
            return {
              ...p,
              status: "awaiting_review",
              active_draft: {
                id: response.draft.id,
                content: response.draft.content,
                platform: response.draft.platform,
                source: response.draft.source,
                created_at: response.draft.created_at,
                is_active: true
              }
            };
          }
          return p;
        });
        setWorkflow({ ...data, platforms: updatedPlatforms });
      } else {
        setWorkflow(data);
      }

      setEditedContent((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });

      // Check for terminal status to redirect
      const terminalStatuses = ["completed", "published", "cancelled", "rejected"];
      if (terminalStatuses.includes(data.status)) {
        toast({
          title: "Workflow Complete",
          description: "All items processed. moving to history...",
        });
        setTimeout(() => navigate("/history"), 1500);
      }

      // If action was accept, open schedule/publish modal
      if (action === "accept") {
        setSelectedPlatform(platform);
        setScheduledDate(new Date()); // Default to Today
        setScheduleModalOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: api.getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleConfirmPublish = async () => {
    if (!workflowId || !selectedPlatform) return;

    let finalPublishDate: Date | undefined;

    if (scheduledDate) {
      finalPublishDate = new Date(scheduledDate);
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      finalPublishDate.setHours(hours, minutes);

      // Validate future time
      if (finalPublishDate < new Date()) {
        toast({
          title: "Invalid time",
          description: "Please select a future date and time.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await api.publishOrSchedule({
        workflow_id: workflowId,
        platform: selectedPlatform,
        publish_at: finalPublishDate ? finalPublishDate.toISOString() : undefined,
        timezone: "Asia/Kolkata",
      });

      toast({
        title: finalPublishDate ? "Scheduled!" : "Published!",
        description: `Content ${finalPublishDate ? "scheduled" : "published"} for ${selectedPlatform}`,
      });

      setScheduleModalOpen(false);
      setScheduledDate(undefined);
      setScheduledTime("12:00");
      setSelectedPlatform(null);

      // Refresh workflow
      const data = await api.getWorkflow(workflowId);
      setWorkflow(data);

      const terminalStatuses = ["completed", "published", "cancelled", "rejected"];
      if (terminalStatuses.includes(data.status)) {
        toast({
          title: "Success! Redirecting...",
          description: "Moving this post to your history.",
        });

        // Navigate to history after a short delay
        setTimeout(() => {
          navigate("/history");
        }, 1500);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: api.getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handlePublishClick = (platform: string) => {
    setSelectedPlatform(platform);
    setScheduledDate(new Date()); // Default to Today
    setScheduleModalOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading workflow...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!workflow) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-lg text-foreground">Workflow not found</p>
            <Button onClick={() => navigate("/create")}>Create New Post</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Workspace</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve AI-generated content for each platform
            </p>
          </div>
          <Badge className={statusColors[workflow.status as keyof typeof statusColors] || ""}>
            {workflow.status}
          </Badge>
        </div>

        {/* Platform Tabs */}
        <Tabs defaultValue={workflow.platforms[0]?.platform} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {workflow.platforms.map((platformState) => {
              const Icon = platformIcons[platformState.platform as keyof typeof platformIcons];
              return (
                <TabsTrigger key={platformState.platform} value={platformState.platform}>
                  {Icon && <Icon className="h-4 w-4 mr-2" />}
                  {platformState.platform.toUpperCase()}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {workflow.platforms.map((platformState: PlatformStateView) => (
            <TabsContent
              key={platformState.platform}
              value={platformState.platform}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Platform Status</h3>
                  <Badge className={statusColors[platformState.status as keyof typeof statusColors] || ""}>
                    {platformState.status}
                  </Badge>
                </div>

                {/* Active Draft */}
                {platformState.active_draft && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Generated Content (Editable)</Label>
                      <Textarea
                        className="min-h-[200px] font-sans text-base leading-relaxed"
                        value={editedContent[platformState.platform] ?? platformState.active_draft.content}
                        onChange={(e) =>
                          setEditedContent((prev) => ({
                            ...prev,
                            [platformState.platform]: e.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {(editedContent[platformState.platform] ?? platformState.active_draft.content).length} characters •{" "}
                        Source: {platformState.active_draft.source}
                      </p>
                    </div>

                    {/* Evaluations */}
                    {platformState.evaluations.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">AI Evaluation</Label>
                        <div className="space-y-2">
                          {platformState.evaluations.map((evaluation) => (
                            <div
                              key={evaluation.id}
                              className="bg-muted/30 rounded-lg p-3 flex items-start gap-3"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">Score: {evaluation.score}/100</span>
                                  {evaluation.passed ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    Iteration {evaluation.iteration}
                                  </span>
                                </div>
                                {evaluation.feedback && (
                                  <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Actions */}
                    {(platformState.status === "awaiting_review") && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Feedback Input */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Refinement Instructions</Label>
                          <Textarea
                            placeholder="E.g., 'Make it punchier', 'Add more emojis', 'Focus on value prop'..."
                            value={feedbackInstructions[platformState.platform] || ""}
                            onChange={(e) =>
                              setFeedbackInstructions(prev => ({
                                ...prev,
                                [platformState.platform]: e.target.value
                              }))
                            }
                            className="h-20"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="default"
                            onClick={() => handleReviewAction(platformState.platform, "accept")}
                            disabled={submittingAction === platformState.platform}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Accept (Original)
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => handleReviewAction(platformState.platform, "reject")}
                            disabled={submittingAction === platformState.platform}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() =>
                              handleReviewAction(
                                platformState.platform,
                                "edit_and_refine",
                                editedContent[platformState.platform] ?? platformState.active_draft.content,
                                feedbackInstructions[platformState.platform]
                              )
                            }
                            disabled={
                              submittingAction === platformState.platform
                            }
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Refine with AI
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() =>
                              handleReviewAction(
                                platformState.platform,
                                "edit_and_publish",
                                editedContent[platformState.platform] ?? platformState.active_draft.content
                              )
                            }
                            disabled={
                              submittingAction === platformState.platform
                            }
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Save & Approve
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Publish Button for Accepted Content */}
                    {platformState.status === "accepted" && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="gradient"
                          size="lg"
                          className="w-full"
                          onClick={() => handlePublishClick(platformState.platform)}
                        >
                          <Send className="h-5 w-5 mr-2" />
                          Publish or Schedule
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* No Draft Yet */}
                {!platformState.active_draft && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Generating content for {platformState.platform}...</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Schedule/Publish Modal */}
        <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Publish Content</DialogTitle>
              <DialogDescription>
                Choose when to publish this content to {selectedPlatform}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-col space-y-2">
                <div className="rounded-md border p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Publish Immediately
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Post to {selectedPlatform} right now
                    </p>
                  </div>
                  <Button
                    variant={!scheduledDate ? "default" : "outline"}
                    onClick={() => setScheduledDate(undefined)}
                    size="sm"
                  >
                    Select
                  </Button>
                </div>

                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium leading-none">
                        Schedule for Later
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Pick a date and time
                      </p>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${!scheduledDate && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Time Picker */}
                  {scheduledDate && (
                    <div className="space-y-2 mt-2">
                      <Label className="text-xs text-muted-foreground">Select Time</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPublish} disabled={!selectedPlatform}>
                {scheduledDate ? "Schedule" : "Publish Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
