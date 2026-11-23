import type { RoomPublicState } from '../shared/premiereRules';
import {
  ALL_SHEET_TABS,
  REPLIES_HEADER,
  SHEET_TAB_NAMES,
  buildSheetTabPayloads,
  parseRepliesSheetValues,
  sanitizeSheetCell,
  type SheetReplyRow,
} from '../shared/sheetsFormatter';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetTitles: string[];
}

export class SheetsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

async function parseApiJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const apiMessage = data?.error?.message || fallbackMessage;
    throw new SheetsApiError(res.status, apiMessage);
  }
  return data as T;
}

function normalizeMetadata(raw: {
  spreadsheetId: string;
  properties?: { title?: string };
  spreadsheetUrl?: string;
  sheets?: Array<{ properties?: { title?: string } }>;
}): SpreadsheetMetadata {
  return {
    spreadsheetId: raw.spreadsheetId,
    title: raw.properties?.title || 'Bảng tính Google Sheets',
    spreadsheetUrl:
      raw.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${raw.spreadsheetId}/edit`,
    sheetTitles: (raw.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  };
}

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const fields = 'spreadsheetId,properties.title,spreadsheetUrl,sheets.properties.title';
  const res = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(fields)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const raw = await parseApiJson<{
    spreadsheetId: string;
    properties?: { title?: string };
    spreadsheetUrl?: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(res, 'Không thể đọc thông tin Google Sheet.');
  return normalizeMetadata(raw);
}

export async function createEventSpreadsheet(
  accessToken: string,
  title: string = 'Quốc Tế Có Nhi · Tổng hợp & Trả lời'
): Promise<SpreadsheetMetadata> {
  const res = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'vi_VN',
      },
      sheets: ALL_SHEET_TABS.map((tabTitle) => ({
        properties: { title: tabTitle },
      })),
    }),
  });

  const raw = await parseApiJson<{
    spreadsheetId: string;
    properties?: { title?: string };
    spreadsheetUrl?: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(res, 'Không thể tạo Google Sheet mới.');
  return normalizeMetadata(raw);
}

export async function ensureTabsExist(
  accessToken: string,
  metadata: SpreadsheetMetadata
): Promise<SpreadsheetMetadata> {
  const missingTabs = ALL_SHEET_TABS.filter((tab) => !metadata.sheetTitles.includes(tab));
  if (missingTabs.length === 0) {
    return metadata;
  }

  const res = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(metadata.spreadsheetId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: missingTabs.map((tabTitle) => ({
          addSheet: {
            properties: { title: tabTitle },
          },
        })),
      }),
    }
  );

  await parseApiJson(res, 'Không thể tạo các tab tổng hợp trong Google Sheet.');
  return fetchSpreadsheetMetadata(accessToken, metadata.spreadsheetId);
}

export async function readSheetReplies(
  accessToken: string,
  metadata: SpreadsheetMetadata
): Promise<SheetReplyRow[]> {
  // Always inspect spreadsheet metadata instead of assuming a hardcoded sheet name
  const targetTab = metadata.sheetTitles.includes(SHEET_TAB_NAMES.REPLIES)
    ? SHEET_TAB_NAMES.REPLIES
    : metadata.sheetTitles[0];

  if (!targetTab) {
    return [];
  }

  const range = `${targetTab}!A1:E200`;
  const res = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(metadata.spreadsheetId)}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await parseApiJson<{ values?: unknown[][] }>(
    res,
    'Không thể đọc dữ liệu trả lời từ Google Sheet.'
  );
  return parseRepliesSheetValues(data.values);
}

export async function syncRoomToSpreadsheet(
  accessToken: string,
  initialMetadata: SpreadsheetMetadata,
  state: RoomPublicState
): Promise<{ metadata: SpreadsheetMetadata; replies: SheetReplyRow[] }> {
  const metadata = await ensureTabsExist(accessToken, initialMetadata);
  const existingReplies = metadata.sheetTitles.includes(SHEET_TAB_NAMES.REPLIES)
    ? await readSheetReplies(accessToken, metadata)
    : [];

  const payloads = buildSheetTabPayloads(state, existingReplies);

  const clearRes = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(metadata.spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          `${SHEET_TAB_NAMES.TEAMS}!A1:F30`,
          `${SHEET_TAB_NAMES.GUESTS}!A1:F40`,
          `${SHEET_TAB_NAMES.REPLIES}!A1:E200`,
        ],
      }),
    }
  );
  await parseApiJson(clearRes, 'Không thể làm mới vùng dữ liệu trên Google Sheet.');

  const updateRes = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(metadata.spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${SHEET_TAB_NAMES.TEAMS}!A1`,
            values: payloads.teamsRows,
          },
          {
            range: `${SHEET_TAB_NAMES.GUESTS}!A1`,
            values: payloads.guestsRows,
          },
          {
            range: `${SHEET_TAB_NAMES.REPLIES}!A1`,
            values: payloads.repliesRows,
          },
        ],
      }),
    }
  );
  await parseApiJson(updateRes, 'Không thể ghi dữ liệu tổng hợp lên Google Sheet.');

  return { metadata, replies: existingReplies };
}

export async function appendReplyRow(
  accessToken: string,
  initialMetadata: SpreadsheetMetadata,
  input: { sender: string; content: string; reply: string }
): Promise<{ metadata: SpreadsheetMetadata; replies: SheetReplyRow[] }> {
  const metadata = await ensureTabsExist(accessToken, initialMetadata);
  const existing = await readSheetReplies(accessToken, metadata);

  const updatedAt = new Date().toLocaleString('vi-VN', { hour12: false });
  const nextRow: SheetReplyRow = {
    rowIndex: existing.length + 2,
    stt: String(existing.length + 1),
    sender: sanitizeSheetCell(input.sender) || 'Host',
    content: sanitizeSheetCell(input.content),
    reply: sanitizeSheetCell(input.reply),
    updatedAt,
  };

  const valuesToWrite = [
    [...REPLIES_HEADER],
    ...existing.map((row, idx) => [
      row.stt || String(idx + 1),
      sanitizeSheetCell(row.sender),
      sanitizeSheetCell(row.content),
      sanitizeSheetCell(row.reply),
      sanitizeSheetCell(row.updatedAt),
    ]),
    [nextRow.stt, nextRow.sender, nextRow.content, nextRow.reply, nextRow.updatedAt],
  ];

  const updateRes = await fetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(metadata.spreadsheetId)}/values/${encodeURIComponent(
      `${SHEET_TAB_NAMES.REPLIES}!A1`
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: valuesToWrite }),
    }
  );
  await parseApiJson(updateRes, 'Không thể ghi dòng trả lời lên Google Sheet.');

  const refreshed = await readSheetReplies(accessToken, metadata);
  return { metadata, replies: refreshed };
}
