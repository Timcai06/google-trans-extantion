/** Read the local 3.1 prototype without upgrading or modifying its database. */
export async function readPreviousLibrary(
  factory: IDBFactory = indexedDB,
): Promise<Record<string, unknown> | null> {
  const name = 'googletrans-vocabulary';
  if (!(await factory.databases()).some((database) => database.name === name)) return null;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    let rejected = false;
    const open = factory.open(name);
    open.onupgradeneeded = () => open.transaction?.abort();
    open.onsuccess = () => {
      if (rejected) open.result.close();
      else resolve(open.result);
    };
    open.onerror = () => reject(open.error ?? new Error('旧词库无法读取，原数据未修改'));
    open.onblocked = () => {
      rejected = true;
      reject(new Error('请关闭旧词库页面后重试迁移'));
    };
  });
  try {
    if (!db.objectStoreNames.contains('entries'))
      throw new Error('旧词库结构无法识别，原数据未修改');
    const names = [
      'entries',
      'progress',
      'events',
      'history',
      'challenges',
      'legacyMappings',
    ].filter((store) => db.objectStoreNames.contains(store));
    const snapshot = await new Promise<Record<string, Record<string, unknown>[]>>(
      (resolve, reject) => {
        const result: Record<string, Record<string, unknown>[]> = {};
        const tx = db.transaction(names, 'readonly');
        for (const store of names) {
          const request = tx.objectStore(store).getAll();
          request.onsuccess = () => {
            result[store] = request.result;
          };
        }
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error ?? new Error('旧词库读取中断，原数据未修改'));
        tx.onerror = () => reject(tx.error ?? new Error('旧词库读取失败，原数据未修改'));
      },
    );
    if (!snapshot.entries) throw new Error('旧词库读取不完整，原数据未修改');
    const progress = new Map((snapshot.progress ?? []).map((value) => [value.entryId, value]));
    // Shared identities are text/language rather than text/language/context.
    // Prefer the newest context; keep every variant and review in the archive.
    const entries = [...snapshot.entries].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
    return {
      translatedWords: Object.fromEntries(
        entries.map((entry) => [
          String(entry.id),
          {
            ...entry,
            sourceLanguage: entry.language,
            learningProgress: progress.get(entry.id) ?? {},
          },
        ]),
      ),
      learningHistory: { previousRuntime: { database: name, version: db.version, ...snapshot } },
    };
  } finally {
    db.close();
  }
}
