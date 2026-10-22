"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Point = { id: string; label: string; tech: string; level: string; score: number };

// Drawn at its measured width (not scaled) so 11-12px text stays 11-12px on phones too.
const PAD = { top: 20, right: 16, bottom: 28, left: 36 };
const TICKS = [0, 25, 50, 75, 100];

// Overall interview score over time: one series, 0-100, crosshair + tooltip on hover.
export function ScoreTrend({ points }: { points: Point[] }) {
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const H = W < 500 ? 220 : 280;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (score: number) => PAD.top + innerH - (score / 100) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points.length - 1;

  function nearest(clientX: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  }

  const p = active === null ? null : points[active];

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Interview score over time, ${points.length} interviews, latest ${points[last].score} out of 100`}
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget))}
        onPointerLeave={() => setActive(null)}
        onClick={(e) => router.push(`/interview/${points[nearest(e.clientX, e.currentTarget)].id}`)}
      >
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-chart-grid" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-chart-muted text-[11px] tabular-nums">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-chart-axis" strokeWidth={1} />

        {points.length > 1 && (
          <>
            <path d={area} className="fill-chart-1" fillOpacity={0.1} />
            <path d={line} fill="none" className="stroke-chart-1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} className="stroke-chart-axis" strokeWidth={1} />
        )}

        {points.map((pt, i) => (
          <circle
            key={pt.id}
            cx={x(i)}
            cy={y(pt.score)}
            r={i === active || i === last ? 5 : 4}
            className="fill-chart-1 stroke-background"
            strokeWidth={2}
          />
        ))}

        {/* Direct label on the latest point only. */}
        <text x={x(last)} y={y(points[last].score) - 12} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
          {points[last].score}
        </text>

        <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-chart-muted text-[11px]">
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text x={x(last)} y={H - 8} textAnchor="end" className="fill-chart-muted text-[11px]">
            {points[last].label}
          </text>
        )}
      </svg>

      {p && active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[3px] border border-rule bg-sheet px-3 py-2 text-xs shadow-md"
          style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(p.score) / H) * 100}%`, marginTop: -10 }}
        >
          <p className="font-semibold">{p.score}/100</p>
          <p>
            {p.tech}, <span className="capitalize">{p.level}</span>
          </p>
          <p className="text-ink-soft">{p.label}</p>
        </div>
      )}
    </div>
  );
}
