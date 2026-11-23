import { motion, AnimatePresence } from 'motion/react';
import type { BagItem } from '../shared/premiereRules';
import { FoodIllustration } from './VintageAvatar';

interface BlindBagProps {
  isFull: boolean;
  isOpened: boolean;
  isOpening: boolean;
  items?: readonly BagItem[] | null;
}

export function BlindBag({ isFull, isOpened, isOpening, items }: BlindBagProps) {
  const showOpen = isOpened || isOpening;

  return (
    <div
      className="relative flex flex-col items-center justify-center my-1 select-none"
      data-testid="blind-bag"
      data-bag-state={showOpen ? 'opened' : isFull ? 'ready' : 'locked'}
    >
      {/* Revealed treats springing out of the opened pouch */}
      <AnimatePresence>
        {showOpen && items && items.length > 0 && (
          <motion.div
            key="revealed-treats"
            initial={{ opacity: 0, y: 42, scale: 0.55 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 -mb-11 flex items-end justify-center gap-2"
          >
            {/* Left sparkle */}
            <motion.svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mb-7"
            >
              <path
                d="M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z"
                fill="#ecc24b"
                stroke="#6d1d36"
                strokeWidth="1.2"
              />
            </motion.svg>

            <motion.div initial={{ rotate: -8 }} animate={{ rotate: -5 }} transition={{ duration: 0.45, delay: 0.25 }}>
              <FoodIllustration type={items[0].illustrationKey} size={62} />
            </motion.div>

            {items[1] && (
              <motion.div initial={{ rotate: 8 }} animate={{ rotate: 5 }} transition={{ duration: 0.45, delay: 0.3 }}>
                <FoodIllustration type={items[1].illustrationKey} size={62} />
              </motion.div>
            )}

            {/* Right sparkle */}
            <motion.svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              initial={{ scale: 0, rotate: 30 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mb-7"
            >
              <path
                d="M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z"
                fill="#ecc24b"
                stroke="#6d1d36"
                strokeWidth="1.2"
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Striped Fabric Pouch SVG */}
      <div className={isFull && !showOpen ? 'animate-bag-ready' : ''}>
        <svg
          aria-hidden="true"
          viewBox="0 0 240 210"
          className={
            showOpen
              ? 'w-[172px] h-[150px] sm:w-[184px] sm:h-[160px] overflow-visible'
              : 'w-[196px] h-[174px] sm:w-[214px] sm:h-[190px] overflow-visible'
          }
        >
          <defs>
            <pattern
              id="bagStripesPattern"
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <rect width="11" height="22" fill="#f9cad6" />
              <rect x="11" width="11" height="22" fill="#fdf8f2" />
            </pattern>
            <clipPath id="bagBodyClip">
              <path d="M72,56 C48,88 30,132 38,176 C42,196 76,204 120,204 C164,204 198,196 202,176 C210,132 192,88 168,56 Z" />
            </clipPath>
          </defs>

          {/* Excitement burst lines around the bag when closed */}
          {!showOpen && (
            <g stroke="#6d1d36" strokeWidth="2.4" strokeLinecap="round" opacity={isFull ? 0.95 : 0.65}>
              <line x1="42" y1="68" x2="26" y2="54" />
              <line x1="36" y1="84" x2="18" y2="79" />
              <line x1="41" y1="100" x2="25" y2="103" />

              <line x1="198" y1="68" x2="214" y2="54" />
              <line x1="204" y1="84" x2="222" y2="79" />
              <line x1="199" y1="100" x2="215" y2="103" />
            </g>
          )}

          {/* Top ruffled fabric collar connected directly to pouch body */}
          <motion.g
            animate={
              showOpen
                ? { scaleX: 1.24, scaleY: 0.95, y: 26 }
                : { scaleX: 1, scaleY: 1, y: 0 }
            }
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: '120px 58px' }}
          >
            <path
              d="M66,26 Q84,12 102,24 Q120,10 138,24 Q156,12 174,26 L168,62 L72,62 Z"
              fill="url(#bagStripesPattern)"
              stroke="#6d1d36"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M90,26 L94,58 M120,22 L120,58 M150,26 L146,58"
              stroke="#6d1d36"
              strokeWidth="1.4"
              opacity="0.45"
            />
          </motion.g>

          {/* Main striped pouch body */}
          <motion.g
            animate={showOpen ? { scaleY: 0.85, y: 8 } : { scaleY: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: '120px 200px' }}
          >
            <path
              d="M72,56 C48,88 30,132 38,176 C42,196 76,204 120,204 C164,204 198,196 202,176 C210,132 192,88 168,56 Z"
              fill="url(#bagStripesPattern)"
              stroke="#6d1d36"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path
              d="M42,175 C60,194 180,194 198,175 C195,194 164,202 120,202 C76,202 45,194 42,175 Z"
              fill="#e4a9ba"
              opacity="0.35"
              clipPath="url(#bagBodyClip)"
            />
          </motion.g>

          {/* Untied ribbon tails when opened (matching screen 4!) */}
          <AnimatePresence>
            {showOpen && (
              <motion.g
                key="untied-tails"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.12 }}
              >
                <path
                  d="M52,86 C30,94 20,110 28,126 C36,115 46,108 58,98 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M188,86 C210,94 220,110 212,126 C204,115 194,108 182,98 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M52,86 Q120,102 188,86"
                  fill="none"
                  stroke="#f8bed0"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M52,86 Q120,102 188,86"
                  fill="none"
                  stroke="#6d1d36"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Satin Pink Bow & Question Tag (animates apart & vanishes on open) */}
          <AnimatePresence>
            {!showOpen && (
              <motion.g
                key="closed-bow-and-tag"
                exit={{ opacity: 0, scale: 1.15, y: -12 }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
                style={{ transformOrigin: '120px 72px' }}
              >
                {/* Ribbon cinch band */}
                <path
                  d="M72,56 Q120,66 168,56 L169,65 Q120,75 71,65 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="2.2"
                />
                {/* Left & Right Ribbon Tails */}
                <path
                  d="M114,66 C94,85 78,105 74,124 L89,115 L97,128 C102,108 110,84 118,68 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M126,66 C146,85 162,105 166,124 L151,115 L143,128 C138,108 130,84 122,68 Z"
                  fill="#f8bed0"
                  stroke="#6d1d36"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Left Bow Loop */}
                <path
                  d="M115,59 C86,40 60,54 70,74 C80,86 105,74 116,64 Z"
                  fill="#fbd0dd"
                  stroke="#6d1d36"
                  strokeWidth="2.3"
                  strokeLinejoin="round"
                />
                {/* Right Bow Loop */}
                <path
                  d="M125,59 C154,40 180,54 170,74 C160,86 135,74 124,64 Z"
                  fill="#fbd0dd"
                  stroke="#6d1d36"
                  strokeWidth="2.3"
                  strokeLinejoin="round"
                />
                {/* Center Bow Knot */}
                <rect
                  x="111"
                  y="54"
                  width="18"
                  height="15"
                  rx="6"
                  fill="#f4a8be"
                  stroke="#6d1d36"
                  strokeWidth="2.2"
                />

                {/* Cream Scalloped "?" Tag */}
                <g transform="translate(120, 146)">
                  <path
                    d="M0,-33 C10,-33 17,-27 21,-21 C29,-18 33,-10 31,0 C33,10 29,18 21,21 C17,27 10,33 0,33 C-10,33 -17,27 -21,21 C-29,18 -33,10 -31,0 C-33,-10 -29,-18 -21,-21 C-17,-27 -10,-33 0,-33 Z"
                    fill="#fdfbf2"
                    stroke="#6d1d36"
                    strokeWidth="2.3"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="25"
                    fill="none"
                    stroke="#6d1d36"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    opacity="0.55"
                  />
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill="#6d1d36"
                    fontFamily="var(--font-display)"
                    fontWeight="800"
                    fontSize="36"
                  >
                    ?
                  </text>
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>
    </div>
  );
}
