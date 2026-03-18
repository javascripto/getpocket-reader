import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import {
  loadReaderPreferences,
  READER_PREFERENCES_KEY,
  resolveReaderTheme,
} from '@/features/pocket/lib/reader-theme';
import { exportCsvContent, importCsvContent } from '@/lib/pocket-csv';
import {
  clearAllItems,
  clearContentCache,
  createPocketItem,
  deleteItemById,
  listItems,
  saveItem,
  upsertItems,
} from '@/lib/pocket-db';
import type {
  AppTheme,
  PocketItem,
  PocketItemStatus,
  ReaderPreferences,
} from '@/types';

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
  exportCsv: () => void;
  clearAll: () => Promise<void>;
}

const PocketContext = createContext<PocketContextValue | undefined>(undefined);

export function PocketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PocketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [readerPreferences, setReaderPreferencesState] =
    useState<ReaderPreferences>(loadReaderPreferences);
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
      exportCsv,
      clearAll,
    }),
    [
      clearAll,
      createPost,
      deletePost,
      exportCsv,
      importCsvFile,
      readerPreferences,
      activeTheme,
      isImporting,
      isLoading,
      items,
      refreshItems,
      setReaderPreferences,
      toggleArchive,
      toggleFavorite,
      updatePostTags,
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
