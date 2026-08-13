import type { Metadata } from 'next';
import { DailyClient } from './DailyClient';

const description =
  'Todays 3 quests, your play streak, and the Daily Gauntlet — a seeded challenge for every game, the same for every player until the day resets.';

export const metadata: Metadata = {
  title: 'Daily Quests & Challenges',
  description,
  alternates: { canonical: '/daily' },
  openGraph: {
    title: 'Daily Quests & Challenges',
    description,
    url: '/daily',
  },
};

export default function DailyPage() {
  return <DailyClient />;
}
