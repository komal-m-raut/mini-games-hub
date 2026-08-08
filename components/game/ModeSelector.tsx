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
  // Solo is the only mode that starts a game right here — the other two
  // navigate away to a seeded challenge — so it leads as the primary action
  // and the challenge modes sit under it as a secondary pair. Three
  // identically-weighted cards left the screen with no obvious way in.
  const secondary = [
    {
      icon: <CalendarDays className="w-5 h-5" strokeWidth={2} />,
      label: "Today's Challenge",
      description: 'Same rounds for everyone',
      accent: '#06B6D4',
      onClick: onDailyChallenge,
      delay: 0.06,
    },
    {
      icon: <Swords className="w-5 h-5" strokeWidth={2} />,
      label: 'Challenge a Friend',
      description: 'Share a link, compare scores',
      accent,
      onClick: onFriendChallenge,
      delay: 0.12,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-white text-center">
        Ready to play?
      </h2>

      <motion.button
        onClick={onSolo}
        className="mode-card mode-card-primary fade-up"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        style={{ '--mode-accent': '#8B5CF6' } as React.CSSProperties}
      >
        <span className="mode-icon">
          <Play className="w-6 h-6" strokeWidth={2.5} fill="currentColor" />
        </span>
        <span className="flex flex-col gap-0.5 text-left">
          <span className="font-display font-bold text-white text-xl leading-tight">
            Start playing
          </span>
          <span className="text-sm text-white/65 leading-snug">
            Five rounds, at your own pace
          </span>
        </span>
      </motion.button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {secondary.map(({ icon, label, description, accent: a, onClick, delay }) => (
          <motion.button
            key={label}
            onClick={onClick}
            className="mode-card mode-card-secondary fade-up"
            whileHover={{ y: -2 }}
            style={
              { '--mode-accent': a, animationDelay: `${delay}s` } as React.CSSProperties
            }
          >
            <span className="mode-icon">{icon}</span>
            <span className="flex flex-col gap-0.5 text-left">
              <span className="font-display font-semibold text-white/90 leading-tight">
                {label}
              </span>
              <span className="text-xs text-white/55 leading-snug">{description}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
