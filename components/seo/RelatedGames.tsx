import Link from 'next/link';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { GameMeta } from '@/types/game';

interface RelatedGamesProps {
  /** Registry game ids. Ids for staged games (`isAvailable: false`) are
   *  fine to pass in — they're filtered out below rather than 404ing. */
  ids: string[];
  title?: string;
}

/**
 * Small "play this next" card strip. Used both by `GameArticle`'s "More
 * games like this" section and by the guides' "Play these to practice"
 * strip, so game and guide content agents can hand-pick ids (including
 * not-yet-shipped ones from REDESIGN-PLAN.md's roster) without ever risking
 * a dead link — only `isAvailable: true` registry entries render.
 */
export function RelatedGames({ ids, title = 'More games like this' }: RelatedGamesProps) {
  const games = ids
    .map((id) => GAME_REGISTRY.find((g) => g.id === id))
    .filter((g): g is GameMeta => Boolean(g?.isAvailable));

  if (games.length === 0) return null;

  return (
    <section className="glass-card">
      <h2 className="font-display text-xl mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            aria-label={`Play ${game.title}`}
            style={{ '--game': game.accent } as React.CSSProperties}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors duration-200 hover:border-[var(--game)] hover:bg-white/[0.05]"
          >
            <span
              className="grid place-items-center w-10 h-10 rounded-lg text-xl shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--game) 18%, rgba(255,255,255,0.03))',
                border: '1px solid color-mix(in srgb, var(--game) 30%, transparent)',
              }}
              aria-hidden="true"
            >
              {game.emoji}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm text-white truncate">{game.title}</span>
              <span className="block text-xs text-ink-3 truncate">{game.tagline}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
