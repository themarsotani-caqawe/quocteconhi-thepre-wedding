import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  autofillDemoExceptOneAtomic,
  getLinkedSheet,
  getPublicRoomState,
  openBagAtomic,
  resetDemoRoomAtomic,
  resetLiveRoomAtomic,
  saveLinkedSheet,
  spinEntryAtomic,
  type RoomMode,
} from './server/db.ts';
import type { RoomPublicState, TeamId } from './src/shared/premiereRules.ts';
import { extractSpreadsheetId } from './src/shared/sheetsFormatter.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const HOST_ADMIN_EMAIL = 'themarso.tani@gmail.com';

function readFirebaseApiKey(): string | null {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { apiKey?: unknown };
    return typeof raw.apiKey === 'string' && raw.apiKey.trim() ? raw.apiKey.trim() : null;
  } catch {
    return null;
  }
}

async function verifyHostFirebaseToken(
  req: Request
): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Vui lòng đăng nhập tài khoản Google của host.' };
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return { ok: false, status: 401, error: 'Thiếu mã xác thực đăng nhập.' };
  }

  const apiKey = readFirebaseApiKey();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'Chưa cấu hình xác thực Firebase trên máy chủ.' };
  }

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      return {
        ok: false,
        status: 401,
        error: 'Phiên đăng nhập Google đã hết hạn, vui lòng đăng nhập lại.',
      };
    }

    const payload = (await lookupRes.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = payload.users?.[0];
    const email = user?.email?.trim().toLowerCase() ?? '';
    if (!email || user?.emailVerified === false) {
      return { ok: false, status: 403, error: 'Tài khoản Google chưa xác minh email.' };
    }
    if (email !== HOST_ADMIN_EMAIL) {
      return {
        ok: false,
        status: 403,
        error: `Chỉ tài khoản host (${HOST_ADMIN_EMAIL}) mới được thực hiện thao tác này.`,
      };
    }
    return { ok: true, email };
  } catch {
    return { ok: false, status: 502, error: 'Không thể xác minh phiên đăng nhập Google lúc này.' };
  }
}

function parseRoom(raw: unknown): RoomMode {
  return raw === 'demo' ? 'demo' : 'live';
}

function parseTeamId(raw: unknown): TeamId | null {
  const num = Number(raw);
  if (num === 1 || num === 2 || num === 3 || num === 4) {
    return num;
  }
  return null;
}

const sseClients: Record<RoomMode, Set<Response>> = {
  live: new Set(),
  demo: new Set(),
};

function broadcastRoomState(room: RoomMode, state: RoomPublicState): void {
  const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients[room]) {
    try {
      res.write(payload);
    } catch {
      sseClients[room].delete(res);
    }
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/state', (req: Request, res: Response) => {
    const room = parseRoom(req.query.room);
    res.setHeader('Cache-Control', 'no-store');
    res.json(getPublicRoomState(room));
  });

  app.get('/api/events', (req: Request, res: Response) => {
    const room = parseRoom(req.query.room);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients[room].add(res);
    const initialState = getPublicRoomState(room);
    res.write(`event: state\ndata: ${JSON.stringify(initialState)}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients[room].delete(res);
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients[room].delete(res);
    });
  });

  app.post('/api/spin', async (req: Request, res: Response) => {
    try {
      const room = parseRoom(req.body?.room);
      const entryId = typeof req.body?.entryId === 'string' ? req.body.entryId.trim() : '';
      if (!entryId) {
        res.status(400).json({ error: 'Vui lòng chọn tên của bạn trước khi quay.' });
        return;
      }

      const result = await spinEntryAtomic(room, entryId);
      if (!result.alreadyAssigned) {
        broadcastRoomState(room, result.state);
      }
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể quay tìm đội lúc này.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/open-bag', async (req: Request, res: Response) => {
    try {
      const room = parseRoom(req.body?.room);
      const teamId = parseTeamId(req.body?.teamId);
      const entryId = typeof req.body?.entryId === 'string' ? req.body.entryId.trim() : undefined;

      if (!teamId) {
        res.status(400).json({ error: 'Đội không hợp lệ.' });
        return;
      }

      const result = await openBagAtomic(room, teamId, entryId);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      if (!result.alreadyOpened) {
        broadcastRoomState(room, result.state);
      }
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể khui túi mù lúc này.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/demo/reset', async (req: Request, res: Response) => {
    const room = req.body?.room;
    if (room !== 'demo') {
      res.status(403).json({ error: 'Không thể đặt lại dữ liệu sự kiện chính.' });
      return;
    }
    const state = await resetDemoRoomAtomic();
    broadcastRoomState('demo', state);
    res.json({ ok: true, state });
  });

  app.post('/api/demo/autofill', async (req: Request, res: Response) => {
    const room = req.body?.room;
    if (room !== 'demo') {
      res.status(403).json({ error: 'Chỉ hỗ trợ trong chế độ thử nghiệm.' });
      return;
    }
    const keepEntryId = typeof req.body?.keepEntryId === 'string' ? req.body.keepEntryId : undefined;
    const state = await autofillDemoExceptOneAtomic(keepEntryId);
    broadcastRoomState('demo', state);
    res.json({ ok: true, state });
  });

  app.get('/api/sheet-link', async (req: Request, res: Response) => {
    const authCheck = await verifyHostFirebaseToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ link: getLinkedSheet() });
  });

  app.post('/api/sheet-link', async (req: Request, res: Response) => {
    const authCheck = await verifyHostFirebaseToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }

    const rawId = typeof req.body?.spreadsheetId === 'string' ? req.body.spreadsheetId : '';
    const spreadsheetId = extractSpreadsheetId(rawId);
    if (!spreadsheetId) {
      res.status(400).json({ error: 'ID hoặc đường dẫn Google Sheet không hợp lệ.' });
      return;
    }

    const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const title = (rawTitle || 'Bảng tính Google Sheets').slice(0, 140);
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const safeUrl = rawUrl.startsWith('https://docs.google.com/spreadsheets/')
      ? rawUrl
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const link = await saveLinkedSheet({ spreadsheetId, title, url: safeUrl });
    res.json({ ok: true, link });
  });

  app.post('/api/admin/reset-live', async (req: Request, res: Response) => {
    const authCheck = await verifyHostFirebaseToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }
    const state = await resetLiveRoomAtomic();
    broadcastRoomState('live', state);
    res.json({ ok: true, state });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Build output missing.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quốc Tế Có Nhi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
