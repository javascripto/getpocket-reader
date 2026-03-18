export type PocketItemStatus = 'unread' | 'archive';

export type PocketViewMode = 'list' | 'cards';

export type ReaderMode = 'clean' | 'original';
export type ReaderTheme = 'light' | 'dark' | 'sepia' | 'slate' | 'system';
export type AppTheme = Exclude<ReaderTheme, 'system'>;
export type ReaderFontFamily = 'sans' | 'serif' | 'mono';

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
}

export interface PocketItem {
  id: string;
  title: string;
  url: string;
  timeAdded: number;
  tags: string[];
  status: PocketItemStatus;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PocketCsvRow {
  title?: string;
  url?: string;
  time_added?: string;
  tags?: string;
  status?: string;
  favorite?: string;
}

export interface ContentCacheEntry {
  url: string;
  title: string;
  content: string;
  format: 'plain' | 'markdown';
  cachedAt: number;
}

export interface ContentCacheArchive {
  version: 1;
  exportedAt: number;
  entries: ContentCacheEntry[];
}

export interface ContentCacheWarmupProgress {
  total: number;
  completed: number;
  success: number;
  skipped: number;
  failed: number;
  currentTitle: string;
}
