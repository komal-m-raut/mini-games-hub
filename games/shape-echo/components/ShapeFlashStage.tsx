'use client';

import { useId } from 'react';
import { ShapeGeom } from '../types';
import { ShapeShape } from './ShapeShape';
import styles from '../styles.module.css';

interface ShapeFlashStageProps {
  target: ShapeGeom;
  color: string;
}

/**
 * Static stage showing the target shape during the memorise flash — the
 * one focal element on screen. A faint inner gradient (white highlight
 * fading into the game accent) plus a soft outer glow give it a premium
 * material instead of a flat translucent fill, and the stage itself carries
 * no border — just the shape, lit.
 */
export function ShapeFlashStage({ target, color }: ShapeFlashStageProps) {
  const gradId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      className={styles.stage}
      role="img"
      aria-label="Memorise this shape's position, size and rotation"
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="35%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.22" />
        </radialGradient>
      </defs>
      <ShapeShape
        type={target.type}
        cx={target.cx}
        cy={target.cy}
        width={target.width}
        ratio={target.ratio}
        rotation={target.rotation}
        fill={`url(#${gradId})`}
        stroke={color}
        strokeWidth={1.25}
        filter={`drop-shadow(0 0 14px ${color}99) drop-shadow(0 0 34px ${color}4d)`}
      />
    </svg>
  );
}
