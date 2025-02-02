<script lang="ts">
  import { onMount, afterUpdate, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import ArticleReactions from '$lib/components/ArticleReactions.svelte';
  
  interface Author {
    id: number;
    username: string;
    avatarUrl: string;
  }

  interface Article {
    id: number;
    title: string;
    content: string;
    htmlContent: string;
    imageUrl: string;
    status: string;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
    author: Author;
    commentCount: number;
  }

  interface TocItem {
    id: string;
    text: string;
    level: number;
    isActive: boolean;
  }

  let article: Article | null = null;
  let loading = false;
  let error = '';
  let tocItems: TocItem[] = [];
  let activeHeadingId = '';
  let observer: IntersectionObserver | null = null;
  let isScrolled = false;

  // 生成标题ID
  function generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 保留中文字符
      .replace(/(-{2,})/g, '-');
  }

  // 处理目录点击
  function handleTocClick(e: MouseEvent, id: string) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    window.history.pushState({}, '', `#${id}`);
  }

  // 清理HTML标签
  function stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // 解析文章内容中的标题
  function parseToc(content: string): TocItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2');
    const items = Array.from(headings).map(heading => {
      const text = stripHtml((heading.innerHTML || '').trim());
      const id = generateHeadingId(text);
      return {
        id,
        text,
        level: parseInt(heading.tagName[1]),
        isActive: false
      };
    });
    return items;
  }

  // 处理文章内容点击事件
  function handleContentInteraction(e: MouseEvent | KeyboardEvent) {
    if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Enter') {
      return;
    }
    const target = e.target as HTMLElement;
    const heading = target.closest('h1, h2');
    if (heading && heading.id) {
      e.preventDefault();
      const element = document.getElementById(heading.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  function scrollToHeading(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 初始化观察器
  function initializeObserver() {
    if (!article?.htmlContent) return;
    
    // 断开之前的观察器
    observer?.disconnect();
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeHeadingId = entry.target.id;
            tocItems = tocItems.map(item => ({
              ...item,
              isActive: item.id === activeHeadingId
            }));
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0
      }
    );
    
    // 查询文章区域内带 id 的标题元素
    const headings = document.querySelectorAll('.article-content h1[id], .article-content h2[id]');
    headings.forEach(heading => observer?.observe(heading));
  }

  async function fetchArticle(id: string) {
    loading = true;
    error = '';
    try {
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) {
        throw new Error('获取文章详情失败');
      }
      article = await response.json();
      if (article?.htmlContent) {
        tocItems = parseToc(article.htmlContent);
      }
    } catch (e) {
      console.error('获取文章详情出错:', e);
      error = e instanceof Error ? e.message : '获取文章详情失败';
    } finally {
      loading = false;
    }
  }

  // 组件销毁时清理观察器
  onDestroy(() => {
    observer?.disconnect();
  });

  // 格式化日期
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function handleScroll() {
    isScrolled = window.scrollY > 200;
  }

  onMount(async () => {
    const id = $page.params.id;
    if (id) {
      await fetchArticle(id);
      await tick();
      setTimeout(() => {
        initializeObserver();
      }, 200);
    }

    window.addEventListener('scroll', handleScroll);
  });

  onDestroy(() => {
    observer?.disconnect();
    window.removeEventListener('scroll', handleScroll);
  });
</script>

