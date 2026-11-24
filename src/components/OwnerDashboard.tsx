import { useState } from 'react';
import { Check, ClipboardCheck, Copy, RotateCcw, Users } from 'lucide-react';
import {
  TEAM_IDS,
  formatTeamsClipboardText,
  type RoomPublicState,
} from '../shared/premiereRules';
import { GoldStar, ScallopedCard } from './CarnivalPlaque';

interface OwnerDashboardProps {
  roomState: RoomPublicState;
  onResetAll: () => Promise<void>;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function OwnerDashboard({ roomState, onResetAll }: OwnerDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCopy = async () => {
    const text = formatTeamsClipboardText(roomState);
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetAll();
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section
      aria-label="Bảng Theo Dõi Dành Cho Chủ Tiệc"
      data-testid="owner-dashboard"
      className="mt-4 w-full space-y-3"
    >
      <ScallopedCard>
        <div className="space-y-3">
          {/* Header & Total Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#6d1d36]/25 pb-2.5">
            <div className="flex items-center gap-1.5">
              <GoldStar className="w-4 h-4" />
              <h2 className="font-display font-bold text-[18px] leading-tight text-[#6d1d36]">
                Bảng Theo Dõi Dành Cho Chủ Tiệc
              </h2>
            </div>

            <div
              data-testid="owner-total-count"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6d1d36] tabular-nums"
            >
              <Users className="w-3.5 h-3.5 text-[#a44564]" aria-hidden="true" />
              <span>
                Tổng đã quay: {roomState.totalPeopleAssigned}/{roomState.totalPeople} người
              </span>
            </div>
          </div>

          {/* 4 Team Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEAM_IDS.map((teamId) => {
              const team = roomState.teams[teamId];
              const missing = Math.max(0, team.capacity - team.memberCount);
              return (
                <div
                  key={teamId}
                  data-testid={`owner-team-card-${teamId}`}
                  className="rounded-2xl border border-[#6d1d36]/30 bg-[#faf4de]/65 px-3 py-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-[17px] text-[#6d1d36]">
                      Đội {teamId}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-[#6d1d36]">
                      {team.memberCount}/{team.capacity} người
                    </span>
                  </div>

                  {/* Distinct status label */}
                  <div
                    data-testid={`owner-team-status-${teamId}`}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold ${
                      team.isFull
                        ? 'bg-[#e6f5ea] text-[#1d5e32] border border-[#1d5e32]/25'
                        : 'bg-[#fce9ef] text-[#8d2345] border border-[#8d2345]/20'
                    }`}
                  >
                    {team.isFull && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                    <span>
                      {team.isFull
                        ? `Đã đủ (${team.memberCount}/${team.capacity})`
                        : `Chưa đủ (còn thiếu ${missing} người)`}
                    </span>
                  </div>

                  {/* Member list */}
                  <div className="pt-1 border-t border-dashed border-[#6d1d36]/20">
                    {team.members.length === 0 ? (
                      <p className="text-[11.5px] italic text-[#6d1d36]/55">Chưa có thành viên</p>
                    ) : (
                      <ol className="space-y-0.5 text-[12px] font-medium text-[#6d1d36]">
                        {team.members.map((member, index) => (
                          <li key={`${member.entryId}-${member.memberName}-${index}`} className="flex items-center gap-1.5">
                            <span className="text-[11px] tabular-nums text-[#a44564] font-bold">
                              {index + 1}.
                            </span>
                            <span>{member.memberName}</span>
                            {member.isPair && (
                              <span className="text-[10px] text-[#a44564]">(đi cặp)</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Owner Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleCopy()}
              data-testid="owner-copy-button"
              className="flex-1 min-h-[44px] rounded-xl border-2 border-[#6d1d36] bg-[#fce9ef] hover:bg-[#f8d2dd] px-3 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#6d1d36] cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="w-4 h-4 text-[#1d5e32]" aria-hidden="true" />
                  <span>Đã copy danh sách!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy danh sách chia đội</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              data-testid="owner-reset-button"
              className="min-h-[44px] rounded-xl border-2 border-[#6d1d36] bg-[#fdfbf2] hover:bg-[#fdecea] px-3.5 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#8e1313] cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reset dữ liệu</span>
            </button>
          </div>
        </div>
      </ScallopedCard>

      {/* Accessible confirmation modal before wiping shared data */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b0c1c]/55 p-4"
        >
          <div className="w-full max-w-[370px] rounded-[26px] border-2 border-[#6d1d36] bg-[#fdfbf2] p-2 shadow-[0_12px_32px_rgba(61,12,28,0.4)]">
            <div className="rounded-[20px] border border-dashed border-[#6d1d36]/60 p-4 space-y-3">
              <h3 id="owner-reset-dialog-title" className="font-display font-bold text-lg text-[#6d1d36]">
                Xác nhận Reset dữ liệu?
              </h3>
              <p className="text-xs leading-relaxed text-[#6d1d36]/90">
                Thao tác này sẽ xóa toàn bộ <strong>{roomState.totalPeopleAssigned}/{roomState.totalPeople}</strong>{' '}
                lượt quay trên tất cả điện thoại để bắt đầu lại từ đầu (0/{roomState.totalPeople} người cho cả 4 đội). Không thể hoàn tác.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetConfirm(false)}
                  className="min-h-[40px] rounded-full border border-[#6d1d36]/40 bg-white px-4 py-1.5 text-xs font-semibold text-[#6d1d36] hover:bg-[#faf4de] cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  data-testid="owner-reset-confirm"
                  onClick={() => void handleConfirmReset()}
                  className="min-h-[40px] rounded-full border-2 border-[#6d1d36] bg-[#f8bed0] px-4 py-1.5 text-xs font-bold text-[#6d1d36] shadow-[0_2px_0_#6d1d36] hover:bg-[#f5aec4] cursor-pointer disabled:opacity-60"
                >
                  {isResetting ? 'Đang xóa…' : 'Xác nhận Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
