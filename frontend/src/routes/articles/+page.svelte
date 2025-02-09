<script>
  import { onMount, onDestroy } from 'svelte';
  import ColorThief from 'colorthief';
  import { t, locale } from '$lib/i18n';
  import { setPageTitle } from '$lib/utils/title';
  import Loading from '$lib/components/Loading.svelte';
  
  let articles = [];
  let visibleArticles = [];
  let loading = false;
  let error = '';
  let sortBy = typeof window !== 'undefined' 
    ? localStorage.getItem('articleSortBy') || 'createdAt'
    : 'createdAt';
  let containerRef;
  let observer;
  let colorThief;
  let colorCache = new Map();

  // 监听排序变化并保存到 localStorage
  $: if (typeof window !== 'undefined' && sortBy) {
    localStorage.setItem('articleSortBy', sortBy);
  }

  export let data;
  const API_BASE = data.API_BASE;

  // 从 localStorage 加载颜色缓存
  onMount(() => {
    colorThief = new ColorThief();
    initIntersectionObserver();
    setPageTitle($t('nav.articles'));
    
    // 加载颜色缓存
    try {
      const savedColors = localStorage.getItem('articleColors');
      if (savedColors) {
        const colors = JSON.parse(savedColors);
        colorCache = new Map(Object.entries(colors));
      }
    } catch (err) {
      console.error('Failed to load color cache:', err);
    }
    
    fetchArticles();
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  async function fetchArticles() {
    loading = true;
    error = '';
    try {
      const response = await fetch(`${API_BASE}/api/articles?sort=${sortBy}`);
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        throw new Error($t('error.fetchArticlesFailed'));
      }
      
      if (!contentType?.includes('application/json')) {
        throw new Error($t('error.invalidContentType', { type: contentType }));
      }
      
      const data = await response.json();
      // 初始化所有文章为可见状态
      articles = data.items.map(article => ({
        ...article,
        isVisible: true // 默认可见
      }));
      
      // 更新可见文章列表
      visibleArticles = articles;
      
      // 预加载前几张图片
      preloadNextImages(articles, 0);
      
    } catch (e) {
      console.error('Error fetching article list:', e);
      error = e instanceof Error ? e.message : $t('error.fetchArticlesFailed');
    } finally {
      loading = false;
    }
  }

  // 初始化 Intersection Observer
  function initIntersectionObserver() {
    let pendingUpdates = new Map();
    let frameId = null;

    observer = new IntersectionObserver(
      (entries) => {
        // 收集所有更新
        entries.forEach(entry => {
          const articleId = Number(entry.target.dataset.articleId);
          pendingUpdates.set(articleId, entry.isIntersecting);
        });

        // 如果已经有待处理的动画帧，不需要再次请求
        if (frameId) return;

        // 在下一帧处理所有更新
        frameId = requestAnimationFrame(() => {
          articles = articles.map(article => ({
            ...article,
            isVisible: pendingUpdates.has(article.id) 
              ? pendingUpdates.get(article.id) 
              : article.isVisible
          }));

          // 清理
          pendingUpdates.clear();
          frameId = null;
        });
      },
      {
        root: null,
        rootMargin: '200px', // 增加预加载区域
        threshold: [0, 0.1, 0.5, 1], // 添加更多观察点以平滑过渡
      }
    );
  }

  // 保存颜色缓存到 localStorage
  function saveColorCache() {
    try {
      const colors = Object.fromEntries(colorCache);
      localStorage.setItem('articleColors', JSON.stringify(colors));
    } catch (err) {
      console.error('Failed to save color cache:', err);
    }
  }

  // 提取主色调
  function extractDominantColor(img, article) {
    return new Promise((resolve, reject) => {
      try {
        // 确保图片已完全加载
        if (!img.complete) {
          img.onload = () => {
            try {
              const color = colorThief.getColor(img);
              resolve(color);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = reject;
        } else {
          const color = colorThief.getColor(img);
          resolve(color);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  // 处理图片加载
  async function handleImageLoad(event, article) {
    const img = event.target;
    
    try {
      // 先尝试从内存缓存获取
      if (colorCache.has(article.imageUrl)) {
        article.dominantColor = colorCache.get(article.imageUrl);
        articles = articles;
        img.style.opacity = '1';
        return;
      }

      // 确保图片有正确的跨域属性
      if (img.crossOrigin !== 'anonymous') {
        img.crossOrigin = 'anonymous';
      }

      // 使用 requestIdleCallback 在空闲时间提取主色调
      if (window.requestIdleCallback) {
        requestIdleCallback(async () => {
          try {
            const color = await extractDominantColor(img, article);
            requestAnimationFrame(() => {
              const dominantColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
              article.dominantColor = dominantColor;
              colorCache.set(article.imageUrl, dominantColor);
              articles = articles;
              // 保存到 localStorage
              saveColorCache();
              img.style.opacity = '1';
            });
          } catch (err) {
            console.error('Failed to extract image color:', err);
            article.dominantColor = 'rgb(32, 32, 32)';
            articles = articles;
            img.style.opacity = '1';
          }
        });
      } else {
        setTimeout(async () => {
          try {
            const color = await extractDominantColor(img, article);
            requestAnimationFrame(() => {
              const dominantColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
              article.dominantColor = dominantColor;
              colorCache.set(article.imageUrl, dominantColor);
              articles = articles;
              // 保存到 localStorage
              saveColorCache();
              img.style.opacity = '1';
            });
          } catch (err) {
            console.error('Failed to extract image color:', err);
            article.dominantColor = 'rgb(32, 32, 32)';
            articles = articles;
            img.style.opacity = '1';
          }
        }, 0);
      }
    } catch (err) {
      console.error('Error in handleImageLoad:', err);
      article.dominantColor = 'rgb(32, 32, 32)';
      articles = articles;
      img.style.opacity = '1';
    }
  }

  // 处理 Intersection Observer
  function intersectionObserver(node, { callback, options }) {
    if (observer) {
      node.dataset.articleId = node.getAttribute('data-article-id');
      observer.observe(node);
    }

    return {
      destroy() {
        if (observer) {
          observer.unobserve(node);
        }
      }
    };
  }

  // 处理元素可见性变化
  function handleIntersection(entry, article) {
    article.isVisible = entry.isIntersecting;
    // 强制更新可见文章列表
    visibleArticles = articles.filter(a => a.isVisible);
  }

  // 预加载下一页图片
  function preloadNextImages(articles, startIndex) {
    const PRELOAD_COUNT = 5;
    const imagesToPreload = articles.slice(startIndex, startIndex + PRELOAD_COUNT)
      .filter(article => article.imageUrl);

    imagesToPreload.forEach(article => {
      const img = new Image();
      img.src = getImageUrl(article.imageUrl);
    });
  }

  // 获取图片 URL
  function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // 处理头像 URL
  function getAvatarUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // 生成卡片样式
  function getCardStyle(article) {
    let style = [];
    if (article.dominantColor) {
      style.push(`--card-color: ${article.dominantColor}`);
    }
    return style.join(';');
  }

  // 生成随机高度
  function getRandomHeight(article) {
    // 使用文章ID作为种子来保持刷新前后高度一致
    const seed = parseInt(article.id, 16);
    const rand = Math.abs(Math.sin(seed)) * 100; // 0-100之间的随机数
    const minHeight = 200;
    const maxHeight = 400;
    const height = minHeight + (rand * (maxHeight - minHeight) / 100);
    return `${height}px`;
  }
</script>

<style lang="postcss">
  .article-card {
    --card-color: rgb(0, 0, 0);
    background: color-mix(in srgb, var(--card-color) 85%, transparent);
    border: none;
    overflow: hidden;
    padding: 0 0 1.5rem 0;
    break-inside: avoid;
    margin-bottom: 1.5rem;
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .article-card:hover {
    transform: translateY(-2px) translateZ(0);
  }

  .article-card .title-link {
    color: white;
    opacity: 0.95;
  }

  .article-card .image-container {
    margin-bottom: 1.5rem;
    overflow: hidden;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
    transform: translateZ(0);
  }

  .articles-container {
    transform: translateZ(0);
    backface-visibility: hidden;
    contain: layout style paint;
  }

  @media (min-width: 1280px) {
    .articles-container {
      column-count: 3;
      column-gap: 1.5rem;
      contain: layout style paint;
    }
    .article-card {
      margin-bottom: 1.5rem;
      contain: layout style paint;
    }
  }

  @media (min-width: 768px) and (max-width: 1279px) {
    .articles-container {
      column-count: 2;
      column-gap: 1.5rem;
      contain: layout style paint;
    }
    .article-card {
      margin-bottom: 1.5rem;
      contain: layout style paint;
    }
  }

  @media (max-width: 767px) {
    .articles-container {
      column-count: 1;
      contain: layout style paint;
    }
    .article-card {
      margin-bottom: 1.5rem;
      contain: layout style paint;
    }
    .article-card .image-container {
      height: 280px !important;
    }
  }

  .article-card .content {
    padding: 0 1.5rem;
  }

  .article-card .image-container::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--card-color) 50%, transparent) 100%);
    pointer-events: none;
  }

  .article-card .excerpt {
    color: white;
    opacity: 0.6;
  }
</style>

<div class="mx-auto max-w-[1600px] px-4 py-12">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl mb-4">
      {$t('article.explore')}
    </h1>

    <div class="flex justify-center gap-8">
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'createdAt' ? 'text-lime-500' : 'text-zinc-400 dark:text-zinc-300'}"
        on:click={() => { sortBy = 'createdAt'; fetchArticles(); }}
        title={$t('article.sortByTime')}
        aria-label={$t('article.sortByTime')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </button>
      
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'viewCount' ? 'text-lime-500' : 'text-zinc-400 dark:text-zinc-300'}"
        on:click={() => { sortBy = 'viewCount'; fetchArticles(); }}
        title={$t('article.sortByViews')}
        aria-label={$t('article.sortByViews')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
      
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'commentCount' ? 'text-lime-500' : 'text-zinc-400 dark:text-zinc-300'}"
        on:click={() => { sortBy = 'commentCount'; fetchArticles(); }}
        title={$t('article.sortByComments')}
        aria-label={$t('article.sortByComments')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      </button>
      
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'reactionCount' ? 'text-lime-500' : 'text-zinc-400 dark:text-zinc-300'}"
        on:click={() => { sortBy = 'reactionCount'; fetchArticles(); }}
        title={$t('article.sortByReactions')}
        aria-label={$t('article.sortByReactions')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>
    </div>
  </div>

  {#if error}
    <div class="p-4 mb-6 text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-200">
      {error}
    </div>
  {/if}

  {#if loading}
    <Loading />
  {:else}
    <div class="articles-container" bind:this={containerRef}>
      {#each articles as article (article.id)}
        <article 
          class="article-card group flex flex-col rounded-2xl transition-all duration-300 hover:shadow-xl relative"
          style={getCardStyle(article)}
          data-article-id={article.id}
          use:intersectionObserver={{
            callback: (entry) => handleIntersection(entry, article),
            options: { rootMargin: '100px' }
          }}
        >
          {#if article.imageUrl}
            <div class="relative image-container w-full"
                 style="height: {getRandomHeight(article)}">
              <img
                src={getImageUrl(article.imageUrl)}
                alt={article.title}
                class="w-full h-full object-cover transition-opacity duration-300"
                loading="lazy"
                decoding="async"
                crossorigin="anonymous"
                style="opacity: 0"
                on:error={() => {
                  console.error('Image load error:', article.imageUrl);
                  article.dominantColor = 'rgb(32, 32, 32)';
                  articles = articles;
                }}
                on:load={(e) => handleImageLoad(e, article)}
              />
            </div>
          {/if}
          
          <div class="content">
            <h2 class="text-lg font-semibold tracking-tight mb-2">
              <a href="/articles/{article.id}" class="title-link">
                <span class="absolute inset-0"></span>
                {article.title}
              </a>
            </h2>

            <p class="text-sm line-clamp-2 flex-grow excerpt">
              {article.content}
            </p>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>