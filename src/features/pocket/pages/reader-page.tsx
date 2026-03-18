import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AppSettingsDialog } from '@/features/pocket/components/app-settings-dialog';
import { usePocket } from '@/features/pocket/context/pocket-context';
import {
  fontFamilyForReader,
  readerThemeColors,
} from '@/features/pocket/lib/reader-theme';
import { fetchCleanContent } from '@/lib/clean-content';
import type { ReaderMode } from '@/types';

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'link';
  }
}

export function ReaderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemId } = useParams();
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
    importCsvFile,
    importCacheFile,
    exportCsv,
    exportContentCache,
    warmContentCache,
    cancelCacheWarmup,
  } = usePocket();

  const [readerMode, setReaderMode] = useState<ReaderMode>('clean');
  const [cleanContent, setCleanContent] = useState('');
  const [cleanTitle, setCleanTitle] = useState('');
  const [cleanContentFormat, setCleanContentFormat] = useState<
    'plain' | 'markdown'
  >('plain');
  const [cleanError, setCleanError] = useState('');
  const [cleanLoading, setCleanLoading] = useState(false);
  const selectedItem = useMemo(
    () => items.find(item => item.id === itemId) ?? null,
    [itemId, items],
  );

  useEffect(() => {
    if (!selectedItem || readerMode !== 'clean') {
      return;
    }

    setCleanLoading(true);
    setCleanError('');
    setCleanContent('');
    setCleanTitle('');
    setCleanContentFormat('plain');

    void fetchCleanContent(selectedItem.url)
      .then(result => {
        setCleanTitle(result.title);
        setCleanContent(result.content);
        setCleanContentFormat(result.format);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Falha ao montar leitura clean.';
        setCleanError(message);
      })
      .finally(() => {
        setCleanLoading(false);
      });
  }, [selectedItem, readerMode]);

  const colors = readerThemeColors(activeTheme);
  const readerFont = fontFamilyForReader(readerPreferences.fontFamily);
  const syntaxTheme = activeTheme === 'dark' ? oneDark : oneLight;

  function navigateBackToSaves() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate({
      pathname: '/',
      search: location.search,
    });
  }

  if (isLoading) {
    return (
      <main
        className="min-h-svh p-6"
        style={{ background: colors.appBackground, color: colors.appText }}
      >
        Carregando...
      </main>
    );
  }

  if (!selectedItem) {
    return (
      <main
        className="min-h-svh p-6"
        style={{ background: colors.appBackground, color: colors.appText }}
      >
        <p className="mb-4">Post não encontrado.</p>
        <Button
          onClick={navigateBackToSaves}
          aria-label="Voltar para saves"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar para saves</span>
        </Button>
      </main>
    );
  }

  return (
    <main
      className="min-h-svh"
      style={{ background: colors.appBackground, color: colors.appText }}
    >
      <header
        className="sticky top-0 z-20 border-b px-5 py-3 backdrop-blur"
        style={{
          borderColor: colors.border,
          background: colors.headerBackground,
        }}
      >
        <div className="relative mx-auto flex max-w-[1400px] items-center justify-center gap-4">
          <Button
            variant="ghost"
            className="absolute left-0 text-current"
            onClick={navigateBackToSaves}
            aria-label="Voltar para saves"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar para saves</span>
          </Button>

          <div className="flex items-center gap-2">
            <Tabs
              value={readerMode}
              onValueChange={value => setReaderMode(value as ReaderMode)}
            >
              <TabsList
                className="border"
                style={{
                  borderColor: colors.border,
                  background: colors.panelBackground,
                }}
              >
                <TabsTrigger
                  value="clean"
                  style={
                    readerMode === 'clean'
                      ? {
                          background: colors.cardBackground,
                          color: colors.appText,
                        }
                      : { color: colors.mutedText }
                  }
                >
                  Leitura clean
                </TabsTrigger>
                <TabsTrigger
                  value="original"
                  style={
                    readerMode === 'original'
                      ? {
                          background: colors.cardBackground,
                          color: colors.appText,
                        }
                      : { color: colors.mutedText }
                  }
                >
                  Original
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                    cancelCacheWarmup={cancelCacheWarmup}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                >
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir link original em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir link original em nova aba</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <section
        className="mx-auto px-5 py-8"
        style={{ maxWidth: `${readerPreferences.contentWidth + 240}px` }}
      >
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">
          {selectedItem.title}
        </h1>
        <p
          className="mb-6 text-sm"
          style={{ color: colors.mutedText }}
        >
          {hostFromUrl(selectedItem.url)}
        </p>
        {readerMode === 'clean' ? (
          <article
            className="rounded-2xl border px-6 py-6 shadow-sm md:px-10"
            style={{
              borderColor: colors.border,
              background: colors.cardBackground,
              color: colors.appText,
            }}
          >
            {cleanLoading && (
              <div
                className="flex items-center gap-3"
                style={{ color: colors.mutedText }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>Montando leitura clean...</p>
              </div>
            )}
            {cleanError && <p className="text-red-600">{cleanError}</p>}
            {!cleanLoading && !cleanError && (
              <>
                {cleanTitle ? (
                  <h2
                    className="mb-4 text-xl font-medium"
                    style={{
                      fontFamily: readerFont,
                      fontSize: `${readerPreferences.fontSize + 3}px`,
                    }}
                  >
                    {cleanTitle}
                  </h2>
                ) : null}
                <div
                  className={`max-h-[70svh] overflow-y-auto ${cleanContentFormat === 'plain' ? 'whitespace-pre-wrap' : ''}`}
                  style={{
                    fontFamily: readerFont,
                    fontSize: `${readerPreferences.fontSize}px`,
                    lineHeight: readerPreferences.lineHeight,
                  }}
                >
                  {cleanContent ? (
                    cleanContentFormat === 'markdown' ? (
                      <div className="reader-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }) {
                              const codeText = String(children ?? '').replace(
                                /\n$/,
                                '',
                              );
                              const match = /language-([\w-]+)/.exec(
                                className || '',
                              );
                              const isInline =
                                !match && !codeText.includes('\n');

                              if (isInline) {
                                return (
                                  <code
                                    className="reader-inline-code"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              }

                              return (
                                <SyntaxHighlighter
                                  language={match?.[1] ?? 'text'}
                                  style={syntaxTheme}
                                  customStyle={{
                                    margin: '0.75rem 0',
                                    borderRadius: '0.75rem',
                                    fontSize: `${Math.max(12, readerPreferences.fontSize - 3)}px`,
                                    lineHeight: 1.55,
                                    padding: '1rem',
                                  }}
                                  wrapLongLines
                                >
                                  {codeText}
                                </SyntaxHighlighter>
                              );
                            },
                          }}
                        >
                          {cleanContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      cleanContent
                    )
                  ) : (
                    'Sem conteúdo extraído para este link.'
                  )}
                </div>
              </>
            )}
          </article>
        ) : (
          <div
            className="rounded-2xl border p-3"
            style={{
              borderColor: colors.border,
              background: colors.cardBackground,
            }}
          >
            <p
              className="mb-2 text-xs"
              style={{ color: colors.mutedText }}
            >
              No modo original, parte das preferências depende do site aberto.
            </p>
            <div
              className="h-[72svh] overflow-hidden rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <iframe
                title={selectedItem.title}
                src={selectedItem.url}
                className="h-full w-full"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
