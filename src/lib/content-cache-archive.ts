import type { ContentCacheArchive, ContentCacheEntry } from '@/types';

function isValidFormat(value: unknown): value is ContentCacheEntry['format'] {
  return value === 'plain' || value === 'markdown';
}

function isContentCacheEntry(value: unknown): value is ContentCacheEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.url === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.content === 'string' &&
    isValidFormat(entry.format) &&
    typeof entry.cachedAt === 'number' &&
    Number.isFinite(entry.cachedAt)
  );
}

export function exportContentCacheArchive(
  entries: ContentCacheEntry[],
): ContentCacheArchive {
  return {
    version: 1,
    exportedAt: Date.now(),
    entries,
  };
}

export function parseContentCacheArchive(
  rawContent: string,
): ContentCacheArchive {
  const parsed = JSON.parse(rawContent) as Partial<ContentCacheArchive>;

  if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error('Arquivo de cache inválido.');
  }

  const entries = parsed.entries.filter(isContentCacheEntry);
  if (entries.length !== parsed.entries.length) {
    throw new Error('Arquivo de cache contém entradas inválidas.');
  }

  return {
    version: 1,
    exportedAt:
      typeof parsed.exportedAt === 'number' && Number.isFinite(parsed.exportedAt)
        ? parsed.exportedAt
        : Date.now(),
    entries,
  };
}
