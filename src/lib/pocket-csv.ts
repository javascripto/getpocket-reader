import Papa from 'papaparse';

import { createPocketItem } from '@/lib/pocket-db';
import type { PocketCsvRow, PocketItem } from '@/types';

function parseTags(rawTags: string | undefined): string[] {
  if (!rawTags) {
    return [];
  }

  return rawTags
    .split(/[|,;]/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function parseStatus(rawStatus: string | undefined): PocketItem['status'] {
  return rawStatus?.trim().toLowerCase() === 'archive' ? 'archive' : 'unread';
}

function parseFavorite(rawFavorite: string | undefined): boolean {
  const value = rawFavorite?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y';
}

function parseEpoch(rawEpoch: string | undefined): number {
  const value = Number(rawEpoch);
  return Number.isFinite(value) && value > 0
    ? value
    : Math.floor(Date.now() / 1000);
}

export function importCsvContent(csvContent: string): PocketItem[] {
  const result = Papa.parse<PocketCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const seen = new Set<string>();
  const items: PocketItem[] = [];

  for (const row of result.data) {
    const url = row.url?.trim();
    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);

    items.push(
      createPocketItem({
        title: row.title?.trim() || url,
        url,
        timeAdded: parseEpoch(row.time_added) * 1000,
        tags: parseTags(row.tags),
        status: parseStatus(row.status),
        favorite: parseFavorite(row.favorite),
      }),
    );
  }

  return items;
}

export function exportCsvContent(items: PocketItem[]): string {
  const rows = items.map(item => ({
    title: item.title,
    url: item.url,
    time_added: Math.floor(item.timeAdded / 1000),
    tags: item.tags.join(','),
    status: item.status,
    favorite: item.favorite ? 'true' : 'false',
  }));

  return Papa.unparse(rows, { quotes: false });
}
