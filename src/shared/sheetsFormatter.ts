import {
  GUEST_ENTRIES,
  TEAM_IDS,
  type RoomPublicState,
  type TeamPublicView,
} from './premiereRules.ts';

export const SHEET_TAB_NAMES = {
  TEAMS: 'Tổng hợp đội',
  GUESTS: 'Danh sách khách',
  REPLIES: 'Trả lời & Ghi chú',
} as const;

export const ALL_SHEET_TABS = [
  SHEET_TAB_NAMES.TEAMS,
  SHEET_TAB_NAMES.GUESTS,
  SHEET_TAB_NAMES.REPLIES,
] as const;

export interface SheetReplyRow {
  rowIndex: number;
  stt: string;
  sender: string;
  content: string;
  reply: string;
  updatedAt: string;
}

export interface SheetTabPayloads {
  teamsRows: string[][];
  guestsRows: string[][];
  repliesRows: string[][];
}

const RAW_ID_REGEX = /^[a-zA-Z0-9-_]{15,120}$/;
const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function sanitizeSheetCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  if (FORMULA_PREFIX_REGEX.test(normalized)) {
    return `'${normalized}`;
  }
  return normalized;
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes('://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.google.com') {
        return null;
      }
      const match = parsed.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]{15,120})(?:\/|$)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  return RAW_ID_REGEX.test(trimmed) ? trimmed : null;
}

function formatTeamStatus(team: TeamPublicView): string {
  if (team.isOpened) return 'Đã khui túi mù';
  if (team.isFull) return 'Đủ người (chờ khui)';
  const remaining = Math.max(0, team.capacity - team.memberCount);
  return `Còn thiếu ${remaining} người`;
}

function formatTeamBagSummary(team: TeamPublicView): string {
  // Never reveal bag contents before the team reaches capacity and opens the blind bag
  if (!team.isOpened || !team.bag) {
    return 'Chưa khui';
  }
  return team.bag.items.map((item) => item.text).join(' · ');
}

export const REPLIES_HEADER: readonly string[] = [
  'STT',
  'Người gửi / Nguồn',
  'Nội dung / Ghi chú',
  'Trả lời từ Google Sheet',
  'Cập nhật',
];

export function buildSheetTabPayloads(
  state: RoomPublicState,
  existingReplies: readonly SheetReplyRow[] = [],
  syncedAtLabel: string = new Date().toLocaleString('vi-VN', { hour12: false })
): SheetTabPayloads {
  const teamsRows: string[][] = [
    ['Đội', 'Sĩ số', 'Trạng thái', 'Thành viên', 'Kết quả túi mù', `Cập nhật: ${syncedAtLabel}`],
  ];

  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    const memberNames =
      team.members.length > 0 ? team.members.map((m) => m.memberName).join(', ') : 'Chưa có';
    teamsRows.push([
      `Đội ${teamId}`,
      `${team.memberCount}/${team.capacity}`,
      formatTeamStatus(team),
      memberNames,
      formatTeamBagSummary(team),
      '',
    ]);
  }

  teamsRows.push([
    'Tổng cộng',
    `${state.totalPeopleAssigned}/${state.totalPeople}`,
    state.totalPeopleAssigned >= state.totalPeople ? 'Đã đủ 25 khách' : 'Đang nhận khách',
    '',
    '',
    syncedAtLabel,
  ]);

  const guestsRows: string[][] = [
    ['STT', 'Tên khách / Cặp', 'Số chỗ', 'Thành viên', 'Đội', 'Trạng thái'],
  ];

  GUEST_ENTRIES.forEach((entry, index) => {
    const assignedTeam = state.assignments[entry.id];
    guestsRows.push([
      String(index + 1),
      entry.label,
      entry.seats === 2 ? 'Cặp (2 chỗ)' : 'Cá nhân (1 chỗ)',
      entry.members.join(' & '),
      assignedTeam ? `Đội ${assignedTeam}` : 'Chưa quay',
      assignedTeam ? 'Đã vào đội' : 'Chờ quay',
    ]);
  });

  const repliesRows: string[][] = [[...REPLIES_HEADER]];
  existingReplies.forEach((row, index) => {
    repliesRows.push([
      row.stt || String(index + 1),
      sanitizeSheetCell(row.sender),
      sanitizeSheetCell(row.content),
      sanitizeSheetCell(row.reply),
      sanitizeSheetCell(row.updatedAt),
    ]);
  });

  return { teamsRows, guestsRows, repliesRows };
}

export function parseRepliesSheetValues(values: unknown[][] | undefined | null): SheetReplyRow[] {
  if (!Array.isArray(values) || values.length <= 1) {
    return [];
  }

  const parsed: SheetReplyRow[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const rawRow = Array.isArray(values[i]) ? values[i] : [];
    const stt = String(rawRow[0] ?? '').trim();
    const sender = String(rawRow[1] ?? '').trim();
    const content = String(rawRow[2] ?? '').trim();
    const reply = String(rawRow[3] ?? '').trim();
    const updatedAt = String(rawRow[4] ?? '').trim();

    if (!stt && !sender && !content && !reply && !updatedAt) {
      continue;
    }

    parsed.push({
      rowIndex: i + 1,
      stt: stt || String(parsed.length + 1),
      sender,
      content,
      reply,
      updatedAt,
    });
  }

  return parsed;
}
