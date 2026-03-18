import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircleX,
  Grid2x2,
  Heart,
  List,
  Loader2,
  Menu,
  Plus,
  Pocket,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AppSettingsDialog } from '@/features/pocket/components/app-settings-dialog';
import { PocketItemCard } from '@/features/pocket/components/pocket-item-card';
import { usePocket } from '@/features/pocket/context/pocket-context';
import { readerThemeColors } from '@/features/pocket/lib/reader-theme';
import type { PocketItem, PocketItemStatus, PocketViewMode } from '@/types';

type SidebarFilter = 'all' | 'unread' | 'archive';

const LIST_SCROLL_STORAGE_KEY = 'pocket-saves-scroll-v1';

function parseSidebarFilter(value: string | null): SidebarFilter {
  return value === 'unread' || value === 'archive' ? value : 'all';
}

function parseBooleanParam(value: string | null): boolean {
  return value === 'true';
}

export function SavesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    items,
    isLoading,
    isImporting,
    isCacheImporting,
    isCacheWarming,
    cacheWarmupProgress,
    readerPreferences,
    activeTheme,
    setReaderPreferences,
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
  } = usePocket();

  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>(() =>
    parseSidebarFilter(searchParams.get('filter')),
  );
  const [onlyFavorites, setOnlyFavorites] = useState(() =>
    parseBooleanParam(searchParams.get('favorites')),
  );
  const [onlyUntagged, setOnlyUntagged] = useState(() =>
    parseBooleanParam(searchParams.get('untagged')),
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    () => searchParams.get('tag') ?? null,
  );
  const [viewMode, setViewMode] = useState<PocketViewMode>(() => {
    const paramValue = searchParams.get('view');
    if (paramValue === 'list' || paramValue === 'cards') {
      return paramValue;
    }

    const stored = localStorage.getItem('pocket-view-mode-v1');
    return stored === 'list' || stored === 'cards' ? stored : 'cards';
  });

  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newStatus, setNewStatus] = useState<PocketItemStatus>('unread');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearSecondDialogOpen, setIsClearSecondDialogOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<PocketItem | null>(
    null,
  );
  const [itemPendingTagEdit, setItemPendingTagEdit] =
    useState<PocketItem | null>(null);
  const [tagSelection, setTagSelection] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [tagPendingRename, setTagPendingRename] = useState<string | null>(null);
  const [renameTagValue, setRenameTagValue] = useState('');

  const [resultScrollElement, setResultScrollElement] =
    useState<HTMLDivElement | null>(null);
  const [resultWidth, setResultWidth] = useState(0);
  const hasRestoredScrollRef = useRef(false);
  const themeColors = readerThemeColors(activeTheme);

  const tagCloud = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filteredItems = useMemo(() => {
    const loweredTerm = searchTerm.trim().toLowerCase();

    return items.filter(item => {
      if (sidebarFilter === 'unread' && item.status !== 'unread') {
        return false;
      }

      if (sidebarFilter === 'archive' && item.status !== 'archive') {
        return false;
      }

      if (onlyFavorites && !item.favorite) {
        return false;
      }

      if (onlyUntagged && item.tags.length > 0) {
        return false;
      }

      if (selectedTag && !item.tags.includes(selectedTag)) {
        return false;
      }

      if (!loweredTerm) {
        return true;
      }

      return (
        item.title.toLowerCase().includes(loweredTerm) ||
        item.url.toLowerCase().includes(loweredTerm) ||
        item.tags.some(tag => tag.toLowerCase().includes(loweredTerm))
      );
    });
  }, [
    items,
    onlyFavorites,
    onlyUntagged,
    searchTerm,
    selectedTag,
    sidebarFilter,
  ]);

  useEffect(() => {
    const element = resultScrollElement;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(entries => {
      const [entry] = entries;
      if (entry) {
        setResultWidth(entry.contentRect.width);
      }
    });

    setResultWidth(element.clientWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [resultScrollElement]);

  useEffect(() => {
    localStorage.setItem('pocket-view-mode-v1', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (searchTerm.trim()) {
      nextParams.set('q', searchTerm.trim());
    }

    if (sidebarFilter !== 'all') {
      nextParams.set('filter', sidebarFilter);
    }

    if (onlyFavorites) {
      nextParams.set('favorites', 'true');
    }

    if (onlyUntagged) {
      nextParams.set('untagged', 'true');
    }

    if (selectedTag) {
      nextParams.set('tag', selectedTag);
    }

    if (viewMode !== 'cards') {
      nextParams.set('view', viewMode);
    }

    const nextSearch = nextParams.toString();
    if (nextSearch !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    onlyFavorites,
    onlyUntagged,
    searchParams,
    searchTerm,
    selectedTag,
    setSearchParams,
    sidebarFilter,
    viewMode,
  ]);

  useEffect(() => {
    if (!resultScrollElement) {
      return;
    }

    const element = resultScrollElement;

    function onScroll() {
      sessionStorage.setItem(
        LIST_SCROLL_STORAGE_KEY,
        JSON.stringify({
          search: location.search,
          scrollTop: element.scrollTop,
        }),
      );
    }

    element.addEventListener('scroll', onScroll);
    return () => element.removeEventListener('scroll', onScroll);
  }, [location.search, resultScrollElement]);

  useEffect(() => {
    if (!resultScrollElement || hasRestoredScrollRef.current) {
      return;
    }

    const rawValue = sessionStorage.getItem(LIST_SCROLL_STORAGE_KEY);
    if (!rawValue) {
      hasRestoredScrollRef.current = true;
      return;
    }

    try {
      const saved = JSON.parse(rawValue) as {
        search?: string;
        scrollTop?: number;
      };

      if (
        saved.search === location.search &&
        typeof saved.scrollTop === 'number' &&
        Number.isFinite(saved.scrollTop)
      ) {
        resultScrollElement.scrollTop = saved.scrollTop;
      }
    } catch {
      // Ignore invalid saved scroll state.
    }

    hasRestoredScrollRef.current = true;
  }, [location.search, resultScrollElement]);

  const cardColumns = useMemo(() => {
    if (viewMode === 'list') {
      return 1;
    }

    if (resultWidth >= 900) {
      return 3;
    }

    if (resultWidth >= 640) {
      return 2;
    }

    return 1;
  }, [resultWidth, viewMode]);

  const virtualRows = useMemo(() => {
    if (cardColumns <= 1) {
      return filteredItems.map(item => [item]);
    }

    const rows: PocketItem[][] = [];
    for (let index = 0; index < filteredItems.length; index += cardColumns) {
      rows.push(filteredItems.slice(index, index + cardColumns));
    }

    return rows;
  }, [cardColumns, filteredItems]);

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => resultScrollElement,
    estimateSize: () => (viewMode === 'cards' ? 290 : 150),
    overscan: 8,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer]);

  async function onCreatePost() {
    await createPost({
      title: newTitle,
      url: newUrl,
      tagsText: newTags,
      status: newStatus,
    });

    setNewTitle('');
    setNewUrl('');
    setNewTags('');
    setNewStatus('unread');
    setIsCreateDialogOpen(false);
  }

  async function onConfirmDelete() {
    if (!itemPendingDelete) {
      return;
    }
    await deletePost(itemPendingDelete);
    setItemPendingDelete(null);
  }

  function onToggleTagSelection(tag: string) {
    setTagSelection(current =>
      current.includes(tag)
        ? current.filter(value => value !== tag)
        : [...current, tag],
    );
  }

  function onAddTagFromInput() {
    const normalized = newTagName.trim();
    if (!normalized) {
      return;
    }

    setTagSelection(current =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    setNewTagName('');
  }

  async function onConfirmTagUpdate() {
    if (!itemPendingTagEdit) {
      return;
    }

    await updatePostTags(itemPendingTagEdit, tagSelection);
    setItemPendingTagEdit(null);
    setTagSelection([]);
    setNewTagName('');
  }

  async function onConfirmTagRename() {
    if (!tagPendingRename) {
      return;
    }

    const oldTag = tagPendingRename;
    const nextTag = renameTagValue.trim();

    await renameTagAcrossPosts(oldTag, nextTag);

    if (selectedTag === oldTag && nextTag) {
      setSelectedTag(nextTag);
    }

    setTagPendingRename(null);
    setRenameTagValue('');
  }

  function SidebarContent({ onAction }: { onAction?: () => void }) {
    return (
      <>
        <div className="mb-5 space-y-2 text-base">
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${sidebarFilter === 'all' ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-accent/60'}`}
            onClick={() => {
              setSidebarFilter('all');
              onAction?.();
            }}
          >
            <span>Todos</span>
            <span>{items.length}</span>
          </button>
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${sidebarFilter === 'unread' ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-accent/60'}`}
            onClick={() => {
              setSidebarFilter('unread');
              onAction?.();
            }}
          >
            <span>Unread</span>
            <span>{items.filter(item => item.status === 'unread').length}</span>
          </button>
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${sidebarFilter === 'archive' ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-accent/60'}`}
            onClick={() => {
              setSidebarFilter('archive');
              onAction?.();
            }}
          >
            <span>Archive</span>
            <span>
              {items.filter(item => item.status === 'archive').length}
            </span>
          </button>

          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${onlyFavorites ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-accent/60'}`}
            onClick={() => {
              setOnlyFavorites(value => !value);
              onAction?.();
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Heart className="h-4 w-4" /> Favoritos
            </span>
            <span>{items.filter(item => item.favorite).length}</span>
          </button>
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </h2>
        <div className="flex max-h-[45svh] flex-wrap gap-2 overflow-auto">
          <button
            type="button"
            className={`rounded-full border px-2 py-1 text-xs transition-colors ${!selectedTag ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-foreground hover:bg-accent/50'}`}
            onClick={() => {
              setSelectedTag(null);
              setOnlyUntagged(false);
              onAction?.();
            }}
          >
            Todas
          </button>
          <button
            type="button"
            className={`rounded-full border px-2 py-1 text-xs transition-colors ${onlyUntagged ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-foreground hover:bg-accent/50'}`}
            onClick={() => {
              setOnlyUntagged(value => !value);
              setSelectedTag(null);
              onAction?.();
            }}
          >
            Sem tags ({items.filter(item => item.tags.length === 0).length})
          </button>
          {tagCloud.map(([tag, count]) => (
            <ContextMenu key={tag}>
              <ContextMenuTrigger asChild>
                <button
                  type="button"
                  className={`rounded-full border px-2 py-1 text-xs transition-colors ${selectedTag === tag ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-foreground hover:bg-accent/50'}`}
                  onClick={() => {
                    setSelectedTag(tag);
                    setOnlyUntagged(false);
                    onAction?.();
                  }}
                >
                  {tag} ({count})
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onSelect={() => {
                    setTagPendingRename(tag);
                    setRenameTagValue(tag);
                  }}
                >
                  Renomear tag
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-4 w-full text-xs text-destructive hover:bg-destructive/10"
          onClick={() => {
            setIsClearDialogOpen(true);
            onAction?.();
          }}
          disabled={isImporting}
        >
          Limpar base local
        </Button>
      </>
    );
  }

  return (
    <main
      className="flex min-h-svh flex-col"
      style={{
        background: themeColors.appBackground,
        color: themeColors.appText,
      }}
    >
      <header
        className="sticky top-0 z-20 border-b px-5 py-4 backdrop-blur"
        style={{
          borderColor: themeColors.border,
          background: themeColors.headerBackground,
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ef4056] text-white sm:h-10 sm:w-10">
              <Pocket className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <strong className="hidden text-2xl font-semibold tracking-tight sm:block">
              Pocket
            </strong>
          </div>

          <nav
            className="hidden items-center gap-5 text-sm md:flex"
            style={{ color: themeColors.mutedText }}
          >
            <span>Home</span>
            <span
              className="border-b-2 border-primary pb-1 font-semibold"
              style={{ color: themeColors.appText }}
            >
              Saves
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AppSettingsDialog
                    isImporting={isImporting}
                    isCacheImporting={isCacheImporting}
                    isCacheWarming={isCacheWarming}
                    isLoading={isLoading}
                    cacheWarmupProgress={cacheWarmupProgress}
                    readerPreferences={readerPreferences}
                    setReaderPreferences={setReaderPreferences}
                    importCsvFile={importCsvFile}
                    importCacheFile={importCacheFile}
                    exportCsv={exportCsv}
                    exportContentCache={exportContentCache}
                    warmContentCache={warmContentCache}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-[#11806f] text-white hover:bg-[#0d6759]"
                  disabled={isImporting}
                >
                  <Pocket /> <Plus /> Novo post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar link</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    value={newTitle}
                    onChange={event => setNewTitle(event.target.value)}
                    placeholder="Título (opcional)"
                  />
                  <Input
                    value={newUrl}
                    onChange={event => setNewUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    value={newTags}
                    onChange={event => setNewTags(event.target.value)}
                    placeholder="tags separadas por vírgula"
                  />
                  <Tabs
                    value={newStatus}
                    onValueChange={value =>
                      setNewStatus(value as PocketItemStatus)
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="archive">Archive</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => void onCreatePost()}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <Dialog
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      >
        <DialogContent className="!top-0 !left-0 !h-svh !max-h-none !w-[86vw] !max-w-[320px] !translate-x-0 !translate-y-0 !rounded-none p-4 sm:!max-w-[360px]">
          <div
            className="rounded-2xl border p-4 pt-12"
            style={{
              borderColor: themeColors.border,
              background: themeColors.panelBackground,
            }}
          >
            <SidebarContent onAction={() => setIsMobileMenuOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[290px_1fr]">
        <aside
          className="hidden rounded-3xl border p-5 lg:block"
          style={{
            borderColor: themeColors.border,
            background: themeColors.panelBackground,
          }}
        >
          <SidebarContent />
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                style={{ color: themeColors.mutedText }}
              />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setSearchTerm('');
                  }
                }}
                placeholder="Buscar por título, URL ou tag"
                className="pl-9 pr-9"
              />
              {searchTerm ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                  onClick={() => setSearchTerm('')}
                  aria-label="Limpar busca"
                >
                  <CircleX className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('cards')}
              >
                <Grid2x2 />
              </Button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Saves</h1>
            <Badge className="bg-[#ff5b2e] text-white">
              {filteredItems.length}
            </Badge>
            {isImporting ? (
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Importando
              </Badge>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <p
                className="inline-flex items-center gap-2"
                style={{ color: themeColors.mutedText }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando posts...
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  'loading-card-1',
                  'loading-card-2',
                  'loading-card-3',
                  'loading-card-4',
                  'loading-card-5',
                  'loading-card-6',
                  'loading-card-7',
                  'loading-card-8',
                  'loading-card-9',
                ].map(key => (
                  <div
                    key={key}
                    className="h-36 animate-pulse rounded-2xl border"
                    style={{
                      borderColor: themeColors.border,
                      background: themeColors.panelBackground,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!isLoading && filteredItems.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed p-8 text-center"
              style={{
                borderColor: themeColors.border,
                background: themeColors.panelBackground,
                color: themeColors.mutedText,
              }}
            >
              Nenhum item encontrado com os filtros atuais.
            </div>
          ) : null}

          {!isLoading && filteredItems.length > 0 ? (
            <div
              ref={setResultScrollElement}
              className="h-[72svh] overflow-auto pr-1"
            >
              <div
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const row = virtualRows[virtualRow.index] ?? [];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full pb-3"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <div
                        className={viewMode === 'cards' ? 'grid gap-4' : ''}
                        style={
                          viewMode === 'cards'
                            ? {
                                gridTemplateColumns: `repeat(${cardColumns}, minmax(0, 1fr))`,
                              }
                            : undefined
                        }
                      >
                        <AnimatePresence
                          initial={false}
                          mode="popLayout"
                        >
                          {row.map(item => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.985 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.985 }}
                              transition={{
                                duration: 0.2,
                                ease: 'easeOut',
                              }}
                            >
                              <PocketItemCard
                                item={item}
                                viewMode={viewMode}
                                onOpen={id =>
                                  navigate({
                                    pathname: `/reader/${id}`,
                                    search: location.search,
                                  })
                                }
                                onToggleFavorite={entry => {
                                  void toggleFavorite(entry);
                                }}
                                onToggleArchive={entry => {
                                  void toggleArchive(entry);
                                }}
                                onRequestTagEdit={entry => {
                                  setItemPendingTagEdit(entry);
                                  setTagSelection(entry.tags);
                                  setNewTagName('');
                                }}
                                themeColors={themeColors}
                                onRequestDelete={entry => {
                                  setItemPendingDelete(entry);
                                }}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <Dialog
        open={itemPendingTagEdit !== null}
        onOpenChange={open => {
          if (!open) {
            setItemPendingTagEdit(null);
            setTagSelection([]);
            setNewTagName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relacionar tags</DialogTitle>
          </DialogHeader>
          {itemPendingTagEdit ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {itemPendingTagEdit.title}
            </p>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={newTagName}
                onChange={event => setNewTagName(event.target.value)}
                placeholder="Nova tag"
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onAddTagFromInput();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onAddTagFromInput}
              >
                Adicionar
              </Button>
            </div>

            <div className="max-h-64 overflow-auto rounded-md border border-accent p-3">
              <div className="flex flex-wrap gap-2">
                {tagCloud.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tag cadastrada ainda.
                  </p>
                ) : (
                  tagCloud.map(([tag]) => {
                    const selected = tagSelection.includes(tag);
                    return (
                      <Button
                        key={tag}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        onClick={() => onToggleTagSelection(tag)}
                      >
                        {tag}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tagSelection.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tag selecionada.
                </p>
              ) : (
                tagSelection.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                  >
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setItemPendingTagEdit(null);
                setTagSelection([]);
                setNewTagName('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void onConfirmTagUpdate()}>
              Salvar tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tagPendingRename !== null}
        onOpenChange={open => {
          if (!open) {
            setTagPendingRename(null);
            setRenameTagValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear tag</DialogTitle>
          </DialogHeader>
          {tagPendingRename ? (
            <p className="text-sm text-muted-foreground">
              A tag <strong>{tagPendingRename}</strong> será renomeada em todos
              os posts relacionados.
            </p>
          ) : null}
          <Input
            value={renameTagValue}
            onChange={event => setRenameTagValue(event.target.value)}
            placeholder="Novo nome da tag"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onConfirmTagRename();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setTagPendingRename(null);
                setRenameTagValue('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void onConfirmTagRename()}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemPendingDelete !== null}
        onOpenChange={open => {
          if (!open) {
            setItemPendingDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir post?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. O post será removido da base local.
          </p>
          {itemPendingDelete ? (
            <p className="line-clamp-2 text-sm font-medium">
              {itemPendingDelete.title}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setItemPendingDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onConfirmDelete()}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar base local?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação remove todos os posts salvos localmente no navegador e não
            pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsClearDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsClearDialogOpen(false);
                setIsClearSecondDialogOpen(true);
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isClearSecondDialogOpen}
        onOpenChange={setIsClearSecondDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmação final</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta é a segunda confirmação. Todos os posts da base local serão
            apagados permanentemente.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsClearSecondDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void (async () => {
                  await clearAll();
                  setIsClearSecondDialogOpen(false);
                })();
              }}
            >
              Sim, limpar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
