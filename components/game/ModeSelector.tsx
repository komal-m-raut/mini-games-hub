'use client';

import { CalendarDays, Play, Swords } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

interface ModeSelectorProps {
  accent?: string;
  /**
   * Tooltip/aria hint on the solo button. The default matches the classic
   * 5-round session; games with a different solo format (30-second sprints,
   * ladder rounds, endless runs) pass their own so the hint never lies.
   */
  soloHint?: string;
  onSolo: () => void;
  onDailyChallenge: () => void;
  onFriendChallenge: () => void;
}

export function ModeSelector({
  accent = '#06B6D4',
  soloHint = 'Five rounds at your own pace',
  onSolo,
  onDailyChallenge,
  onFriendChallenge,
}: ModeSelectorProps) {
  // All three sit on one compact row. Solo still carries the accent fill, so
  // there's an obvious way in without it taking a full-width block of its
  // own — the descriptions moved out because at this size they wrapped to
  // three lines each and were the reason the row needed so much height.
  const modes = [
    {
      icon: <Play strokeWidth={2.5} fill="currentColor" />,
      label: 'Play solo',
      hint: soloHint,
      primary: true,
      tone: '#8B5CF6',
      onClick: onSolo,
    },
    {
      icon: <CalendarDays strokeWidth={2} />,
      label: "Today's Challenge",
      hint: 'The same rounds for everyone today',
      primary: false,
      tone: '#06B6D4',
      onClick: onDailyChallenge,
    },
    {
      icon: <Swords strokeWidth={2} />,
      label: 'Challenge a friend',
      hint: 'Share a link and compare scores',
      primary: false,
      tone: accent,
      onClick: onFriendChallenge,
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="font-display text-2xl text-center">Ready to play?</h2>

      <div className="flex flex-wrap justify-center gap-2">
        {modes.map(({ icon, label, hint, primary, tone, onClick }) => (
          <NeonButton
            key={label}
            onClick={onClick}
            title={hint}
            aria-label={`${label} — ${hint}`}
            variant={primary ? 'primary' : 'secondary'}
            accent={tone}
            pill
          >
            {icon}
            <span>{label}</span>
          </NeonButton>
        ))}
      </div>
    </div>
  );
}
