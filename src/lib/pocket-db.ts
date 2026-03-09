import { openDB } from 'idb';

import type { PocketItem } from '@/types';

const DB_NAME = 'pocket-offline-db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';

const database = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (db.objectStoreNames.contains(STORE_ITEMS)) {
      return;
    }

    const store = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
    store.createIndex('by-status', 'status', { unique: false });
    store.createIndex('by-favorite', 'favorite', { unique: false });
    store.createIndex('by-timeAdded', 'timeAdded', { unique: false });
  },
});

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

function toId(url: string): string {
  const normalized = normalizeUrl(url);
  const bytes = new TextEncoder().encode(normalized);
  let hash = 0;

  for (const byte of bytes) {
    hash = (hash * 31 + byte) >>> 0;
  }

  return `item_${hash.toString(16)}_${normalized.slice(0, 24).replace(/[^a-z0-9]/g, '')}`;
}

export function createPocketItem(partial: {
  title: string;
  url: string;
  timeAdded: number;
  tags: string[];
  status: PocketItem['status'];
  favorite: boolean;
}): PocketItem {
  const now = Date.now();

  return {
    id: toId(partial.url),
    title: partial.title,
    url: partial.url,
    timeAdded: partial.timeAdded,
    tags: partial.tags,
    status: partial.status,
    favorite: partial.favorite,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listItems(): Promise<PocketItem[]> {
  const db = await database;
  const items = await db.getAll(STORE_ITEMS);
  return items.sort((a, b) => b.timeAdded - a.timeAdded);
}

export async function upsertItems(items: PocketItem[]): Promise<void> {
  const db = await database;
  const tx = db.transaction(STORE_ITEMS, 'readwrite');

  for (const item of items) {
    const existing = await tx.store.get(item.id);
    const nextItem = existing
      ? {
          ...existing,
          ...item,
          createdAt: existing.createdAt,
          updatedAt: Date.now(),
        }
      : item;

    await tx.store.put(nextItem);
  }

  await tx.done;
}

export async function saveItem(item: PocketItem): Promise<void> {
  await upsertItems([item]);
}

export async function clearAllItems(): Promise<void> {
  const db = await database;
  await db.clear(STORE_ITEMS);
}

export async function deleteItemById(itemId: string): Promise<void> {
  const db = await database;
  await db.delete(STORE_ITEMS, itemId);
}
