import { ShapeGeom } from '../types';
import { ShapeShape } from './ShapeShape';

interface ShapeFlashStageProps {
  target: ShapeGeom;
  color: string;
}

/** Static stage showing the target shape during the memorise flash. */
export function ShapeFlashStage({ target, color }: ShapeFlashStageProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full select-none rounded-2xl"
      style={{
        maxWidth: 440,
        aspectRatio: '1 / 1',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      role="img"
      aria-label="Memorise this shape's position, size and rotation"
    >
      <ShapeShape
        type={target.type}
        cx={target.cx}
        cy={target.cy}
        width={target.width}
        ratio={target.ratio}
        rotation={target.rotation}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  );
}
