import React from 'react';

export interface AlyoxaConstellationProps {
  className?: string;
}

export const AlyoxaConstellation: React.FC<AlyoxaConstellationProps> = ({
  className = '',
}) => {
  return (
    <div className={`relative w-full flex items-center justify-center overflow-visible ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 675"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      >
        <defs />

        {/* LAYER 3: PATH TOPOLOGY (IDLE & ACTIVE) */}
        <g id="layer-paths">
          {/* IDLE PATHS */}
          <g
            id="layer-paths-idle"
            stroke="currentColor"
            strokeWidth="1.25"
            fill="none"
            opacity="0.25"
            strokeDasharray="4 4"
          >
            <path d="M 312 190 H 480 C 510 190, 520 270, 540 270 H 540" />
            <path d="M 660 270 H 680 C 700 270, 710 190, 740 190 H 888" />
            <path d="M 920 222 V 448" />
            <path d="M 888 480 H 312" />
            <path d="M 280 448 V 330 C 280 270, 480 270, 540 270 H 540" />
            <path d="M 660 270 C 740 270, 760 480, 888 480" opacity="0.15" />
          </g>

          {/* ACTIVE PATH OVERLAYS */}
          <g id="layer-paths-active" strokeWidth="1.25" fill="none" opacity="0.5">
            <path
              d="M 312 190 H 480 C 510 190, 520 270, 540 270 H 540"
              stroke="currentColor"
              className="anim-path-flow"
            />
            <path
              d="M 660 270 H 680 C 700 270, 710 190, 740 190 H 888"
              stroke="currentColor"
              className="anim-path-flow"
            />
            <path
              d="M 920 222 V 448"
              stroke="currentColor"
              className="anim-path-flow"
            />
            <path
              d="M 888 480 H 312"
              stroke="currentColor"
              className="anim-path-flow"
            />
            <path
              d="M 280 448 V 330 C 280 270, 480 270, 540 270 H 540"
              stroke="currentColor"
              className="anim-path-flow"
            />
          </g>
        </g>

        {/* LAYER 5: NODE GEOMETRIES */}
        <g id="layer-nodes">
          {/* NODE 1: AI CORE */}
          <g id="node-ai" transform="translate(600, 270)">
            <g className="anim-ai-outer">
              <rect
                x="-56"
                y="-56"
                width="112"
                height="112"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.4"
                rx="4"
              />
              <rect
                x="-44"
                y="-44"
                width="88"
                height="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="6 12"
              />
            </g>
            <g className="anim-ai-inner">
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="#F0EDE4"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <path
                d="M 0 -36 V -30 M 0 36 V 30 M -36 0 H -30 M 36 0 H 30"
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
            </g>
            <circle
              cx="0"
              cy="0"
              r="18"
              fill="#E8E4DB"
              stroke="currentColor"
              strokeWidth="1"
              className="anim-ai-core-pulse"
            />
            <circle cx="0" cy="0" r="3.5" fill="currentColor" />
          </g>

          {/* NODE 2: SIGNAL */}
          <g id="node-signal" transform="translate(280, 190)">
            <rect
              x="-28"
              y="-28"
              width="56"
              height="56"
              rx="4"
              fill="#F0EDE4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeOpacity="0.4"
            />
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <circle cx="0" cy="0" r="3" fill="currentColor" />
          </g>

          {/* NODE 3: FORGE */}
          <g id="node-forge" transform="translate(920, 190)">
            <rect
              x="-28"
              y="-28"
              width="56"
              height="56"
              rx="4"
              fill="#F0EDE4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeOpacity="0.4"
            />
            <rect
              x="-8"
              y="-8"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <circle cx="0" cy="0" r="2.5" fill="currentColor" />
          </g>

          {/* NODE 4: PULSE */}
          <g id="node-pulse" transform="translate(920, 480)">
            <rect
              x="-28"
              y="-28"
              width="56"
              height="56"
              rx="4"
              fill="#F0EDE4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeOpacity="0.4"
            />
            <path
              d="M -10 0 C -10 -6, -5 -10, 0 -10 C 5 -10, 10 -6, 10 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="0" cy="4" r="2" fill="currentColor" />
          </g>

          {/* NODE 5: VAULT */}
          <g id="node-vault" transform="translate(280, 480)">
            <rect
              x="-28"
              y="-28"
              width="56"
              height="56"
              rx="4"
              fill="#F0EDE4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeOpacity="0.4"
            />
            <rect
              x="-9"
              y="-12"
              width="18"
              height="14"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <circle cx="0" cy="-5" r="1.5" fill="currentColor" />
          </g>
        </g>

        {/* LAYER 6: TYPOGRAPHY & MICRO-LABELS */}
        <g id="layer-labels" fill="currentColor">
          {/* AI CORE TYPOGRAPHY */}
          <g transform="translate(600, 270)">
            <text x="0" y="50" className="alx-text-title font-mono tracking-widest text-[11px]" textAnchor="middle">
              ALYOXA CORE
            </text>
            <text x="0" y="64" className="alx-text-role font-mono tracking-wider text-[9px]" textAnchor="middle" opacity="0.7">
              ORCHESTRATION &amp; REASONING
            </text>
          </g>

          {/* SIGNAL TYPOGRAPHY */}
          <g transform="translate(280, 190)">
            <text x="0" y="46" className="alx-text-title font-mono tracking-widest text-[11px]" textAnchor="middle">
              SIGNAL
            </text>
            <text x="0" y="58" className="alx-text-role font-mono tracking-wider text-[9px]" textAnchor="middle" opacity="0.7">
              OBSERVATION
            </text>
          </g>

          {/* FORGE TYPOGRAPHY */}
          <g transform="translate(920, 190)">
            <text x="0" y="46" className="alx-text-title font-mono tracking-widest text-[11px]" textAnchor="middle">
              FORGE
            </text>
            <text x="0" y="58" className="alx-text-role font-mono tracking-wider text-[9px]" textAnchor="middle" opacity="0.7">
              EXECUTION
            </text>
          </g>

          {/* PULSE TYPOGRAPHY */}
          <g transform="translate(920, 480)">
            <text x="0" y="46" className="alx-text-title font-mono tracking-widest text-[11px]" textAnchor="middle">
              PULSE
            </text>
            <text x="0" y="58" className="alx-text-role font-mono tracking-wider text-[9px]" textAnchor="middle" opacity="0.7">
              COMMUNICATION
            </text>
          </g>

          {/* VAULT TYPOGRAPHY */}
          <g transform="translate(280, 480)">
            <text x="0" y="46" className="alx-text-title font-mono tracking-widest text-[11px]" textAnchor="middle">
              VAULT
            </text>
            <text x="0" y="58" className="alx-text-role font-mono tracking-wider text-[9px]" textAnchor="middle" opacity="0.7">
              MEMORY
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AlyoxaConstellation;