import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  LogOut,
  MessageSquarePlus,
  RefreshCw,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';
import { BrandBadge, CarnivalButton, GoldStar, ScallopedCard } from '../components/CarnivalPlaque';
import { CurtainFrame } from '../components/CurtainFrame';
import {
  clearAccessToken,
  getAccessToken,
  getFirebaseIdToken,
  googleSignIn,
  initAuth,
  logout,
} from '../lib/googleAuth';
import {
  SheetsApiError,
  appendReplyRow,
  createEventSpreadsheet,
  fetchSpreadsheetMetadata,
  readSheetReplies,
  syncRoomToSpreadsheet,
  type SpreadsheetMetadata,
} from '../lib/googleSheets';
import { TEAM_IDS, type RoomPublicState } from '../shared/premiereRules';
import {
  SHEET_TAB_NAMES,
  extractSpreadsheetId,
  type SheetReplyRow,
} from '../shared/sheetsFormatter';

interface GoogleSheetPageProps {
  onNavigate: (path: string) => void;
}

type ConfirmAction =
  | { kind: 'create-sheet'; title: string }
  | { kind: 'sync-sheet'; spreadsheetTitle: string }
  | {
      kind: 'append-reply';
      spreadsheetTitle: string;
      sender: string;
      content: string;
      reply: string;
    }
  | { kind: 'reset-live'; totalAssigned: number };

