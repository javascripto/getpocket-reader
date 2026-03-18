import { Readability } from '@mozilla/readability';
import hljs from 'highlight.js';
import TurndownService from 'turndown';

import { getContentCache, setContentCache } from './pocket-db';

const DARKREAD_PROXY = 'https://darkread-proxy.vercel.app';
const ORIGINAL_CONTENT_TIMEOUT_MS = 8000;
const DARKREAD_PROXY_TIMEOUT_MS = 12000;

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

class DarkreadProxyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DarkreadProxyError';
  }
}

export function isDarkreadProxyError(error: unknown): boolean {
  return error instanceof DarkreadProxyError;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// Fenced code blocks with auto language detection
// Handles both <pre><code> and <pre><span> (darkread sometimes uses spans)
turndown.addRule('fencedCodeBlock', {
  filter(node) {
    return node.nodeName === 'PRE' && !!node.textContent?.trim();
  },
  replacement(_content, node) {
    const el = node as HTMLElement;
    const code = el.querySelector('code');
    const langFromClass = /language-([\w-]+)/.exec(code?.className ?? '')?.[1];
    // Replace <br> with newlines before extracting text
    el.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    const text = el.textContent ?? '';
    const lang = langFromClass ?? (text.trim() ? hljs.highlightAuto(text).language ?? '' : '');
    return `\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n`;
  },
});

async function fetchViaDarkread(url: string): Promise<{ title: string; content: string }> {
  let res: Response;

  try {
    res = await fetchWithTimeout(
      `${DARKREAD_PROXY}/darkread?cors=true&url=${encodeURIComponent(url)}`,
      {},
      DARKREAD_PROXY_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new DarkreadProxyError('Tempo esgotado ao obter conteúdo via darkread proxy.');
    }

    throw error;
  }

  if (!res.ok) throw new DarkreadProxyError('Falha ao obter conteúdo via darkread proxy.');

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const articleEl = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
  if (!articleEl?.textContent?.trim()) throw new DarkreadProxyError('Não foi possível extrair o conteúdo deste link.');

  const text = articleEl.textContent ?? '';

  // Darkread shows this when it can't access the article
  if (text.includes('That article cannot be read') || text.trimStart().startsWith('self.__next_f')) {
    throw new DarkreadProxyError('Este artigo não pode ser lido (pode estar atrás de paywall ou inacessível).');
  }

  const title = doc.querySelector('h1')?.textContent?.trim() || 'Leitura clean (via darkread)';
  const markdown = turndown.turndown(articleEl.innerHTML);
  return { title, content: markdown };
}

interface FetchCleanContentOptions {
  preferProxy?: boolean;
}

export async function fetchCleanContent(
  targetUrl: string,
  options?: FetchCleanContentOptions,
): Promise<{
  title: string;
  content: string;
  format: 'plain' | 'markdown';
}> {
  const cached = await getContentCache(targetUrl);
  if (cached) {
    return {
      title: cached.title,
      content: cached.content,
      format: cached.format,
    };
  }

  if (!options?.preferProxy) {
    try {
      const response = await fetchWithTimeout(
        targetUrl,
        { mode: 'cors' },
        ORIGINAL_CONTENT_TIMEOUT_MS,
      );
      if (!response.ok) {
        throw new Error('Falha ao baixar conteúdo original.');
      }

      const html = await response.text();
      const document = new DOMParser().parseFromString(html, 'text/html');
      const article = new Readability(document).parse();

      if (article?.content) {
        const result = {
          title: article.title || 'Leitura clean',
          content: turndown.turndown(article.content),
          format: 'markdown' as const,
        };
        await setContentCache(targetUrl, { ...result, cachedAt: Date.now() });
        return result;
      }
    } catch {
      // fallback for CORS-restricted websites
    }
  }

  const { title, content } = await fetchViaDarkread(targetUrl);
  const result = { title, content, format: 'markdown' as const };
  await setContentCache(targetUrl, { ...result, cachedAt: Date.now() });
  return result;
}
