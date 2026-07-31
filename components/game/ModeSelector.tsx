'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Swords, User } from 'lucide-react';

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
  const cards = [
    {
      icon: <User className="w-7 h-7" strokeWidth={1.5} />,
      label: 'Solo',
      accent: '#8B5CF6',
      onClick: onSolo,
      delay: 0,
    },
    {
      icon: <CalendarDays className="w-7 h-7" strokeWidth={1.5} />,
      label: 'Daily Challenge',
      accent: '#06B6D4',
      onClick: onDailyChallenge,
      delay: 0.06,
    },
    {
      icon: <Swords className="w-7 h-7" strokeWidth={1.5} />,
      label: 'Challenge a Friend',
      accent,
      onClick: onFriendChallenge,
      delay: 0.12,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">
          How do you want to play?
        </h2>
        <p className="text-white/40 text-sm font-mono">Pick a mode to begin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ icon, label, accent: a, onClick, delay }) => (
          <motion.button
            key={label}
            onClick={onClick}
            className="mode-card group"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -3 }}
            style={{ '--mode-accent': a } as React.CSSProperties}
          >
            <span className="mode-icon">{icon}</span>
            <span className="font-display font-bold text-white text-lg">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
