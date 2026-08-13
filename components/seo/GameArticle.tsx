import { ChevronDown } from 'lucide-react';
import { getGameMeta } from '@/lib/gameRegistry';
import { GameContent } from '@/types/content';
import { RelatedGames } from './RelatedGames';

interface GameArticleProps {
  /** Registry id, e.g. "timing-tap". */
  gameId: string;
  /**
   * The game's own content module (games/<id>/content.ts), passed by the
   * page rather than looked up from a central map here — every game page
   * already imports its CONTENT for buildGameJsonLd, and a shared registry
   * in this file would be the one merge point 21 parallel game builds
   * would all have to edit.
   */
  content: GameContent;
}

/**
 * The SEO/content article every game page renders between How to Play and
 * the Leaderboard: About / Tips / FAQ / More games like this. A server
 * component — none of this needs interactivity beyond the native
 * `<details>` the FAQ already gets for free.
 */
export function GameArticle({ gameId, content }: GameArticleProps) {
  const meta = getGameMeta(gameId);
  if (!meta) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card">
        <h2 className="font-display text-xl mb-3">About {meta.title}</h2>
        <div className="space-y-3 text-ink-2 leading-relaxed">
          {content.intro.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="glass-card">
        <h2 className="font-display text-xl mb-3">Tips to score higher</h2>
        <ul className="list-disc list-inside space-y-2 marker:text-ink-4 text-ink-2 leading-relaxed">
          {content.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">FAQ</h2>
        {content.faq.map((entry, i) => (
          <details key={i} className="glass-card how-to-play">
            <summary className="how-to-play-summary font-display text-base">
              <span>{entry.q}</span>
              <ChevronDown className="how-to-play-chevron w-5 h-5 shrink-0" strokeWidth={1.5} />
            </summary>
            <p className="mt-4 pt-4 border-t border-white/[0.07] text-ink-2 leading-relaxed">
              {entry.a}
            </p>
          </details>
        ))}
      </section>

      <RelatedGames ids={content.related} />
    </div>
  );
}
