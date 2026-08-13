import { GameOutcome } from '../types';

interface MatchPipsProps {
  /** This round's best-of-3 results so far, in play order. */
  outcomes: GameOutcome[];
  /** Total games in the match — remaining slots render as empty pips. */
  totalGames: number;
  accent: string;
}

const OUTCOME_LABEL: Record<GameOutcome, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };
const OUTCOME_LETTER: Record<GameOutcome, string> = { win: 'W', loss: 'L', draw: 'D' };
const OUTCOME_COLOR: Record<GameOutcome, string> = {
  win: '#22C55E',
  loss: '#EF4444',
  draw: '#94A3B8',
};

/** W/D/L pips for the best-of-3 match in progress (or just finished). Played
 *  games show their letter in colour; games not yet reached are a dim dot. */
export function MatchPips({ outcomes, totalGames, accent }: MatchPipsProps) {
  return (
    <div className="flex items-center gap-1.5" role="list" aria-label="Match record">
      {Array.from({ length: totalGames }, (_, i) => {
        const outcome = outcomes[i];
        return (
          <span
            key={i}
            role="listitem"
            aria-label={outcome ? OUTCOME_LABEL[outcome] : 'Not yet played'}
            className="grid place-items-center w-6 h-6 rounded-full font-ui text-2xs font-semibold"
            style={
              outcome
                ? {
                    color: OUTCOME_COLOR[outcome],
                    background: `${OUTCOME_COLOR[outcome]}22`,
                    border: `1px solid ${OUTCOME_COLOR[outcome]}66`,
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${accent}33`,
                  }
            }
          >
            {outcome ? OUTCOME_LETTER[outcome] : ''}
          </span>
        );
      })}
    </div>
  );
}
