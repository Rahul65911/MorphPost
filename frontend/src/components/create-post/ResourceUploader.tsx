import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Image,
  Video,
  X,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Resource {
  id: string;
  name: string;
  type: "document" | "url" | "image" | "video";
  url?: string;
}

interface ResourceUploaderProps {
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  urlInput: string;
  setUrlInput: (value: string) => void;
}

export function ResourceUploader({
  resources,
  setResources,
  urlInput,
  setUrlInput,
}: ResourceUploaderProps) {
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newResources: Resource[] = [];
      Array.from(files).forEach((file) => {
        let type: Resource["type"] = "document";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("video/")) type = "video";

        newResources.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type,
        });
      });

      setResources((prev) => [...prev, ...newResources]);
      toast({
        title: `${newResources.length} file(s) added`,
        description: "Resources will be used as reference material.",
      });
    },
    [setResources, toast]
  );

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;

    const isVideo =
      urlInput.includes("youtube.com") || urlInput.includes("vimeo.com");
    setResources((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        name: urlInput,
        type: isVideo ? "video" : "url",
        url: urlInput,
      },
    ]);
    setUrlInput("");
    toast({
      title: "URL added",
      description: "This link will be analyzed for context.",
    });
  };

  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const getResourceIcon = (type: Resource["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">
            Reference Materials & Media
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  These will be used as reference context, not copied directly.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="secondary">{resources.length} added</Badge>
      </div>

      {/* Drag & Drop Zone */}
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, MD, TXT, PNG, JPG, MP4, YouTube, Vimeo
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.docx,.md,.txt,.png,.jpg,.jpeg,.webp,.mp4"
          className="hidden"
          onChange={handleFileUpload}
        />
      </label>

      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Paste a URL (article, YouTube, Vimeo)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
        />
        <Button variant="outline" onClick={handleAddUrl}>
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Resource List */}
      {resources.length > 0 && (
        <div className="space-y-2 pt-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background/50">
                  {getResourceIcon(resource.type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[300px]">
                    {resource.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {resource.type}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeResource(resource.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
