"use client";

import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEffectsPaused, useEffectsPaused } from "@/lib/effects-pause";

export function EffectsPauseButton() {
  const paused = useEffectsPaused();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-effects-pause
      data-print-hide
      aria-pressed={paused}
      onClick={() => setEffectsPaused(!paused)}
    >
      {paused ? (
        <Play aria-hidden className="size-4" />
      ) : (
        <Pause aria-hidden className="size-4" />
      )}
      {paused ? "Play animations" : "Pause animations"}
    </Button>
  );
}
