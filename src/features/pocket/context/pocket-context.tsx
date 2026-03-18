import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import {
  loadReaderPreferences,
  READER_PREFERENCES_KEY,
  resolveReaderTheme,
} from '@/features/pocket/lib/reader-theme';
import {
  exportContentCacheArchive,
  parseContentCacheArchive,
} from '@/lib/content-cache-archive';
import { fetchCleanContent } from '@/lib/clean-content';
import { exportCsvContent, importCsvContent } from '@/lib/pocket-csv';
import {
  clearAllItems,
  clearContentCache,
  createPocketItem,
  deleteItemById,
  getContentCache,
  listItems,
  listContentCache,
  saveItem,
  upsertContentCacheEntries,
  upsertItems,
} from '@/lib/pocket-db';
import type {
  AppTheme,
  ContentCacheWarmupProgress,
  PocketItem,
  PocketItemStatus,
  ReaderPreferences,
} from '@/types';

const CACHE_WARMUP_DELAY_MS = 1500;

interface CreatePostInput {
  title: string;
  url: string;
  tagsText: string;
  status: PocketItemStatus;
}

interface PocketContextValue {
  items: PocketItem[];
  isLoading: boolean;
  isImporting: boolean;
  isCacheImporting: boolean;
  isCacheWarming: boolean;
  cacheWarmupProgress: ContentCacheWarmupProgress | null;
  readerPreferences: ReaderPreferences;
  activeTheme: AppTheme;
  setReaderPreferences: (patch: Partial<ReaderPreferences>) => void;
  refreshItems: (showLoading?: boolean) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<void>;
  toggleFavorite: (item: PocketItem) => Promise<void>;
  toggleArchive: (item: PocketItem) => Promise<void>;
  updatePostTags: (item: PocketItem, tags: string[]) => Promise<void>;
  renameTagAcrossPosts: (oldTag: string, newTag: string) => Promise<void>;
  deletePost: (item: PocketItem) => Promise<void>;
  importCsvFile: (file: File) => Promise<void>;
  importCacheFile: (file: File) => Promise<void>;
  exportCsv: () => void;
  exportContentCache: () => Promise<void>;
  warmContentCache: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const PocketContext = createContext<PocketContextValue | undefined>(undefined);

export function PocketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PocketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isCacheImporting, setIsCacheImporting] = useState(false);
  const [isCacheWarming, setIsCacheWarming] = useState(false);
  const [cacheWarmupProgress, setCacheWarmupProgress] =
    useState<ContentCacheWarmupProgress | null>(null);
  const [readerPreferences, setReaderPreferencesState] =
    useState<ReaderPreferences>(loadReaderPreferences);
  const isCacheWarmingRef = useRef(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const activeTheme = useMemo(
    () => resolveReaderTheme(readerPreferences.theme, systemPrefersDark),
    [readerPreferences.theme, systemPrefersDark],
  );

  const setReaderPreferences = useCallback(
    (patch: Partial<ReaderPreferences>) => {
      setReaderPreferencesState(current => ({ ...current, ...patch }));
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(
      READER_PREFERENCES_KEY,
      JSON.stringify(readerPreferences),
    );
  }, [readerPreferences]);

  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', activeTheme);
  }, [activeTheme]);

  const refreshItems = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const allItems = await listItems();
      setItems(allItems);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshItems(true);
  }, [refreshItems]);

  const updateItem = useCallback(
    async (item: PocketItem) => {
      await saveItem({ ...item, updatedAt: Date.now() });
      await refreshItems();
    },
    [refreshItems],
  );

  const toggleFavorite = useCallback(
    async (item: PocketItem) => {
      await updateItem({ ...item, favorite: !item.favorite });
    },
    [updateItem],
  );

  const toggleArchive = useCallback(
    async (item: PocketItem) => {
      await updateItem({
        ...item,
        status: item.status === 'archive' ? 'unread' : 'archive',
      });
    },
    [updateItem],
  );

  const deletePost = useCallback(
    async (item: PocketItem) => {
      await deleteItemById(item.id);
      await refreshItems();
      toast.success('Post excluído');
    },
    [refreshItems],
  );

  const updatePostTags = useCallback(
    async (item: PocketItem, tags: string[]) => {
      const normalizedTags = [...new Set(tags.map(tag => tag.trim()))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      await updateItem({ ...item, tags: normalizedTags });
      toast.success('Tags atualizadas');
    },
    [updateItem],
  );

  const renameTagAcrossPosts = useCallback(
    async (oldTag: string, newTag: string) => {
      const from = oldTag.trim();
      const to = newTag.trim();

      if (!from || !to) {
        toast.error('Nome da tag inválido');
        return;
      }

      if (from === to) {
        return;
      }

      const affectedItems = items.filter(item => item.tags.includes(from));
      if (affectedItems.length === 0) {
        return;
      }

      const now = Date.now();
      const nextItems = affectedItems.map(item => ({
        ...item,
        tags: [
          ...new Set(item.tags.map(tag => (tag === from ? to : tag))),
        ].sort((a, b) => a.localeCompare(b)),
        updatedAt: now,
      }));

      await upsertItems(nextItems);
      await refreshItems();
      toast.success(
        `Tag renomeada em ${affectedItems.length} post${affectedItems.length > 1 ? 's' : ''}`,
      );
    },
    [items, refreshItems],
  );

  const createPost = useCallback(
    async (input: CreatePostInput) => {
      const url = input.url.trim();
      if (!url) {
        toast.error('URL obrigatória');
        return;
      }

      const nextItem = createPocketItem({
        title: input.title.trim() || url,
        url,
        timeAdded: Date.now(),
        tags: input.tagsText
          .split(/[|,;]/)
          .map(value => value.trim())
          .filter(Boolean),
        status: input.status,
        favorite: false,
      });

      await saveItem(nextItem);
      await refreshItems();
      toast.success('Post salvo offline');
    },
    [refreshItems],
  );

  const importCsvFile = useCallback(
    async (file: File) => {
      try {
        setIsImporting(true);
        const text = await file.text();
        const importedItems = importCsvContent(text);

        await upsertItems(importedItems);
        await refreshItems(true);

        toast.success(`Importados ${importedItems.length} itens`);
      } finally {
        setIsImporting(false);
      }
    },
    [refreshItems],
  );

  const exportCsv = useCallback(() => {
    const csv = exportCsvContent(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `pocket-offline-export-${dateStamp}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success('Export concluído');
  }, [items]);

  const importCacheFile = useCallback(async (file: File) => {
    try {
      setIsCacheImporting(true);
      const text = await file.text();
      const archive = parseContentCacheArchive(text);

      await upsertContentCacheEntries(archive.entries);
      toast.success(`Importados ${archive.entries.length} conteúdos em cache`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao importar cache';
      toast.error(message);
    } finally {
      setIsCacheImporting(false);
    }
  }, []);

  const exportContentCache = useCallback(async () => {
    const entries = await listContentCache();
    const archive = exportContentCacheArchive(entries);
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `pocket-content-cache-${dateStamp}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success(`Cache exportado (${entries.length} itens)`);
  }, []);

  const warmContentCache = useCallback(async () => {
    if (isCacheWarmingRef.current) {
      toast.message('A fila de cache ja esta em andamento');
      return;
    }

    const uniqueItems = Array.from(
      new Map(
        items
          .map(item => [item.url.trim().toLowerCase(), item] as const)
          .filter(([url]) => url),
      ).values(),
    );

    if (uniqueItems.length === 0) {
      toast.message('Nao ha posts para salvar no cache');
      return;
    }

    const cachedEntries = await listContentCache();
    const cachedUrls = new Set(cachedEntries.map(entry => entry.url));
    const pendingItems = uniqueItems.filter(
      item => !cachedUrls.has(item.url.trim().toLowerCase().replace(/\/+$/, '')),
    );

    if (pendingItems.length === 0) {
      toast.message('Todos os posts ja estao salvos no cache');
      return;
    }

    isCacheWarmingRef.current = true;
    setIsCacheWarming(true);
    setCacheWarmupProgress({
      total: pendingItems.length,
      completed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      currentTitle: '',
    });

    try {
      let success = 0;
      let skipped = 0;
      let failed = 0;

      for (const [index, item] of pendingItems.entries()) {
        setCacheWarmupProgress(current =>
          current
            ? {
                ...current,
                currentTitle: item.title,
              }
            : current,
        );

        const cached = await getContentCache(item.url);
        if (cached) {
          skipped += 1;
          setCacheWarmupProgress(current =>
            current
              ? {
                  ...current,
                  completed: index + 1,
                  skipped,
                }
              : current,
          );
          continue;
        }

        try {
          await fetchCleanContent(item.url);
          success += 1;
        } catch {
          failed += 1;
        }

        setCacheWarmupProgress(current =>
          current
            ? {
                ...current,
                completed: index + 1,
                success,
                failed,
              }
            : current,
        );

        if (index < pendingItems.length - 1) {
          await new Promise(resolve =>
            window.setTimeout(resolve, CACHE_WARMUP_DELAY_MS),
          );
        }
      }

      toast.success(
        `Cache concluido: ${success} novos, ${skipped} ja existentes, ${failed} falhas`,
      );
    } finally {
      isCacheWarmingRef.current = false;
      setIsCacheWarming(false);
      setCacheWarmupProgress(current =>
        current
          ? {
              ...current,
              currentTitle: '',
            }
          : current,
      );
    }
  }, [items]);

  const clearAll = useCallback(async () => {
    await clearAllItems();
    await clearContentCache();
    await refreshItems(true);
  }, [refreshItems]);

  const value = useMemo<PocketContextValue>(
    () => ({
      items,
      isLoading,
      isImporting,
      isCacheImporting,
      isCacheWarming,
      cacheWarmupProgress,
      readerPreferences,
      activeTheme,
      setReaderPreferences,
      refreshItems,
      createPost,
      toggleFavorite,
      toggleArchive,
      updatePostTags,
      renameTagAcrossPosts,
      deletePost,
      importCsvFile,
      importCacheFile,
      exportCsv,
      exportContentCache,
      warmContentCache,
      clearAll,
    }),
    [
      cacheWarmupProgress,
      clearAll,
      createPost,
      deletePost,
      exportContentCache,
      exportCsv,
      importCsvFile,
      importCacheFile,
      readerPreferences,
      activeTheme,
      isCacheImporting,
      isCacheWarming,
      isImporting,
      isLoading,
      items,
      refreshItems,
      setReaderPreferences,
      toggleArchive,
      toggleFavorite,
      updatePostTags,
      warmContentCache,
      renameTagAcrossPosts,
    ],
  );

  return (
    <PocketContext.Provider value={value}>{children}</PocketContext.Provider>
  );
}

export function usePocket() {
  const context = useContext(PocketContext);
  if (!context) {
    throw new Error('usePocket must be used within PocketProvider');
  }
  return context;
}
