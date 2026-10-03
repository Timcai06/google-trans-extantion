import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createIndexedDBStore, createLibraryClient, type LibraryWord } from '@googletrans/data';
import type { SyncResponse } from '@googletrans/core';
import {
  api,
  isExtension,
  readConnection,
  translationRequestStillCurrent,
  validateServerURL,
  writeConnection,
  type Connection,
  type Session,
} from './connection';

const store = createIndexedDBStore({ name: 'googletrans-library-v1' });
const savedDevice = localStorage.getItem('googletransDevice');
const deviceId = savedDevice ?? crypto.randomUUID();
localStorage.setItem('googletransDevice', deviceId);
const blank = {
  text: '',
  translation: '',
  context: '',
  sourceLanguage: 'en',
  targetLanguage: 'zh-CN',
};

export function App() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [serverURL, setServerURL] = useState('http://127.0.0.1:8787');
  const [words, setWords] = useState<LibraryWord[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<LibraryWord | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('词条会先保存在本机；登录后可同步账号词库。');
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [reviewMode, setReviewMode] = useState<'flashcard' | 'quiz' | 'spelling'>('flashcard');
  const activeNamespace = connection?.session?.user.id ?? 'local';
  const namespaceRef = useRef(activeNamespace);
  namespaceRef.current = activeNamespace;
  const client = useMemo(
    () => createLibraryClient({ store, deviceId, namespace: activeNamespace }),
    [activeNamespace],
  );
  const refresh = useCallback(async () => {
    const result = await client.listWords();
    if (namespaceRef.current === client.namespace) setWords(result);
  }, [client]);
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  const persistConnection = async (value: Connection) => {
    await writeConnection(value);
    setWords([]);
    setEditing(null);
    setForm(blank);
    setReviewId(null);
    setConnection(value);
  };
  const sync = useCallback(async () => {
    if (!connection?.session) throw new Error('请先登录，匿名词库不会自动上传。');
    const report = await client.sync((request) =>
      api<SyncResponse>(connection, '/v1/sync', request),
    );
    await refresh();
    setMessage(
      `同步完成：发送 ${report.sent}，接收 ${report.received}，待上传 ${report.pending}。`,
    );
  }, [client, connection, refresh]);
  useEffect(() => {
    void readConnection()
      .then((value) => {
        setConnection(value);
        setServerURL(value.serverURL);
        if (value.migration)
          setMessage(
            `旧词库已导入 ${value.migration.imported} 条，跳过 ${value.migration.skipped} 条；原始数据仍保留，可导出备份核对。`,
          );
      })
      .catch((cause) => setError(String(cause)));
  }, []);
  useEffect(() => {
    if (connection)
      void run(async () => {
        await refresh();
        if (connection.session && navigator.onLine) await sync();
      });
  }, [connection, refresh, run, sync]);
  useEffect(() => {
    const update = () => {
      if (connection && document.visibilityState === 'visible')
        void refresh().catch((cause) => setError(String(cause)));
    };
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [connection, refresh]);
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      if (connection?.session) void run(sync);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [connection, run, sync]);
  // All mutations commit locally before a network attempt. Network failure leaves the outbox intact.
  const mutate = (task: () => Promise<unknown>) =>
    run(async () => {
      if (!connection) throw new Error('词库尚未初始化');
      await task();
      await refresh();
      setMessage('已保存到本机。');
      if (connection.session && navigator.onLine) await sync();
    });
  const save = (event: FormEvent) => {
    event.preventDefault();
    void mutate(async () => {
      await client.saveWord({
        ...form,
        ...(editing
          ? { starred: editing.starred, createdAt: editing.createdAt, legacy: editing.legacy }
          : {}),
      });
      setEditing(null);
      setForm(blank);
    });
  };
  const authenticate = (action: 'login' | 'register') =>
    run(async () => {
      const url = validateServerURL(serverURL);
      const session = await api<Session>({ serverURL: url, session: null }, `/v1/auth/${action}`, {
        email,
        password,
      });
      await persistConnection({ serverURL: url, session });
      setPassword('');
      setMessage('已登录账号词库；本机匿名词库需点击导入。');
    });
  const logout = () =>
    run(async () => {
      const previous = connection!;
      await persistConnection({ ...previous, session: null });
      setMessage('已退出；本地账号数据保留，当前显示匿名词库。');
      if (previous.session) {
        try {
          await api(previous, '/v1/auth/logout', {});
        } catch {
          setMessage('本机已退出。服务器不可达，服务器会话未确认撤销。');
        }
      }
    });
  const visible = words.filter(
    (word) =>
      `${word.text} ${word.translation} ${word.context}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter !== 'starred' || word.starred) &&
      (filter !== 'due' || word.progress.nextReview <= Date.now()),
  );
  const due = words.filter((word) => word.progress.nextReview <= Date.now());
  const review = words.find((word) => word.id === reviewId);
  const submitAnswer = (correct: boolean) =>
    mutate(async () => {
      if (!review) return;
      await client.submitReview({ wordId: review.id, correct, mode: reviewMode });
      const next = due.find((word) => word.id !== review.id);
      setReviewId(next?.id ?? null);
      setRevealed(false);
      setAnswer('');
    });
  return (
    <main>
      <header>
        <div>
          <h1>GoogleTrans 词库</h1>
          <p>
            {connection?.session ? connection.session.user.email : '本机匿名词库'} ·{' '}
            {online ? '在线' : '离线，仍可保存'}
          </p>
        </div>
        {isExtension() && (
          <a href="./index.html?view=tab" target="_blank" rel="noreferrer">
            打开完整页面
          </a>
        )}
      </header>
      <section aria-labelledby="account">
        <h2 id="account">账号与同步</h2>
        <label>
          同步服务器
          <input value={serverURL} onChange={(e) => setServerURL(e.target.value)} type="url" />
        </label>
        <div className="actions">
          <button
            disabled={busy || !connection}
            onClick={() =>
              void run(async () => {
                const url = validateServerURL(serverURL);
                const changed = url !== connection!.serverURL;
                await persistConnection({
                  serverURL: url,
                  session: changed ? null : connection!.session,
                });
                setMessage(changed ? '已切换服务器并退出原会话。' : '服务器已保存。');
              })
            }
          >
            保存服务器
          </button>
          <button disabled={busy || !connection?.session} onClick={() => void run(sync)}>
            立即同步
          </button>
        </div>
        {connection?.session ? (
          <div className="actions">
            <button disabled={busy} onClick={() => void logout()}>
              退出
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm('把本机匿名词库复制到当前账号并同步？此操作不会删除匿名词库。'))
                  void mutate(() => client.importAnonymous());
              }}
            >
              导入本机词库到账号
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void authenticate('login');
            }}
          >
            <div className="columns">
              <label>
                邮箱
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="actions">
              <button disabled={busy || !connection}>登录</button>
              <button
                type="button"
                disabled={busy || !connection || !email || password.length < 8}
                onClick={() => void authenticate('register')}
              >
                注册
              </button>
            </div>
          </form>
        )}
        <p className="hint">
          登录会切换独立词库。Web 登录保留在当前标签页会话；扩展连接保存在可信扩展页面。
        </p>
      </section>
      <p role="status">{busy ? '处理中…' : message}</p>
      {error && (
        <p role="alert" className="error">
          {error} 本地已保存的内容会保留，可稍后重试同步。
        </p>
      )}
      <section>
        <h2>{editing ? '编辑词条' : '添加词条'}</h2>
        <form onSubmit={save}>
          <div className="columns">
            <label>
              单词
              <input
                required
                maxLength={500}
                disabled={Boolean(editing)}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
              />
            </label>
            <label>
              翻译
              <input
                maxLength={16000}
                value={form.translation}
                onChange={(e) => setForm({ ...form, translation: e.target.value })}
              />
            </label>
          </div>
          <label>
            上下文
            <textarea
              maxLength={16000}
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
            />
          </label>
          <div className="columns">
            <label>
              源语言
              <input
                disabled={Boolean(editing)}
                value={form.sourceLanguage}
                onChange={(e) => setForm({ ...form, sourceLanguage: e.target.value })}
                required
                maxLength={32}
              />
            </label>
            <label>
              目标语言
              <input
                value={form.targetLanguage}
                onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })}
                required
                maxLength={32}
              />
            </label>
          </div>
          <div className="actions">
            <button disabled={busy || !connection}>保存词条</button>
            <button
              type="button"
              disabled={busy || !connection?.session || !form.text}
              onClick={() =>
                void run(async () => {
                  const submitted = { ...form };
                  const result = await api<{ translation: string }>(connection!, '/v1/translate', {
                    text: submitted.text,
                    sourceLanguage: submitted.sourceLanguage,
                    targetLanguage: submitted.targetLanguage,
                  });
                  setForm((previous) =>
                    translationRequestStillCurrent(previous, submitted)
                      ? { ...previous, translation: result.translation }
                      : previous,
                  );
                })
              }
            >
              服务器翻译
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                取消编辑
              </button>
            )}
          </div>
        </form>
      </section>
      <section>
        <h2>复习 · {due.length} 条到期</h2>
        <label>
          练习方式
          <select
            value={reviewMode}
            onChange={(e) => {
              setReviewMode(e.target.value as typeof reviewMode);
              setRevealed(false);
              setAnswer('');
            }}
          >
            <option value="flashcard">闪卡</option>
            <option value="quiz">翻译问答</option>
            <option value="spelling">拼写</option>
          </select>
        </label>
        {review ? (
          <article>
            <h3>{reviewMode === 'spelling' ? review.translation : review.text}</h3>
            {reviewMode !== 'flashcard' && (
              <label>
                {reviewMode === 'spelling' ? '输入单词' : '输入翻译'}
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </label>
            )}
            {revealed && <p>{reviewMode === 'spelling' ? review.text : review.translation}</p>}
            <div className="actions">
              <button disabled={busy} onClick={() => setRevealed(true)}>
                显示答案
              </button>
              {reviewMode === 'flashcard' ? (
                <>
                  <button disabled={busy || !revealed} onClick={() => void submitAnswer(true)}>
                    记住了
                  </button>
                  <button disabled={busy || !revealed} onClick={() => void submitAnswer(false)}>
                    再练习
                  </button>
                </>
              ) : (
                <button
                  disabled={busy || !answer}
                  onClick={() =>
                    void submitAnswer(
                      answer.normalize('NFKC').trim().toLowerCase() ===
                        (reviewMode === 'spelling' ? review.text : review.translation)
                          .normalize('NFKC')
                          .trim()
                          .toLowerCase(),
                    )
                  }
                >
                  提交答案
                </button>
              )}
            </div>
          </article>
        ) : (
          <button
            disabled={busy || !due.length}
            onClick={() => {
              setReviewId(due[0]?.id ?? null);
              setRevealed(false);
              setAnswer('');
            }}
          >
            开始到期复习
          </button>
        )}
      </section>
      <section>
        <h2>词库 · {words.length} 条</h2>
        <div className="columns">
          <label>
            搜索
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="单词、翻译或上下文"
            />
          </label>
          <label>
            筛选
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">全部</option>
              <option value="starred">收藏</option>
              <option value="due">到期</option>
            </select>
          </label>
        </div>
        {visible.length === 0 && <p>暂无符合条件的词条。</p>}
        {visible.map((word) => (
          <article key={word.id}>
            <div className="word-heading">
              <h3>{word.text}</h3>
              <button
                disabled={busy}
                aria-label={`${word.starred ? '取消收藏' : '收藏'} ${word.text}`}
                onClick={() => void mutate(() => client.setStarred(word.id, !word.starred))}
              >
                {word.starred ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>
            <p>{word.translation || '未填写翻译'}</p>
            {word.context && <blockquote>{word.context}</blockquote>}
            <p className="hint">
              {word.sourceLanguage} → {word.targetLanguage} · 等级 {word.progress.masteryLevel}/5 ·
              复习 {word.progress.reviewCount} 次 ·{' '}
              {word.progress.nextReview > Date.now()
                ? `下次 ${new Date(word.progress.nextReview).toLocaleString()}`
                : '已到期'}
            </p>
            <div className="actions">
              <button
                disabled={busy}
                onClick={() => {
                  setEditing(word);
                  setForm({
                    text: word.text,
                    translation: word.translation,
                    context: word.context,
                    sourceLanguage: word.sourceLanguage,
                    targetLanguage: word.targetLanguage,
                  });
                }}
              >
                编辑
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (confirm(`删除「${word.text}」？删除也会同步至账号。`))
                    void mutate(() => client.deleteWord(word.id));
                }}
              >
                删除
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setReviewId(word.id);
                  setRevealed(false);
                }}
              >
                复习此词
              </button>
            </div>
          </article>
        ))}
      </section>
      <section>
        <h2>备份与恢复</h2>
        <div className="actions">
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const backup = await client.exportBackup();
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
                );
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `googletrans-${client.namespace}-${Date.now()}.json`;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage('备份已导出，不包含 token 或密码。');
              })
            }
          >
            导出当前词库
          </button>
          <label className="file-button">
            导入备份
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file && confirm('将备份合并到当前词库？导入前的备份会保留。'))
                  void mutate(async () => {
                    const result = await client.importBackup(JSON.parse(await file.text()));
                    setMessage(`导入 ${result.imported} 条，跳过 ${result.skipped} 条。`);
                  });
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm('恢复最近一次导入前的词库备份？'))
                void mutate(() => client.restorePreImportBackup());
            }}
          >
            恢复导入前备份
          </button>
        </div>
        <p className="hint">备份属于当前词库；导入后在已登录时参与同步。</p>
      </section>
    </main>
  );
}
