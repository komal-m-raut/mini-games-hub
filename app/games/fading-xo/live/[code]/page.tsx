import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GameHeader } from '@/components/game/GameHeader';
import { LiveGhostGrid } from '@/games/fading-xo/LiveGhostGrid';
import { LIVE_DUEL_CODE_PATTERN } from '@/lib/liveDuel';

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: 'Live Ghost Grid Room',
  description: 'A private live Ghost Grid duel. Open the link, take your mark, and play head-to-head.',
  robots: { index: false, follow: false },
};

export default async function LiveGhostGridPage({ params }: Props) {
  const { code } = await params;
  if (!LIVE_DUEL_CODE_PATTERN.test(code)) notFound();

  return (
    <div className="page-container py-8 sm:py-12">
      <GameHeader gameId="fading-xo" />
      <LiveGhostGrid code={code} />
    </div>
  );
}
