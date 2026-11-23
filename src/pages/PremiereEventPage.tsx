import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AgendaView } from '../components/AgendaView';
import {
  BrandBadge,
  CarnivalButton,
  GoldStar,
} from '../components/CarnivalPlaque';
import { CurtainFrame } from '../components/CurtainFrame';
import { NameSelectorSheet } from '../components/NameSelectorSheet';
import { PremiereMarqueeHeader } from '../components/PremiereMarqueeHeader';
import { PrizeWheel } from '../components/PrizeWheel';
import { TeamView } from '../components/TeamView';
import {
  ENTRY_BY_ID,
  computeWheelTargetAngle,
  type GuestEntry,
  type RoomPublicState,
  type TeamId,
} from '../shared/premiereRules';

function getRoomFromSearch(): 'live' | 'demo' {
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === '1' ? 'demo' : 'live';
}

export function PremiereEventPage() {
  const room = useMemo(() => getRoomFromSearch(), []);
  const storageKey = `qtcnhi_viewer_entry_${room}`;

  const [roomState, setRoomState] = useState<RoomPublicState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved && ENTRY_BY_ID.has(saved) ? saved : null;
    } catch {
      return null;
    }
  });

  // Explicit UI tab ('spin' = "Quay tìm đội", 'agenda' = "Agenda")
  const [activeTab, setActiveTab] = useState<'spin' | 'agenda'>('spin');

  // Explicit override so a guest can switch back to Wheel view when picking another name
  const [forceWheelView, setForceWheelView] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Spin state
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  // Bag opening state
  const [isOpeningBag, setIsOpeningBag] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  // Persist only the currently viewed guest entry ID locally
  useEffect(() => {
    try {
      if (selectedEntryId) {
        localStorage.setItem(storageKey, selectedEntryId);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedEntryId, storageKey]);

  const fetchLatestState = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?room=${room}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Không tải được dữ liệu sự kiện');
      const data = (await res.json()) as RoomPublicState;
      setRoomState(data);
      setLoadError(null);
    } catch {
      setLoadError('Đang kết nối lại máy chủ sự kiện…');
    }
  }, [room]);

  // Real-time SSE subscription + visibility/online resync across phones
  useEffect(() => {
    void fetchLatestState();

    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const connectSse = () => {
      if (closed) return;
      source = new EventSource(`/api/events?room=${room}`);
      source.addEventListener('state', (event) => {
        try {
          const next = JSON.parse((event as MessageEvent).data) as RoomPublicState;
          setRoomState(next);
          setLoadError(null);
        } catch {
          // ignore malformed chunk
        }
      });
      source.onerror = () => {
        source?.close();
        if (!closed && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void fetchLatestState();
            connectSse();
          }, 2000);
        }
      };
    };

    connectSse();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchLatestState();
      }
    };
    const handleOnline = () => {
      void fetchLatestState();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      closed = true;
      source?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (spinTimerRef.current !== null) window.clearTimeout(spinTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchLatestState, room]);

  const selectedEntry = selectedEntryId ? ENTRY_BY_ID.get(selectedEntryId) ?? null : null;
  const assignedTeamId: TeamId | null =
    selectedEntryId && roomState ? roomState.assignments[selectedEntryId] ?? null : null;

  // Show TeamView automatically when the selected guest already has an assigned team
  // and the wheel is not currently in the middle of a spin animation.
  const showTeamView = Boolean(
    !forceWheelView && !isSpinning && selectedEntry && assignedTeamId && roomState
  );

  const handleSelectEntry = (entry: GuestEntry) => {
    setSelectedEntryId(entry.id);
    setSpinError(null);
    setOpenError(null);
    setIsSheetOpen(false);
    // If this guest already spun previously, open their saved team directly
    if (roomState?.assignments[entry.id]) {
      setForceWheelView(false);
    } else {
      setForceWheelView(false);
    }
  };

  const handleStartSpin = async () => {
    if (isSpinning) return;
    setSpinError(null);

    if (!selectedEntryId) {
      setIsSheetOpen(true);
      return;
    }

    // If already assigned in current state, jump straight to their team
    if (roomState?.assignments[selectedEntryId]) {
      setForceWheelView(false);
      return;
    }

    setIsSpinning(true);
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, entryId: selectedEntryId }),
      });
      const payload = (await res.json()) as {
        teamId?: TeamId;
        alreadyAssigned?: boolean;
        state?: RoomPublicState;
        error?: string;
      };

      if (!res.ok || !payload.teamId || !payload.state) {
        throw new Error(payload.error || 'Chưa thể lưu lượt quay, thử lại nhé.');
      }

      const assigned = payload.teamId;
      const latestState = payload.state;

      // If this entry was already assigned earlier (e.g. race or reconnect),
      // go straight to their saved team; otherwise play full spin animation to exact slice!
      if (payload.alreadyAssigned) {
        setRoomState(latestState);
        setIsSpinning(false);
        setForceWheelView(false);
        return;
      }

      const nextAngle = computeWheelTargetAngle(wheelAngle, assigned);
      setWheelAngle(nextAngle);
      setRoomState(latestState);

      spinTimerRef.current = window.setTimeout(() => {
        setIsSpinning(false);
        setForceWheelView(false);
      }, 4350);
    } catch (err) {
      // On network drop after server saved, pull latest state to check if already saved
      await fetchLatestState();
      setIsSpinning(false);
      setSpinError(
        err instanceof Error ? err.message : 'Mạng tạm gián đoạn, vui lòng chạm quay lại.'
      );
    }
  };

  const handleOpenBag = async () => {
    if (!assignedTeamId || isOpeningBag) return;
    setOpenError(null);
    setIsOpeningBag(true);

    try {
      const res = await fetch('/api/open-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room,
          teamId: assignedTeamId,
          entryId: selectedEntryId,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: RoomPublicState;
      };

      if (!res.ok || !payload.ok || !payload.state) {
        throw new Error(payload.error || 'Chưa thể khui túi mù.');
      }

      // Hold brief opening animation state so the bow unties before settling
      window.setTimeout(() => {
        if (payload.state) setRoomState(payload.state);
        setIsOpeningBag(false);
      }, 450);
    } catch (err) {
      setIsOpeningBag(false);
      setOpenError(err instanceof Error ? err.message : 'Không thể khui túi mù lúc này.');
    }
  };

  const handleSwitchViewer = () => {
    setSelectedEntryId(null);
    setForceWheelView(true);
    setOpenError(null);
    setSpinError(null);
    setIsSheetOpen(true);
  };

  const handleDemoAutofill = async () => {
    const targetEntry = selectedEntryId || 'celine-phang';
    const res = await fetch('/api/demo/autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'demo', keepEntryId: targetEntry }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: RoomPublicState };
      setRoomState(data.state);
      if (!selectedEntryId) {
        setSelectedEntryId(targetEntry);
      }
      setForceWheelView(false);
    }
  };

  const handleDemoReset = async () => {
    const res = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'demo' }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: RoomPublicState };
      setRoomState(data.state);
      setSelectedEntryId(null);
      setForceWheelView(false);
      setIsSpinning(false);
      setIsOpeningBag(false);
    }
  };

  return (
    <CurtainFrame>
      {/* Demo-only sandbox helper bar (completely absent in live guest URL) */}
      {room === 'demo' && (
        <div
          data-testid="demo-toolbar"
          className="mb-2 rounded-xl bg-[#fef2b8] border border-[#6d1d36] px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6d1d36]"
        >
          <span>Chế độ thử nghiệm</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDemoAutofill}
              className="underline cursor-pointer hover:text-[#531227]"
            >
              Quay mẫu
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleDemoReset}
              className="underline cursor-pointer hover:text-[#531227]"
            >
              Đặt lại thử
            </button>
          </div>
        </div>
      )}

      {/* Shared Top Header + Event Info + Two Side-by-Side Tabs */}
      <div className="flex flex-col items-center mb-2.5">
        <BrandBadge />

        <PremiereMarqueeHeader className="mt-1" />

        {/* Event Date & Venue Line ("28.11.2026 · LÀ HOME") */}
        <div className="mt-1 rounded-2xl bg-[#fdfbf2]/95 border-[1.5px] border-[#6d1d36] px-3 py-1 text-center shadow-[0_2px_0_rgba(109,29,54,0.12)] w-full">
          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[#6d1d36] tabular-nums">
            <GoldStar className="w-3 h-3" />
            <span>28.11.2026 · LÀ HOME</span>
            <GoldStar className="w-3 h-3" />
          </div>
          <p className="text-[10.5px] font-medium text-[#6d1d36]/85 leading-tight">
            18:00–21:00 · 25 Mai Xuân Thưởng, Đà Lạt
          </p>
        </div>

        {/* Two Side-by-Side Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Nội dung sự kiện"
          className="w-full grid grid-cols-2 gap-1.5 mt-1.5"
        >
          <button
            type="button"
            role="tab"
            id="tab-spin"
            aria-selected={activeTab === 'spin'}
            aria-controls="panel-spin"
            data-testid="tab-spin"
            onClick={() => setActiveTab('spin')}
            className={`relative min-h-[42px] rounded-full border-2 border-[#6d1d36] px-2 py-1.5 flex items-center justify-center gap-1.5 font-display font-bold text-[15px] sm:text-[16px] leading-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36] ${
              activeTab === 'spin'
                ? 'bg-[#f8bed0] text-[#6d1d36] shadow-[0_2px_0_#6d1d36]'
                : 'bg-[#fdfbf2] text-[#6d1d36]/85 hover:bg-[#fceef2]'
            }`}
          >
            {activeTab === 'spin' && (
              <>
                <span className="pointer-events-none absolute inset-[2.5px] rounded-full border border-dashed border-[#6d1d36]/45" />
                <GoldStar className="w-3 h-3 relative z-10" />
              </>
            )}
            <span className="relative z-10 whitespace-nowrap">Quay tìm đội</span>
            {activeTab === 'spin' && <GoldStar className="w-3 h-3 relative z-10" />}
          </button>

          <button
            type="button"
            role="tab"
            id="tab-agenda"
            aria-selected={activeTab === 'agenda'}
            aria-controls="panel-agenda"
            data-testid="tab-agenda"
            onClick={() => setActiveTab('agenda')}
            className={`relative min-h-[42px] rounded-full border-2 border-[#6d1d36] px-2 py-1.5 flex items-center justify-center gap-1.5 font-display font-bold text-[15px] sm:text-[16px] leading-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36] ${
              activeTab === 'agenda'
                ? 'bg-[#f8bed0] text-[#6d1d36] shadow-[0_2px_0_#6d1d36]'
                : 'bg-[#fdfbf2] text-[#6d1d36]/85 hover:bg-[#fceef2]'
            }`}
          >
            {activeTab === 'agenda' && (
              <>
                <span className="pointer-events-none absolute inset-[2.5px] rounded-full border border-dashed border-[#6d1d36]/45" />
                <GoldStar className="w-3 h-3 relative z-10" />
              </>
            )}
            <span className="relative z-10 whitespace-nowrap">Agenda</span>
            {activeTab === 'agenda' && <GoldStar className="w-3 h-3 relative z-10" />}
          </button>
        </div>
      </div>

      {activeTab === 'agenda' ? (
        <div role="tabpanel" id="panel-agenda" aria-labelledby="tab-agenda" className="flex-1 flex flex-col">
          <AgendaView />
        </div>
      ) : (
        <div role="tabpanel" id="panel-spin" aria-labelledby="tab-spin" className="flex-1 flex flex-col">
          {loadError && !roomState && (
            <div className="my-auto text-center text-sm font-medium text-[#6d1d36]">
              {loadError}
            </div>
          )}

          {showTeamView && roomState && assignedTeamId && selectedEntry ? (
            <TeamView
              team={roomState.teams[assignedTeamId]}
              viewerEntry={selectedEntry}
              isOpening={isOpeningBag}
              openError={openError}
              onOpenBag={handleOpenBag}
              onSwitchViewer={handleSwitchViewer}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col justify-between gap-2"
              data-testid="spin-screen"
            >
              {/* 4-Slice Interactive Wheel */}
              <div className="my-auto py-0.5">
                <PrizeWheel
                  angle={wheelAngle}
                  isSpinning={isSpinning}
                  inviteBounce={Boolean(selectedEntryId && !assignedTeamId)}
                  onWheelClick={handleStartSpin}
                  disabled={!roomState}
                />
              </div>

              {/* Name Selector & Spin CTA */}
              <div className="flex flex-col gap-2">
                {spinError && (
                  <p role="alert" className="text-xs font-medium text-[#9e1c38] text-center">
                    {spinError}
                  </p>
                )}

                <NameSelectorSheet
                  isOpen={isSheetOpen}
                  selectedEntryId={selectedEntryId}
                  assignments={roomState?.assignments ?? {}}
                  onOpen={() => setIsSheetOpen(true)}
                  onClose={() => setIsSheetOpen(false)}
                  onSelect={handleSelectEntry}
                  disabled={isSpinning}
                />

                <CarnivalButton
                  type="button"
                  variant="pink"
                  onClick={handleStartSpin}
                  disabled={isSpinning || !roomState}
                  data-testid="spin-cta-button"
                >
                  {isSpinning ? 'Đang quay tìm đội…' : 'Quay liền tay'}
                </CarnivalButton>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </CurtainFrame>
  );
}
