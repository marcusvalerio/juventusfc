export interface Point {
  x: number;
  y: number;
}

/**
 * Monotone-ish cubic path. Control points are pulled toward the horizontal so
 * the curve never overshoots a data point — important when the line is money.
 */
export function smoothPath(points: Point[], tension = 0.22): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export const scale = (value: number, min: number, max: number, size: number) =>
  max === min ? size / 2 : ((value - min) / (max - min)) * size;

/** Arc path for donut slices. */
export function arcPath(cx: number, cy: number, radius: number, thickness: number, startAngle: number, endAngle: number) {
  const inner = radius - thickness;
  const toXY = (r: number, angle: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = toXY(radius, startAngle);
  const p2 = toXY(radius, endAngle);
  const p3 = toXY(inner, endAngle);
  const p4 = toXY(inner, startAngle);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}
