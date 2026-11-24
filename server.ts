import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  autofillDemoExceptOneAtomic,
  getPublicRoomState,
  openBagAtomic,
  resetRoomAtomic,
  spinEntryAtomic,
  type RoomMode,
} from './server/db.ts';
import type { RoomPublicState, TeamId } from './src/shared/premiereRules.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

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

  app.post('/api/reset', async (req: Request, res: Response) => {
    const room = parseRoom(req.body?.room);
    const isOwner = req.body?.owner === true;
    if (room === 'live' && !isOwner) {
      res.status(403).json({ error: 'Chỉ chủ tiệc (?owner=true) mới có quyền đặt lại dữ liệu.' });
      return;
    }
    const state = await resetRoomAtomic(room);
    broadcastRoomState(room, state);
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
