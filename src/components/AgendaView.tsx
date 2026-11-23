import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AGENDA_SCHEDULE,
  AGENDA_SECTION_TITLE,
  DRESS_CODE_CONTENT,
  PAJAMA_SHOP_SUGGESTIONS,
} from '../shared/agendaData';
import { AgendaTimelineIcon, PajamaSetIllustration } from './AgendaIllustrations';
import { GoldStar } from './CarnivalPlaque';

export function AgendaView() {
  const [isShopListOpen, setIsShopListOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col gap-2.5 pb-1"
      data-testid="agenda-view"
    >
      {/* Dress Code Ticket Card */}
      <section
        aria-labelledby="agenda-dress-code-heading"
        className="relative rounded-[22px] bg-[#fdfbf2] border-2 border-[#6d1d36] shadow-[0_3px_0_rgba(109,29,54,0.16)] p-1.5"
      >
        {/* Left & Right semicircular ticket cutouts */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9px] top-1/2 -translate-y-1/2 w-[16px] h-[22px] rounded-r-full bg-[#e8f2f7] border-y-2 border-r-2 border-[#6d1d36] z-10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[9px] top-1/2 -translate-y-1/2 w-[16px] h-[22px] rounded-l-full bg-[#e8f2f7] border-y-2 border-l-2 border-[#6d1d36] z-10"
        />

        <div className="relative rounded-[16px] border border-dashed border-[#6d1d36]/60 px-2.5 py-2.5 sm:px-3.5">
          {/* Corner stars placed with clear margin from button/links */}
          <GoldStar className="w-3 h-3 absolute left-2 bottom-2 pointer-events-none" />
          <GoldStar className="w-3 h-3 absolute right-2 bottom-2 pointer-events-none" />

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Folded Striped Pajamas Illustration */}
            <div className="w-[88px] sm:w-[104px] shrink-0 flex items-center justify-center">
              <PajamaSetIllustration className="w-full h-auto" />
            </div>

            {/* Dress Code Copy + Collapsible Shop Button */}
            <div className="flex-1 min-w-0 text-center flex flex-col items-center pr-1">
              <h2
                id="agenda-dress-code-heading"
                className="font-display font-extrabold text-[21px] sm:text-[24px] leading-tight text-[#6d1d36] relative inline-block"
              >
                {DRESS_CODE_CONTENT.heading}
                <span
                  aria-hidden="true"
                  className="block h-[3px] w-full rounded-full bg-[#f4a9be]/80 -mt-0.5"
                />
              </h2>

              <div className="mt-1 space-y-0.5 text-[11.5px] sm:text-[12.5px] leading-snug font-medium text-[#6d1d36]">
                {DRESS_CODE_CONTENT.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsShopListOpen((prev) => !prev)}
                aria-expanded={isShopListOpen}
                aria-controls="pajama-shop-suggestions"
                data-testid="toggle-shop-suggestions"
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-full bg-[#fbd8e3] hover:bg-[#f8c4d5] border-[1.5px] border-[#6d1d36] px-3 py-1 min-h-[36px] text-[12px] sm:text-[13px] font-display font-bold text-[#6d1d36] shadow-[0_2px_0_rgba(109,29,54,0.2)] active:translate-y-[1px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36]"
              >
                <span>{DRESS_CODE_CONTENT.toggleLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isShopListOpen ? 'rotate-180' : '-rotate-90'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Collapsible Pajama Shop Recommendations */}
          <AnimatePresence initial={false}>
            {isShopListOpen && (
              <motion.div
                id="pajama-shop-suggestions"
                data-testid="shop-suggestions-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 pt-2.5 pb-2 border-t border-dashed border-[#6d1d36]/30 flex flex-col items-center gap-2">
                  <p className="text-[12px] sm:text-[13px] leading-snug text-center font-medium text-[#6d1d36] max-w-[32ch]">
                    {DRESS_CODE_CONTENT.shopIntro}
                  </p>

                  <div className="w-full grid grid-cols-2 gap-2 px-3 pb-1">
                    {PAJAMA_SHOP_SUGGESTIONS.map((shop) => (
                      <a
                        key={shop.id}
                        href={shop.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`shop-link-${shop.id}`}
                        className="min-h-[44px] rounded-xl bg-[#fceef2] hover:bg-[#f8d7e2] active:translate-y-[1px] border-[1.5px] border-[#6d1d36] px-2.5 py-2 flex items-center justify-between gap-1 text-[13px] sm:text-[13.5px] font-display font-bold text-[#6d1d36] shadow-[0_2px_0_rgba(109,29,54,0.15)] transition-colors no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36]"
                      >
                        <span className="truncate">{shop.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#a44564]" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Evening Schedule ("Lịch tối nay") */}
      <section aria-labelledby="agenda-schedule-heading" className="flex flex-col items-center">
        {/* Scalloped Ribbon Heading */}
        <div className="relative z-10 inline-flex items-center justify-center">
          {/* Left swallowtail ribbon */}
          <svg aria-hidden="true" viewBox="0 0 28 36" className="w-6 h-7 -mr-3 shrink-0">
            <path
              d="M28,5 L3,5 L10,18 L3,31 L28,31 Z"
              fill="#f8d2df"
              stroke="#6d1d36"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative z-10 rounded-full bg-[#fdfbf2] border-2 border-[#6d1d36] px-1 py-0.5 shadow-[0_2px_0_rgba(109,29,54,0.16)]">
            <div className="rounded-full border border-dashed border-[#6d1d36]/60 px-4 py-1 flex items-center gap-2">
              <GoldStar className="w-3.5 h-3.5" />
              <h2
                id="agenda-schedule-heading"
                className="font-display font-extrabold text-[19px] sm:text-[21px] leading-none text-[#6d1d36] whitespace-nowrap"
              >
                {AGENDA_SECTION_TITLE}
              </h2>
              <GoldStar className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Right swallowtail ribbon */}
          <svg aria-hidden="true" viewBox="0 0 28 36" className="w-6 h-7 -ml-3 shrink-0">
            <path
              d="M0,5 L25,5 L18,18 L25,31 L0,31 Z"
              fill="#f8d2df"
              stroke="#6d1d36"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Two-column Timeline Rows with Perfectly Centered Dashed Connector */}
        <div className="relative w-full mt-2 space-y-2" data-testid="agenda-timeline">
          {AGENDA_SCHEDULE.map((item, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === AGENDA_SCHEDULE.length - 1;
            return (
              <div
                key={item.id}
                data-testid={`agenda-row-${item.id}`}
                className="relative z-10 rounded-[16px] bg-[#fdfbf2] border-[1.8px] border-[#6d1d36] px-2.5 py-1.5 shadow-[0_2px_0_rgba(109,29,54,0.13)] grid grid-cols-[96px_14px_1fr] sm:grid-cols-[104px_14px_1fr] items-center gap-1.5 sm:gap-2"
              >
                {/* Left Column: Time Pill */}
                <div className="flex items-center justify-center">
                  <span className="w-full text-center rounded-full bg-[#fce3ec] border border-[#df9cb2] px-1.5 py-1 font-display font-bold text-[14px] sm:text-[15px] leading-none tabular-nums text-[#6d1d36] whitespace-nowrap">
                    {item.time}
                  </span>
                </div>

                {/* Center Timeline Dot Node + Aligned Dashed Stem */}
                <div className="relative self-stretch flex items-center justify-center" aria-hidden="true">
                  {!isFirst && (
                    <span className="pointer-events-none absolute -top-4 bottom-1/2 left-1/2 -translate-x-1/2 border-l-[1.8px] border-dashed border-[#6d1d36]/65" />
                  )}
                  {isFirst && (
                    <span className="pointer-events-none absolute -top-4 bottom-1/2 left-1/2 -translate-x-1/2 border-l-[1.8px] border-dashed border-[#6d1d36]/65" />
                  )}
                  {!isLast && (
                    <span className="pointer-events-none absolute top-1/2 -bottom-4 left-1/2 -translate-x-1/2 border-l-[1.8px] border-dashed border-[#6d1d36]/65" />
                  )}
                  <span className="relative z-10 w-3 h-3 rounded-full bg-[#f8bed0] border-[1.6px] border-[#6d1d36]" />
                </div>

                {/* Right Column: Icon + Activity Title (same font size as time) */}
                <div className="min-w-0 flex items-center gap-2">
                  <AgendaTimelineIcon type={item.iconKey} className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="font-display font-bold text-[14px] sm:text-[15px] leading-snug text-[#6d1d36] break-words">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
