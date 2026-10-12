/** Preserve historical content while excluding credentials at every nesting level. */
export function sanitizeLegacy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeLegacy);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => {
        const name = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
        return !/^(?:.*(?:apikey|token|password|secret)(?:key|value)?|.*credentials?|auth(?:entication|orization|header|token|key|secret)?|deepseekkey|providerkey)$/.test(
          name,
        );
      })
      .map(([key, child]) => [key, sanitizeLegacy(child)]),
  );
}

export function legacyWord(key: string, input: unknown): Record<string, unknown> {
  if (typeof input === 'string' || typeof input === 'number')
    return { text: key, translation: String(input) };
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('Invalid legacy word');
  const value = input as Record<string, unknown>;
  const translated = value.translation ?? value.translatedText ?? value.meaning ?? value.definition;
  const translation =
    translated && typeof translated === 'object'
      ? ((translated as Record<string, unknown>).translation ??
        (translated as Record<string, unknown>).text)
      : translated;
  return {
    ...value,
    text: value.text ?? value.word ?? value.original ?? key,
    translation:
      typeof translation === 'string' || typeof translation === 'number' ? String(translation) : '',
    sourceLanguage: value.sourceLanguage ?? value.language ?? value.lang ?? 'en',
    context: value.context ?? value.sentence ?? value.example ?? '',
  };
}

export function legacyTimestamp(input: unknown, fallback: number): number {
  const value = typeof input === 'string' ? Date.parse(input) : input;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

export function legacyPreferences(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => {
      if (['enabled', 'highlightEnabled', 'autoSave'].includes(key))
        return typeof value === 'boolean';
      if (key === 'dailyGoal')
        return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 500;
      if (key === 'theme' || key === 'uiElementTheme')
        return ['system', 'light', 'dark'].includes(String(value));
      return (
        key === 'disabledHosts' &&
        Array.isArray(value) &&
        value.length <= 100 &&
        value.every(
          (host) => typeof host === 'string' && host.length <= 253 && /^[a-zA-Z0-9.-]+$/.test(host),
        )
      );
    }),
  );
}

/** Adapt the uncommitted runtime's exported file without inventing review events. */
export function previousBackup(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('Invalid previous runtime backup');
  const value = sanitizeLegacy(input) as Record<string, unknown>;
  if (value.format !== 'googletrans-learning-backup' || value.version !== 1)
    throw new TypeError('Unsupported previous runtime backup');
  for (const key of ['entries', 'progress', 'events', 'history', 'challenges']) {
    if (!Array.isArray(value[key]) || value[key].length > 100_000)
      throw new TypeError(`Invalid previous runtime backup ${key}`);
  }
  const entries = value.entries as Record<string, unknown>[];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !['id', 'text', 'language', 'translation', 'context'].every(
        (key) => typeof entry[key] === 'string' && (entry[key] as string).length <= 10_000,
      ) ||
      !entry.id ||
      !entry.text ||
      ids.has(entry.id as string) ||
      typeof entry.starred !== 'boolean' ||
      ![entry.createdAt, entry.updatedAt].every(
        (time) => typeof time === 'number' && Number.isSafeInteger(time) && time >= 0,
      )
    )
      throw new TypeError('Invalid or duplicate previous runtime entry');
    ids.add(entry.id as string);
  }
  const progress = new Map<string, Record<string, unknown>>();
  for (const item of value.progress as Record<string, unknown>[]) {
    if (
      !item ||
      typeof item.entryId !== 'string' ||
      !ids.has(item.entryId) ||
      progress.has(item.entryId)
    )
      throw new TypeError('Invalid previous runtime progress');
    progress.set(item.entryId, item);
  }
  if (value.preferences) value.preferences = legacyPreferences(value.preferences);
  return {
    translatedWords: Object.fromEntries(
      [...entries]
        .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
        .map((entry) => [
          entry.id as string,
          {
            ...entry,
            sourceLanguage: entry.language,
            learningProgress: progress.get(entry.id as string) ?? {},
          },
        ]),
    ),
    learningHistory: { previousRuntime: { backup: value } },
  };
}

export function canonicalLegacy(source: unknown): string {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, canonical(child)]),
      );
    return value;
  }
  return JSON.stringify(canonical(source));
}

export function previousBackupSource(source: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(canonicalLegacy(source));
  if (bytes.length > 32_000_000) throw new RangeError('Previous runtime backup exceeds limit');
  // The prototype's portable FNV identity is only a lookup key, not a signature.
  // The importer also compares the full archive before accepting a repeated key.
  let hash = 14695981039346656037n;
  for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * 1099511628211n) & 0xffffffffffffffffn;
  return `previous-backup:${hash.toString(16).padStart(16, '0')}`;
}
