import { useQueryClient } from "@tanstack/react-query";
import {
  useListVideos,
  useDeleteVideo,
  getListVideosQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Film, AlertCircle } from "lucide-react";

type VideoStatus = "pending" | "processing" | "completed" | "failed";

function StatusBadge({ status }: { status: VideoStatus }) {
  const map: Record<VideoStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    processing: { label: "Generating", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    completed: { label: "Ready", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${s.className}`}>
      {status === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {s.label}
    </Badge>
  );
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: videos, isLoading } = useListVideos();
  const deleteMutation = useDeleteVideo();

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video History</h1>
        <p className="text-muted-foreground mt-1">All your generated videos in one place.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !videos?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Film className="h-14 w-14 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No videos generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => (
            <Card key={video.id} className="border-border bg-card overflow-hidden" data-testid={`card-history-${video.id}`}>
              {video.status === "completed" && video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  controls
                  className="w-full aspect-video bg-black"
                  data-testid={`video-history-${video.id}`}
                />
              ) : (
                <div
                  className={`w-full aspect-video flex flex-col items-center justify-center gap-2 ${
                    video.status === "failed" ? "bg-red-950/30" : "bg-black/40"
                  }`}
                >
                  {(video.status === "processing" || video.status === "pending") ? (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
                      <p className="text-xs text-muted-foreground">Processing...</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-7 w-7 text-red-400" />
                      <p className="text-xs text-red-400/70">Generation failed</p>
                    </>
                  )}
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-foreground line-clamp-2">{video.prompt}</p>

                {video.status === "failed" && video.errorMessage && (
                  <p className="text-xs text-red-400/70 line-clamp-1">{video.errorMessage}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={video.status as VideoStatus} />
                    <span className="text-xs text-muted-foreground/60">{video.aspectRatio} · {video.duration}s</span>
                  </div>
                  <button
                    data-testid={`button-delete-history-${video.id}`}
                    onClick={() => handleDelete(video.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground/40">
                  {video.createdAt ? new Date(video.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
