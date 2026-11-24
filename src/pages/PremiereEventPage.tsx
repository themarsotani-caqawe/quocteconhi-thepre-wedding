import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { AgendaView } from '../components/AgendaView';
import {
  BrandBadge,
  CarnivalButton,
  GoldStar,
} from '../components/CarnivalPlaque';
import { CurtainFrame } from '../components/CurtainFrame';
import { NameSelectorSheet } from '../components/NameSelectorSheet';
import { OwnerDashboard } from '../components/OwnerDashboard';
import { PremiereMarqueeHeader } from '../components/PremiereMarqueeHeader';
import { PrizeWheel } from '../components/PrizeWheel';
import { TeamView } from '../components/TeamView';
import {
  clearDeviceSpinLock,
  readDeviceSpinLock,
  writeDeviceSpinLock,
  type DeviceSpinLock,
} from '../lib/deviceSpinLock';
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

function getIsOwnerFromSearch(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('owner') === 'true';
}

export function PremiereEventPage() {
  const room = useMemo(() => getRoomFromSearch(), []);
  const isOwner = useMemo(() => getIsOwnerFromSearch(), []);

  const [roomState, setRoomState] = useState<RoomPublicState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Strict per-device lock stored in BOTH localStorage & cookie
  const [deviceLock, setDeviceLock] = useState<DeviceSpinLock | null>(() =>
    readDeviceSpinLock(room)
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(() => {
    const initialLock = readDeviceSpinLock(room);
    return initialLock ? initialLock.entryId : null;
  });

  // Explicit UI tab ('spin' = "Quay tìm đội", 'agenda' = "Agenda")
  const [activeTab, setActiveTab] = useState<'spin' | 'agenda'>('spin');

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Spin state
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  // Bag opening state
  const [isOpeningBag, setIsOpeningBag] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const openBagTimerRef = useRef<number | null>(null);

  const reconcileLockWithState = useCallback(
    (nextState: RoomPublicState) => {
      const verified = readDeviceSpinLock(room, nextState.epoch);
      setDeviceLock(verified);
      if (verified) {
        setSelectedEntryId(verified.entryId);
      }
    },
    [room]
  );

  const fetchLatestState = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?room=${room}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Không tải được dữ liệu sự kiện');
      const data = (await res.json()) as RoomPublicState;
      setRoomState(data);
      reconcileLockWithState(data);
      setLoadError(null);
    } catch {
      setLoadError('Đang kết nối lại dữ liệu chung…');
    }
  }, [reconcileLockWithState, room]);

  // Real-time SSE + periodic sync fallback across phones
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
          reconcileLockWithState(next);
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
          }, 2500);
        }
      };
    };

    connectSse();

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchLatestState();
      }
    }, 5000);

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
      window.clearInterval(pollInterval);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (spinTimerRef.current !== null) window.clearTimeout(spinTimerRef.current);
      if (openBagTimerRef.current !== null) window.clearTimeout(openBagTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchLatestState, reconcileLockWithState, room]);

  const effectiveEntryId = deviceLock?.entryId ?? selectedEntryId;
  const selectedEntry = effectiveEntryId ? ENTRY_BY_ID.get(effectiveEntryId) ?? null : null;
  const assignedTeamId: TeamId | null =
    deviceLock?.teamId ??
    (effectiveEntryId && roomState ? roomState.assignments[effectiveEntryId] ?? null : null);

  const isAllFull = Boolean(roomState?.isAllFull);
  const isDeviceLocked = Boolean(deviceLock);

  // Show TeamView when this device has completed its spin (or while locked) and wheel isn't spinning
  const showTeamView = Boolean(
    !isSpinning && isDeviceLocked && selectedEntry && assignedTeamId && roomState
  );

  // Spin button is strictly locked unless:
  // - roomState loaded
  // - all 4 teams are NOT 5/5 full
  // - this device has NOT already spun
  // - guest has explicitly selected an unassigned name from dropdown
  // - wheel is not currently spinning
  const canSpin = Boolean(
    roomState &&
      !isAllFull &&
      !isDeviceLocked &&
      selectedEntryId &&
      !roomState.assignments[selectedEntryId] &&
      !isSpinning
  );

  const handleSelectEntry = (entry: GuestEntry) => {
    if (isDeviceLocked) return;
    if (roomState?.assignments[entry.id]) return;
    setSelectedEntryId(entry.id);
    setSpinError(null);
    setOpenError(null);
    setIsSheetOpen(false);
  };

  const handleStartSpin = async () => {
    if (isSpinning || isDeviceLocked || isAllFull) return;
    setSpinError(null);

    if (!selectedEntryId) {
      setIsSheetOpen(true);
      setSpinError('Vui lòng chọn tên của bạn trước khi bấm Quay liền tay.');
      return;
    }

    if (!roomState) return;
    if (roomState.assignments[selectedEntryId]) {
      setSpinError('Tên này đã quay trước đó. Vui lòng chọn tên khác chưa quay.');
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

      if (payload.alreadyAssigned) {
        setRoomState(latestState);
        setIsSpinning(false);
        setSpinError('Tên này vừa được quay ở một thiết bị khác. Hãy chọn lại tên của bạn.');
        setSelectedEntryId(null);
        return;
      }

      const nextAngle = computeWheelTargetAngle(wheelAngle, assigned);
      setWheelAngle(nextAngle);
      setRoomState(latestState);

      spinTimerRef.current = window.setTimeout(() => {
        const lock: DeviceSpinLock = {
          epoch: latestState.epoch,
          entryId: selectedEntryId,
          teamId: assigned,
          spunAt: new Date().toISOString(),
        };
        writeDeviceSpinLock(room, lock);
        setDeviceLock(lock);
        setIsSpinning(false);
      }, 4350);
    } catch (err) {
      await fetchLatestState();
      setIsSpinning(false);
      setSpinError(
        err instanceof Error ? err.message : 'Mạng tạm gián đoạn, vui lòng thử lại.'
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
          entryId: effectiveEntryId,
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

      openBagTimerRef.current = window.setTimeout(() => {
        if (payload.state) setRoomState(payload.state);
        setIsOpeningBag(false);
      }, 450);
    } catch (err) {
      setIsOpeningBag(false);
      setOpenError(err instanceof Error ? err.message : 'Không thể khui túi mù lúc này.');
    }
  };

  const handleOwnerReset = async () => {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, owner: true }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: RoomPublicState };
      clearDeviceSpinLock(room);
      setDeviceLock(null);
      setSelectedEntryId(null);
      setRoomState(data.state);
      setIsSpinning(false);
      setIsOpeningBag(false);
      setSpinError(null);
      setOpenError(null);
    }
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
      const assigned = data.state.assignments[targetEntry];
      if (assigned) {
        const lock: DeviceSpinLock = {
          epoch: data.state.epoch,
          entryId: targetEntry,
          teamId: assigned,
          spunAt: new Date().toISOString(),
        };
        writeDeviceSpinLock('demo', lock);
        setDeviceLock(lock);
        setSelectedEntryId(targetEntry);
      }
    }
  };

  const handleDemoReset = async () => {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'demo', owner: true }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: RoomPublicState };
      clearDeviceSpinLock('demo');
      setDeviceLock(null);
      setSelectedEntryId(null);
      setRoomState(data.state);
      setIsSpinning(false);
      setIsOpeningBag(false);
      setSpinError(null);
      setOpenError(null);
    }
  };

  let spinButtonLabel = 'Quay liền tay';
  if (isSpinning) spinButtonLabel = 'Đang quay tìm đội…';
  else if (isAllFull) spinButtonLabel = 'Tất cả các đội đã đủ thành viên';
  else if (isDeviceLocked) spinButtonLabel = 'Thiết bị đã hoàn tất lượt quay';

  return (
    <CurtainFrame>
      {/* Demo-only sandbox helper bar */}
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

        {/* Event Date & Venue Line */}
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
              deviceLocked={isDeviceLocked}
              onOpenBag={handleOpenBag}
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
                  inviteBounce={Boolean(canSpin)}
                  onWheelClick={handleStartSpin}
                  disabled={!canSpin}
                />
              </div>

              {/* All-Full Notice or Name Requirement Helper + Spin CTA */}
              <div className="flex flex-col gap-2">
                {isAllFull && (
                  <div
                    role="status"
                    data-testid="all-teams-full-banner"
                    className="rounded-xl border-2 border-[#6d1d36] bg-[#fef2b8] px-3 py-2 text-center text-xs font-bold text-[#6d1d36] flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Tất cả các đội đã đủ thành viên</span>
                  </div>
                )}

                {spinError && (
                  <p role="alert" className="text-xs font-medium text-[#9e1c38] text-center">
                    {spinError}
                  </p>
                )}

                {!isAllFull && !isDeviceLocked && !selectedEntryId && !spinError && (
                  <p className="text-[11.5px] font-medium text-[#6d1d36]/80 text-center">
                    Vui lòng chọn tên của bạn trong danh sách trước khi bấm quay
                  </p>
                )}

                <NameSelectorSheet
                  isOpen={isSheetOpen}
                  selectedEntryId={effectiveEntryId}
                  assignments={roomState?.assignments ?? {}}
                  totalAssigned={roomState?.totalPeopleAssigned ?? 0}
                  deviceLocked={isDeviceLocked}
                  onOpen={() => setIsSheetOpen(true)}
                  onClose={() => setIsSheetOpen(false)}
                  onSelect={handleSelectEntry}
                  disabled={isSpinning || !roomState || isAllFull}
                />

                <CarnivalButton
                  type="button"
                  variant="pink"
                  onClick={handleStartSpin}
                  disabled={!canSpin}
                  data-testid="spin-cta-button"
                >
                  <span className="text-[17px] sm:text-[19px]">{spinButtonLabel}</span>
                </CarnivalButton>
              </div>
            </motion.div>
          )}

          {/* Owner Dashboard rendered right below the wheel / team card when ?owner=true */}
          {isOwner && roomState && (
            <OwnerDashboard roomState={roomState} onResetAll={handleOwnerReset} />
          )}
        </div>
      )}
    </CurtainFrame>
  );
}
