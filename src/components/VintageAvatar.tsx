import type { BagItem } from '../shared/premiereRules';

const SKIN_TONES = ['#fce0d2', '#f7d3be', '#fae4d8', '#f4cab2'];
const HAIR_COLORS = ['#5b3124', '#3b2421', '#6e3d2c', '#2f2021', '#855337', '#49302a', '#634133'];
const SHIRT_COLORS = ['#f8bed0', '#cbe5f4', '#fce8a6', '#d6ead0', '#f4c7ab', '#dfd4f0', '#fbd9b4'];

export function VintageAvatar({
  seed,
  size = 46,
}: {
  seed: number;
  size?: number;
}) {
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const hair = HAIR_COLORS[(seed * 3 + 1) % HAIR_COLORS.length];
  const shirt = SHIRT_COLORS[(seed * 2 + 3) % SHIRT_COLORS.length];
  const hasGlasses = seed % 4 === 1 || seed % 9 === 0;
  const hasCap = seed % 5 === 2;
  const isLongHair = seed % 2 === 0;
  const hasBun = seed % 3 === 1 && !hasCap;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="rounded-full border-2 border-[#6d1d36] bg-[#fdf7ec] shrink-0"
    >
      <circle cx="32" cy="32" r="30" fill="#eef6fb" />

      {/* Back hair for long styles */}
      {isLongHair && (
        <path
          d="M15,34 C14,20 22,12 32,12 C42,12 50,20 49,34 L48,49 L16,49 Z"
          fill={hair}
          stroke="#6d1d36"
          strokeWidth="1.8"
        />
      )}

      {/* Top bun */}
      {hasBun && (
        <circle
          cx="32"
          cy="11"
          r="6.5"
          fill={hair}
          stroke="#6d1d36"
          strokeWidth="1.8"
        />
      )}

      {/* Shoulders / Pajama collar */}
      <path
        d="M12,62 C14,49 22,45 32,45 C42,45 50,49 52,62 Z"
        fill={shirt}
        stroke="#6d1d36"
        strokeWidth="1.8"
      />
      <path
        d="M25,46 L32,52 L39,46"
        fill="#fdfbf2"
        stroke="#6d1d36"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Neck & Face */}
      <rect x="28" y="39" width="8" height="8" rx="3" fill={skin} />
      <circle
        cx="32"
        cy="30"
        r="13.5"
        fill={skin}
        stroke="#6d1d36"
        strokeWidth="1.8"
      />

      {/* Rosy cheeks */}
      <circle cx="24" cy="33" r="2.3" fill="#f39ab0" opacity="0.65" />
      <circle cx="40" cy="33" r="2.3" fill="#f39ab0" opacity="0.65" />

      {/* Eyes & Smile */}
      <circle cx="27" cy="29.5" r="1.6" fill="#6d1d36" />
      <circle cx="37" cy="29.5" r="1.6" fill="#6d1d36" />
      <path
        d="M28.5,35 Q32,38 35.5,35"
        fill="none"
        stroke="#6d1d36"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Glasses */}
      {hasGlasses && (
        <g fill="none" stroke="#6d1d36" strokeWidth="1.4">
          <circle cx="27" cy="29.5" r="4.1" />
          <circle cx="37" cy="29.5" r="4.1" />
          <line x1="31.1" y1="29.5" x2="32.9" y2="29.5" />
        </g>
      )}

      {/* Front hair bangs */}
      {!hasCap && (
        <path
          d={
            isLongHair
              ? 'M18.5,28 C19,18 26,15 32,16 C38,15 45,18 45.5,28 C41,22 36,21 32,23 C28,21 23,22 18.5,28 Z'
              : 'M18.5,27 C18,16 25,13 32,13 C39,13 46,16 45.5,27 C43,21 38,19 32,20 C26,19 21,21 18.5,27 Z'
          }
          fill={hair}
          stroke="#6d1d36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      )}

      {/* Cute vintage cap */}
      {hasCap && (
        <g>
          <path
            d="M18,24 C19,14 25,11 32,11 C39,11 45,14 46,24 Z"
            fill="#88b8d8"
            stroke="#6d1d36"
            strokeWidth="1.8"
          />
          <path
            d="M17,24 Q32,21 49,25 Q34,27 17,24 Z"
            fill="#a7cee6"
            stroke="#6d1d36"
            strokeWidth="1.6"
          />
        </g>
      )}
    </svg>
  );
}

