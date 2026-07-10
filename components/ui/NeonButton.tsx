'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface NeonButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: string;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'neon-btn-primary',
  secondary: 'neon-btn-secondary',
  ghost: 'neon-btn-ghost',
  danger: 'neon-btn-danger',
};

const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
  xl: 'px-10 py-5 text-xl',
};

export function NeonButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  glow,
  fullWidth = false,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <motion.button
      className={cn(
        'neon-btn',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
      style={{ boxShadow: glow ? `0 0 24px ${glow}, 0 0 48px ${glow}33` : undefined }}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
