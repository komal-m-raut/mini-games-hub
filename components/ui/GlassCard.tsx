'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: string;
  hoverable?: boolean;
}

export function GlassCard({ children, className, glow, hoverable = false, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={cn('glass-card', hoverable && 'cursor-pointer', className)}
      style={{
        boxShadow: glow ? `0 0 40px ${glow}` : undefined,
      }}
      whileHover={hoverable ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
