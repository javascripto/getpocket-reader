import { Download, Loader2, Settings2, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ContentCacheWarmupProgress,
  ReaderFontFamily,
  ReaderPreferences,
  ReaderTheme,
} from '@/types';

function formatEstimatedTime(remainingMs: number | null) {
  if (remainingMs === null) {
    return 'Calculando tempo restante...';
  }

  if (remainingMs <= 0) {
    return 'Concluido';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

interface AppSettingsDialogProps {
  isImporting: boolean;
  isCacheImporting: boolean;
  isCacheWarming: boolean;
  isLoading: boolean;
  cacheWarmupProgress: ContentCacheWarmupProgress | null;
  readerPreferences: ReaderPreferences;
  setReaderPreferences: (patch: Partial<ReaderPreferences>) => void;
  importCsvFile: (file: File) => Promise<void>;
  importCacheFile: (file: File) => Promise<void>;
  exportCsv: () => void;
  exportContentCache: () => Promise<void>;
  warmContentCache: () => Promise<void>;
  cancelCacheWarmup: () => void;
}

export function AppSettingsDialog({
  isImporting,
  isCacheImporting,
  isCacheWarming,
  isLoading,
  cacheWarmupProgress,
  readerPreferences,
  setReaderPreferences,
  importCsvFile,
  importCacheFile,
  exportCsv,
  exportContentCache,
  warmContentCache,
  cancelCacheWarmup,
}: AppSettingsDialogProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importCacheInputRef = useRef<HTMLInputElement | null>(null);
  const canResumeCacheWarmup =
    !isCacheWarming &&
    !!cacheWarmupProgress &&
    cacheWarmupProgress.remaining > 0;

  const progressPercent = cacheWarmupProgress
    ? Math.round(
        (cacheWarmupProgress.processed /
          Math.max(cacheWarmupProgress.total, 1)) *
          100,
      )
    : 0;

  function onClickImport() {
    if (isImporting) {
      return;
    }
    importInputRef.current?.click();
  }

  function onClickImportCache() {
    if (isCacheImporting) {
      return;
    }
    importCacheInputRef.current?.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent overlayClassName="supports-backdrop-filter:backdrop-blur-none">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Dados</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={onClickImport}
                disabled={isImporting}
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importando...' : 'Importar CSV'}
              </Button>
              <Button
                variant="secondary"
                onClick={exportCsv}
                disabled={isImporting || isLoading}
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  isCacheWarming ? cancelCacheWarmup() : void warmContentCache()
                }
                disabled={isImporting || isLoading}
              >
                {isCacheWarming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isCacheWarming
                  ? 'Pausar cache'
                  : canResumeCacheWarmup
                    ? 'Retomar cache'
                    : 'Salvar cache'}
              </Button>
              <Button
                variant="secondary"
                onClick={onClickImportCache}
                disabled={isCacheImporting || isCacheWarming}
              >
                <Upload className="h-4 w-4" />
                {isCacheImporting ? 'Importando cache...' : 'Importar cache'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void exportContentCache()}
                disabled={isCacheImporting || isCacheWarming}
              >
                <Download className="h-4 w-4" />
                Exportar cache JSON
              </Button>
            </div>
            {cacheWarmupProgress && (
              <div className="mt-3 space-y-2 rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {isCacheWarming
                      ? 'Salvando em segundo plano'
                      : cacheWarmupProgress.remaining > 0
                        ? 'Execucao pausada'
                        : 'Ultima execucao'}
                  </span>
                  <span>
                    {cacheWarmupProgress.cached}/{cacheWarmupProgress.total} em cache ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Restantes: {cacheWarmupProgress.remaining} | Novos:{' '}
                  {cacheWarmupProgress.success} | Ja em cache:{' '}
                  {cacheWarmupProgress.alreadyCached} | Falhas:{' '}
                  {cacheWarmupProgress.failed}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tempo estimado:{' '}
                  {isCacheWarming
                    ? formatEstimatedTime(
                        cacheWarmupProgress.estimatedRemainingMs,
                      )
                    : cacheWarmupProgress.remaining > 0
                      ? 'Pausado'
                      : 'Concluido'}
                </p>
                {cacheWarmupProgress.currentTitle ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    Atual: {cacheWarmupProgress.currentTitle}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Leitura</p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Tema</p>
              <Tabs
                value={readerPreferences.theme}
                onValueChange={value =>
                  setReaderPreferences({ theme: value as ReaderTheme })
                }
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="system">System</TabsTrigger>
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="dark">Dark</TabsTrigger>
                  <TabsTrigger value="sepia">Sepia</TabsTrigger>
                  <TabsTrigger value="slate">Slate</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Fonte</p>
              <Tabs
                value={readerPreferences.fontFamily}
                onValueChange={value =>
                  setReaderPreferences({
                    fontFamily: value as ReaderFontFamily,
                  })
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger
                    value="sans"
                    style={{
                      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    }}
                  >
                    Sans
                  </TabsTrigger>
                  <TabsTrigger
                    value="serif"
                    style={{
                      fontFamily:
                        "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
                    }}
                  >
                    Serif
                  </TabsTrigger>
                  <TabsTrigger
                    value="mono"
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
                    }}
                  >
                    Mono
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2 text-sm">
              <span className="font-medium">
                Tamanho da fonte: {readerPreferences.fontSize}px
              </span>
              <Slider
                min={10}
                max={30}
                step={1}
                value={[readerPreferences.fontSize]}
                onValueChange={value => {
                  const [fontSize] = value;
                  if (typeof fontSize === 'number') {
                    setReaderPreferences({ fontSize });
                  }
                }}
              />
            </div>

            <div className="space-y-2 text-sm">
              <span className="font-medium">
                Espaçamento de linha: {readerPreferences.lineHeight.toFixed(2)}
              </span>
              <Slider
                min={1.2}
                max={2.2}
                step={0.05}
                value={[readerPreferences.lineHeight]}
                onValueChange={value => {
                  const [lineHeight] = value;
                  if (typeof lineHeight === 'number') {
                    setReaderPreferences({ lineHeight });
                  }
                }}
              />
            </div>

            <div className="space-y-2 text-sm">
              <span className="font-medium">
                Largura do texto: {readerPreferences.contentWidth}px
              </span>
              <Slider
                min={540}
                max={1100}
                step={10}
                value={[readerPreferences.contentWidth]}
                onValueChange={value => {
                  const [contentWidth] = value;
                  if (typeof contentWidth === 'number') {
                    setReaderPreferences({ contentWidth });
                  }
                }}
              />
            </div>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) {
              void importCsvFile(file);
            }
            event.currentTarget.value = '';
          }}
        />
        <input
          ref={importCacheInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) {
              void importCacheFile(file);
            }
            event.currentTarget.value = '';
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
