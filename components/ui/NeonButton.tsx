'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: Size;
  /**
   * Per-game hue for the `accent` and `secondary` variants. Everything else
   * about the button — height, padding, radius, weight, icon size, press
   * behaviour — stays identical across games, so the same action looks the
   * same everywhere and only its colour changes.
   */
  accent?: string;
  fullWidth?: boolean;
  /** Fully rounded. For toolbar-style controls, not primary actions. */
  pill?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  accent: 'btn-accent',
};

const SIZE: Record<Size, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/**
 * The app's only button. Geometry and states come entirely from the `.btn`
 * token layer in globals.css, so there is one place to change how a button
 * feels — this used to carry its own padding table, which is how nine
 * different padding pairs ended up in the codebase.
 *
 * Named NeonButton for history; the neon is gone.
 */
export function NeonButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  accent,
  fullWidth = false,
  pill = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={cn(
        'btn',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'btn-block',
        pill && 'btn-pill',
        className
      )}
      style={accent ? ({ '--btn-accent': accent, ...style } as React.CSSProperties) : style}
      // Press feedback is the CSS `:active` translate on `.btn`, not a
      // Framer scale — one definition covers every button in the app,
      // including the ones that aren't this component.
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
