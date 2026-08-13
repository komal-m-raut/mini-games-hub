import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { GameBackLink } from './GameBackLink';

interface GameHeaderProps {
  /** Registry id, e.g. "timing-tap". */
  gameId: string;
}

/**
 * The masthead every game page opens with: back link, the game's emoji as
 * artwork, its name at a size that actually reads as a title, and the single
 * sentence describing what the player does.
 *
 * It replaced a 12px uppercase tracked label per page — which made the game's
 * own name the least prominent text on its page — and it pulls its copy from
 * the registry so the hub card and the game page can never describe the same
 * game differently.
 */
export function GameHeader({ gameId }: GameHeaderProps) {
  const game = GAME_REGISTRY.find((g) => g.id === gameId);
  if (!game) return null;

  return (
    <header className="mb-6">
      <div className="mb-4">
        <GameBackLink />
      </div>

      <div className="flex items-center gap-3.5">
        <span
          className="grid place-items-center w-14 h-14 shrink-0 rounded-2xl text-3xl"
          style={{
            background: `color-mix(in srgb, ${game.accent} 18%, rgba(255,255,255,0.03))`,
            border: `1px solid color-mix(in srgb, ${game.accent} 30%, transparent)`,
          }}
          aria-hidden="true"
        >
          {game.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl leading-tight">
            {game.title}
          </h1>
          <p className="text-sm sm:text-base text-ink-2 leading-snug mt-0.5">
            {game.howTo}
          </p>
        </div>
      </div>
    </header>
  );
}
