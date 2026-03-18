import { CheckCircle2, Download, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { usePocket } from '@/features/pocket/context/pocket-context';

export function CacheWarmupWidget() {
  const { isCacheWarming, cacheWarmupProgress } = usePocket();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isCacheWarming) {
      setDismissed(false);
    }
  }, [isCacheWarming]);

  const progressPercent = useMemo(() => {
    if (!cacheWarmupProgress) {
      return 0;
    }

    return Math.round(
      (cacheWarmupProgress.cached /
        Math.max(cacheWarmupProgress.total, 1)) *
        100,
    );
  }, [cacheWarmupProgress]);

  if (!cacheWarmupProgress || dismissed) {
    return null;
  }

  const isFinished =
    !isCacheWarming &&
    cacheWarmupProgress.remaining === 0;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <div className="pointer-events-auto rounded-2xl border bg-background/95 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 rounded-full bg-muted p-2">
              {isCacheWarming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFinished ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isCacheWarming ? 'Salvando cache em segundo plano' : 'Cache finalizado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {cacheWarmupProgress.cached}/{cacheWarmupProgress.total} em cache
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setDismissed(true)}
            disabled={isCacheWarming}
            aria-label="Fechar progresso do cache"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
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

        {cacheWarmupProgress.currentTitle ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            Atual: {cacheWarmupProgress.currentTitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
