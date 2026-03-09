import { Archive, ExternalLink, Star, Tag, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PocketItem, PocketViewMode } from '@/types';

interface PocketThemeColors {
  border: string;
  cardBackground: string;
  appText: string;
  mutedText: string;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'link';
  }
}

function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(epochMs));
}

interface PocketItemCardProps {
  item: PocketItem;
  viewMode: PocketViewMode;
  onOpen: (id: string) => void;
  onToggleFavorite: (item: PocketItem) => void;
  onToggleArchive: (item: PocketItem) => void;
  onRequestTagEdit: (item: PocketItem) => void;
  themeColors: PocketThemeColors;
  onRequestDelete: (item: PocketItem) => void;
}

export function PocketItemCard({
  item,
  viewMode,
  onOpen,
  onToggleFavorite,
  onToggleArchive,
  onRequestTagEdit,
  themeColors,
  onRequestDelete,
}: PocketItemCardProps) {
  const host = hostFromUrl(item.url);
  const palette = ['#f3b0b9', '#b8e1d8', '#bcd7f7', '#f5d8a8', '#d2c7ee'];
  const color =
    palette[Math.abs(host.length + item.title.length) % palette.length];

  if (viewMode === 'cards') {
    return (
      <article
        className="overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{
          borderColor: themeColors.border,
          background: themeColors.cardBackground,
        }}
      >
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onOpen(item.id)}
        >
          <div
            className="h-34 border-b"
            style={{
              borderColor: themeColors.border,
              background: `linear-gradient(145deg, ${color}, #f9f5ea)`,
            }}
          />
          <div className="p-4">
            <h3
              className="line-clamp-2 min-h-14 text-lg font-semibold"
              style={{ color: themeColors.appText }}
            >
              {item.title}
            </h3>
            <p
              className="mt-1 line-clamp-1 text-xs"
              style={{ color: themeColors.mutedText }}
            >
              {host}
            </p>
            <p
              className="mt-2 text-xs"
              style={{ color: themeColors.mutedText }}
            >
              {formatDate(item.timeAdded)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 3).map(tagName => (
                <Badge
                  key={tagName}
                  variant="secondary"
                  className="text-[11px]"
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {tagName}
                </Badge>
              ))}
            </div>
          </div>
        </button>

        <div
          className="flex items-center justify-end gap-1 border-t px-3 py-2"
          style={{ borderColor: themeColors.border }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(item)}
              >
                <Star
                  className={`h-4 w-4 ${item.favorite ? 'fill-amber-400 text-amber-500' : 'text-[#777267]'}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {item.favorite ? 'Remover dos favoritos' : 'Favoritar'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleArchive(item)}
              >
                <Archive
                  className={`h-4 w-4 ${item.status === 'archive' ? 'text-[#11806f]' : 'text-[#777267]'}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {item.status === 'archive' ? 'Mover para unread' : 'Arquivar'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRequestTagEdit(item)}
              >
                <Tag className="h-4 w-4 text-[#777267]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar tags</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={event => event.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4 text-[#777267]" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir link original</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRequestDelete(item)}
              >
                <Trash2 className="h-4 w-4 text-red-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir post</TooltipContent>
          </Tooltip>
        </div>
      </article>
    );
  }

  return (
    <article
      className="flex flex-col gap-3 rounded-2xl border p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:items-start sm:gap-4"
      style={{
        borderColor: themeColors.border,
        background: themeColors.cardBackground,
      }}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpen(item.id)}
      >
        <h3
          className="line-clamp-1 text-base font-semibold"
          style={{ color: themeColors.appText }}
        >
          {item.title}
        </h3>
        <p
          className="mt-1 line-clamp-1 text-xs"
          style={{ color: themeColors.mutedText }}
        >
          {host}
        </p>
        <div
          className="mt-2 flex items-center gap-2 text-xs"
          style={{ color: themeColors.mutedText }}
        >
          <span>{formatDate(item.timeAdded)}</span>
          <span>•</span>
          <span>{item.status === 'archive' ? 'Archive' : 'Unread'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 2).map(tagName => (
            <Badge
              key={tagName}
              variant="secondary"
              className="text-[11px]"
            >
              <Tag className="mr-1 h-3 w-3" />
              {tagName}
            </Badge>
          ))}
        </div>
      </button>

      <div
        className="flex w-full items-center justify-end gap-1 border-t pt-2 sm:ml-2 sm:w-auto sm:shrink-0 sm:border-t-0 sm:pt-0"
        style={{ borderColor: themeColors.border }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(item)}
            >
              <Star
                className={`h-4 w-4 ${item.favorite ? 'fill-amber-400 text-amber-500' : 'text-[#777267]'}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {item.favorite ? 'Remover dos favoritos' : 'Favoritar'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleArchive(item)}
            >
              <Archive
                className={`h-4 w-4 ${item.status === 'archive' ? 'text-[#11806f]' : 'text-[#777267]'}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {item.status === 'archive' ? 'Mover para unread' : 'Arquivar'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRequestTagEdit(item)}
            >
              <Tag className="h-4 w-4 text-[#777267]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar tags</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={event => event.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 text-[#777267]" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir link original</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRequestDelete(item)}
            >
              <Trash2 className="h-4 w-4 text-red-700" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir post</TooltipContent>
        </Tooltip>
      </div>
    </article>
  );
}
