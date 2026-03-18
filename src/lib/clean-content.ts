import { Readability } from '@mozilla/readability';
import hljs from 'highlight.js';
import TurndownService from 'turndown';

const DARKREAD_PROXY = 'https://darkread-proxy.vercel.app';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

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
  if (!res.ok) throw new Error('Falha ao obter conteúdo via darkread proxy.');

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const articleEl = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
  if (!articleEl?.textContent?.trim()) throw new Error('Não foi possível extrair o conteúdo deste link.');

  const text = articleEl.textContent ?? '';

  // Darkread shows this when it can't access the article
  if (text.includes('That article cannot be read') || text.trimStart().startsWith('self.__next_f')) {
    throw new Error('Este artigo não pode ser lido (pode estar atrás de paywall ou inacessível).');
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
  try {
    const response = await fetch(targetUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error('Falha ao baixar conteúdo original.');
    }

    const html = await response.text();
    const document = new DOMParser().parseFromString(html, 'text/html');
    const article = new Readability(document).parse();

    if (article?.content) {
      const markdown = turndown.turndown(article.content);
      return {
        title: article.title || 'Leitura clean',
        content: markdown,
        format: 'markdown',
      };
    }
  } catch {
    // fallback for CORS-restricted websites
  }

  const { title, content } = await fetchViaDarkread(targetUrl);
  return { title, content, format: 'markdown' };
}
