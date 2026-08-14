import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

const description =
  'Your Tiny Arcadium profile — nickname, avatar, level and XP, play streak, unlocked badges, and your best score in every game. Stored on this device only.';

export const metadata: Metadata = {
  title: 'Your Player Profile',
  description,
  alternates: { canonical: '/profile' },
  openGraph: {
    title: 'Your Player Profile',
    description,
    url: '/profile',
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
