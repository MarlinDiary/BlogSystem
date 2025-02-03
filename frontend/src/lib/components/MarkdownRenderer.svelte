<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import type { TokenizerAndRendererExtension, RendererExtensionFunction } from 'marked';

  export let content: string;

  let html = '';

  onMount(() => {
    // 配置marked选项
    marked.setOptions({
      gfm: true, // 启用GFM
      breaks: true, // 支持GitHub风格的换行
    });

    // 添加GFM扩展
    const gfmExtension: TokenizerAndRendererExtension = {
      name: 'gfm',
      level: 'block' as const,
      start(src: string) { return src.match(/^~~/)?.index; },
      tokenizer(src: string) {
        const rule = /^~~(.+?)~~/;
        const match = rule.exec(src);
        if (match) {
          return {
            type: 'strikethrough',
            raw: match[0],
            text: match[1],
            tokens: []
          };
        }
        return undefined;
      },
      renderer: ((token) => {
        return `<del>${token.text}</del>`;
      }) as RendererExtensionFunction
    };

    marked.use({ extensions: [gfmExtension] });

    // 渲染Markdown并净化HTML
    const rawHtml = marked.parse(content);
    if (typeof rawHtml === 'string') {
      html = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
          'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'hr', 'del', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class']
      });
    }
  });
</script>

<div class="markdown-content prose prose-zinc dark:prose-invert max-w-none">
  {@html html}
</div>

<style>
  .markdown-content :global(p) {
    margin-bottom: 1em;
  }

  .markdown-content :global(a) {
    color: var(--color-primary-600);
    text-decoration: none;
  }

  .markdown-content :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-content :global(code) {
    background-color: rgb(244 244 245);
    color: rgb(39 39 42);
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-size: 0.875em;
  }

  :global(.dark) .markdown-content :global(code) {
    background-color: rgb(39 39 42);
    color: rgb(244 244 245);
  }

  .markdown-content :global(pre code) {
    background-color: rgb(24 24 27);
    color: rgb(244 244 245);
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid rgb(212 212 216);
    padding-left: 1em;
    margin-left: 0;
    color: rgb(82 82 91);
  }

  :global(.dark) .markdown-content :global(blockquote) {
    border-left-color: rgb(63 63 70);
    color: rgb(161 161 170);
  }

  .markdown-content :global(ul), 
  .markdown-content :global(ol) {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid rgb(228 228 231);
    padding: 0.5em;
  }

  :global(.dark) .markdown-content :global(th),
  :global(.dark) .markdown-content :global(td) {
    border-color: rgb(63 63 70);
  }

  .markdown-content :global(th) {
    background-color: rgb(244 244 245);
  }

  :global(.dark) .markdown-content :global(th) {
    background-color: rgb(39 39 42);
  }
</style> 