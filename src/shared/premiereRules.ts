export type TeamId = 1 | 2 | 3 | 4;

export const TEAM_IDS: readonly TeamId[] = [1, 2, 3, 4] as const;
export const TEAM_CAPACITY = 5;
export const TOTAL_PEOPLE = TEAM_IDS.length * TEAM_CAPACITY; // 20 max seats (5 per team)

export function getTeamCapacities(): Record<TeamId, number> {
  return {
    1: TEAM_CAPACITY,
    2: TEAM_CAPACITY,
    3: TEAM_CAPACITY,
    4: TEAM_CAPACITY,
  };
}

export interface GuestEntry {
  id: string;
  label: string;
  seats: 1 | 2;
  members: readonly string[];
  avatarSeeds: readonly number[];
}

export const GUEST_ENTRIES: readonly GuestEntry[] = [
  { id: 'celine-phang', label: 'Céline Phang', seats: 1, members: ['Céline Phang'], avatarSeeds: [0] },
  { id: 'sam-chun', label: 'Sam & Chun', seats: 2, members: ['Sam', 'Chun'], avatarSeeds: [1, 2] },
  { id: 'anh-xu-con-trai', label: 'Anh Xù & Con trai', seats: 2, members: ['Anh Xù', 'Con trai'], avatarSeeds: [3, 4] },
  { id: 'cao-thu', label: 'Cao Thư', seats: 1, members: ['Cao Thư'], avatarSeeds: [5] },
  { id: 'phuong-thuy', label: 'Phương Thuỳ', seats: 1, members: ['Phương Thuỳ'], avatarSeeds: [6] },
  { id: 'trong-hieu', label: 'Trọng Hiếu', seats: 1, members: ['Trọng Hiếu'], avatarSeeds: [7] },
  { id: 'hong-nhung', label: 'Hồng Nhung', seats: 1, members: ['Hồng Nhung'], avatarSeeds: [8] },
  { id: 'nhat-quang', label: 'Nhật Quang', seats: 1, members: ['Nhật Quang'], avatarSeeds: [9] },
  { id: 'lan-anh', label: 'Lan Anh', seats: 1, members: ['Lan Anh'], avatarSeeds: [10] },
  { id: 'mina', label: 'Mina', seats: 1, members: ['Mina'], avatarSeeds: [11] },
  { id: 'tuan-anh', label: 'Tuấn Anh', seats: 1, members: ['Tuấn Anh'], avatarSeeds: [12] },
  { id: 'thanh-dang', label: 'Thành Đăng', seats: 1, members: ['Thành Đăng'], avatarSeeds: [13] },
  { id: 'phuong-thuy-bui', label: 'Phương Thuý Bùi', seats: 1, members: ['Phương Thuý Bùi'], avatarSeeds: [14] },
  { id: 'bao-khanh', label: 'Bảo Khanh', seats: 1, members: ['Bảo Khanh'], avatarSeeds: [15] },
  { id: 'tat-thinh', label: 'Tất Thịnh', seats: 1, members: ['Tất Thịnh'], avatarSeeds: [16] },
  { id: 'gia-thuy', label: 'Gia Thuỵ', seats: 1, members: ['Gia Thuỵ'], avatarSeeds: [17] },
  { id: 'thanh-phuong', label: 'Thanh Phương', seats: 1, members: ['Thanh Phương'], avatarSeeds: [24] },
  { id: 'to-to-dat-le', label: 'Tố Tố & Đạt Lê', seats: 2, members: ['Tố Tố', 'Đạt Lê'], avatarSeeds: [18, 19] },
  {
    id: 'truong-hai-hoang-hai',
    label: 'Trường Hải & Hoàng Hải',
    seats: 2,
    members: ['Trường Hải', 'Hoàng Hải'],
    avatarSeeds: [20, 21],
  },
  { id: 'nhi-duc', label: 'Nhi & Đức', seats: 2, members: ['Nhi', 'Đức'], avatarSeeds: [22, 23] },
] as const;

export const ENTRY_BY_ID: ReadonlyMap<string, GuestEntry> = new Map(
  GUEST_ENTRIES.map((entry) => [entry.id, entry])
);

export interface BagItem {
  id: string;
  text: string;
  illustrationKey:
    | 'oc-buou'
    | 'khoai-tay'
    | 'nem-nuong'
    | 'soju-yakult'
    | 'pizza'
    | 'canele'
    | 'burrata'
    | 'drinks';
}

export interface RevealedBag {
  title: string;
  items: readonly BagItem[];
}

export interface TeamMemberSlot {
  entryId: string;
  memberName: string;
  avatarSeed: number;
  isPair: boolean;
  pairGroupId: string | null;
}

export interface TeamPublicView {
  teamId: TeamId;
  memberCount: number;
  capacity: number;
  isFull: boolean;
  isOpened: boolean;
  openedAt: string | null;
  members: TeamMemberSlot[];
  bag: RevealedBag | null;
}

