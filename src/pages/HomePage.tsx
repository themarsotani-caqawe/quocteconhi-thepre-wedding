import { motion } from 'motion/react';
import {
  BrandBadge,
  CarnivalButton,
  GoldStar,
  ScallopedCard,
} from '../components/CarnivalPlaque';
import { CurtainFrame } from '../components/CurtainFrame';
import { PremiereMarqueeHeader } from '../components/PremiereMarqueeHeader';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <CurtainFrame>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col justify-between gap-4 py-1"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandBadge />

          <PremiereMarqueeHeader className="mt-0.5" />

          <ScallopedCard className="w-full">
            <div className="flex flex-col items-center text-center py-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[#a44564]">
                <GoldStar className="w-3.5 h-3.5" />
                <span>Lời mời thân mật</span>
                <GoldStar className="w-3.5 h-3.5" />
              </div>

              <div className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-[#6d1d36]/90 max-w-[32ch]">
                <p>
                  Chào mừng bạn đến ngôi nhà chung{' '}
                  <span className="block font-semibold text-[#6d1d36]">Quốc Tế Có Nhi</span>
                </p>
                <p>
                  Nơi bạn được đặc cách xem trước phim cưới và photobook siêu bá khí của hai tụi mình.
                </p>
                <p className="font-semibold text-[#6d1d36]">
                  Cùng chọn đồng đội và khui túi mù thôi !!!
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-dashed border-[#6d1d36]/25 w-full space-y-0.5 text-[12.5px] font-medium text-[#6d1d36]">
                <p className="tabular-nums">18:00–21:00 · 28.11.2026</p>
                <p>LÀ HOME · 25 Mai Xuân Thưởng, Đà Lạt</p>
                <p className="text-[#a44564] font-semibold">Dress code: Pajamas only</p>
              </div>
            </div>
          </ScallopedCard>
        </div>

        <div className="flex flex-col items-center gap-3 pb-2">
          <a
            href="/the-pre-wedding-premiere"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/the-pre-wedding-premiere');
            }}
            className="w-full block no-underline"
          >
            <CarnivalButton
              type="button"
              variant="pink"
              data-testid="enter-premiere-button"
              className="w-full"
            >
              <span className="text-[16px] sm:text-[17px]">Vào The Pre-Wedding Premiere</span>
            </CarnivalButton>
          </a>
        </div>
      </motion.div>
    </CurtainFrame>
  );
}
