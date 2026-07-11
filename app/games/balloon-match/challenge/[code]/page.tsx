import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BalloonGame } from '@/games/balloon-match/BalloonGame';
import { challengeLabel, isValidChallengeCode } from '@/lib/challenge';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${challengeLabel(code)} · Balloon Match`,
    description:
      'You’ve been challenged! Play the same 3 balloons as your friends and climb the shared leaderboard.',
  };
}

export default async function ChallengePage({ params }: Props) {
  const { code } = await params;
  if (!isValidChallengeCode(code)) notFound();

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <BalloonGame challengeCode={code} />
    </div>
  );
}
