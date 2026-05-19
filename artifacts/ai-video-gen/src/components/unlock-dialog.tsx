import { useState } from "react";
import { useUnlockPlan } from "@workspace/api-client-react";
import { usePlan } from "@/context/plan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Crown, ShieldCheck } from "lucide-react";

interface UnlockDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UnlockDialog({ open, onClose }: UnlockDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const { setPlan } = usePlan();
  const unlock = useUnlockPlan();

  const handleSubmit = () => {
    if (!code.trim()) return;
    setError("");
    unlock.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (data) => {
          setPlan(data.plan, code.trim());
          onClose();
          setCode("");
        },
        onError: () => {
          setError("Invalid code. Please check and try again.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-5 w-5 text-yellow-400" />
            Unlock Premium
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your access code to unlock longer videos and unlimited generations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Plan benefits */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
              <Sparkles className="h-4 w-4" />
              Premium Benefits
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>4s, 6s &amp; 8s video durations</li>
              <li>Unlimited daily generations</li>
              <li>Priority processing</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Input
              data-testid="input-unlock-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your access code..."
              className="bg-background border-border font-mono text-sm"
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <Button
            data-testid="button-unlock-submit"
            onClick={handleSubmit}
            disabled={!code.trim() || unlock.isPending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {unlock.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
            ) : (
              <><ShieldCheck className="h-4 w-4 mr-2" /> Unlock Access</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
