import { ChevronDown, Compass, Lightbulb } from 'lucide-react';
import { getGameMeta } from '@/lib/gameRegistry';
import { GameContent } from '@/types/content';
import { RelatedGames } from './RelatedGames';

interface GameArticleProps {
  gameId: string;
  content: GameContent;
}

/**
 * Long-form strategy stays server-rendered and indexable, but it no longer
 * pushes the leaderboard several screens below the game. Players can open
 * one calm field guide when they want depth; everyone else keeps moving.
 */
export function GameArticle({ gameId, content }: GameArticleProps) {
  const meta = getGameMeta(gameId);
  if (!meta) return null;

  return (
    <section className="game-field-guide">
      <div className="game-field-guide__head">
        <div>
          <p>Field guide</p>
          <h2>Master {meta.title}</h2>
        </div>
        <span>{content.tips.length} strategy notes · {content.faq.length} answers</span>
      </div>

      <details className="game-field-guide__details">
        <summary>
          <span><Compass aria-hidden="true" /> Open strategy guide</span>
          <ChevronDown aria-hidden="true" />
        </summary>

        <div className="game-field-guide__body">
          <article>
            <h3>How it works</h3>
            <div>
              {content.intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </article>

          <article>
            <h3><Lightbulb aria-hidden="true" /> Play smarter</h3>
            <ol>
              {content.tips.map((tip, index) => (
                <li key={index}><span>{String(index + 1).padStart(2, '0')}</span>{tip}</li>
              ))}
            </ol>
          </article>

          <article>
            <h3>Common questions</h3>
            <div className="game-field-guide__faq">
              {content.faq.map((entry, index) => (
                <details key={index}>
                  <summary>
                    <span>{entry.q}</span>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <p>{entry.a}</p>
                </details>
              ))}
            </div>
          </article>
        </div>
      </details>

      <RelatedGames ids={content.related} />
    </section>
  );
}
