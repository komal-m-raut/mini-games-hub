import { ShapeType } from '../types';

interface ShapeShapeProps {
  type: ShapeType;
  /** Center and width, fractions of the stage (0-1). */
  cx: number;
  cy: number;
  width: number;
  /** Height/width — ignored for triangle (equilateral, width alone). */
  ratio: number;
  rotation: number;
  /** viewBox units per stage fraction; the stage uses a 0-100 viewBox. */
  view?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

/**
 * Renders one shape (rectangle, ellipse or equilateral triangle) as an SVG
 * primitive, in a stage's 0-100 viewBox. Shared by the flash stage, the
 * draggable recreate stage and the results comparison overlay, so the three
 * geometry formulas (especially the triangle's circumradius) live in one
 * place.
 */
export function ShapeShape({
  type,
  cx,
  cy,
  width,
  ratio,
  rotation,
  view = 100,
  ...svgProps
}: ShapeShapeProps) {
  const cxV = cx * view;
  const cyV = cy * view;
  const widthV = width * view;
  const transform = rotation ? `rotate(${rotation} ${cxV} ${cyV})` : undefined;

  if (type === 'rectangle') {
    const heightV = widthV * ratio;
    return (
      <rect
        x={cxV - widthV / 2}
        y={cyV - heightV / 2}
        width={widthV}
        height={heightV}
        rx={Math.min(widthV, heightV) * 0.08}
        transform={transform}
        {...svgProps}
      />
    );
  }

  if (type === 'ellipse') {
    const ry = (widthV * ratio) / 2;
    return <ellipse cx={cxV} cy={cyV} rx={widthV / 2} ry={ry} transform={transform} {...svgProps} />;
  }

  // Equilateral triangle: circumradius R = side / √3, vertices spaced 120°
  // apart starting straight up so it reads as "pointing up" before rotation.
  const R = widthV / Math.sqrt(3);
  const points = [0, 1, 2]
    .map((k) => {
      const angle = ((-90 + k * 120) * Math.PI) / 180;
      return `${cxV + R * Math.cos(angle)},${cyV + R * Math.sin(angle)}`;
    })
    .join(' ');
  return <polygon points={points} transform={transform} {...svgProps} />;
}
