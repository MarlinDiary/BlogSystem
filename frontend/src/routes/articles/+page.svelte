<script>
  import { onMount } from 'svelte';
  import ColorThief from 'colorthief';
  import { t, locale } from '$lib/i18n';
  import { setPageTitle } from '$lib/utils/title';
  
  let articles = [];
  let loading = false;
  let error = '';
  let sortBy = typeof window !== 'undefined' 
    ? localStorage.getItem('articleSortBy') || 'createdAt'
    : 'createdAt';
  const colorThief = new ColorThief();

  // 监听排序变化并保存到 localStorage
  $: if (typeof window !== 'undefined' && sortBy) {
    localStorage.setItem('articleSortBy', sortBy);
  }

  export let data;
  const API_BASE = data.API_BASE;

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
      articles = data.items;
      
      // Extract dominant color for each article image
      for (let article of articles) {
        if (article.imageUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = getImageUrl(article.imageUrl);
            });
            const color = colorThief.getColor(img);
            article.dominantColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          } catch (e) {
            console.error('Failed to extract image color:', e);
          }
        }
      }
      
    } catch (e) {
      console.error('Error fetching article list:', e);
      error = e instanceof Error ? e.message : $t('error.fetchArticlesFailed');
    } finally {
      loading = false;
    }
  }

  // 处理图片 URL
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
    if (!article.dominantColor) return '';
    return `--card-color: ${article.dominantColor}`;
  }

  onMount(() => {
    setPageTitle($t('nav.articles'));
    fetchArticles();
  });
</script>

<style lang="postcss">
  .article-card {
    --card-color: rgb(0, 0, 0);
    background: color-mix(in srgb, var(--card-color) 85%, transparent);
    border: none;
    overflow: hidden;
    padding: 0 0 1.5rem 0;
  }

  .article-card:hover {
    transform: translateY(-2px);
  }

  .article-card .title-link {
    color: white;
    opacity: 0.95;
  }

  .article-card .image-container {
    margin-bottom: 1.5rem;
    overflow: hidden;
    height: clamp(200px, 30vh, 280px);
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

  @media (max-width: 1280px) {
    .article-card .image-container {
      height: clamp(180px, 25vh, 240px);
    }
  }

  @media (max-width: 768px) {
    .article-card .image-container {
      height: clamp(160px, 20vh, 200px);
    }
  }
</style>

<div class="mx-auto max-w-[1600px] px-4 py-12">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl mb-4">
      {$t('article.explore')}
    </h1>

    <div class="flex justify-center gap-8">
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'createdAt' ? 'text-lime-500' : 'text-zinc-500 dark:text-zinc-400'}"
        on:click={() => { sortBy = 'createdAt'; fetchArticles(); }}
        title={$t('article.sortByTime')}
        aria-label={$t('article.sortByTime')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </button>
      
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'viewCount' ? 'text-lime-500' : 'text-zinc-500 dark:text-zinc-400'}"
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
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'commentCount' ? 'text-lime-500' : 'text-zinc-500 dark:text-zinc-400'}"
        on:click={() => { sortBy = 'commentCount'; fetchArticles(); }}
        title={$t('article.sortByComments')}
        aria-label={$t('article.sortByComments')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      </button>
      
      <button 
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {sortBy === 'reactionCount' ? 'text-lime-500' : 'text-zinc-500 dark:text-zinc-400'}"
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
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent"></div>
    </div>
  {:else}
    <div class="grid gap-4 md:gap-6 xl:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-w-screen-md md:max-w-screen-xl xl:max-w-none mx-auto">
      {#each articles as article}
        <article 
          class="article-card group flex flex-col rounded-2xl transition-all duration-300 hover:shadow-xl relative"
          style={getCardStyle(article)}
        >
          {#if article.imageUrl}
            <div class="w-full h-48 relative image-container">
              <img
                src={getImageUrl(article.imageUrl)}
                alt={article.title}
                class="w-full h-full object-cover"
                crossorigin="anonymous"
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
              {article.content.substring(0, 120)}...
            </p>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>