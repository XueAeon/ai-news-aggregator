import juice from 'juice';
import hljs from 'highlight.js';
import { Marked } from 'marked';

function normalizeMarkdownForWechat(raw) {
  return (raw || '')
    .replace(/\*\*([^\n*]+)\*\*\s*\n+\s*([：:])/g, '**$1**$2')
    .replace(/__([^\n_]+)__\s*\n+\s*([：:])/g, '__$1__$2');
}

export function renderMarkdown(markdown) {
  const normalized = normalizeMarkdownForWechat(markdown);

  const renderer = {
    code(token) {
      const text = token.text || '';
      const lang = (token.lang || '').trim().split(/\s+/)[0];
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(text, { language: lang }).value
        : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
    },
  };

  const markedInstance = new Marked({ gfm: true, breaks: true });
  markedInstance.use({ renderer });
  return markedInstance.parse(normalized);
}

export function getThemeCss({ primaryColor, fontSize, lineHeight, justify }) {
  return `
#wx-output {
  --md-primary-color: ${primaryColor};
  font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif;
  font-size: ${fontSize};
  line-height: ${lineHeight};
  color: #1f2937;
  word-break: break-word;
}
#wx-output h1 { display: table; margin: 2em auto 1em; padding: 0 .8em; border-bottom: 2px solid var(--md-primary-color); font-size: 1.4em; text-align: center; }
#wx-output h2 { margin: 1.8em 0 .9em; padding: .28em .7em; border-radius: 6px; background: var(--md-primary-color); color: #fff; font-size: 1.24em; }
#wx-output h3 { margin: 1.4em 0 .7em; padding-left: .55em; border-left: 3px solid var(--md-primary-color); font-size: 1.1em; }
#wx-output p { margin: .9em 0; letter-spacing: .02em; ${justify ? 'text-align: justify;' : ''} }
#wx-output ul,#wx-output ol { margin: .85em 0; padding-left: 1.5em; }
#wx-output li { margin: .3em 0; }
#wx-output blockquote { margin: 1em 0; padding: .85em .95em; border: 1px dashed #cbd5e1; color: #334155; border-radius: 8px; }
#wx-output blockquote p { margin: 0; }
#wx-output a { color: var(--md-primary-color); text-decoration: none; border-bottom: 1px solid rgba(37,99,235,.35); }
#wx-output hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.35em 0; }
#wx-output code { padding: .08em .28em; border-radius: 4px; background: #f1f5f9; font-size: .92em; }
#wx-output pre { margin: 1em 0; padding: .85em; border-radius: 8px; overflow: auto; background: #0f172a; color: #e2e8f0; }
#wx-output pre code { padding: 0; background: transparent; color: inherit; }
#wx-output table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .95em; }
#wx-output th,#wx-output td { border: 1px solid #e2e8f0; padding: .45em .6em; text-align: left; }
#wx-output thead th { background: #eff6ff; }
#wx-output img { max-width: 100%; display: block; margin: 1em auto; border-radius: 6px; }
`;
}

export function generateWechatInlineHtml(markdown, themeOpts) {
  const contentHtml = renderMarkdown(markdown);
  const style = getThemeCss(themeOpts);
  const html = `<style>${style}</style><section id="wx-output">${contentHtml}</section>`;

  return juice(html, {
    inlinePseudoElements: true,
    preserveImportant: true,
    resolveCSSVariables: false,
  });
}

export function extractPlainTextFromHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || '').replace(/\s{2,}/g, ' ').trim();
}

export async function copyRichHtml(html) {
  const plainText = extractPlainTextFromHtml(html);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  const selection = window.getSelection();
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = html;
  tempContainer.style.position = 'fixed';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0';
  document.body.appendChild(tempContainer);

  try {
    const range = document.createRange();
    range.selectNodeContents(tempContainer);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('execCommand copy failed');
  } finally {
    selection?.removeAllRanges();
    tempContainer.remove();
  }
}
