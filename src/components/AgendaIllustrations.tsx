import { useId } from 'react';
import type { AgendaIconKey } from '../shared/agendaData';

export function PajamaSetIllustration({ className = '' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const stripeId = `pajama-stripes-${uid}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 156 144"
      className={`overflow-visible select-none ${className}`}
    >
      <defs>
        <pattern
          id={stripeId}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-10)"
        >
          <rect width="6" height="12" fill="#fbd2df" />
          <rect x="6" width="6" height="12" fill="#fdfaf5" />
        </pattern>
      </defs>

      {/* Excitement burst lines at top-left */}
      <g stroke="#6d1d36" strokeWidth="2.4" strokeLinecap="round">
        <line x1="20" y1="30" x2="10" y2="17" />
        <line x1="29" y1="22" x2="27" y2="9" />
        <line x1="16" y1="42" x2="4" y2="39" />
      </g>

      {/* Pajama Pants (right-back) */}
      <g transform="translate(88, 18) rotate(5)">
        <path
          d="M4,6 C16,10 38,10 50,6 L56,82 C56,85 52,87 47,87 L36,87 L29,40 L25,87 L13,87 C8,87 4,85 4,82 Z"
          fill={`url(#${stripeId})`}
          stroke="#6d1d36"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        {/* Elastic waistband */}
        <path
          d="M4,6 C16,10 38,10 50,6 L51,14 C38,18 16,18 3,14 Z"
          fill="#fce8ef"
          stroke="#6d1d36"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* Waistband Satin Bow */}
        <path
          d="M27,12 C18,5 12,11 16,16 C19,19 25,15 27,13 Z"
          fill="#f6adc3"
          stroke="#6d1d36"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M27,12 C36,5 42,11 38,16 C35,19 29,15 27,13 Z"
          fill="#f6adc3"
          stroke="#6d1d36"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M25,14 L20,24 M29,14 L34,24"
          stroke="#6d1d36"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="27" cy="13" r="2.6" fill="#ee96b2" stroke="#6d1d36" strokeWidth="1.4" />
      </g>

      {/* Folded Pajama Shirt (front-left) */}
      <g transform="translate(18, 28) rotate(-8)">
        {/* Left & Right Folded Sleeves behind */}
        <path
          d="M8,22 L-4,76 C-5,80 -1,83 5,84 L16,84 L18,34 Z"
          fill={`url(#${stripeId})`}
          stroke="#6d1d36"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M68,22 L80,74 C81,78 77,82 71,82 L60,82 L58,34 Z"
          fill={`url(#${stripeId})`}
          stroke="#6d1d36"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />

        {/* Shirt main folded torso */}
        <path
          d="M12,16 L26,10 L50,10 L64,16 L72,88 C72,92 68,94 63,94 L13,94 C8,94 4,92 4,88 Z"
          fill={`url(#${stripeId})`}
          stroke="#6d1d36"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Subtle fold shadow along bottom */}
        <path
          d="M8,88 C24,92 52,92 68,88 L67,93 L9,93 Z"
          fill="#e7a5b9"
          opacity="0.32"
        />

        {/* Collar */}
        <path
          d="M25,10 L38,26 L20,31 L14,17 Z"
          fill="#fdf8f5"
          stroke="#6d1d36"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M51,10 L38,26 L56,31 L62,17 Z"
          fill="#fdf8f5"
          stroke="#6d1d36"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M26,10 Q38,16 50,10"
          fill="none"
          stroke="#6d1d36"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Center button placket */}
        <line x1="38" y1="26" x2="38" y2="93" stroke="#6d1d36" strokeWidth="1.5" />
        <circle cx="33.5" cy="42" r="2.2" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.3" />
        <circle cx="33.5" cy="60" r="2.2" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.3" />
        <circle cx="33.5" cy="78" r="2.2" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.3" />

        {/* Breast pocket with cute pink heart */}
        <path
          d="M44,44 L61,44 L61,59 C61,63 57,66 52.5,66 C48,66 44,63 44,59 Z"
          fill="#fdf8f5"
          stroke="#6d1d36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <line x1="44" y1="48" x2="61" y2="48" stroke="#df7e99" strokeWidth="1.4" />
        <path
          d="M52.5,58.5 C52.5,58.5 47.5,55.5 47.5,52.8 C47.5,51.2 48.8,50.2 50.2,50.2 C51.2,50.2 52,50.8 52.5,51.6 C53,50.8 53.8,50.2 54.8,50.2 C56.2,50.2 57.5,51.2 57.5,52.8 C57.5,55.5 52.5,58.5 52.5,58.5 Z"
          fill="#f28aa8"
          stroke="#6d1d36"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function AgendaTimelineIcon({
  type,
  className = 'w-8 h-8',
}: {
  type: AgendaIconKey;
  className?: string;
}) {
  switch (type) {
    case 'bag':
      return (
        <svg aria-hidden="true" viewBox="0 0 44 44" className={`${className} shrink-0 overflow-visible`}>
          {/* Small burst lines */}
          <g stroke="#6d1d36" strokeWidth="1.4" strokeLinecap="round">
            <line x1="8" y1="10" x2="4" y2="6" />
            <line x1="36" y1="10" x2="40" y2="6" />
            <line x1="38" y1="16" x2="42" y2="15" />
          </g>
          {/* Ruffled top */}
          <path
            d="M15,7 Q18,4 22,7 Q26,4 29,7 L27,13 L17,13 Z"
            fill="#f9cad6"
            stroke="#6d1d36"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Bag pouch */}
          <path
            d="M17,13 C11,19 8,28 10,36 C11,39 16,40 22,40 C28,40 33,39 34,36 C36,28 33,19 27,13 Z"
            fill="#fbd4df"
            stroke="#6d1d36"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Bow & cinch */}
          <path
            d="M17,13 C13,10 10,13 13,16 C15,18 19,15 21,14 Z"
            fill="#f5a9bf"
            stroke="#6d1d36"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M27,13 C31,10 34,13 31,16 C29,18 25,15 23,14 Z"
            fill="#f5a9bf"
            stroke="#6d1d36"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="22" cy="14" r="2.2" fill="#eb8dab" stroke="#6d1d36" strokeWidth="1.2" />
          {/* ? mark */}
          <text
            x="22"
            y="33"
            textAnchor="middle"
            fill="#6d1d36"
            fontFamily="var(--font-display)"
            fontWeight="800"
            fontSize="15"
          >
            ?
          </text>
        </svg>
      );

    case 'camera':
      return (
        <svg aria-hidden="true" viewBox="0 0 44 44" className={`${className} shrink-0 overflow-visible`}>
          {/* Top flash / sparkles */}
          <g stroke="#6d1d36" strokeWidth="1.4" strokeLinecap="round">
            <line x1="16" y1="8" x2="14" y2="4" />
            <line x1="22" y1="7" x2="22" y2="3" />
            <line x1="28" y1="8" x2="30" y2="4" />
          </g>
          {/* Shutter button & viewfinder bump */}
          <rect x="15" y="10" width="12" height="5" rx="1.5" fill="#f7c873" stroke="#6d1d36" strokeWidth="1.5" />
          <rect x="8" y="12" width="5" height="3" rx="1" fill="#f5a9bf" stroke="#6d1d36" strokeWidth="1.3" />
          {/* Camera body */}
          <rect x="5" y="15" width="34" height="22" rx="4.5" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.7" />
          {/* Pastel pink stripe band */}
          <rect x="5" y="21" width="34" height="10" fill="#fbd4df" stroke="#6d1d36" strokeWidth="1.3" />
          {/* Flash window */}
          <rect x="30" y="17.5" width="5" height="3.5" rx="1" fill="#fef2b8" stroke="#6d1d36" strokeWidth="1.1" />
          {/* Lens */}
          <circle cx="22" cy="26" r="7.5" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.7" />
          <circle cx="22" cy="26" r="5" fill="#779ab5" stroke="#6d1d36" strokeWidth="1.4" />
          <circle cx="20.5" cy="24.5" r="1.4" fill="#fdfbf2" />
        </svg>
      );

    case 'cutlery':
      return (
        <svg aria-hidden="true" viewBox="0 0 44 44" className={`${className} shrink-0 overflow-visible`}>
          {/* Fork (left, slightly tilted) */}
          <g transform="translate(14, 22) rotate(-8)">
            <path
              d="M-5,-15 L-5,-5 C-5,-1 -2,1 0,1 C2,1 5,-1 5,-5 L5,-15 M-1.6,-15 L-1.6,-5 M1.6,-15 L1.6,-5"
              fill="#fdfbf2"
              stroke="#6d1d36"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M-2.2,1 L2.2,1 L2.8,14 C2.8,16 1.5,17 0,17 C-1.5,17 -2.8,16 -2.8,14 Z"
              fill="#f8bed0"
              stroke="#6d1d36"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </g>
          {/* Knife (right, slightly tilted) */}
          <g transform="translate(30, 22) rotate(10)">
            <path
              d="M-2.5,-15 C2,-15 4,-9 3.5,1 L-2.5,1 Z"
              fill="#fdfbf2"
              stroke="#6d1d36"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M-2.4,1 L2.4,1 L2.8,14 C2.8,16 1.5,17 0,17 C-1.5,17 -2.8,16 -2.8,14 Z"
              fill="#f8bed0"
              stroke="#6d1d36"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    case 'clapper':
      return (
        <svg aria-hidden="true" viewBox="0 0 44 44" className={`${className} shrink-0 overflow-visible`}>
          {/* Top tilted clapper arm */}
          <g transform="translate(7, 15) rotate(-14)">
            <rect x="0" y="-5" width="30" height="6" rx="1.5" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.6" />
            <path d="M5,-5 L9,1 M13,-5 L17,1 M21,-5 L25,1" stroke="#6d1d36" strokeWidth="2.4" />
          </g>
          {/* Hinge bar */}
          <rect x="7" y="16" width="30" height="5" rx="1" fill="#fdfbf2" stroke="#6d1d36" strokeWidth="1.6" />
          <path d="M12,16 L15,21 M20,16 L23,21 M28,16 L31,21" stroke="#6d1d36" strokeWidth="2.2" />
          {/* Pink slate body */}
          <rect x="7" y="21" width="30" height="17" rx="3" fill="#f9bed0" stroke="#6d1d36" strokeWidth="1.7" />
          {/* Play button triangle inside slate */}
          <path
            d="M19,25.5 L27.5,29.5 L19,33.5 Z"
            fill="#fdfbf2"
            stroke="#6d1d36"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
