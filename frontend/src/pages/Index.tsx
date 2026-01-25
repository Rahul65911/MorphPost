import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  FileText,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Users,
  Linkedin,
  Twitter,
  Newspaper,
  Check,
  Bot,
  Edit3,
  Send,
} from "lucide-react";

const features = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: "AI in Your Voice",
    description:
      "Upload your content and we learn your unique writing style. Every post sounds authentically you.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Multi-Platform",
    description:
      "Generate optimized content for LinkedIn and X—all from a single prompt.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Human Control",
    description:
      "Review, edit, accept or reject each platform's content. AI assists, you decide.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Built for Creators",
    description:
      "Designed for founders, developers, and personal brand builders who value their time.",
  },
];

const platforms = [
  {
    icon: (props: any) => (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.451V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
    name: "LinkedIn",
    color: "text-[#0A66C2]",
  },
  {
    icon: (props: any) => (
      <svg role="img" viewBox="0 0 16 16" fill="currentColor" {...props}>
        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
      </svg>
    ),
    name: "X",
    color: "text-foreground",
  },

];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MorphPost</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="gradient">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="animate-fade-in">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Content Generation
          </Badge>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight animate-slide-up">
            Transform ideas into{" "}
            <span className="gradient-text">platform-perfect posts</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            MorphPost uses AI to generate content in your unique voice for LinkedIn and X.
            Review with AI insights, edit with full control, and publish with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/auth">
              <Button size="lg" variant="gradient" className="min-w-[200px] h-12">
                Start Creating Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-8 pt-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <span className="text-sm text-muted-foreground">Publish to:</span>
            {platforms.map((platform) => (
              <div key={platform.name} className="flex items-center gap-2">
                <platform.icon className={`h-5 w-5 ${platform.color}`} />
                <span className="text-sm text-muted-foreground">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_hsl(221_83%_53%_/_0.08)_0%,_transparent_60%)] pointer-events-none" />
      </section>

      {/* What We Do Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What MorphPost Does
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We help content creators save time while maintaining their authentic voice across multiple platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Edit3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Create Once
              </h3>
              <p className="text-muted-foreground">
                Write your idea or paste existing content. Choose between manual mode or structured templates for maximum flexibility.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                AI Adapts
              </h3>
              <p className="text-muted-foreground">
                Our AI learns your writing style and automatically generates platform-optimized versions for LinkedIn and X.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Publish Everywhere
              </h3>
              <p className="text-muted-foreground">
                Review AI-generated content, make edits if needed, and publish to all platforms with confidence. You're always in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to create at scale
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From style learning to multi-platform publishing, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-2xl p-6 space-y-4 hover:border-primary/50 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to content that converts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Teach Your Style",
                description:
                  "Upload existing content or paste URLs. Our AI learns your unique voice, tone, and patterns.",
              },
              {
                step: "02",
                title: "Generate Content",
                description:
                  "Enter a topic or use our structured template. Get platform-optimized drafts instantly.",
              },
              {
                step: "03",
                title: "Review & Publish",
                description:
                  "Review AI scores, edit as needed, and publish to all platforms with one click.",
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="text-center space-y-4 animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-primary-foreground text-2xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(221_83%_53%_/_0.1)_0%,_transparent_70%)]" />

            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Ready to create content that converts?
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Join creators who save hours every week while publishing better content across all platforms.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/auth">
                  <Button size="lg" variant="gradient" className="h-12">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-success" /> No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-success" /> Free to start
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">MorphPost</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 MorphPost. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
