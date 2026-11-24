import { motion } from 'motion/react';
import { Lock, PartyPopper } from 'lucide-react';
import {
  type GuestEntry,
  type TeamPublicView,
} from '../shared/premiereRules';
import { BlindBag } from './BlindBag';
import {
  CarnivalButton,
  GoldStar,
  RibbonBanner,
  ScallopedCard,
} from './CarnivalPlaque';
import { FoodIllustration, VintageAvatar } from './VintageAvatar';

interface TeamViewProps {
  team: TeamPublicView;
  viewerEntry: GuestEntry;
  isOpening: boolean;
  openError: string | null;
  deviceLocked: boolean;
  onOpenBag: () => void;
}

export function TeamView({
  team,
  viewerEntry,
  isOpening,
  openError,
  deviceLocked,
  onOpenBag,
}: TeamViewProps) {
  const remaining = Math.max(0, team.capacity - team.memberCount);
  const emptySlotCount = remaining;

  const ribbonLabel = team.isOpened
    ? 'Túi mù đã mở'
    : `${team.memberCount}/${team.capacity} thành viên`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col justify-between gap-3"
      data-testid="team-view"
      data-team-id={team.teamId}
    >
      {/* Prominent Celebration Banner with Live Team Count */}
      <div
        data-testid="spin-congrats-banner"
        className="rounded-[22px] border-2 border-[#6d1d36] bg-[#fef2b8] px-3.5 py-2.5 text-center shadow-[0_3px_0_rgba(109,29,54,0.16)] space-y-1"
      >
        <div className="flex items-center justify-center gap-1.5 font-display font-bold text-[16px] sm:text-[17px] text-[#6d1d36] leading-snug">
          <PartyPopper className="w-4 h-4 text-[#a44564] shrink-0" aria-hidden="true" />
          <span>
            Chúc mừng {viewerEntry.label} đã gia nhập Đội {team.teamId}!
          </span>
        </div>
        <p
          data-testid="congrats-team-count"
          className="text-xs sm:text-[13px] font-semibold text-[#6d1d36]/90 tabular-nums"
        >
          Hiện tại Đội {team.teamId} đang có {team.memberCount}/{team.capacity} thành viên
        </p>
      </div>

      {/* Team Header Plaque */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-full max-w-[300px] rounded-[28px] bg-[#fdfbf2] border-2 border-[#6d1d36] px-4 py-2 shadow-[0_3px_0_rgba(109,29,54,0.16)] relative">
          <div className="rounded-[20px] border border-dashed border-[#6d1d36]/55 py-1.5 px-3 flex items-center justify-center gap-3">
            <GoldStar className="w-4 h-4" />
            <h1 className="font-display font-extrabold text-[34px] leading-none text-[#6d1d36]">
              Đội {team.teamId}
            </h1>
            <GoldStar className="w-4 h-4" />
          </div>
        </div>

        <RibbonBanner className="-mt-3 z-10">{ribbonLabel}</RibbonBanner>
      </div>

      {/* 5-slot Teammates Cloud Card */}
      <ScallopedCard>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2.5 items-start">
          {team.members.map((slot, index) => {
            const isViewer = slot.entryId === viewerEntry.id;
            return (
              <motion.div
                key={`${slot.entryId}-${slot.memberName}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.16, delay: index * 0.015 }}
                className="flex flex-col items-center text-center min-w-0 w-[64px] sm:w-[70px]"
              >
                <div
                  className={`rounded-full p-0.5 ${
                    isViewer ? 'ring-2 ring-[#df7e99] ring-offset-1 ring-offset-[#fdfbf2]' : ''
                  }`}
                >
                  <VintageAvatar seed={slot.avatarSeed} size={40} />
                </div>
                <span
                  className={`mt-0.5 text-[11px] leading-[1.15] break-words max-w-[74px] ${
                    isViewer ? 'font-bold text-[#6d1d36]' : 'font-semibold text-[#6d1d36]/90'
                  }`}
                >
                  {slot.memberName}
                </span>
                {slot.isPair && (
                  <span className="text-[9.5px] leading-none text-[#a44564] mt-0.5">
                    đi cặp
                  </span>
                )}
              </motion.div>
            );
          })}

          {Array.from({ length: emptySlotCount }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex flex-col items-center text-center opacity-55 w-[64px] sm:w-[70px]"
              aria-label="Vị trí đang chờ đồng đội"
            >
              <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-[#6d1d36]/40 bg-[#f2ebe0] flex items-center justify-center">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#b7a4a8">
                  <circle cx="12" cy="8.5" r="4" />
                  <path d="M5,20 C5,15.5 8,13.5 12,13.5 C16,13.5 19,15.5 19,20 Z" />
                </svg>
              </div>
              <span className="mt-0.5 text-[10px] text-[#6d1d36]/55">Đang chờ</span>
            </div>
          ))}
        </div>
      </ScallopedCard>

      {/* Center Striped Pink Blind Bag */}
      <BlindBag
        isFull={team.isFull}
        isOpened={team.isOpened}
        isOpening={isOpening}
        items={team.bag?.items ?? null}
      />

      {/* Bottom State: Remaining count OR Khui túi mù CTA OR Revealed Dishes */}
      <div className="flex flex-col items-center gap-1.5">
        {openError && (
          <p role="alert" className="text-xs font-medium text-[#9e1c38] text-center">
            {openError}
          </p>
        )}

        {!team.isFull && (
          <div
            data-testid="remaining-banner"
            className="w-full min-h-[50px] rounded-full bg-[#fdfbf2] border-2 border-[#6d1d36] px-4 py-2 flex items-center justify-center gap-2.5 shadow-[0_3px_0_rgba(109,29,54,0.15)] relative"
          >
            <span className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed border-[#6d1d36]/50" />
            <GoldStar className="w-4 h-4" />
            <span className="font-display font-bold text-[19px] text-[#6d1d36]">
              Còn {remaining} người nữa!
            </span>
            <GoldStar className="w-4 h-4" />
          </div>
        )}

        {team.isFull && !team.isOpened && (
          <CarnivalButton
            variant="pink"
            onClick={onOpenBag}
            disabled={isOpening}
            data-testid="open-bag-button"
          >
            {isOpening ? 'Đang mở túi…' : 'Khui túi mù'}
          </CarnivalButton>
        )}

        {team.isOpened && team.bag && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="w-full"
            data-testid="revealed-bag-card"
          >
            <ScallopedCard>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <GoldStar className="w-3.5 h-3.5" />
                <h2 className="font-display font-bold text-[16px] text-[#6d1d36] text-center">
                  {team.bag.title}
                </h2>
                <GoldStar className="w-3.5 h-3.5" />
              </div>
              <ul className="space-y-1.5">
                {team.bag.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5">
                    <div className="shrink-0">
                      <FoodIllustration type={item.illustrationKey} size={34} />
                    </div>
                    <span className="font-display font-bold text-[14px] leading-snug text-[#6d1d36]">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </ScallopedCard>
          </motion.div>
        )}

        {/* Strict 1-spin-per-device lock badge */}
        {deviceLocked && (
          <div
            data-testid="device-locked-note"
            className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#6d1d36]/75"
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thiết bị đã hoàn tất lượt quay cho {viewerEntry.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