export function FoodIllustration({
  type,
  size = 44,
}: {
  type: BagItem['illustrationKey'];
  size?: number;
}) {
  switch (type) {
    case 'pizza':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <circle cx="32" cy="34" r="22" fill="#f7c873" stroke="#6d1d36" strokeWidth="2" />
          <circle cx="32" cy="34" r="18" fill="#ffe79e" stroke="#d99a45" strokeWidth="1.2" />
          <circle cx="25" cy="29" r="3.4" fill="#df6159" stroke="#6d1d36" strokeWidth="1.2" />
          <circle cx="38" cy="27" r="3.4" fill="#df6159" stroke="#6d1d36" strokeWidth="1.2" />
          <circle cx="33" cy="39" r="3.4" fill="#df6159" stroke="#6d1d36" strokeWidth="1.2" />
          <circle cx="24" cy="40" r="2.2" fill="#7ab578" />
          <circle cx="40" cy="37" r="2.2" fill="#7ab578" />
          <line x1="32" y1="16" x2="32" y2="52" stroke="#6d1d36" strokeWidth="1" opacity="0.35" />
          <line x1="14" y1="34" x2="50" y2="34" stroke="#6d1d36" strokeWidth="1" opacity="0.35" />
        </svg>
      );
    case 'canele':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <ellipse cx="32" cy="49" rx="22" ry="6" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.8" />
          <path d="M18,45 L20,27 C21,23 27,23 28,27 L30,45 Z" fill="#b76632" stroke="#6d1d36" strokeWidth="1.8" />
          <path d="M34,45 L36,27 C37,23 43,23 44,27 L46,45 Z" fill="#c7743c" stroke="#6d1d36" strokeWidth="1.8" />
          <path d="M25,47 L27,22 C28,18 36,18 37,22 L39,47 Z" fill="#9f5122" stroke="#6d1d36" strokeWidth="1.8" />
        </svg>
      );
    case 'oc-buou':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <path d="M12,32 C12,48 20,54 32,54 C44,54 52,48 52,32 Z" fill="#fbd4df" stroke="#6d1d36" strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="20" ry="6.5" fill="#f7dba1" stroke="#6d1d36" strokeWidth="1.8" />
          <circle cx="25" cy="31" r="4.5" fill="#8b5d47" stroke="#6d1d36" strokeWidth="1.4" />
          <circle cx="36" cy="30" r="4.8" fill="#7c4e38" stroke="#6d1d36" strokeWidth="1.4" />
          <path d="M23,21 Q25,16 23,12 M33,19 Q35,14 33,10 M42,21 Q44,16 42,12" fill="none" stroke="#6d1d36" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'khoai-tay':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <rect x="20" y="13" width="5" height="22" rx="2" fill="#f7cf61" stroke="#6d1d36" strokeWidth="1.5" transform="rotate(-10 22 24)" />
          <rect x="29" y="10" width="5.5" height="24" rx="2" fill="#fce07c" stroke="#6d1d36" strokeWidth="1.5" />
          <rect x="38" y="13" width="5" height="22" rx="2" fill="#f7cf61" stroke="#6d1d36" strokeWidth="1.5" transform="rotate(10 40 24)" />
          <path d="M17,28 L47,28 L43,53 L21,53 Z" fill="#f8bed0" stroke="#6d1d36" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="41" r="5" fill="#fff4c4" stroke="#6d1d36" strokeWidth="1.4" />
        </svg>
      );
    case 'nem-nuong':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <ellipse cx="32" cy="40" rx="22" ry="12" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="2" />
          <rect x="19" y="29" width="24" height="7" rx="3.5" fill="#d47243" stroke="#6d1d36" strokeWidth="1.6" transform="rotate(-12 31 32)" />
          <rect x="21" y="37" width="24" height="7" rx="3.5" fill="#c76135" stroke="#6d1d36" strokeWidth="1.6" transform="rotate(-6 33 40)" />
          <circle cx="45" cy="42" r="5.5" fill="#f2a24c" stroke="#6d1d36" strokeWidth="1.4" />
          <circle cx="19" cy="42" r="4" fill="#82bc75" stroke="#6d1d36" strokeWidth="1.3" />
        </svg>
      );
    case 'soju-yakult':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <path d="M18,24 L18,52 C18,54 30,54 30,52 L30,24 L27,16 L27,10 L21,10 L21,16 Z" fill="#86c58b" stroke="#6d1d36" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="19" y="30" width="10" height="12" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.2" />
          <path d="M36,30 C35,34 36,37 35,41 L35,51 C35,53 47,53 47,51 L47,41 C46,37 47,34 46,30 Z" fill="#fce8d5" stroke="#6d1d36" strokeWidth="1.8" />
          <rect x="36" y="26" width="10" height="4" rx="1" fill="#e85b6a" stroke="#6d1d36" strokeWidth="1.4" />
        </svg>
      );
    case 'burrata':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <ellipse cx="32" cy="41" rx="22" ry="12" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="2" />
          <circle cx="21" cy="39" r="5" fill="#7fc276" stroke="#6d1d36" strokeWidth="1.4" />
          <circle cx="43" cy="39" r="5" fill="#e86e66" stroke="#6d1d36" strokeWidth="1.4" />
          <path d="M22,38 C22,28 28,24 32,24 C36,24 42,28 42,38 C42,43 37,45 32,45 C27,45 22,43 22,38 Z" fill="#fffdf7" stroke="#6d1d36" strokeWidth="1.8" />
          <path d="M28,25 L32,21 L36,25" fill="none" stroke="#6d1d36" strokeWidth="1.5" />
        </svg>
      );
    case 'drinks':
      return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
          <rect x="12" y="20" width="12" height="32" rx="3" fill="#bde3f5" stroke="#6d1d36" strokeWidth="1.8" />
          <rect x="26" y="16" width="12" height="36" rx="3" fill="#f7e6b7" stroke="#6d1d36" strokeWidth="1.8" />
          <rect x="40" y="23" width="12" height="29" rx="3" fill="#f8bed0" stroke="#6d1d36" strokeWidth="1.8" />
          <path d="M32,16 L37,8" stroke="#6d1d36" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}
