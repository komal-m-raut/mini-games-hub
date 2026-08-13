import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShapeEchoGame } from '@/games/shape-echo/ShapeEchoGame';
import { GameHeader } from '@/components/game/GameHeader';
import { challengeLabel, isValidChallengeCode } from '@/lib/challenge';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const description =
    "You've been challenged! Recreate the same three shapes as your friends and climb the shared leaderboard.";
  return {
    title: `${challengeLabel(code)} · Shape Echo`,
    description,
    // Unbounded unique URLs — keep out of search indexes, but OG stays
    // so shared invite links unfurl nicely in chats.
    robots: { index: false, follow: false },
    openGraph: { title: `${challengeLabel(code)} · Shape Echo`, description },
  };
}

export default async function ShapeEchoChallengePage({ params }: Props) {
  const { code } = await params;
  if (!isValidChallengeCode(code)) notFound();

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <div>
        <GameHeader gameId="shape-echo" />
        <ShapeEchoGame challengeCode={code} />
      </div>
    </div>
  );
}
