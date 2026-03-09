import { Download, Settings2, Upload } from 'lucide-react';
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
import type { ReaderFontFamily, ReaderPreferences, ReaderTheme } from '@/types';

interface AppSettingsDialogProps {
  isImporting: boolean;
  isLoading: boolean;
  readerPreferences: ReaderPreferences;
  setReaderPreferences: (patch: Partial<ReaderPreferences>) => void;
  importCsvFile: (file: File) => Promise<void>;
  exportCsv: () => void;
}

export function AppSettingsDialog({
  isImporting,
  isLoading,
  readerPreferences,
  setReaderPreferences,
  importCsvFile,
  exportCsv,
}: AppSettingsDialogProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function onClickImport() {
    if (isImporting) {
      return;
    }
    importInputRef.current?.click();
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
            </div>
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
                min={14}
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
      </DialogContent>
    </Dialog>
  );
}
