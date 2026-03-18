import { Readability } from '@mozilla/readability';
import hljs from 'highlight.js';
import TurndownService from 'turndown';

import { getContentCache, setContentCache } from './pocket-db';

const DARKREAD_PROXY = 'https://darkread-proxy.vercel.app';

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
  const res = await fetch(`${DARKREAD_PROXY}/?cors=true&url=${encodeURIComponent(url)}`);
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

export async function fetchCleanContent(targetUrl: string): Promise<{
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

  try {
    const response = await fetch(targetUrl, { mode: 'cors' });
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

  const { title, content } = await fetchViaDarkread(targetUrl);
  const result = { title, content, format: 'markdown' as const };
  await setContentCache(targetUrl, { ...result, cachedAt: Date.now() });
  return result;
}
