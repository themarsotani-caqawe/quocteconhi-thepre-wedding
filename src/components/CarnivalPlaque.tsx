import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function GoldStar({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} animate-star-twinkle shrink-0`}
    >
      <path
        d="M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z"
        fill="#ecc24b"
        stroke="#6d1d36"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandBadge({ label = 'Quốc Tế Có Nhi' }: { label?: string }) {
  return (
    <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#fdfbf2] border-2 border-[#6d1d36] px-4 py-1 shadow-[0_2px_0_#6d1d36]">
      <GoldStar className="w-3.5 h-3.5" />
      <span className="font-display font-bold text-sm tracking-tight text-[#6d1d36] whitespace-nowrap">
        {label}
      </span>
      <GoldStar className="w-3.5 h-3.5" />
    </div>
  );
}

export function RibbonBanner({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto inline-flex items-center justify-center ${className}`}>
      {/* Left ribbon swallowtail */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 34"
        className="w-5 h-8 -mr-2 shrink-0"
      >
        <path
          d="M24,4 L4,4 L11,17 L4,30 L24,30 Z"
          fill="#f8d2dd"
          stroke="#6d1d36"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 bg-[#fce9ef] border-2 border-[#6d1d36] px-5 py-1 rounded-sm shadow-[0_2px_0_rgba(109,29,54,0.18)]">
        <span className="font-display font-bold text-[15px] text-[#6d1d36] whitespace-nowrap">
          {children}
        </span>
      </div>
      {/* Right ribbon swallowtail */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 34"
        className="w-5 h-8 -ml-2 shrink-0"
      >
        <path
          d="M0,4 L20,4 L13,17 L20,30 L0,30 Z"
          fill="#f8d2dd"
          stroke="#6d1d36"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

interface CarnivalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'pink' | 'cream';
  children: ReactNode;
}

export function CarnivalButton({
  variant = 'pink',
  children,
  className = '',
  disabled,
  ...rest
}: CarnivalButtonProps) {
  const bg =
    variant === 'pink'
      ? 'bg-[#f8bed0] hover:bg-[#f5aec4] text-[#6d1d36]'
      : 'bg-[#fdfbf2] hover:bg-[#faf4de] text-[#6d1d36]';

  return (
    <button
      disabled={disabled}
      className={`relative w-full min-h-[50px] rounded-full border-2 border-[#6d1d36] ${bg} shadow-[0_3px_0_#6d1d36] active:translate-y-[2px] active:shadow-[0_1px_0_#6d1d36] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer px-4 py-2.5 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36] focus-visible:ring-offset-2 ${className}`}
      {...rest}
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed border-[#6d1d36]/55" />
      <span className="relative z-10 flex items-center justify-center gap-2.5 font-display font-bold text-[20px] leading-none whitespace-nowrap">
        <GoldStar className="w-4 h-4" />
        <span>{children}</span>
        <GoldStar className="w-4 h-4" />
      </span>
    </button>
  );
}

export function ScallopedCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[26px] bg-[#fdfbf2] border-2 border-[#6d1d36] shadow-[0_3px_0_rgba(109,29,54,0.16)] p-1.5 ${className}`}
    >
      <div className="rounded-[20px] border border-dashed border-[#6d1d36]/60 px-3.5 py-3">
        {children}
      </div>
    </div>
  );
}
