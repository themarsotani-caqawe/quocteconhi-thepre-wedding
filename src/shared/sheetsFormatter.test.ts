import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSheetTabPayloads,
  extractSpreadsheetId,
  parseRepliesSheetValues,
  sanitizeSheetCell,
} from './sheetsFormatter.ts';
import { GUEST_ENTRIES, type RoomPublicState, type TeamId } from './premiereRules.ts';

function makeSampleState(openedTeam3: boolean): RoomPublicState {
  const assignments: Record<string, TeamId> = {
    'celine-phang': 1,
    'sam-chun': 3,
    'thanh-phuong': 4,
  };

  return {
    room: 'live',
    totalPeopleAssigned: 4,
    totalPeople: 25,
    assignments,
    teams: {
      1: {
        teamId: 1,
        memberCount: 1,
        capacity: 6,
        isFull: false,
        isOpened: false,
        openedAt: null,
        members: [
          { entryId: 'celine-phang', memberName: 'Céline Phang', avatarSeed: 0, isPair: false, pairGroupId: null },
        ],
        bag: null,
      },
      2: {
        teamId: 2,
        memberCount: 0,
        capacity: 6,
        isFull: false,
        isOpened: false,
        openedAt: null,
        members: [],
        bag: null,
      },
      3: {
        teamId: 3,
        memberCount: openedTeam3 ? 6 : 2,
        capacity: 6,
        isFull: openedTeam3,
        isOpened: openedTeam3,
        openedAt: openedTeam3 ? '2026-11-28T11:30:00.000Z' : null,
        members: [
          { entryId: 'sam-chun', memberName: 'Sam', avatarSeed: 1, isPair: true, pairGroupId: 'sam-chun' },
          { entryId: 'sam-chun', memberName: 'Chun', avatarSeed: 2, isPair: true, pairGroupId: 'sam-chun' },
        ],
        bag: openedTeam3
          ? {
              title: 'Tối đó, Đội 3 mang…',
              items: [
                { id: 'pizza', text: '4 bánh pizza', illustrationKey: 'pizza' },
                { id: 'canele', text: '25 bánh canelé', illustrationKey: 'canele' },
              ],
            }
          : null,
      },
      4: {
        teamId: 4,
        memberCount: 1,
        capacity: 7,
        isFull: false,
        isOpened: false,
        openedAt: null,
        members: [
          { entryId: 'thanh-phuong', memberName: 'Thanh Phương', avatarSeed: 24, isPair: false, pairGroupId: null },
        ],
        bag: null,
      },
    },
  };
}

test('extractSpreadsheetId accepts valid Google Sheets URLs and raw IDs, rejects unsafe URLs', () => {
  const validId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(
    extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${validId}/edit#gid=0`),
    validId
  );
  assert.equal(
    extractSpreadsheetId(`https://docs.google.com/spreadsheets/u/1/d/${validId}/view`),
    validId
  );
  assert.equal(extractSpreadsheetId(validId), validId);
  assert.equal(extractSpreadsheetId('http://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'), null);
  assert.equal(extractSpreadsheetId('https://evil.example/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'), null);
  assert.equal(extractSpreadsheetId('short'), null);
});

test('buildSheetTabPayloads formats 4 teams + 20 guest rows and hides unopened blind bags', () => {
  const state = makeSampleState(false);
  const payloads = buildSheetTabPayloads(state, [], '28/11/2026 18:00');

  // 1 header + 4 teams + 1 total = 6 rows
  assert.equal(payloads.teamsRows.length, 6);
  assert.equal(payloads.teamsRows[1][0], 'Đội 1');
  assert.equal(payloads.teamsRows[1][1], '1/6');
  assert.equal(payloads.teamsRows[1][4], 'Chưa khui');
  assert.equal(payloads.teamsRows[4][1], '1/7');
  assert.equal(payloads.teamsRows[5][1], '4/25');

  // 1 header + 20 guest entries = 21 rows
  assert.equal(payloads.guestsRows.length, GUEST_ENTRIES.length + 1);
  const thanhPhuongRow = payloads.guestsRows.find((r) => r[1] === 'Thanh Phương');
  assert.ok(thanhPhuongRow);
  assert.equal(thanhPhuongRow[4], 'Đội 4');
  assert.equal(thanhPhuongRow[5], 'Đã vào đội');
});

test('buildSheetTabPayloads reveals bag summary only when isOpened is true and preserves existing replies', () => {
  const state = makeSampleState(true);
  const existingReplies = [
    {
      rowIndex: 2,
      stt: '1',
      sender: 'Céline Phang',
      content: 'Mình ăn chay được không?',
      reply: 'Có salad burrata & canelé nha!',
      updatedAt: '28/11/2026 18:05',
    },
  ];
  const payloads = buildSheetTabPayloads(state, existingReplies, '28/11/2026 18:10');

  assert.equal(payloads.teamsRows[3][2], 'Đã khui túi mù');
  assert.equal(payloads.teamsRows[3][4], '4 bánh pizza · 25 bánh canelé');
  assert.equal(payloads.repliesRows.length, 2);
  assert.equal(payloads.repliesRows[1][3], 'Có salad burrata & canelé nha!');
});

test('sanitizeSheetCell neutralizes formula prefixes and parseRepliesSheetValues skips blanks', () => {
  assert.equal(sanitizeSheetCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(sanitizeSheetCell('+1234'), "'+1234");
  assert.equal(sanitizeSheetCell('Xin chào'), 'Xin chào');

  const parsed = parseRepliesSheetValues([
    ['STT', 'Người gửi', 'Nội dung', 'Trả lời', 'Cập nhật'],
    ['', '', '', '', ''],
    ['1', 'Mina', 'Mấy giờ chiếu phim?', '19:45 nha bạn', '18:00'],
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].sender, 'Mina');
  assert.equal(parsed[0].reply, '19:45 nha bạn');
});