export function GoogleSheetPage({ onNavigate }: GoogleSheetPageProps) {
  const [roomState, setRoomState] = useState<RoomPublicState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [sheetInput, setSheetInput] = useState<string>('');
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [replies, setReplies] = useState<SheetReplyRow[]>([]);

  const [senderInput, setSenderInput] = useState<string>('Host');
  const [contentInput, setContentInput] = useState<string>('');
  const [replyInput, setReplyInput] = useState<string>('');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmAction | null>(null);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof SheetsApiError && err.status === 401) {
      clearAccessToken();
      setNeedsAuth(true);
      setFeedback({
        type: 'err',
        text: 'Phiên Google Sheets đã hết hạn. Vui lòng đăng nhập lại bằng nút Sign in with Google.',
      });
      return;
    }
    const message = err instanceof Error ? err.message : fallback;
    setFeedback({ type: 'err', text: message });
  }, []);

  const persistSheetLinkToServer = useCallback(async (meta: SpreadsheetMetadata) => {
    const idToken = await getFirebaseIdToken();
    if (!idToken) return;
    await fetch('/api/sheet-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        spreadsheetId: meta.spreadsheetId,
        title: meta.title,
        url: meta.spreadsheetUrl,
      }),
    });
  }, []);

  const connectSheetById = useCallback(
    async (accessToken: string, spreadsheetId: string, saveToServer: boolean) => {
      setBusyAction('connect');
      setFeedback(null);
      try {
        const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
        const sheetReplies = await readSheetReplies(accessToken, meta);
        setMetadata(meta);
        setSheetInput(meta.spreadsheetUrl);
        setReplies(sheetReplies);
        if (saveToServer) {
          await persistSheetLinkToServer(meta);
        }
        setFeedback({
          type: 'ok',
          text: `Đã kết nối "${meta.title}" (${sheetReplies.length} dòng trả lời/ghi chú).`,
        });
      } catch (err) {
        handleApiError(err, 'Không thể kết nối tới Google Sheet.');
      } finally {
        setBusyAction(null);
      }
    },
    [handleApiError, persistSheetLinkToServer]
  );

  // Subscribe to live room state via SSE
  useEffect(() => {
    let active = true;
    fetch('/api/state?room=live')
      .then((res) => res.json())
      .then((data: RoomPublicState) => {
        if (active) setRoomState(data);
      })
      .catch(() => {});

    const es = new EventSource('/api/events?room=live');
    const onState = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as RoomPublicState;
        if (active) setRoomState(next);
      } catch {
        // ignore parse errors
      }
    };
    es.addEventListener('state', onState as EventListener);
    return () => {
      active = false;
      es.removeEventListener('state', onState as EventListener);
      es.close();
    };
  }, []);

  // Initialize Firebase auth listener (token kept strictly in memory)
  useEffect(() => {
    const unsubscribe = initAuth(
      (signedInUser, token) => {
        setUser(signedInUser);
        setNeedsAuth(false);
        void (async () => {
          try {
            const idToken = await signedInUser.getIdToken();
            const linkRes = await fetch('/api/sheet-link', {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!linkRes.ok) return;
            const linkData = (await linkRes.json()) as {
              link?: { spreadsheetId: string } | null;
            };
            if (linkData.link?.spreadsheetId) {
              await connectSheetById(token, linkData.link.spreadsheetId, false);
            }
          } catch {
            // non-fatal
          }
        })();
      },
      (signedInUser) => {
        setUser(signedInUser);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [connectSheetById]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setFeedback(null);
    try {
      const { user: loggedUser, accessToken } = await googleSignIn();
      setUser(loggedUser);
      setNeedsAuth(false);

      const idToken = await loggedUser.getIdToken();
      const linkRes = await fetch('/api/sheet-link', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (linkRes.ok) {
        const linkData = (await linkRes.json()) as {
          link?: { spreadsheetId: string } | null;
        };
        if (linkData.link?.spreadsheetId) {
          await connectSheetById(accessToken, linkData.link.spreadsheetId, false);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'err', text: message });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setMetadata(null);
    setReplies([]);
    setFeedback(null);
  };

  const handleConnectInput = async () => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const id = extractSpreadsheetId(sheetInput);
    if (!id) {
      setFeedback({
        type: 'err',
        text: 'Vui lòng dán đường dẫn https://docs.google.com/spreadsheets/d/... hoặc ID Google Sheet hợp lệ.',
      });
      return;
    }
    await connectSheetById(token, id, true);
  };

  const handleRefreshReplies = async () => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    if (!metadata) return;
    setBusyAction('read');
    setFeedback(null);
    try {
      const latestMeta = await fetchSpreadsheetMetadata(token, metadata.spreadsheetId);
      const nextReplies = await readSheetReplies(token, latestMeta);
      setMetadata(latestMeta);
      setReplies(nextReplies);
      setFeedback({
        type: 'ok',
        text: `Đã đọc ${nextReplies.length} dòng từ tab "${SHEET_TAB_NAMES.REPLIES}".`,
      });
    } catch (err) {
      handleApiError(err, 'Không thể đọc dữ liệu từ Google Sheet.');
    } finally {
      setBusyAction(null);
    }
  };

  const executeConfirmedAction = async () => {
    const action = confirmModal;
    if (!action) return;
    setConfirmModal(null);
    setFeedback(null);

    if (action.kind === 'reset-live') {
      setBusyAction('reset');
      try {
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
          setNeedsAuth(true);
          return;
        }
        const res = await fetch('/api/admin/reset-live', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; state?: RoomPublicState };
        if (!res.ok || !data.state) {
          throw new Error(data.error || 'Không thể đặt lại phòng lúc này.');
        }
        setRoomState(data.state);
        setFeedback({
          type: 'ok',
          text: 'Đã đặt lại phòng sự kiện chính về 0/25 khách và đóng toàn bộ túi mù.',
        });
      } catch (err) {
        handleApiError(err, 'Không thể đặt lại phòng lúc này.');
      } finally {
        setBusyAction(null);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    if (action.kind === 'create-sheet') {
      setBusyAction('create');
      try {
        const created = await createEventSpreadsheet(token, action.title);
        let syncedReplies: SheetReplyRow[] = [];
        let finalMeta = created;
        if (roomState) {
          const synced = await syncRoomToSpreadsheet(token, created, roomState);
          finalMeta = synced.metadata;
          syncedReplies = synced.replies;
        }
        await persistSheetLinkToServer(finalMeta);
        setMetadata(finalMeta);
        setSheetInput(finalMeta.spreadsheetUrl);
        setReplies(syncedReplies);
        setFeedback({
          type: 'ok',
          text: `Đã tạo và đồng bộ lên Google Sheet "${finalMeta.title}".`,
        });
      } catch (err) {
        handleApiError(err, 'Không thể tạo Google Sheet mới.');
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if (action.kind === 'sync-sheet' && metadata && roomState) {
      setBusyAction('sync');
      try {
        const synced = await syncRoomToSpreadsheet(token, metadata, roomState);
        setMetadata(synced.metadata);
        setReplies(synced.replies);
        setFeedback({
          type: 'ok',
          text: `Đã tổng hợp ${roomState.totalPeopleAssigned}/25 khách và 4 đội lên "${synced.metadata.title}".`,
        });
      } catch (err) {
        handleApiError(err, 'Không thể đồng bộ dữ liệu lên Google Sheet.');
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if (action.kind === 'append-reply' && metadata) {
      setBusyAction('reply');
      try {
        const updated = await appendReplyRow(token, metadata, {
          sender: action.sender,
          content: action.content,
          reply: action.reply,
        });
        setMetadata(updated.metadata);
        setReplies(updated.replies);
        setContentInput('');
        setReplyInput('');
        setFeedback({
          type: 'ok',
          text: `Đã ghi phản hồi mới vào tab "${SHEET_TAB_NAMES.REPLIES}".`,
        });
      } catch (err) {
        handleApiError(err, 'Không thể ghi dòng trả lời lên Google Sheet.');
      } finally {
        setBusyAction(null);
      }
    }
  };

  return (
    <CurtainFrame>
      <div className="flex-1 flex flex-col gap-3.5 py-1">
        <div className="flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between gap-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6d1d36] hover:text-[#a44564] no-underline whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Trang mời</span>
            </a>
            <a
              href="/the-pre-wedding-premiere"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/the-pre-wedding-premiere');
              }}
              className="text-xs font-semibold text-[#a44564] hover:text-[#6d1d36] no-underline whitespace-nowrap"
            >
              Vào phòng →
            </a>
          </div>
          <BrandBadge />
        </div>

        <div className="text-center">
          <h1 className="font-display font-bold text-[22px] sm:text-[24px] leading-tight text-[#6d1d36]">
            Tổng hợp &amp; Trả lời qua Google Sheet
          </h1>
          <p className="mt-1 text-xs text-[#6d1d36]/80">
            Đồng bộ danh sách 25 khách, 4 đội và đọc/trả lời ghi chú trực tiếp từ Google Sheets.
          </p>
        </div>

        {feedback && (
          <div
            role="status"
            data-testid="sheet-feedback"
            className={`rounded-2xl border-2 px-3.5 py-2.5 text-xs font-medium flex items-start gap-2 ${
              feedback.type === 'ok'
                ? 'bg-[#eefaf0] border-[#2e7d32]/40 text-[#1b5e20]'
                : 'bg-[#fdecea] border-[#b71c1c]/40 text-[#8e1313]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Live event snapshot */}
        <ScallopedCard>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a44564] whitespace-nowrap">
              <GoldStar className="w-3.5 h-3.5" />
              <span>Trạng thái phòng chính</span>
            </div>
            <span
              data-testid="live-total-count"
              className="rounded-full bg-[#fce9ef] border border-[#6d1d36]/40 px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#6d1d36] whitespace-nowrap shrink-0"
            >
              {roomState ? `${roomState.totalPeopleAssigned}/${roomState.totalPeople} khách` : '…'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEAM_IDS.map((teamId) => {
              const team = roomState?.teams[teamId];
              return (
                <div
                  key={teamId}
                  className="rounded-xl bg-[#faf4de]/70 border border-[#6d1d36]/25 px-2.5 py-1.5 text-center"
                >
                  <div className="text-[11px] font-bold text-[#6d1d36]">Đội {teamId}</div>
                  <div className="text-xs font-semibold tabular-nums text-[#a44564]">
                    {team ? `${team.memberCount}/${team.capacity}` : '0/6'}
                  </div>
                  <div className="text-[10px] text-[#6d1d36]/70">
                    {team?.isOpened ? 'Đã khui túi' : team?.isFull ? 'Chờ khui' : 'Đang ghép'}
                  </div>
                </div>
              );
            })}
          </div>
        </ScallopedCard>

        {/* Authentication */}
        <ScallopedCard>
          <div className="flex flex-col items-center text-center gap-2.5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a44564]">
              Kết nối tài khoản Google
            </div>

            {needsAuth ? (
              <>
                <p className="text-xs text-[#6d1d36]/85 max-w-[36ch]">
                  Khách tham gia không cần đăng nhập. Chỉ host đăng nhập Google để tạo, đồng bộ và
                  trả lời dữ liệu trên Google Sheet.
                </p>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  data-testid="google-signin-button"
                  className="gsi-material-button"
                >
                  <div className="gsi-material-button-state" />
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'Đang đăng nhập…' : 'Sign in with Google'}
                    </span>
                    <span style={{ display: 'none' }}>Sign in with Google</span>
                  </div>
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between gap-2 text-left">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#6d1d36] truncate">
                    {user?.displayName || 'Tài khoản Google'}
                  </div>
                  <div className="text-[11px] text-[#6d1d36]/75 truncate">{user?.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-full border border-[#6d1d36]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#6d1d36] hover:bg-[#fce9ef] cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </ScallopedCard>

        {/* Sheet connection & sync controls */}
        {!needsAuth && (
          <>
            <ScallopedCard>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#a44564]">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bảng tính Google Sheet</span>
                  </div>
                  {metadata && (
                    <a
                      href={metadata.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d1d36] underline hover:text-[#a44564]"
                    >
                      <span>Mở Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="Dán link hoặc ID Google Sheet…"
                    aria-label="Đường dẫn hoặc ID Google Sheet"
                    className="flex-1 rounded-xl border border-[#6d1d36]/40 bg-white px-3 py-2 text-xs text-[#6d1d36] placeholder:text-[#6d1d36]/45 focus:outline-none focus:ring-2 focus:ring-[#6d1d36]"
                  />
                  <button
                    type="button"
                    onClick={handleConnectInput}
                    disabled={busyAction !== null}
                    className="rounded-xl border-2 border-[#6d1d36] bg-[#faf4de] px-3.5 py-2 text-xs font-bold text-[#6d1d36] hover:bg-[#f6e8b8] disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {busyAction === 'connect' ? 'Đang kết nối…' : 'Kết nối'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        kind: 'create-sheet',
                        title: 'Quốc Tế Có Nhi · Tổng hợp & Trả lời',
                      })
                    }
                    disabled={busyAction !== null}
                    className="flex-1 min-w-[160px] rounded-xl border-2 border-[#6d1d36] bg-[#fce9ef] px-3 py-2 text-xs font-bold text-[#6d1d36] hover:bg-[#f8d2dd] disabled:opacity-50 cursor-pointer"
                  >
                    + Tạo Google Sheet mới
                  </button>

                  {metadata && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal({
                          kind: 'sync-sheet',
                          spreadsheetTitle: metadata.title,
                        })
                      }
                      disabled={busyAction !== null || !roomState}
                      className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#6d1d36] bg-[#f8bed0] px-3 py-2 text-xs font-bold text-[#6d1d36] hover:bg-[#f5aec4] disabled:opacity-50 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{busyAction === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ 25 khách & 4 đội'}</span>
                    </button>
                  )}
                </div>

                {metadata && (
                  <div className="rounded-xl bg-[#faf4de]/65 border border-dashed border-[#6d1d36]/35 px-3 py-2 text-[11px] text-[#6d1d36]">
                    <div className="font-bold truncate">Đang liên kết: {metadata.title}</div>
                    <div className="mt-0.5 text-[#6d1d36]/75">
                      Các tab: {metadata.sheetTitles.join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            </ScallopedCard>

            {/* Replies & Notes panel */}
            {metadata && (
              <ScallopedCard>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a44564]">
                      Trả lời &amp; Ghi chú từ Sheet
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshReplies}
                      disabled={busyAction !== null}
                      className="inline-flex items-center gap-1 rounded-full border border-[#6d1d36]/35 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6d1d36] hover:bg-[#fce9ef] cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${busyAction === 'read' ? 'animate-spin' : ''}`} />
                      <span>Đọc lại Sheet</span>
                    </button>
                  </div>

                  {replies.length === 0 ? (
                    <p className="text-xs text-[#6d1d36]/70 italic">
                      Chưa có dòng ghi chú nào trong tab “{SHEET_TAB_NAMES.REPLIES}”. Bạn có thể
                      nhập trực tiếp trên Google Sheet hoặc thêm ở bên dưới.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                      {replies.map((row) => (
                        <div
                          key={`${row.rowIndex}-${row.stt}`}
                          className="rounded-xl border border-[#6d1d36]/25 bg-white/90 px-3 py-2 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#a44564] font-semibold">
                            <span>
                              #{row.stt} · {row.sender || 'Khách'}
                            </span>
                            <span className="text-[#6d1d36]/55 font-normal">{row.updatedAt}</span>
                          </div>
                          {row.content && <p className="text-[#6d1d36]">{row.content}</p>}
                          {row.reply && (
                            <p className="rounded-lg bg-[#fce9ef]/70 px-2.5 py-1 text-[#6d1d36] font-medium">
                              Trả lời: {row.reply}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-dashed border-[#6d1d36]/25 pt-2.5 space-y-2">
                    <div className="text-[11px] font-bold text-[#6d1d36]">
                      Ghi thêm nội dung / câu trả lời lên Google Sheet
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={senderInput}
                        onChange={(e) => setSenderInput(e.target.value)}
                        placeholder="Người gửi / Tên khách"
                        className="rounded-xl border border-[#6d1d36]/35 bg-white px-3 py-1.5 text-xs text-[#6d1d36]"
                      />
                      <input
                        type="text"
                        value={contentInput}
                        onChange={(e) => setContentInput(e.target.value)}
                        placeholder="Câu hỏi hoặc ghi chú"
                        className="rounded-xl border border-[#6d1d36]/35 bg-white px-3 py-1.5 text-xs text-[#6d1d36]"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="Nội dung trả lời…"
                        className="flex-1 rounded-xl border border-[#6d1d36]/35 bg-white px-3 py-1.5 text-xs text-[#6d1d36]"
                      />
                      <button
                        type="button"
                        disabled={
                          busyAction !== null || (!contentInput.trim() && !replyInput.trim())
                        }
                        onClick={() =>
                          setConfirmModal({
                            kind: 'append-reply',
                            spreadsheetTitle: metadata.title,
                            sender: senderInput.trim() || 'Host',
                            content: contentInput.trim(),
                            reply: replyInput.trim(),
                          })
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#6d1d36] bg-[#faf4de] px-3 py-1.5 text-xs font-bold text-[#6d1d36] hover:bg-[#f6e8b8] disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Gửi lên Sheet</span>
                      </button>
                    </div>
                  </div>
                </div>
              </ScallopedCard>
            )}

            {/* Host Room Reset */}
            <ScallopedCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#6d1d36]">Quản lý phòng sự kiện chính</div>
                  <p className="text-[11px] text-[#6d1d36]/75">
                    Xoá toàn bộ lượt quay &amp; trạng thái khui túi mù hiện tại để bắt đầu mới (0/25).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    setConfirmModal({
                      kind: 'reset-live',
                      totalAssigned: roomState?.totalPeopleAssigned ?? 0,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#6d1d36] bg-[#fdfbf2] px-3 py-2 text-xs font-bold text-[#6d1d36] hover:bg-[#fdecea] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset phòng</span>
                </button>
              </div>
            </ScallopedCard>
          </>
        )}

        <div className="pt-1 pb-2">
          <CarnivalButton
            type="button"
            variant="cream"
            onClick={() => onNavigate('/the-pre-wedding-premiere')}
          >
            <span className="text-[16px]">Vào phòng sự kiện</span>
          </CarnivalButton>
        </div>
      </div>

      {/* Explicit confirmation dialog before any mutating or destructive API call */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b0c1c]/55 p-4"
        >
          <div className="w-full max-w-[390px] rounded-[26px] border-2 border-[#6d1d36] bg-[#fdfbf2] p-2 shadow-[0_12px_32px_rgba(61,12,28,0.4)]">
            <div className="rounded-[20px] border border-dashed border-[#6d1d36]/60 p-4 space-y-3">
              <h2 id="confirm-modal-title" className="font-display font-bold text-lg text-[#6d1d36]">
                {confirmModal.kind === 'create-sheet' && 'Tạo Google Sheet mới?'}
                {confirmModal.kind === 'sync-sheet' && 'Đồng bộ dữ liệu lên Google Sheet?'}
                {confirmModal.kind === 'append-reply' && 'Ghi dòng trả lời lên Google Sheet?'}
                {confirmModal.kind === 'reset-live' && 'Đặt lại phòng sự kiện chính về 0/25?'}
              </h2>

              <div className="text-xs leading-relaxed text-[#6d1d36]/90 space-y-1.5">
                {confirmModal.kind === 'create-sheet' && (
                  <p>
                    Hệ thống sẽ tạo bảng tính <strong>“{confirmModal.title}”</strong> trong Google
                    Drive của bạn với 3 tab: <strong>{SHEET_TAB_NAMES.TEAMS}</strong>,{' '}
                    <strong>{SHEET_TAB_NAMES.GUESTS}</strong> và{' '}
                    <strong>{SHEET_TAB_NAMES.REPLIES}</strong>.
                  </p>
                )}

                {confirmModal.kind === 'sync-sheet' && (
                  <>
                    <p>
                      Cập nhật bảng tính <strong>“{confirmModal.spreadsheetTitle}”</strong> với dữ
                      liệu mới nhất:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Tab “{SHEET_TAB_NAMES.TEAMS}”: tổng hợp 4 đội (6+6+6+7) và túi mù đã mở</li>
                      <li>Tab “{SHEET_TAB_NAMES.GUESTS}”: danh sách 20 mục / 25 khách</li>
                      <li>Tab “{SHEET_TAB_NAMES.REPLIES}”: giữ nguyên các dòng trả lời hiện có</li>
                    </ul>
                  </>
                )}

                {confirmModal.kind === 'append-reply' && (
                  <>
                    <p>
                      Thêm 1 dòng vào tab <strong>“{SHEET_TAB_NAMES.REPLIES}”</strong> của bảng tính{' '}
                      <strong>“{confirmModal.spreadsheetTitle}”</strong>:
                    </p>
                    <div className="rounded-xl bg-[#fce9ef]/70 px-3 py-2 space-y-0.5">
                      <div>
                        <strong>Người gửi:</strong> {confirmModal.sender}
                      </div>
                      {confirmModal.content && (
                        <div>
                          <strong>Nội dung:</strong> {confirmModal.content}
                        </div>
                      )}
                      {confirmModal.reply && (
                        <div>
                          <strong>Trả lời:</strong> {confirmModal.reply}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {confirmModal.kind === 'reset-live' && (
                  <p>
                    Thao tác này sẽ xoá toàn bộ{' '}
                    <strong>{confirmModal.totalAssigned}/25 khách đã quay đội</strong> và trạng thái
                    khui túi mù của phòng chính để bắt đầu lại từ 0/25. Không thể hoàn tác.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="rounded-full border border-[#6d1d36]/40 bg-white px-4 py-2 text-xs font-semibold text-[#6d1d36] hover:bg-[#faf4de] cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  data-testid="confirm-modal-submit"
                  onClick={() => void executeConfirmedAction()}
                  className="rounded-full border-2 border-[#6d1d36] bg-[#f8bed0] px-4 py-2 text-xs font-bold text-[#6d1d36] shadow-[0_2px_0_#6d1d36] hover:bg-[#f5aec4] cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CurtainFrame>
  );
}
