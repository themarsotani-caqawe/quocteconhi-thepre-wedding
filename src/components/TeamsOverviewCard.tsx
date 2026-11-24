import { Check, Users } from 'lucide-react';
import { TEAM_IDS, type RoomPublicState, type TeamId } from '../shared/premiereRules';
import { GoldStar, ScallopedCard } from './CarnivalPlaque';

interface TeamsOverviewCardProps {
  roomState: RoomPublicState;
  highlightEntryId?: string | null;
  highlightTeamId?: TeamId | null;
}

export function TeamsOverviewCard({
  roomState,
  highlightEntryId = null,
  highlightTeamId = null,
}: TeamsOverviewCardProps) {
  return (
    <section
      aria-label="Danh sách thành viên các đội"
      data-testid="teams-overview-card"
      className="mt-3 w-full"
    >
      <ScallopedCard>
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#6d1d36]/25 pb-2">
            <div className="flex items-center gap-1.5">
              <GoldStar className="w-3.5 h-3.5" />
              <h2 className="font-display font-bold text-[17px] leading-tight text-[#6d1d36]">
                Danh sách thành viên 4 đội
              </h2>
            </div>

            <div
              data-testid="teams-overview-total"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#6d1d36] tabular-nums"
            >
              <Users className="w-3.5 h-3.5 text-[#a44564]" aria-hidden="true" />
              <span>
                {roomState.totalPeopleAssigned}/{roomState.totalPeople} người
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEAM_IDS.map((teamId) => {
              const team = roomState.teams[teamId];
              const missing = Math.max(0, team.capacity - team.memberCount);
              const isViewerTeam = highlightTeamId === teamId;
              return (
                <div
                  key={teamId}
                  data-testid={`overview-team-card-${teamId}`}
                  className={`rounded-2xl border px-3 py-2 space-y-1.5 ${
                    isViewerTeam
                      ? 'border-[#6d1d36] bg-[#fceef2]/85 shadow-[0_2px_0_rgba(109,29,54,0.12)]'
                      : 'border-[#6d1d36]/30 bg-[#faf4de]/65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-[16px] text-[#6d1d36]">
                      Đội {teamId}
                    </span>
                    <span className="text-[11.5px] font-bold tabular-nums text-[#6d1d36]">
                      {team.memberCount}/{team.capacity} người
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                      team.isFull
                        ? 'bg-[#e6f5ea] text-[#1d5e32] border border-[#1d5e32]/25'
                        : 'bg-[#fdfbf2] text-[#8d2345] border border-[#6d1d36]/20'
                    }`}
                  >
                    {team.isFull && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    <span>
                      {team.isOpened
                        ? 'Đã đủ · Đã khui túi mù'
                        : team.isFull
                          ? `Đủ ${team.capacity}/${team.capacity} · Sẵn sàng khui túi mù`
                          : `Còn thiếu ${missing} người`}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-dashed border-[#6d1d36]/20">
                    {team.members.length === 0 ? (
                      <p className="text-[11px] italic text-[#6d1d36]/55">Chưa có thành viên</p>
                    ) : (
                      <ol className="space-y-0.5 text-[11.5px] text-[#6d1d36]">
                        {team.members.map((member, idx) => {
                          const isMe = highlightEntryId && member.entryId === highlightEntryId;
                          return (
                            <li
                              key={`${member.entryId}-${member.memberName}-${idx}`}
                              className={`flex items-center gap-1.5 ${
                                isMe ? 'font-bold text-[#6d1d36]' : 'font-medium text-[#6d1d36]/90'
                              }`}
                            >
                              <span className="text-[10.5px] tabular-nums text-[#a44564] font-bold">
                                {idx + 1}.
                              </span>
                              <span>{member.memberName}</span>
                              {member.isPair && (
                                <span className="text-[10px] text-[#a44564]">(đi cặp)</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScallopedCard>
    </section>
  );
}