export interface AssignmentRecord {
  entryId: string;
  teamId: TeamId;
  createdAt: string;
}

export interface RoomPublicState {
  room: 'live' | 'demo';
  epoch: string;
  totalPeopleAssigned: number;
  totalPeople: number;
  isAllFull: boolean;
  assignments: Record<string, TeamId>;
  teams: Record<TeamId, TeamPublicView>;
}

export function getTeamSeatCounts(assignments: Record<string, TeamId>): Record<TeamId, number> {
  const counts: Record<TeamId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const [entryId, teamId] of Object.entries(assignments)) {
    const entry = ENTRY_BY_ID.get(entryId);
    if (entry && (teamId === 1 || teamId === 2 || teamId === 3 || teamId === 4)) {
      counts[teamId] += entry.seats;
    }
  }
  return counts;
}

/**
 * Computes all teams that still have capacity for `entryId` without ever
 * exceeding TEAM_CAPACITY (5 members per team). Any team at 5/5 is excluded.
 */
export function computeEligibleTeams(
  assignments: Record<string, TeamId>,
  entryId: string
): TeamId[] {
  const entry = ENTRY_BY_ID.get(entryId);
  if (!entry) {
    throw new Error(`Không tìm thấy tên khách: ${entryId}`);
  }
  if (assignments[entryId]) {
    return [assignments[entryId]];
  }

  const used = getTeamSeatCounts(assignments);
  const eligible: TeamId[] = [];
  for (const teamId of TEAM_IDS) {
    if (used[teamId] < TEAM_CAPACITY && used[teamId] + entry.seats <= TEAM_CAPACITY) {
      eligible.push(teamId);
    }
  }

  return eligible;
}

export function pickRandomEligibleTeam(
  assignments: Record<string, TeamId>,
  entryId: string,
  randomFloat: () => number = Math.random
): TeamId {
  const eligible = computeEligibleTeams(assignments, entryId);
  if (eligible.length === 0) {
    const used = getTeamSeatCounts(assignments);
    const allTeamsFull = TEAM_IDS.every((id) => used[id] >= TEAM_CAPACITY);
    if (allTeamsFull) {
      throw new Error('Tất cả các đội đã đủ thành viên.');
    }
    throw new Error('Các đội còn lại chỉ còn 1 chỗ trống, không đủ 2 chỗ cho cặp đôi này.');
  }
  const raw = randomFloat();
  const clamped = Math.min(Math.max(raw, 0), 0.999999999);
  const index = Math.floor(clamped * eligible.length);
  return eligible[index];
}

/**
 * Wheel geometry:
 * - At angle = 0deg, Đội 1 is centered at top (0deg), Đội 2 at right (90deg),
 *   Đội 3 at bottom (180deg), Đội 4 at left (270deg).
 * - Rotating clockwise by `angle` brings `(360 - (angle % 360)) % 360` under the top pointer.
 */
export function getTeamAtWheelAngle(angle: number): TeamId {
  const normalized = ((angle % 360) + 360) % 360;
  const pointerAngleOnWheel = (360 - normalized) % 360;
  if (pointerAngleOnWheel >= 315 || pointerAngleOnWheel < 45) return 1;
  if (pointerAngleOnWheel >= 45 && pointerAngleOnWheel < 135) return 2;
  if (pointerAngleOnWheel >= 135 && pointerAngleOnWheel < 225) return 3;
  return 4;
}

export function computeWheelTargetAngle(
  currentAngle: number,
  targetTeam: TeamId,
  jitterUnit: number = Math.random()
): number {
  const baseTargetMod = (360 - (targetTeam - 1) * 90) % 360;
  // Keep jitter safely within [-24deg, +24deg] inside the +-45deg quadrant
  const safeJitter = (Math.min(Math.max(jitterUnit, 0), 1) - 0.5) * 48;
  const desiredMod = (((baseTargetMod + safeJitter) % 360) + 360) % 360;

  const currentMod = ((currentAngle % 360) + 360) % 360;
  let deltaMod = desiredMod - currentMod;
  if (deltaMod < 0) {
    deltaMod += 360;
  }

  const extraTurns = 5 * 360;
  return currentAngle + extraTurns + deltaMod;
}

export function formatTeamsClipboardText(state: RoomPublicState): string {
  const lines: string[] = [
    `QUỐC TẾ CÓ NHI — KẾT QUẢ CHIA ĐỘI (${state.totalPeopleAssigned}/${state.totalPeople} thành viên)`,
    '',
  ];
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    const status = team.isFull
      ? 'Đã đủ (5/5)'
      : `Chưa đủ (còn thiếu ${Math.max(0, team.capacity - team.memberCount)} người)`;
    const memberNames =
      team.members.length > 0 ? team.members.map((m) => m.memberName).join(', ') : 'Chưa có thành viên';
    lines.push(`• Đội ${teamId} (${team.memberCount}/${team.capacity} người · ${status}): ${memberNames}`);
  }
  return lines.join('\n');
}
