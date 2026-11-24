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
  autofillDemoLocalRoomState,
  isValidRoomPublicState,
  openLocalRoomBag,
  readLocalRoomState,
  resetLocalRoomState,
  saveRemoteStateToLocal,
  spinLocalRoomState,
} from '../lib/localRoomStore';
import {
  ENTRY_BY_ID,
  computeWheelTargetAngle,
  type GuestEntry,
  type RoomPublicState,
  type TeamId,
} from '../shared/premiereRules';

const REMOTE_TIMEOUT_MS = 2200;

function getRoomFromSearch(): 'live' | 'demo' {
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === '1' ? 'demo' : 'live';
}

function getIsOwnerFromSearch(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('owner') === 'true';
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = REMOTE_TIMEOUT_MS
): Promise<{ status: number; ok: boolean; data: unknown }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Non-JSON response');
    }
    const data: unknown = await res.json();
    return { status: res.status, ok: res.ok, data };
  } finally {
    window.clearTimeout(timer);
  }
}

export function PremiereEventPage() {
  const room = useMemo(() => getRoomFromSearch(), []);
  const isOwner = useMemo(() => getIsOwnerFromSearch(), []);

  // Always initialize synchronously from browser-local state so UI is immediately usable
  // without ever blocking on external shared sync.
  const [roomState, setRoomState] = useState<RoomPublicState>(() => readLocalRoomState(room));

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

  // Track whether optional backend API is genuinely reachable (null = probing, true = active, false = local mode)
  const remoteAvailableRef = useRef<boolean | null>(null);

  const reconcileLockWithState = useCallback(
    (nextState: RoomPublicState) => {
      const current = readDeviceSpinLock(room);
      // Preserve offline/local spin lock across optional remote refreshes unless cleared by explicit reset
      if (current && current.epoch.startsWith('local-') && !nextState.epoch.startsWith('local-')) {
        return !nextState.assignments[current.entryId];
      }
      const verified = readDeviceSpinLock(room, nextState.epoch);
      setDeviceLock(verified);
      if (verified) {
        setSelectedEntryId(verified.entryId);
      }
      return false;
    },
    [room]
  );

  const applyRemoteState = useCallback(
    (next: RoomPublicState) => {
      const hasUnmergedLocalSpin = reconcileLockWithState(next);
      if (hasUnmergedLocalSpin) {
        return;
      }
      saveRemoteStateToLocal(room, next);
      setRoomState(next);
    },
    [reconcileLockWithState, room]
  );

  const fetchLatestState = useCallback(async (): Promise<boolean> => {
    try {
      const { ok, data } = await fetchJsonWithTimeout(`/api/state?room=${room}`, {
        cache: 'no-store',
      });
      if (!ok || !isValidRoomPublicState(data)) {
        remoteAvailableRef.current = false;
        return false;
      }
      remoteAvailableRef.current = true;
      applyRemoteState(data);
      return true;
    } catch {
      // Silently ignore external sync errors/timeouts and keep running in browser-local mode
      remoteAvailableRef.current = false;
      return false;
    }
  }, [applyRemoteState, room]);

  // Optional real-time SSE + periodic sync only when backend API responds cleanly
  useEffect(() => {
    let source: EventSource | null = null;
    let pollInterval: number | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const connectSse = () => {
      if (closed || remoteAvailableRef.current !== true || source) return;
      source = new EventSource(`/api/events?room=${room}`);
      source.addEventListener('state', (event) => {
        try {
          const next: unknown = JSON.parse((event as MessageEvent).data);
          if (isValidRoomPublicState(next)) {
            applyRemoteState(next);
          }
        } catch {
          // ignore malformed chunk
        }
      });
      source.onerror = () => {
        source?.close();
        source = null;
        if (!closed && remoteAvailableRef.current === true && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void fetchLatestState().then((ok) => {
              if (ok) connectSse();
            });
          }, 5000);
        }
      };
    };

    void fetchLatestState().then((ok) => {
      if (closed || !ok) return;
      connectSse();
      pollInterval = window.setInterval(() => {
        if (document.visibilityState === 'visible' && remoteAvailableRef.current === true) {
          void fetchLatestState();
        }
      }, 5000);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && remoteAvailableRef.current === true) {
        void fetchLatestState();
      }
    };
    const handleOnline = () => {
      if (remoteAvailableRef.current !== false) {
        void fetchLatestState().then((ok) => {
          if (ok) connectSse();
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      closed = true;
      source?.close();
      if (pollInterval !== null) window.clearInterval(pollInterval);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (spinTimerRef.current !== null) window.clearTimeout(spinTimerRef.current);
      if (openBagTimerRef.current !== null) window.clearTimeout(openBagTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [applyRemoteState, fetchLatestState, room]);

  const effectiveEntryId = deviceLock?.entryId ?? selectedEntryId;
  const selectedEntry = effectiveEntryId ? ENTRY_BY_ID.get(effectiveEntryId) ?? null : null;
  const assignedTeamId: TeamId | null =
    deviceLock?.teamId ??
    (effectiveEntryId ? roomState.assignments[effectiveEntryId] ?? null : null);

  const isAllFull = roomState.isAllFull;
  const isDeviceLocked = Boolean(deviceLock);

  // Show TeamView when this device has completed its spin (or while locked) and wheel isn't spinning
  const showTeamView = Boolean(
    !isSpinning && isDeviceLocked && selectedEntry && assignedTeamId
  );

  // Spin button is strictly locked unless:
  // - all 4 teams are NOT 5/5 full
  // - this device has NOT already spun
  // - guest has explicitly selected an unassigned name from dropdown
  // - wheel is not currently spinning
  const canSpin = Boolean(
    !isAllFull &&
      !isDeviceLocked &&
      selectedEntryId &&
      !roomState.assignments[selectedEntryId] &&
      !isSpinning
  );

  const handleSelectEntry = (entry: GuestEntry) => {
    if (isDeviceLocked) return;
    if (roomState.assignments[entry.id]) return;
    setSelectedEntryId(entry.id);
    setSpinError(null);
    setOpenError(null);
    setIsSheetOpen(false);
  };

  const commitWheelSpinResult = (
    entryId: string,
    assigned: TeamId,
    latestState: RoomPublicState
  ) => {
    const nextAngle = computeWheelTargetAngle(wheelAngle, assigned);
    setWheelAngle(nextAngle);
    setRoomState(latestState);

    spinTimerRef.current = window.setTimeout(() => {
      const lock: DeviceSpinLock = {
        epoch: latestState.epoch,
        entryId,
        teamId: assigned,
        spunAt: new Date().toISOString(),
      };
      writeDeviceSpinLock(room, lock);
      setDeviceLock(lock);
      setIsSpinning(false);
    }, 4350);
  };

  const handleStartSpin = async () => {
    if (isSpinning || isDeviceLocked || isAllFull) return;
    setSpinError(null);

    if (!selectedEntryId) {
      setIsSheetOpen(true);
      setSpinError('Vui lòng chọn tên của bạn trước khi bấm Quay liền tay.');
      return;
    }

    if (roomState.assignments[selectedEntryId]) {
      setSpinError('Tên này đã quay trước đó. Vui lòng chọn tên khác chưa quay.');
      return;
    }

    setIsSpinning(true);

    // If backend API is confirmed reachable, try shared spin first; otherwise or on error/timeout, spin locally immediately
    if (remoteAvailableRef.current === true) {
      try {
        const { status, ok, data } = await fetchJsonWithTimeout('/api/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, entryId: selectedEntryId }),
        });
        const payload = data as {
          teamId?: TeamId;
          alreadyAssigned?: boolean;
          state?: RoomPublicState;
          error?: string;
        };

        if (payload.alreadyAssigned && payload.state && isValidRoomPublicState(payload.state)) {
          applyRemoteState(payload.state);
          setIsSpinning(false);
          setSpinError('Tên này vừa được quay ở một thiết bị khác. Hãy chọn lại tên của bạn.');
          setSelectedEntryId(null);
          return;
        }

        if (ok && payload.teamId && payload.state && isValidRoomPublicState(payload.state)) {
          saveRemoteStateToLocal(room, payload.state);
          commitWheelSpinResult(selectedEntryId, payload.teamId, payload.state);
          return;
        }

        if (status >= 400 && status < 500 && status !== 404 && payload.error) {
          setIsSpinning(false);
          setSpinError(payload.error);
          return;
        }
      } catch {
        // Fall through to local spin if remote server failed or timed out
        remoteAvailableRef.current = false;
      }
    }

    try {
      const localResult = spinLocalRoomState(room, selectedEntryId);
      if (localResult.alreadyAssigned) {
        setRoomState(localResult.state);
        setIsSpinning(false);
        setSpinError('Tên này đã quay trước đó. Vui lòng chọn tên khác chưa quay.');
        setSelectedEntryId(null);
        return;
      }
      commitWheelSpinResult(selectedEntryId, localResult.teamId, localResult.state);
    } catch (err) {
      setIsSpinning(false);
      setSpinError(
        err instanceof Error ? err.message : 'Chưa thể thực hiện lượt quay, thử lại nhé.'
      );
    }
  };

  const handleOpenBag = async () => {
    if (!assignedTeamId || isOpeningBag) return;
    setOpenError(null);
    setIsOpeningBag(true);

    if (remoteAvailableRef.current === true) {
      try {
        const { ok, status, data } = await fetchJsonWithTimeout('/api/open-bag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room,
            teamId: assignedTeamId,
            entryId: effectiveEntryId,
          }),
        });
        const payload = data as {
          ok?: boolean;
          error?: string;
          state?: RoomPublicState;
        };

        if (ok && payload.ok && payload.state && isValidRoomPublicState(payload.state)) {
          const nextState = payload.state;
          saveRemoteStateToLocal(room, nextState);
          openBagTimerRef.current = window.setTimeout(() => {
            setRoomState(nextState);
            setIsOpeningBag(false);
          }, 450);
          return;
        }

        if (status >= 400 && status < 500 && status !== 404 && payload.error) {
          setIsOpeningBag(false);
          setOpenError(payload.error);
          return;
        }
      } catch {
        remoteAvailableRef.current = false;
      }
    }

    try {
      const nextState = openLocalRoomBag(room, assignedTeamId);
      openBagTimerRef.current = window.setTimeout(() => {
        setRoomState(nextState);
        setIsOpeningBag(false);
      }, 450);
    } catch (err) {
      setIsOpeningBag(false);
      setOpenError(err instanceof Error ? err.message : 'Không thể khui túi mù lúc này.');
    }
  };

  const applyResetSuccess = (nextState: RoomPublicState, targetRoom: 'live' | 'demo') => {
    clearDeviceSpinLock(targetRoom);
    setDeviceLock(null);
    setSelectedEntryId(null);
    setRoomState(nextState);
    setIsSpinning(false);
    setIsOpeningBag(false);
    setSpinError(null);
    setOpenError(null);
  };

  const handleOwnerReset = async () => {
    if (remoteAvailableRef.current === true) {
      try {
        const { ok, data } = await fetchJsonWithTimeout('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, owner: true }),
        });
        const payload = data as { state?: RoomPublicState };
        if (ok && payload.state && isValidRoomPublicState(payload.state)) {
          saveRemoteStateToLocal(room, payload.state);
          applyResetSuccess(payload.state, room);
          return;
        }
      } catch {
        remoteAvailableRef.current = false;
      }
    }

    const nextState = resetLocalRoomState(room);
    applyResetSuccess(nextState, room);
  };

  const handleDemoAutofill = async () => {
    const targetEntry = selectedEntryId || 'celine-phang';
    let nextState: RoomPublicState | null = null;

    if (remoteAvailableRef.current === true) {
      try {
        const { ok, data } = await fetchJsonWithTimeout('/api/demo/autofill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: 'demo', keepEntryId: targetEntry }),
        });
        const payload = data as { state?: RoomPublicState };
        if (ok && payload.state && isValidRoomPublicState(payload.state)) {
          nextState = payload.state;
          saveRemoteStateToLocal('demo', nextState);
        }
      } catch {
        remoteAvailableRef.current = false;
      }
    }

    if (!nextState) {
      nextState = autofillDemoLocalRoomState(targetEntry);
    }

    setRoomState(nextState);
    const assigned = nextState.assignments[targetEntry];
    if (assigned) {
      const lock: DeviceSpinLock = {
        epoch: nextState.epoch,
        entryId: targetEntry,
        teamId: assigned,
        spunAt: new Date().toISOString(),
      };
      writeDeviceSpinLock('demo', lock);
      setDeviceLock(lock);
      setSelectedEntryId(targetEntry);
    }
  };

  const handleDemoReset = async () => {
    if (remoteAvailableRef.current === true) {
      try {
        const { ok, data } = await fetchJsonWithTimeout('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: 'demo', owner: true }),
        });
        const payload = data as { state?: RoomPublicState };
        if (ok && payload.state && isValidRoomPublicState(payload.state)) {
          saveRemoteStateToLocal('demo', payload.state);
          applyResetSuccess(payload.state, 'demo');
          return;
        }
      } catch {
        remoteAvailableRef.current = false;
      }
    }

    const nextState = resetLocalRoomState('demo');
    applyResetSuccess(nextState, 'demo');
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
          {showTeamView && assignedTeamId && selectedEntry ? (
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
                  assignments={roomState.assignments}
                  totalAssigned={roomState.totalPeopleAssigned}
                  deviceLocked={isDeviceLocked}
                  onOpen={() => setIsSheetOpen(true)}
                  onClose={() => setIsSheetOpen(false)}
                  onSelect={handleSelectEntry}
                  disabled={isSpinning || isAllFull}
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
          {isOwner && (
            <OwnerDashboard roomState={roomState} onResetAll={handleOwnerReset} />
          )}
        </div>
      )}
    </CurtainFrame>
  );
}
