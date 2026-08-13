import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MathSprintGame } from '@/games/math-sprint/MathSprintGame';
import { GameHeader } from '@/components/game/GameHeader';
import { challengeLabel, isValidChallengeCode } from '@/lib/challenge';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const description =
    "You've been challenged! Solve the same three seeded rounds as your friends and climb the shared leaderboard.";
  return {
    title: `${challengeLabel(code)} · Math Sprint`,
    description,
    // Unbounded unique URLs — keep out of search indexes, but OG stays
    // so shared invite links unfurl nicely in chats.
    robots: { index: false, follow: false },
    openGraph: { title: `${challengeLabel(code)} · Math Sprint`, description },
  };
}

export default async function MathSprintChallengePage({ params }: Props) {
  const { code } = await params;
  if (!isValidChallengeCode(code)) notFound();

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <div>
        <GameHeader gameId="math-sprint" />
        <MathSprintGame challengeCode={code} />
      </div>
    </div>
  );
}
