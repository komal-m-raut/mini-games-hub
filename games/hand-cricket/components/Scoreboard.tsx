'use client';

interface ScoreboardProps {
  runs: number;
  balls: number;
  /** Shown only once innings 2 is chasing a target. */
  target?: number;
  accent: string;
}

/** Small HUD strip: runs, balls faced, and — once set — the chase target. */
export function Scoreboard({ runs, balls, target, accent }: ScoreboardProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">Runs</p>
        <p className="font-score text-2xl leading-none" style={{ color: accent }}>
          {runs}
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">Balls</p>
        <p className="font-score text-2xl leading-none text-ink-2">{balls}</p>
      </div>
      {target !== undefined && (
        <div className="text-right">
          <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">Target</p>
          <p className="font-score text-2xl leading-none text-ink-2">{target}</p>
        </div>
      )}
    </div>
  );
}
