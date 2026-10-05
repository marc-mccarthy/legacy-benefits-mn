"use client";

import { useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEffectsPaused, useEffectsPaused } from "@/lib/effects-pause";

export function EffectsPauseButton({
  iconOnly = false,
}: {
  iconOnly?: boolean;
}) {
  const paused = useEffectsPaused();
  const label = paused ? "Play animations" : "Pause animations";

  useEffect(() => {
    document.documentElement.toggleAttribute("data-effects-paused", paused);
  }, [paused]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-effects-pause
      data-print-hide
      aria-pressed={paused}
      aria-label={iconOnly ? label : undefined}
      className={iconOnly ? "size-11 px-0" : "px-0"}
      onClick={() => setEffectsPaused(!paused)}
    >
      {paused ? (
        <Play aria-hidden className="size-4" />
      ) : (
        <Pause aria-hidden className="size-4" />
      )}
      {iconOnly ? null : label}
    </Button>
  );
}
