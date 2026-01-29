import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Upload,
  Link as LinkIcon,
  X,
  Check,
  Sparkles,
  ArrowRight,
  FileUp,
  Zap,
  MessageSquare,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UploadedSource {
  id: string;
  name: string;
  type: "file" | "url";
  status: "processing" | "done" | "error";
}

export default function StyleSetup() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sources, setSources] = useState<UploadedSource[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  // Questionnaire State
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  // Categorized Deep Style Questions
  const questionCategories = [
    {
      category: "Tone & Attitude",
      questions: [
        "What predominant tone does your writing typically adopt (e.g., formal, sarcastic, empathetic, or authoritative), and how does it shift based on the audience or platform?",
      ]
    },
    {
      category: "Sentence Structure",
      questions: [
        "How do you usually structure your sentences—short and punchy, long and descriptive, or a mix for rhythm—and what influences this choice?",
      ]
    },
    {
      category: "Vocabulary & Diction",
      questions: [
        "What types of words stand out in your writing (e.g., technical jargon, everyday slang, or elevated diction), and do you notice patterns in word frequency or rarity?",
        "What is the typical diversity of your vocabulary in a given piece (e.g., do you repeat certain words or phrases, or aim for variety), and how does length impact this?",
        "How often do you use common function words like 'the,' 'and,' or 'of,' and do you think this reflects a unique pattern in your style?"
      ]
    },
    {
      category: "Literary Devices & Mechanics",
      questions: [
        "Do you incorporate elements like metaphors, humor, emojis, or repetition in your writing, and in what contexts do they appear most?",
        "What patterns do you observe in your use of punctuation (e.g., frequent dashes, ellipses, or exclamation points), and how does this affect the pacing of your text?"
      ]
    },
    {
      category: "Platform adaptations",
      questions: [
        "How would you describe your writing style specifically on X (Twitter)? (e.g., casual, threads, punchy)",
        "How would you describe your writing style specifically on LinkedIn? (e.g., professional, story-driven, authoritative)"
      ]
    },
    {
      category: "Influences & Engagement",
      questions: [
        "What personal experiences or influences (e.g., cultural background or reading habits) shape your word choices or overall voice?",
        "How do you encourage interaction in your writing, such as through questions, calls to action, or provocative statements?"
      ]
    }
  ];

  // Flatten questions for sequential navigation while keeping category context
  const questions = questionCategories.flatMap(cat =>
    cat.questions.map(q => ({ category: cat.category, text: q }))
  );

  // Steps: Questions -> Connect -> Upload -> Analyze -> Confirm
  const steps = ["Questions", "Connect", "Upload", "Analyze", "Confirm"];
  const [currentStep, setCurrentStep] = useState(0);

  // Style preferences (for manual edit)
  const [tone, setTone] = useState([50]);
  const [emojiUsage, setEmojiUsage] = useState([30]);
  const [ctaStrength, setCtaStrength] = useState([60]);
  const [formality, setFormality] = useState([70]);

  // Analyzed Profile
  const [analyzedProfile, setAnalyzedProfile] = useState<any>(null);

  // Check for return from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("twitter_connected") === "true") {
      toast({
        title: "Twitter connected!",
        description: "Your tweets will be used to analyze your style.",
      });
      // Optionally advance to next step or show connected state
      // For now, let's just clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("twitter_error")) {
      toast({
        title: "Connection failed",
        description: "Could not connect to Twitter.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("linkedin_connected") === "true") {
      toast({
        title: "LinkedIn connected!",
        description: "Your posts will be used to analyze your style.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("linkedin_error")) {
      toast({
        title: "Connection failed",
        description: "Could not connect to LinkedIn.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const tempId = Math.random().toString(36).substr(2, 9);
        const newSource: UploadedSource = {
          id: tempId,
          name: file.name,
          type: "file",
          status: "processing",
        };
        setSources((prev) => [...prev, newSource]);

        try {
          await api.uploadSource(file);
          setSources((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, status: "done" } : s))
          );
        } catch (error) {
          setSources((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, status: "error" } : s))
          );
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return;

    const tempId = Math.random().toString(36).substr(2, 9);
    const newSource: UploadedSource = {
      id: tempId,
      name: urlInput,
      type: "url",
      status: "processing",
    };
    setSources((prev) => [...prev, newSource]);
    setUrlInput("");

    try {
      await api.submitUrl(newSource.name);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "done" } : s))
      );
    } catch (error) {
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "error" } : s))
      );
      toast({
        title: "URL processing failed",
        description: "Could not process the URL.",
        variant: "destructive",
      });
    }
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAnalyze = async () => {
    // Sources are optional if they connected social media, but we can't easily check that here without complex state.
    // So we allow proceeding. If no data is in memory, backend returns "Neutral" profile.

    setIsAnalyzing(true);
    setCurrentStep(3); // Analyzing step (was 2)

    try {
      const result = await api.analyzeStyle();
      setAnalyzedProfile(result.profile);

      // Map result to sliders (simplified mapping)
      if (result.profile) {
        // This mapping would be more sophisticated in real app
        setTone([result.profile.tone === "Casual" ? 30 : 70]);
      }

      setAnalysisComplete(true);
      setCurrentStep(4); // Move to Confirm step (was 3)
      toast({
        title: "Analysis complete!",
        description: "We've learned your writing style.",
      });
    } catch (error) {
      console.error("Analysis Error:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze your style. Please try again.",
        variant: "destructive",
      });
      // Allow user to retry instead of resetting currentStep blindly
      // But we need to stop spinner.
      setIsAnalyzing(false);
      // Stay on current step or go back?
      // If we are at step 3 (loading), we should go back to allow retry.
      if (currentStep === 3) {
        setCurrentStep(2); // Go back to Upload
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConnectTwitter = async () => {
    try {
      const { url } = await api.connectTwitter();
      window.location.href = url;
    } catch (error) {
      console.error("Twitter Connect Error:", error);
      toast({
        title: "Connection failed",
        description: "Could not initiate Twitter connection.",
        variant: "destructive",
      });
    }
  };

  const handleConnectLinkedIn = async () => {
    try {
      const { url } = await api.connectLinkedIn();
      window.location.href = url;
    } catch (error) {
      console.error("LinkedIn Connect Error:", error);
      toast({
        title: "Connection failed",
        description: "Could not initiate LinkedIn connection.",
        variant: "destructive",
      });
    }
  };

  const isTwitterConnected = new URLSearchParams(window.location.search).get("twitter_connected") === "true";
  const isLinkedInConnected = new URLSearchParams(window.location.search).get("linkedin_connected") === "true";

  const handleConfirm = async () => {
    // Save to local storage for Dashboard to pick up
    const preferences = {
      tone: tone[0],
      emojiUsage: emojiUsage[0],
      ctaStrength: ctaStrength[0],
      formality: formality[0],
    };
    localStorage.setItem("manual_style_preferences", JSON.stringify(preferences));

    // Explicitly mark onboarding as done in backend
    try {
      await api.finishOnboarding();
    } catch (e) {
      console.error("Failed to mark onboarding as complete", e);
      // Continue anyway so user is not stuck
    }

    toast({
      title: "Style profile saved!",
      description: "Your writing style has been saved. Let's create some content!",
    });
    navigate("/create");
  };

  const handleNextQuestion = async () => {
    if (currentAnswer.trim()) {
      try {
        // Prefix answer with Question context for better analysis
        const fullContent = `[${questions[questionIndex].category}] Q: ${questions[questionIndex].text}\nA: ${currentAnswer}`;
        // Fire and forget - don't block navigation
        api.submitText(fullContent).catch(err => {
          console.error("Failed to save answer", err);
          toast({
            title: "Warning",
            description: "Failed to save answer. Your response might be lost.",
            variant: "destructive"
          })
        });
      } catch (err) {
        console.error("Failed to prepare answer", err);
      }
    }

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(prev => prev + 1);
      setCurrentAnswer("");
    } else {
      setCurrentStep(1); // Go to Connect
    }
  };

  const handleSkipQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(prev => prev + 1);
      setCurrentAnswer("");
    } else {
      setCurrentStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/logo-light.png" alt="MorphPost Logo" className="h-10 w-10 object-contain dark:hidden" />
              <img src="/logo-dark.png" alt="MorphPost Logo" className="h-10 w-10 object-contain hidden dark:block" />
            </div>
            <span className="text-xl font-semibold text-foreground">MorphPost</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Skip for now
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  i <= currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  i <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step}
              </span>
              {i < steps.length - 1 && (
                <div className="h-px w-12 bg-border" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 0 && (
          <div className="space-y-8 animate-slide-up max-w-2xl mx-auto">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-foreground">Let's get to know you</h1>
              <p className="text-muted-foreground">
                Answer a few quick questions to help AI understand your goals.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    {questions[questionIndex].category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Question {questionIndex + 1} of {questions.length}
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-foreground">
                  {questions[questionIndex].text}
                </h2>

                <Input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="bg-background/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNextQuestion();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1" onClick={handleSkipQuestion}>
                  Skip Question
                </Button>
                <Button className="flex-1" variant="gradient" onClick={handleNextQuestion} disabled={!currentAnswer.trim()}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="text-center">
              <Button variant="link" size="sm" className="text-muted-foreground" onClick={() => setCurrentStep(1)}>
                Skip all questions
              </Button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-8 animate-slide-up">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-foreground">Connect Platforms</h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Connect your social accounts (optional). We'll import to learn your style.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center">
                    <svg role="img" viewBox="0 0 16 16" className="h-6 w-6 fill-current"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">X (Twitter)</h3>
                    <p className="text-sm text-muted-foreground">Import your tweets and threads</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleConnectTwitter}>Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#0077b5] text-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">LinkedIn</h3>
                    <p className="text-sm text-muted-foreground">Import your posts and articles</p>
                  </div>
                </div>
                {isLinkedInConnected ? (
                  <Button variant="secondary" disabled className="gap-2">
                    <Check className="h-4 w-4" /> Connected
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleConnectLinkedIn}>Connect</Button>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Button size="lg" variant="secondary" onClick={() => setCurrentStep(2)}>
                Next: Upload Content
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-foreground">
                Upload Content
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                (Optional) Upload documents or paste URLs to refine your style profile.
              </p>
            </div>

            {/* Upload Section */}
            <div className="glass rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Upload Sources</h2>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX, Markdown, or paste LinkedIn URLs
                  </p>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <label className="block">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group">
                  <FileUp className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                  <p className="text-foreground font-medium">
                    Drop files here or click to upload
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, DOCX, MD, TXT
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.docx,.md,.txt"
                  onChange={handleFileUpload}
                />
              </label>

              {/* URL Input */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Paste a LinkedIn post URL..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
                    className="pl-11"
                  />
                </div>
                <Button onClick={handleUrlAdd} variant="secondary">
                  Add URL
                </Button>
              </div>

              {/* Uploaded Sources List */}
              {sources.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Uploaded Sources</Label>
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                      >
                        {source.type === "file" ? (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <LinkIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="flex-1 text-sm text-foreground truncate">
                          {source.name}
                        </span>
                        {source.status === "processing" ? (
                          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : source.status === "done" ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : (
                          <X className="h-5 w-5 text-destructive" />
                        )}
                        <button
                          onClick={() => removeSource(source.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                variant="gradient"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="min-w-[200px]"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Analyze My Style
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-foreground">Analyzing your unique voice...</p>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-8 animate-slide-up">
            {/* Analysis Results */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium">
                <Check className="h-4 w-4" />
                Analysis Complete
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Here's your writing style profile
              </h1>
              <p className="text-muted-foreground">
                Review the analysis and confirm or make adjustments.
              </p>
            </div>

            {/* AI Insight Summary */}
            <div className="glass rounded-2xl p-6 border-l-4 border-l-primary animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Style Analysis
              </h3>
              <p className="text-foreground/90 italic leading-relaxed">
                "{analyzedProfile?.general_summary || "Your style is professional yet approachable, using clear language and direct calls to action."}"
              </p>
            </div>

            {/* Platform Tabs */}
            <Tabs defaultValue="twitter" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="twitter">X (Twitter)</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              </TabsList>

              {["twitter", "linkedin"].map((platform) => {
                const profile = analyzedProfile?.platform_styles?.[platform];
                return (
                  <TabsContent key={platform} value={platform} className="space-y-4 animate-slide-up">
                    <div className="bg-secondary/20 rounded-xl p-4 mb-4">
                      <p className="text-sm font-medium text-foreground mb-1">Platform Strategy</p>
                      <p className="text-sm text-muted-foreground">{profile?.summary}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <StyleCard
                        icon={<MessageSquare className="h-5 w-5" />}
                        title="Tone & Voice"
                        value={profile?.tone || "N/A"}
                        description={`Tone optimized for ${platform}`}
                      />
                      <StyleCard
                        icon={<Zap className="h-5 w-5" />}
                        title="Sentence Structure"
                        value={profile?.sentence_style || "N/A"}
                        description="Structuring for readability"
                      />
                      <StyleCard
                        icon={<Sparkles className="h-5 w-5" />}
                        title="Visual Flair"
                        value={profile?.emoji_usage?.replace("_", " ") || "N/A"}
                        description="Emoji & formatting usage"
                      />
                      <StyleCard
                        icon={<TrendingUp className="h-5 w-5" />}
                        title="Call to Action"
                        value={profile?.cta_style || "N/A"}
                        description="Engagement drivers"
                      />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Platform Bias */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Platform Familiarity</h3>
              <div className="flex gap-3">
                {analyzedProfile?.platform_bias.map((p: string) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                )) || <Badge variant="secondary">General</Badge>}
              </div>
            </div>

            {/* Manual Edit Section */}
            {showManualEdit && (
              <div className="glass rounded-2xl p-6 space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Fine-tune Preferences</h3>

                <div className="space-y-6">
                  <SliderField
                    label="Tone"
                    leftLabel="Casual"
                    rightLabel="Formal"
                    value={tone}
                    onChange={setTone}
                  />
                  <SliderField
                    label="Emoji Usage"
                    leftLabel="None"
                    rightLabel="Heavy"
                    value={emojiUsage}
                    onChange={setEmojiUsage}
                  />
                  <SliderField
                    label="CTA Strength"
                    leftLabel="Subtle"
                    rightLabel="Aggressive"
                    value={ctaStrength}
                    onChange={setCtaStrength}
                  />
                  <SliderField
                    label="Formality"
                    leftLabel="Relaxed"
                    rightLabel="Professional"
                    value={formality}
                    onChange={setFormality}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowManualEdit(!showManualEdit)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {showManualEdit ? "Hide Editor" : "Edit Preferences"}
              </Button>
              <Button size="lg" variant="gradient" onClick={handleConfirm}>
                <Check className="h-5 w-5 mr-2" />
                Looks Like Me
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

      </main>
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
        <span className="text-xs text-muted-foreground w-20">{leftLabel}</span>
        <Slider
          value={value}
          onValueChange={onChange}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-20 text-right">{rightLabel}</span>
      </div>
    </div>
  );
}
