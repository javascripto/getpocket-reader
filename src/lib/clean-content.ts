import { Readability } from '@mozilla/readability';

function rJinaUrl(url: string): string {
  const withoutProtocol = url.replace(/^https?:\/\//i, '');
  return `https://r.jina.ai/http://${withoutProtocol}`;
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

    if (article?.textContent) {
      return {
        title: article.title || 'Leitura clean',
        content: article.textContent.trim(),
        format: 'plain',
      };
    }
  } catch {
    // fallback for CORS-restricted websites
  }

  const fallbackResponse = await fetch(rJinaUrl(targetUrl));
  if (!fallbackResponse.ok) {
    throw new Error('Não foi possível obter versão clean para este link.');
  }

  const fallbackText = await fallbackResponse.text();

  return {
    title: 'Leitura clean (fallback)',
    content: fallbackText,
    format: 'markdown',
  };
}
