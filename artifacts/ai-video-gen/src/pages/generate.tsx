import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateVideo,
  useGetVideoStatus,
  useListVideos,
  useDeleteVideo,
  getListVideosQueryKey,
  getGetVideoStatusQueryKey,
} from "@workspace/api-client-react";

import { usePlan } from "@/context/plan";
import { UnlockDialog } from "@/components/unlock-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Trash2, AlertCircle, Film, Crown, Lock } from "lucide-react";

type VideoStatus = "pending" | "processing" | "completed" | "failed";

type AllowedDuration = 2 | 3 | 4 | 5 | 8;
const ALL_DURATIONS: AllowedDuration[] = [2, 3, 4, 5, 8];
const PREMIUM_ONLY: AllowedDuration[] = [8];

function StatusBadge({ status }: { status: VideoStatus }) {
  const map: Record<VideoStatus, { label: string; className: string }> = {
    pending:    { label: "Pending",    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    processing: { label: "Generating", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    completed:  { label: "Ready",      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    failed:     { label: "Failed",     className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${s.className}`}>
      {status === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {s.label}
    </Badge>
  );
}

function VideoPoller({ videoId, onDone }: { videoId: number; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useGetVideoStatus(videoId, {
    query: {
      queryKey: getGetVideoStatusQueryKey(videoId),
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        if (s === "completed" || s === "failed") return false;
        return 3000;
      },
    },
  });

  useEffect(() => {
    if (data?.status === "completed" || data?.status === "failed") {
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      onDone();
    }
  }, [data?.status, onDone, queryClient]);

  return null;
}

export default function GeneratePage() {
  const queryClient = useQueryClient();
  const { plan, code, allowedDurations } = usePlan();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState<2 | 3 | 4 | 5 | 8>(4);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobDone, setJobDone] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  // If current duration is no longer allowed (plan downgraded), reset
  useEffect(() => {
    if (!allowedDurations.includes(duration)) {
      setDuration(allowedDurations[0] as 2 | 3 | 4 | 5 | 8);
    }
  }, [allowedDurations, duration]);

  const generateMutation = useGenerateVideo();
  const deleteMutation = useDeleteVideo();
  const { data: videos, isLoading: videosLoading } = useListVideos();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setJobDone(false);
    generateMutation.mutate(
      {
        data: { prompt: prompt.trim(), aspectRatio, duration },
        ...(code ? { headers: { "x-plan-code": code } } : {}),
      },
      {
        onSuccess: (video) => {
          setActiveJobId(video.id);
          queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) }
    );
  };

  const isGenerating = generateMutation.isPending || (activeJobId !== null && !jobDone);
  const isPremium = plan === "premium" || plan === "admin";

  return (
    <div className="space-y-8">
      {activeJobId && !jobDone && (
        <VideoPoller videoId={activeJobId} onDone={() => { setJobDone(true); setActiveJobId(null); }} />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          VirgoAI
        </h1>
        <p className="text-muted-foreground mt-1">Describe a scene and AI will bring it to life.</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-5">
          <Textarea
            data-testid="input-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A sweeping aerial shot of a neon-lit city at night, rain-slicked streets reflecting lights..."
            className="min-h-28 text-sm resize-none bg-background border-border focus:border-primary"
            disabled={isGenerating}
          />

          <div className="flex flex-wrap gap-5 items-end">
            {/* Aspect ratio */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aspect Ratio</p>
              <div className="flex gap-2">
                {(["16:9", "9:16"] as const).map((r) => (
                  <button
                    key={r}
                    data-testid={`button-ratio-${r.replace(":", "x")}`}
                    onClick={() => setAspectRatio(r)}
                    disabled={isGenerating}
                    className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                      aspectRatio === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Duration</p>
              <div className="flex gap-2">
                {ALL_DURATIONS.map((d) => {
                  const isLocked = PREMIUM_ONLY.includes(d) && !isPremium;
                  const isSelected = duration === d;
                  return (
                    <button
                      key={d}
                      data-testid={`button-duration-${d}`}
                      onClick={() => isLocked ? setUnlockOpen(true) : setDuration(d as 2 | 3 | 4 | 5 | 8)}
                      disabled={isGenerating}
                      className={`relative px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isLocked
                          ? "bg-secondary/50 text-muted-foreground/50 border-border/50 cursor-pointer"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {isLocked && <Lock className="inline h-2.5 w-2.5 mr-0.5 mb-0.5" />}
                      {d}s
                      {isLocked && (
                        <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[9px] font-bold px-1 rounded-full">PRO</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ml-auto">
              <Button
                data-testid="button-generate"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate</>
                )}
              </Button>
            </div>
          </div>

          {/* Generating progress */}
          {isGenerating && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-full border-2 border-violet-500/30" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-300">Generating your video...</p>
                <p className="text-xs text-muted-foreground">This takes 30–120 seconds. Hang tight.</p>
              </div>
            </div>
          )}

          {/* Free plan upgrade hint */}
          {!isPremium && (
            <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <Crown className="h-3.5 w-3.5" />
                Free plan — 2s to 5s videos. Unlock 8s with Premium.
              </div>
              <button
                onClick={() => setUnlockOpen(true)}
                className="text-xs font-medium text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
              >
                Unlock
              </button>
            </div>
          )}

          {generateMutation.isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to start generation. Please try again.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent videos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Videos</h2>
        {videosLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !videos?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No videos yet. Generate your first one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.slice(0, 6).map((video) => (
              <Card key={video.id} className="border-border bg-card overflow-hidden" data-testid={`card-video-${video.id}`}>
                {video.status === "completed" && video.videoUrl ? (
                  <video src={video.videoUrl} controls className="w-full aspect-video bg-black" data-testid={`video-player-${video.id}`} />
                ) : (
                  <div className={`w-full aspect-video flex items-center justify-center ${video.status === "failed" ? "bg-red-950/30" : "bg-black/40"}`}>
                    {(video.status === "processing" || video.status === "pending")
                      ? <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                      : <AlertCircle className="h-8 w-8 text-red-400" />}
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{video.prompt}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={video.status as VideoStatus} />
                      <button data-testid={`button-delete-${video.id}`} onClick={() => handleDelete(video.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground/50">
                    <span>{video.aspectRatio}</span><span>·</span><span>{video.duration}s</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} />
    </div>
  );
}
