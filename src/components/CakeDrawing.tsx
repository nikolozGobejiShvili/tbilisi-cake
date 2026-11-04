/**
 * The cake in cross-section, at real scale beside a fork. Everything is drawn in code, so it
 * works for any size and filling. Layers grow upward through CSS, keyed to the choices.
 */
const PX_PER_CM = 8;
const CANVAS = 400;
const GROUND = CANVAS - 14;
const FORK_CM = 19;

type Props = {
  tiers: readonly number[];
  tierHeight: number;
  desserts?: number;
  sponge: string;
  cream: string;
  accent: string;
  label: string;
  forkLabel: string;
  animate?: boolean;
  /** Crops the empty sky above the drawing. The builder leaves it, so the cake can grow into it. */
  fit?: boolean;
};

function Tier({ x, y, width, height, sponge, cream, accent, first }: { x: number; y: number; width: number; height: number; sponge: string; cream: string; accent: string; first: number }) {
  const layers = 7;
  const layerHeight = height / layers;
  return (
    <g>
      <rect x={x - 3} y={y - 3} width={width + 6} height={height + 3} fill="#fffaf7" />
      {Array.from({ length: layers }, (_, i) => {
        const isCream = i % 2 === 1;
        return (
          <rect
            key={i}
            className="slice-layer"
            style={{ animationDelay: `${(first + i) * 45}ms`, fill: isCream ? cream : sponge }}
            x={x}
            y={y + height - (i + 1) * layerHeight}
            width={width}
            height={layerHeight + 0.5}
          />
        );
      })}
      {/* The filling's accent, as a thin line through the middle cream layer. */}
      <rect className="slice-layer" style={{ animationDelay: `${(first + 4) * 45}ms`, fill: accent }} x={x} y={y + height / 2 - 1} width={width} height={2} />
    </g>
  );
}

export function CakeDrawing({ tiers, tierHeight, desserts = 0, sponge, cream, accent, label, forkLabel, animate = false, fit = false }: Props) {
  const centre = 150;
  const height = tierHeight * PX_PER_CM;
  const drawn = tiers.map((diameter, i) => {
    const width = diameter * PX_PER_CM;
    const y = GROUND - (i + 1) * height;
    return { key: `${diameter}-${y}`, x: centre - width / 2, y, width, first: i * 2 };
  });

  const miniCount = Math.min(desserts, 40);
  const forkTop = GROUND - FORK_CM * PX_PER_CM;
  const stackTop = GROUND - tiers.length * height;
  const skyline = fit ? Math.max(0, Math.min(forkTop, stackTop) - 8) : 0;

  return (
    <svg
      viewBox={`0 ${skyline} ${CANVAS} ${CANVAS - skyline}`}
      role="img"
      aria-label={label}
      className={`cake-drawing w-full h-auto ${animate ? "is-animated" : ""}`}
      style={{ maxWidth: CANVAS }}
    >
      <line x1="0" x2={CANVAS} y1={GROUND} y2={GROUND} stroke="currentColor" strokeWidth="1" />

      {drawn.map((tier) => (
        <Tier key={tier.key} x={tier.x} y={tier.y} width={tier.width} height={height} sponge={sponge} cream={cream} accent={accent} first={tier.first} />
      ))}

      {Array.from({ length: miniCount }, (_, i) => {
        const perRow = 8;
        const size = 30;
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = 6 + col * (size + 6);
        const top = GROUND - (row + 1) * (size + 6);
        return <Tier key={i} x={x} y={top} width={size} height={size} sponge={sponge} cream={cream} accent={accent} first={i % 6} />;
      })}

      {/* A fork at the same scale, so the size means something. */}
      <g fill="currentColor" aria-hidden="true">
        <rect x="363" y={forkTop + 44} width="6" height={FORK_CM * PX_PER_CM - 44} rx="2" />
        <path d={`M352 ${forkTop} v34 q0 14 14 16 h0 q14 -2 14 -16 v-34 h-3 v30 h-3 v-30 h-3 v30 h-2 v-30 h-3 v30 h-3 v-30 h-3 v30 h-3 v-30 z`} />
      </g>
      <text x="366" y={forkTop - 8} textAnchor="middle" fontSize="13" fill="currentColor" className="visually-hidden">
        {forkLabel}
      </text>
    </svg>
  );
}
