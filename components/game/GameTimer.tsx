'use client';

import { motion } from 'framer-motion';

interface GameTimerProps {
  timeLeft: number;
  totalSeconds: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIGS = {
  sm: { r: 28, stroke: 4, textClass: 'text-2xl' },
  md: { r: 40, stroke: 5, textClass: 'text-4xl' },
  lg: { r: 56, stroke: 6, textClass: 'text-5xl' },
};

export function GameTimer({ timeLeft, totalSeconds, label, size = 'md' }: GameTimerProps) {
  const { r, stroke, textClass } = SIZE_CONFIGS[size];
  const circumference = 2 * Math.PI * r;
  const progress = timeLeft / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  const urgent = timeLeft <= 2;
  const color = urgent ? '#EF4444' : timeLeft <= Math.ceil(totalSeconds * 0.4) ? '#F97316' : '#06B6D4';
  const viewBoxSize = (r + stroke) * 2 + 4;
  const cx = viewBoxSize / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-xs font-ui text-white/50 uppercase tracking-widest">{label}</p>
      )}
      <div className="relative" style={{ width: viewBoxSize, height: viewBoxSize }}>
        <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <motion.circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ rotate: -90, transformOrigin: `${cx}px ${cx}px` }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.9, ease: 'linear' }}
            filter={`drop-shadow(0 0 6px ${color})`}
          />
        </svg>
        {/* Number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={timeLeft}
            className={`font-display font-bold ${textClass}`}
            style={{ color }}
            initial={{ scale: 1.3, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