<style lang="postcss">
  .article-wrapper {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .article-container {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .cover-container {
    position: relative;
    width: 100%;
    aspect-ratio: 240/135;
    margin-bottom: 2rem;
    @media (min-width: 640px) {
      width: 108%;
      margin-left: -4%;
    }
    @media (min-width: 768px) {
      width: 112%;
      margin-left: -6%;
    }
    @media (min-width: 1024px) {
      width: 120%;
      margin-left: -10%;
    }
  }

  .blur-background {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    background-size: cover;
    background-position: center;
    filter: blur(16px) saturate(1.5);
    z-index: 0;
    border-radius: 0.75rem;
    @media (min-width: 640px) {
      border-radius: 1rem;
    }
    @media (min-width: 768px) {
      border-radius: 1.25rem;
    }
    @media (min-width: 1024px) {
      border-radius: 1.5rem;
    }
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgb(255 255 255 / 0.5);
      border-radius: inherit;
    }
  }

  :global(.dark) .blur-background::after {
    background: rgb(0 0 0 / 0.5);
  }

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.75rem;
    position: relative;
    z-index: 1;
    @media (min-width: 640px) {
      border-radius: 1rem;
    }
    @media (min-width: 768px) {
      border-radius: 1.25rem;
    }
    @media (min-width: 1024px) {
      border-radius: 1.5rem;
    }
  }

  :global(.dark) .cover-image {
    &:hover {
      border-color: rgb(63 63 70);
    }
  }

  .article-content {
    line-height: 1.8;
    font-size: 1.1rem;
  }

  .article-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0 2rem;
    color: #666;
  }

  .author-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }

  .toc {
    position: absolute;
    width: 160px;
    height: fit-content;
    display: none;
    transition: all 0.3s ease;
    @screen lg {
      display: block;
      position: fixed;
      left: 50%;
      transform: translateX(calc(-50% - 480px));
      margin-left: -40px;  /* 给目录一些额外的间距 */
    }

    &[data-scrolled="true"] {
      top: 2rem;
      padding-top: 5rem;
    }

    &:not([data-scrolled="true"]) {
      top: 16rem;
    }
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    &:hover .toc-item:not(:hover) {
      opacity: 0.5;
    }
  }

  .toc-item {
    display: block;
    font-size: 12px;
    line-height: 18px;
    font-weight: 500;
    color: rgb(161 161 170);
    text-decoration: none;
    transition: all 0.2s ease;

    &[data-level="2"] {
      padding-left: 0;
    }

    &[data-level="3"] {
      padding-left: 4px;
    }

    &[data-level="4"] {
      padding-left: 8px;
    }

    &[data-active="true"] {
      color: rgb(24 24 27);
    }

    @media (hover: hover) {
      &:hover {
        color: rgb(24 24 27);
      }
    }
  }

  :global(.dark) .toc-item {
    color: rgb(113 113 122);

    &[data-active="true"] {
      color: rgb(244 244 245);
    }

    @media (hover: hover) {
      &:hover {
        color: rgb(161 161 170);
      }
    }
  }

  :global(.dark) .toc-list:hover .toc-item:not(:hover) {
    color: rgb(82 82 91);
  }

  @media (max-width: 1280px) {
    .toc {
      display: none;
    }
  }

  :global(.heading-anchor) {
    cursor: pointer;
    scroll-margin-top: 2rem;

    &:hover {
      &::after {
        content: '#';
        opacity: 0.5;
        margin-left: 0.5rem;
        font-weight: normal;
      }
    }
  }

  :global(.dark) {
    :global(.heading-anchor:hover::after) {
      opacity: 0.3;
    }
  }
</style>

<div class="article-wrapper">
  {#if article && tocItems.length > 0}
    <nav class="toc" data-scrolled={isScrolled}>
      <div class="toc-list">
        {#each tocItems as item}
          <a
            href="#{item.id}"
            class="toc-item"
            data-level={item.level}
            data-active={item.isActive}
            on:click|preventDefault={(e) => handleTocClick(e, item.id)}
            aria-current={item.isActive ? 'true' : undefined}
          >
            {item.text}
          </a>
        {/each}
      </div>
    </nav>
  {/if}

  {#if article}
    <ArticleReactions
      articleId={article.id}
      {isScrolled}
    />
  {/if}

  <div class="article-container">
    {#if loading}
      <div class="flex items-center justify-center min-h-screen">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center min-h-screen">
        <p class="text-red-500">{error}</p>
      </div>
    {:else if article}
      <div class="cover-container">
        <div 
          class="blur-background" 
          style="background-image: url({article.imageUrl})"
        ></div>
        <img
          src={article.imageUrl}
          alt={article.title}
          class="cover-image"
        />
      </div>
      
      <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-100">
        {article.title}
      </h1>

      <div class="article-meta">
        <img 
          src={article.author.avatarUrl || '/frontend/static/logo.png'} 
          alt={article.author.username}
          class="author-avatar"
        />
        <div>
          <div class="font-medium text-zinc-800 dark:text-zinc-100">{article.author.username}</div>
          <div class="text-sm text-zinc-500">
            发布于 {formatDate(article.createdAt)}
          </div>
        </div>
        <div class="ml-auto flex items-center gap-4 text-sm text-zinc-500">
          <span>阅读 {article.viewCount}</span>
          <span>评论 {article.commentCount}</span>
        </div>
      </div>

      <div 
        class="article-content prose dark:prose-invert max-w-none" 
        role="article"
      >
        {#if article?.htmlContent}
          {@html article.htmlContent.replace(
            /<(h[12])([^>]*)>(.*?)<\/\1>/g,
            (match, tag, attrs, text) => {
              const cleanText = stripHtml(text.trim());
              const cleanAttrs = attrs.replace(/\s+id\s*=\s*(['"]).*?\1/, '');
              const id = generateHeadingId(cleanText);
              const tocItem = tocItems.find(item => item.text === cleanText);
              const finalId = tocItem?.id || id;
              return `<${tag}${cleanAttrs} id="${finalId}" class="heading-anchor" tabindex="0" role="link" aria-label="跳转到${cleanText}章节">${text}</${tag}>`;
            }
          )}
        {/if}
      </div>
    {/if}
  </div>
</div>

<svelte:window on:click={handleContentInteraction} on:keydown={handleContentInteraction} /> 