import { useId } from 'react';

interface PremiereMarqueeHeaderProps {
  className?: string;
}

export function PremiereMarqueeHeader({ className = '' }: PremiereMarqueeHeaderProps) {
  const uid = useId().replace(/:/g, '');
  const archPreWeddingId = `arch-pw-${uid}`;
  const archPremiereId = `arch-pr-${uid}`;
  const archCoupleId = `arch-cp-${uid}`;

  // Symmetric scalloped carnival cloud silhouettes matching the approved design
  const outerCloudPath = [
    'M 200,8',
    'C 226,8 242,24 247,36',
    'C 268,30 296,38 308,58',
    'C 334,54 366,68 378,94',
    'C 394,108 394,138 370,152',
    'C 348,164 316,162 294,154',
    'C 268,162 236,160 200,156',
    'C 164,160 132,162 106,154',
    'C 84,162 52,164 30,152',
    'C 6,138 6,108 22,94',
    'C 34,68 66,54 92,58',
    'C 104,38 132,30 153,36',
    'C 158,24 174,8 200,8 Z',
  ].join(' ');

  const innerCloudPath = [
    'M 200,15',
    'C 222,15 236,29 241,41',
    'C 264,36 290,44 301,63',
    'C 327,60 358,72 370,96',
    'C 385,109 385,135 364,146',
    'C 344,157 314,155 292,147',
    'C 268,154 236,152 200,149',
    'C 164,152 132,154 108,147',
    'C 86,155 56,157 36,146',
    'C 15,135 15,109 30,96',
    'C 42,72 73,60 99,63',
    'C 110,44 136,36 159,41',
    'C 164,29 178,15 200,15 Z',
  ].join(' ');

  const dottedCloudPath = [
    'M 200,20',
    'C 219,20 231,32 236,44',
    'C 259,40 284,48 295,66',
    'C 321,64 350,75 363,98',
    'C 377,110 377,132 359,141',
    'C 341,151 313,149 292,142',
    'C 268,148 236,146 200,143',
    'C 164,146 132,148 108,142',
    'C 87,149 59,151 41,141',
    'C 23,132 23,110 37,98',
    'C 50,75 79,64 105,66',
    'C 116,48 141,40 164,44',
    'C 169,32 181,20 200,20 Z',
  ].join(' ');

  return (
    <div className={`w-full relative select-none ${className}`}>
      <h1 className="sr-only">THE PRE-WEDDING PREMIERE — TANI & LA HỒNG ĐỨC</h1>
      <svg
        viewBox="0 0 400 186"
        className="w-full h-auto overflow-visible drop-shadow-[0_3px_0_rgba(109,29,54,0.14)]"
        role="img"
        aria-label="The Pre-Wedding Premiere — Tani & La Hồng Đức"
      >
        <defs>
          <path id={archPreWeddingId} d="M 46,102 Q 200,64 354,102" />
          <path id={archPremiereId} d="M 74,132 Q 200,104 326,132" />
          <path id={archCoupleId} d="M 88,162 Q 200,145 312,162" />
        </defs>

        {/* Outer pastel blue scalloped cloud rim */}
        <path
          d={outerCloudPath}
          fill="#bee0f2"
          stroke="#6d1d36"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Inner cream cloud */}
        <path
          d={innerCloudPath}
          fill="#fdfbf2"
          stroke="#6d1d36"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />

        {/* Delicate dotted inner border */}
        <path
          d={dottedCloudPath}
          fill="none"
          stroke="#6d1d36"
          strokeWidth="1.2"
          strokeDasharray="2.2 2.4"
          strokeLinejoin="round"
          opacity="0.82"
        />

        {/* Left & Right 8-point Gold Stars */}
        <g transform="translate(38, 121)">
          <path
            d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z"
            fill="#ecc24b"
            stroke="#6d1d36"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M-4.5,-4.5 L0,-1.5 L4.5,-4.5 L1.5,0 L4.5,4.5 L0,1.5 L-4.5,4.5 L-1.5,0 Z"
            fill="#f7dc81"
            stroke="#6d1d36"
            strokeWidth="0.6"
          />
        </g>

        <g transform="translate(362, 121)">
          <path
            d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z"
            fill="#ecc24b"
            stroke="#6d1d36"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M-4.5,-4.5 L0,-1.5 L4.5,-4.5 L1.5,0 L4.5,4.5 L0,1.5 L-4.5,4.5 L-1.5,0 Z"
            fill="#f7dc81"
            stroke="#6d1d36"
            strokeWidth="0.6"
          />
        </g>

        {/* Top "THE" */}
        <text
          x="200"
          y="49"
          textAnchor="middle"
          fill="#f2b2c5"
          stroke="#6d1d36"
          strokeWidth="2.4"
          paintOrder="stroke fill"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="19"
          letterSpacing="1"
        >
          THE
        </text>

        {/* Arched "PRE-WEDDING" */}
        <text
          fill="#f2b2c5"
          stroke="#6d1d36"
          strokeWidth="2.9"
          paintOrder="stroke fill"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="31"
          letterSpacing="0.8"
        >
          <textPath href={`#${archPreWeddingId}`} startOffset="50%" textAnchor="middle">
            PRE-WEDDING
          </textPath>
        </text>

        {/* Arched "PREMIERE" */}
        <text
          fill="#f2b2c5"
          stroke="#6d1d36"
          strokeWidth="2.7"
          paintOrder="stroke fill"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="26"
          letterSpacing="1"
        >
          <textPath href={`#${archPremiereId}`} startOffset="50%" textAnchor="middle">
            PREMIERE
          </textPath>
        </text>

        {/* Curved Ribbon Tails & Folds */}
        <path
          d="M 52,143 L 86,151 L 86,178 L 49,176 L 63,160 Z"
          fill="#f8d2df"
          stroke="#6d1d36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M 80,171 L 89,178 L 89,169 Z"
          fill="#c98097"
          stroke="#6d1d36"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        <path
          d="M 348,143 L 314,151 L 314,178 L 351,176 L 337,160 Z"
          fill="#f8d2df"
          stroke="#6d1d36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M 320,171 L 311,178 L 311,169 Z"
          fill="#c98097"
          stroke="#6d1d36"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Curved Front Ribbon Banner */}
        <path
          d="M 79,143 Q 200,124 321,143 L 321,171 Q 200,152 79,171 Z"
          fill="#fdf1f5"
          stroke="#6d1d36"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />

        {/* Arched "TANI & LA HỒNG ĐỨC" */}
        <text
          fill="#6d1d36"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="16"
          letterSpacing="0.8"
        >
          <textPath href={`#${archCoupleId}`} startOffset="50%" textAnchor="middle">
            TANI &amp; LA HỒNG ĐỨC
          </textPath>
        </text>
      </svg>
    </div>
  );
}
