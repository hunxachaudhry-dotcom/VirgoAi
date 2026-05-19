import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ImageIcon, Download, Sparkles, AlertCircle } from "lucide-react";

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

const SIZE_OPTIONS: { value: ImageSize; label: string; desc: string }[] = [
  { value: "1024x1024", label: "Square", desc: "1:1" },
  { value: "1536x1024", label: "Landscape", desc: "3:2" },
  { value: "1024x1536", label: "Portrait", desc: "2:3" },
];

interface GeneratedImage {
  b64_json: string;
  prompt: string;
  size: ImageSize;
}

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/openai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Image generation failed");
      }

      const data = await res.json();
      setImages((prev) => [
        { b64_json: data.b64_json, prompt: prompt.trim(), size },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (img: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${img.b64_json}`;
    link.download = `virgoai-image-${index + 1}.png`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Image Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Apni imagination se koi bhi image banao.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-5">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleGenerate())}
            placeholder="Ek khubsoorat sunset beach pe, neon lights ke saath, cinematic style..."
            className="min-h-24 text-sm resize-none bg-background border-border focus:border-primary"
            disabled={isGenerating}
          />

          <div className="flex flex-wrap gap-5 items-end">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Size</p>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    disabled={isGenerating}
                    className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                      size === s.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {s.label}
                    <span className="ml-1 text-xs opacity-60">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Image</>
                )}
              </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-full border-2 border-pink-500/30" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-pink-300">Image ban rahi hai...</p>
                <p className="text-xs text-muted-foreground">Thodi der wait karo — 10-30 seconds lagenge.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <Card key={i} className="border-border bg-card overflow-hidden">
                <img
                  src={`data:image/png;base64,${img.b64_json}`}
                  alt={img.prompt}
                  className="w-full object-cover"
                />
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{img.prompt}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadImage(img, i)}
                    className="shrink-0 text-xs h-7 px-2"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !isGenerating && (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Koi image generate nahi hui abhi. Upar prompt likho!</p>
        </div>
      )}
    </div>
  );
}
