'use client';

import React, { useEffect, useRef } from 'react';

// Refined architectural geometry system: positioned gracefully away from headline text boxes
const ARCHITECTURAL_PATHS = [
  // Upper atmospheric trajectory (well above the headline)
  { id: 'path-1', d: 'M 0,80 C 400,90 700,50 1100,100 C 1300,120 1380,80 1440,95', baseWeight: 0.75, sensitivity: 0.05 },
  // Right-flank structural curve (sweeping down the right column / system manifest area)
  { id: 'path-2', d: 'M 900,0 C 920,300 880,600 950,900', baseWeight: 0.65, sensitivity: 0.04 },
  // Lower baseline trajectory (safely below the body text)
  { id: 'path-3', d: 'M 0,820 C 350,800 650,850 1000,810 C 1250,780 1350,830 1440,815', baseWeight: 0.7, sensitivity: 0.05 },
  // Subtle vertical framing line on the far right margin
  { id: 'path-4', d: 'M 1320,0 C 1325,400 1315,700 1330,900', baseWeight: 0.5, sensitivity: 0.03 },
];

const ANCHOR_NODES = [
  { id: 'node-1', x: 700, y: 70 },
  { id: 'node-2', x: 1100, y: 100 },
  { id: 'node-3', x: 920, y: 350 },
  { id: 'node-4', x: 880, y: 650 },
  { id: 'node-5', x: 650, y: 850 },
];

export default function AlyoxaField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const nodesRef = useRef<(SVGCircleElement | null)[]>([]);

  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const posRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const updatePhysics = () => {
      const target = mouseRef.current;
      const current = posRef.current;

      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;

      const hasPointer = target.active && current.x > -500;

      pathsRef.current.forEach((pathEl, idx) => {
        if (!pathEl) return;
        const pathData = ARCHITECTURAL_PATHS[idx];
        if (!hasPointer) {
          pathEl.style.transform = 'translate(0px, 0px)';
          pathEl.style.opacity = '0.35';
          return;
        }

        const dx = current.x - 720;
        const dy = current.y - 450;
        const distFactor = Math.min(1, Math.max(0, 1 - Math.hypot(dx, dy) / 800));
        
        const offsetX = (current.x - 720) * pathData.sensitivity * distFactor;
        const offsetY = (current.y - 450) * pathData.sensitivity * distFactor;

        pathEl.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
        pathEl.style.opacity = String(0.35 + distFactor * 0.2);
      });

      nodesRef.current.forEach((nodeEl, idx) => {
        if (!nodeEl) return;
        const node = ANCHOR_NODES[idx];
        if (!hasPointer) {
          nodeEl.style.transform = 'translate(0px, 0px)';
          nodeEl.style.opacity = '0.45';
          return;
        }

        const dist = Math.hypot(current.x - node.x, current.y - node.y);
        const influence = Math.max(0, 1 - dist / 400);
        
        const shiftX = (current.x - node.x) * 0.05 * influence;
        const shiftY = (current.y - node.y) * 0.05 * influence;

        nodeEl.style.transform = `translate(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px)`;
        nodeEl.style.opacity = String(0.45 + influence * 0.25);
      });

      rafRef.current = requestAnimationFrame(updatePhysics);
    };

    rafRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -1000, y: -1000, active: false };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 pointer-events-auto overflow-hidden z-0"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <g fill="none" stroke="#004741" strokeLinecap="round" strokeLinejoin="round">
          {ARCHITECTURAL_PATHS.map((p, i) => (
            <path
              key={p.id}
              ref={(el) => { pathsRef.current[i] = el; }}
              d={p.d}
              strokeWidth={p.baseWeight}
              strokeOpacity="0.35"
              style={{ transition: 'opacity 0.4s ease' }}
            />
          ))}

          {/* Restrained connection geometry in negative space */}
          <path
            d="M 700,70 L 920,350 M 1100,100 L 920,350 M 920,350 L 880,650"
            strokeWidth="0.5"
            strokeOpacity="0.18"
            strokeDasharray="4 8"
          />
        </g>

        <g fill="#004741">
          {ANCHOR_NODES.map((node, i) => (
            <circle
              key={node.id}
              ref={(el) => { nodesRef.current[i] = el; }}
              cx={node.x}
              cy={node.y}
              r="2"
              fillOpacity="0.45"
              style={{ transition: 'opacity 0.4s ease' }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}