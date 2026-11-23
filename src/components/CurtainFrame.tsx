import type { ReactNode } from 'react';

interface CurtainFrameProps {
  children: ReactNode;
}

export function CurtainFrame({ children }: CurtainFrameProps) {
  return (
    <div className="min-h-dvh w-full bg-[#d3e6f2] flex justify-center items-stretch sm:py-6 sm:px-4">
      <div className="relative w-full max-w-[440px] min-h-dvh sm:min-h-[820px] sm:rounded-[28px] sm:border-[3px] sm:border-[#6d1d36] sm:shadow-[0_20px_50px_rgba(109,29,54,0.18)] overflow-hidden carnival-stripes flex flex-col">
        {/* Left Draped Pink Curtain */}
        <svg
          aria-hidden="true"
          viewBox="0 0 64 800"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 left-0 h-full w-9 sm:w-11 z-20 animate-curtain-left"
        >
          <path
            d="M0,0 L48,0 C44,110 34,210 24,300 C34,390 42,490 36,610 C32,700 28,755 32,800 L0,800 Z"
            fill="#fbd4df"
            stroke="#6d1d36"
            strokeWidth="2.5"
          />
          <path
            d="M12,0 C14,130 10,235 8,320 C16,420 20,520 14,640 C11,715 10,760 12,800"
            fill="none"
            stroke="#e99fb4"
            strokeWidth="2.5"
          />
          <path
            d="M26,0 C25,105 20,195 16,285"
            fill="none"
            stroke="#6d1d36"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M18,315 C24,415 28,510 23,620"
            fill="none"
            stroke="#6d1d36"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Tie-back ribbon on left curtain */}
          <path
            d="M0,305 Q16,315 26,302 Q15,295 0,298 Z"
            fill="#f4a8be"
            stroke="#6d1d36"
            strokeWidth="2"
          />
        </svg>

        {/* Right Draped Pink Curtain */}
        <svg
          aria-hidden="true"
          viewBox="0 0 64 800"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 right-0 h-full w-9 sm:w-11 z-20 animate-curtain-right"
        >
          <path
            d="M64,0 L16,0 C20,110 30,210 40,300 C30,390 22,490 28,610 C32,700 36,755 32,800 L64,800 Z"
            fill="#fbd4df"
            stroke="#6d1d36"
            strokeWidth="2.5"
          />
          <path
            d="M52,0 C50,130 54,235 56,320 C48,420 44,520 50,640 C53,715 54,760 52,800"
            fill="none"
            stroke="#e99fb4"
            strokeWidth="2.5"
          />
          <path
            d="M38,0 C39,105 44,195 48,285"
            fill="none"
            stroke="#6d1d36"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M46,315 C40,415 36,510 41,620"
            fill="none"
            stroke="#6d1d36"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Tie-back ribbon on right curtain */}
          <path
            d="M64,305 Q48,315 38,302 Q49,295 64,298 Z"
            fill="#f4a8be"
            stroke="#6d1d36"
            strokeWidth="2"
          />
        </svg>

        {/* Top Scalloped Curtain Valance */}
        <svg
          aria-hidden="true"
          viewBox="0 0 440 74"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 left-0 w-full h-14 z-30 animate-valance"
        >
          <path
            d="M0,0 L440,0 L440,24 Q395,56 352,24 Q308,56 264,24 Q220,56 176,24 Q132,56 88,24 Q44,56 0,24 Z"
            fill="#fbd4df"
            stroke="#6d1d36"
            strokeWidth="2.5"
          />
          <path
            d="M0,12 Q44,40 88,12 Q132,40 176,12 Q220,40 264,12 Q308,40 352,12 Q395,40 440,12"
            fill="none"
            stroke="#e89cb2"
            strokeWidth="2.5"
          />
          <path
            d="M0,0 L440,0 L440,16 Q385,36 330,14 Q275,36 220,14 Q165,36 110,14 Q55,36 0,16 Z"
            fill="#f6b5c7"
            stroke="#6d1d36"
            strokeWidth="2"
          />
        </svg>

        {/* Bottom Scalloped Carnival Trim */}
        <svg
          aria-hidden="true"
          viewBox="0 0 440 26"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 w-full h-5 z-30"
        >
          <path
            d="M0,26 L440,26 L440,12 Q418,2 396,12 Q374,2 352,12 Q330,2 308,12 Q286,2 264,12 Q242,2 220,12 Q198,2 176,12 Q154,2 132,12 Q110,2 88,12 Q66,2 44,12 Q22,2 0,12 Z"
            fill="#f9c8d6"
            stroke="#6d1d36"
            strokeWidth="2"
          />
        </svg>

        {/* Main Stage Content */}
        <main className="relative z-10 flex-1 flex flex-col px-9 sm:px-10 pt-14 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
