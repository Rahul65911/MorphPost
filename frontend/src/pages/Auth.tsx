import { useState, useEffect } from "react";
// import { useGoogleLogin } from '@react-oauth/google'; // Removed
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Mail, Lock, User, ArrowRight, Github, Chrome, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, isAuthenticated, user } = useAuth(); // Added user
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = () => {
    toast({
      title: "Welcome back!",
      description: "Redirecting...",
    });
    // Navigation handled by useEffect
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.is_onboarded) {
        navigate("/dashboard");
      } else {
        navigate("/style-setup");
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
        toast({
          title: "Welcome back!",
          description: "Redirecting...",
        });
        // Navigation handled by useEffect
      } else {
        await signup({ username, email, password });
        toast({
          title: "Account created!",
          description: "Let's set up your writing style.",
        });
        // Navigation handled by useEffect
      }
    } catch (error) {
      toast({
        title: "Error",
        description: api.getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center">
              <img src="/logo-light.png" alt="MorphPost Logo" className="h-12 w-12 object-contain dark:hidden" />
              <img src="/logo-dark.png" alt="MorphPost Logo" className="h-12 w-12 object-contain hidden dark:block" />
            </div>
            <span className="text-2xl font-bold text-foreground">MorphPost</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your dashboard"
                : "Get started with AI-powered content creation"}
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            {googleClientId ? (
              <div className="grid grid-cols-2 gap-3">
                <GoogleAuthButton
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  onSuccess={handleGoogleSuccess}
                />
                <Button variant="outline" className="h-11" disabled>
                  <Github className="h-5 w-5 mr-2" />
                  GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-11" disabled title="Configure Google Client ID to enable">
                    <Chrome className="h-5 w-5 mr-2 opacity-50" />
                    Google
                  </Button>
                  <Button variant="outline" className="h-11" disabled>
                    <Github className="h-5 w-5 mr-2" />
                    GitHub
                  </Button>
                </div>
                {/* Setup Hint - Only visible in dev/if needed */}
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Configuration Missing</AlertTitle>
                  <AlertDescription className="text-xs">
                    Add VITE_GOOGLE_CLIENT_ID to .env
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              variant="gradient"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(221_83%_53%_/_0.1)_0%,_transparent_70%)]" />

        <div className="relative z-10 max-w-lg text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Content
          </div>

          <h2 className="text-4xl font-bold text-foreground">
            Create content that{" "}
            <span className="gradient-text">sounds like you</span>
          </h2>

          <p className="text-lg text-muted-foreground">
            Generate platform-specific posts in your unique writing style.
            Review with AI insights, then publish with confidence.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            {[
              { title: "Style Learning", desc: "Upload your content to train AI" },
              { title: "Multi-Platform", desc: "LinkedIn, X in one click" },
              { title: "AI Review", desc: "Get scores and suggestions" },
              { title: "Human Control", desc: "Edit, approve, or reject anytime" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-4 text-left animate-fade-in"
              >
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
