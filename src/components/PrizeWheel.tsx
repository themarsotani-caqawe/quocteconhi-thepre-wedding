import type { TeamId } from '../shared/premiereRules';

interface PrizeWheelProps {
  angle: number;
  isSpinning: boolean;
  inviteBounce: boolean;
  onWheelClick: () => void;
  disabled?: boolean;
}

const BULB_COUNT = 24;

export function PrizeWheel({
  angle,
  isSpinning,
  inviteBounce,
  onWheelClick,
  disabled = false,
}: PrizeWheelProps) {
  const bulbs = Array.from({ length: BULB_COUNT }, (_, i) => {
    const theta = (i * 360) / BULB_COUNT;
    const rad = (theta * Math.PI) / 180;
    const cx = 160 + 135 * Math.cos(rad);
    const cy = 160 + 135 * Math.sin(rad);
    return { cx, cy, i };
  });

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Top golden pointer */}
      <div
        aria-hidden="true"
        className={`relative z-20 -mb-4 transition-transform duration-150 ${
          isSpinning ? 'animate-bounce' : ''
        }`}
      >
        <svg width="34" height="34" viewBox="0 0 36 36">
          <path
            d="M4,5 Q18,2 32,5 L18,33 Z"
            fill="#f4c84b"
            stroke="#6d1d36"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="10" r="2.5" fill="#fdfbf2" />
        </svg>
      </div>

      {/* Wheel button wrapper (hitbox stays stable while inner visual bounces) */}
      <button
        type="button"
        onClick={onWheelClick}
        disabled={disabled || isSpinning}
        aria-label="Chạm vào vòng quay để quay tìm đội"
        data-testid="prize-wheel-button"
        className="relative z-10 w-[244px] h-[244px] sm:w-[272px] sm:h-[272px] rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6d1d36]/40 cursor-pointer disabled:cursor-wait"
      >
        <div
          className={`w-full h-full ${
            inviteBounce && !isSpinning ? 'animate-wheel-invite' : ''
          }`}
        >
        <div
          className="w-full h-full will-change-transform"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: isSpinning
              ? 'transform 4.2s cubic-bezier(0.12, 0.86, 0.16, 1)'
              : 'transform 0.35s ease-out',
          }}
        >
          <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-[0_6px_0_rgba(109,29,54,0.16)]">
            {/* Outer pink carnival rim */}
            <circle cx="160" cy="160" r="148" fill="#f7b9ca" stroke="#6d1d36" strokeWidth="3.2" />
            <circle cx="160" cy="160" r="122" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="2.8" />

            {/* Marquee bulbs around rim */}
            {bulbs.map(({ cx, cy, i }) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="5.2"
                fill={isSpinning && i % 2 === 0 ? '#ffeaa0' : '#fff9ea'}
                stroke="#6d1d36"
                strokeWidth="1.6"
              />
            ))}

            {/* 4 Slices (Đội 1 Top, Đội 2 Right, Đội 3 Bottom, Đội 4 Left) */}
            {/* Đội 1: Top (-135deg to -45deg in standard SVG coords where 0 is 3 o'clock) */}
            <path
              d="M160,160 L73.7,73.7 A122,122 0 0,1 246.3,73.7 Z"
              fill="#fef2b8"
              stroke="#6d1d36"
              strokeWidth="2.4"
            />
            {/* Đội 2: Right (-45deg to 45deg) */}
            <path
              d="M160,160 L246.3,73.7 A122,122 0 0,1 246.3,246.3 Z"
              fill="#fadadd"
              stroke="#6d1d36"
              strokeWidth="2.4"
            />
            {/* Đội 3: Bottom (45deg to 135deg) */}
            <path
              d="M160,160 L246.3,246.3 A122,122 0 0,1 73.7,246.3 Z"
              fill="#fef2b8"
              stroke="#6d1d36"
              strokeWidth="2.4"
            />
            {/* Đội 4: Left (135deg to 225deg) */}
            <path
              d="M160,160 L73.7,246.3 A122,122 0 0,1 73.7,73.7 Z"
              fill="#fadadd"
              stroke="#6d1d36"
              strokeWidth="2.4"
            />

            {/* Quadrant Labels & Vintage Illustrations (all labels upright like approved design) */}
            {/* Đội 1 (Top) */}
            <g transform="translate(160, 160)">
              <text
                x="0"
                y="-86"
                textAnchor="middle"
                fill="#6d1d36"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="20"
              >
                Đội 1
              </text>
              {/* Vintage Acoustic Guitar */}
              <g transform="translate(0, -50) rotate(28)">
                <ellipse cx="0" cy="6" rx="9" ry="11" fill="#8fd3e8" stroke="#6d1d36" strokeWidth="1.8" />
                <ellipse cx="0" cy="-2" rx="6.5" ry="7.5" fill="#8fd3e8" stroke="#6d1d36" strokeWidth="1.8" />
                <circle cx="0" cy="3" r="3" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.4" />
                <rect x="-2" y="-21" width="4" height="16" fill="#d99a5b" stroke="#6d1d36" strokeWidth="1.5" />
                <rect x="-3.2" y="-25" width="6.4" height="5" rx="1" fill="#b77239" stroke="#6d1d36" strokeWidth="1.4" />
              </g>
            </g>

            {/* Đội 2 (Right) */}
            <g transform="translate(160, 160)">
              <text
                x="70"
                y="-12"
                textAnchor="middle"
                fill="#6d1d36"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="20"
              >
                Đội 2
              </text>
              {/* Vintage Camera */}
              <g transform="translate(68, 16)">
                <rect x="-15" y="-10" width="30" height="20" rx="3.5" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.8" />
                <rect x="-15" y="-4" width="30" height="10" fill="#d9dfe6" stroke="#6d1d36" strokeWidth="1.3" />
                <rect x="-7" y="-14" width="10" height="4" rx="1" fill="#f7c873" stroke="#6d1d36" strokeWidth="1.4" />
                <circle cx="0" cy="1" r="6.5" fill="#779ab5" stroke="#6d1d36" strokeWidth="1.8" />
                <circle cx="0" cy="1" r="3" fill="#3a4c60" />
              </g>
            </g>

            {/* Đội 3 (Bottom) */}
            <g transform="translate(160, 160)">
              <text
                x="0"
                y="96"
                textAnchor="middle"
                fill="#6d1d36"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="20"
              >
                Đội 3
              </text>
              {/* Vintage Popcorn Bucket */}
              <g transform="translate(0, 56)">
                <circle cx="-7" cy="-9" r="5" fill="#fff7d1" stroke="#6d1d36" strokeWidth="1.4" />
                <circle cx="0" cy="-12" r="5.5" fill="#fffdf2" stroke="#6d1d36" strokeWidth="1.4" />
                <circle cx="7" cy="-9" r="5" fill="#fff7d1" stroke="#6d1d36" strokeWidth="1.4" />
                <path d="M-12,-6 L12,-6 L9,14 L-9,14 Z" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M-7,-6 L-5,14 M0,-6 L0,14 M7,-6 L5,14" stroke="#df6479" strokeWidth="3.2" />
              </g>
            </g>

            {/* Đội 4 (Left) */}
            <g transform="translate(160, 160)">
              <text
                x="-70"
                y="-12"
                textAnchor="middle"
                fill="#6d1d36"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="20"
              >
                Đội 4
              </text>
              {/* Vintage Pajama Sleep Mask */}
              <g transform="translate(-68, 16)">
                <path
                  d="M-17,-3 C-16,-11 -6,-10 -2,-6 C0,-4 0,-4 2,-6 C6,-10 16,-11 17,-3 C18,6 10,11 4,7 C1,5 -1,5 -4,7 C-10,11 -18,6 -17,-3 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="1.8"
                />
                <path d="M-11,0 Q-8,3 -5,0 M5,0 Q8,3 11,0" fill="none" stroke="#6d1d36" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            </g>

            {/* Center Gold Star Hub */}
            <circle cx="160" cy="160" r="22" fill="#fef2b8" stroke="#6d1d36" strokeWidth="2.4" />
            <path
              d="M160,144 L164.4,153.6 L175,155 L167.2,162.4 L169.2,173 L160,167.8 L150.8,173 L152.8,162.4 L145,155 L155.6,153.6 Z"
              fill="#f4c84b"
              stroke="#6d1d36"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        </div>
      </button>

      {/* Pink Pedestal Base */}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 34"
        className="-mt-6 w-48 h-8 z-0 pointer-events-none"
      >
        <path
          d="M65,4 L155,4 L166,22 L192,22 C197,22 200,26 200,30 L20,30 C20,26 23,22 28,22 L54,22 Z"
          fill="#f7b9ca"
          stroke="#6d1d36"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export const TEAM_ACCENT_LABELS: Record<TeamId, string> = {
  1: 'Đội 1',
  2: 'Đội 2',
  3: 'Đội 3',
  4: 'Đội 4',
};
