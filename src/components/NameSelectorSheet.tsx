import { ChevronDown, Check, X } from 'lucide-react';
import { GUEST_ENTRIES, type GuestEntry, type TeamId } from '../shared/premiereRules';

interface NameSelectorSheetProps {
  isOpen: boolean;
  selectedEntryId: string | null;
  assignments: Record<string, TeamId>;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (entry: GuestEntry) => void;
  disabled?: boolean;
}

export function NameSelectorSheet({
  isOpen,
  selectedEntryId,
  assignments,
  onOpen,
  onClose,
  onSelect,
  disabled = false,
}: NameSelectorSheetProps) {
  const selectedEntry = GUEST_ENTRIES.find((e) => e.id === selectedEntryId) ?? null;

  return (
    <>
      {/* Trigger button styled like the mockup dropdown */}
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        data-testid="name-selector-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="w-full min-h-[48px] rounded-xl bg-[#fdfbf2] border-2 border-[#6d1d36] px-4 py-2.5 flex items-center justify-between gap-2 text-left shadow-[0_2px_0_rgba(109,29,54,0.14)] hover:bg-[#faf4de] transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d1d36]"
      >
        <span
          className={`font-display text-[17px] truncate ${
            selectedEntry ? 'font-bold text-[#6d1d36]' : 'font-semibold text-[#6d1d36]/85'
          }`}
        >
          {selectedEntry ? selectedEntry.label : 'Chọn tên của bạn'}
        </span>
        <ChevronDown className="w-5 h-5 text-[#6d1d36] shrink-0" aria-hidden="true" />
      </button>

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chọn tên khách mời"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#531227]/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={onClose}
        >
          <div
            className="w-full max-w-[440px] max-h-[82dvh] rounded-t-[28px] sm:rounded-[28px] bg-[#fdfbf2] border-2 border-[#6d1d36] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#6d1d36]/15 bg-[#fceef2]">
              <div>
                <h2 className="font-display font-bold text-xl text-[#6d1d36]">
                  Chọn tên của bạn
                </h2>
                <p className="text-xs text-[#6d1d36]/75 mt-0.5">
                  Nếu tên đã quay rồi, bạn sẽ xem lại đúng đội của mình
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng danh sách tên"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#6d1d36] hover:bg-[#f8bed0]/40 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable guest list */}
            <div className="overflow-y-auto px-3 py-2.5 divide-y divide-[#6d1d36]/10">
              {GUEST_ENTRIES.map((entry) => {
                const assignedTeam = assignments[entry.id];
                const isSelected = entry.id === selectedEntryId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelect(entry)}
                    data-testid={`guest-option-${entry.id}`}
                    className={`w-full min-h-[50px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#fbd4df]/65'
                        : 'hover:bg-[#fceef2]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-[17px] text-[#6d1d36] truncate">
                        {entry.label}
                      </div>
                      {entry.seats === 2 && (
                        <div className="text-[12px] text-[#6d1d36]/70">
                          Cặp đôi · 2 chỗ cùng đội
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
                      {assignedTeam ? (
                        <span className="text-[#6d1d36]/75">
                          Đội {assignedTeam} · Xem lại
                        </span>
                      ) : (
                        <span className="text-[#a44564]">Chưa quay</span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#6d1d36]" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
