'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Play, Swords } from 'lucide-react';

interface ModeSelectorProps {
  accent?: string;
  onSolo: () => void;
  onDailyChallenge: () => void;
  onFriendChallenge: () => void;
}

export function ModeSelector({
  accent = '#06B6D4',
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
      icon: <Play className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />,
      label: 'Play solo',
      hint: 'Five rounds at your own pace',
      primary: true,
      tone: '#8B5CF6',
      onClick: onSolo,
    },
    {
      icon: <CalendarDays className="w-4 h-4" strokeWidth={2} />,
      label: "Today's Challenge",
      hint: 'The same rounds for everyone today',
      primary: false,
      tone: '#06B6D4',
      onClick: onDailyChallenge,
    },
    {
      icon: <Swords className="w-4 h-4" strokeWidth={2} />,
      label: 'Challenge a friend',
      hint: 'Share a link and compare scores',
      primary: false,
      tone: accent,
      onClick: onFriendChallenge,
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="font-display text-2xl font-semibold text-white text-center">
        Ready to play?
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        {modes.map(({ icon, label, hint, primary, tone, onClick }) => (
          <motion.button
            key={label}
            onClick={onClick}
            title={hint}
            aria-label={`${label} — ${hint}`}
            className={`mode-pill ${primary ? 'mode-pill-primary' : ''}`}
            style={{ '--mode-accent': tone } as React.CSSProperties}
            whileTap={{ scale: 0.97 }}
          >
            {icon}
            <span>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
