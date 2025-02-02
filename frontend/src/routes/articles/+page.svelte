<script lang="ts">
  import { onMount } from 'svelte';
  import ColorThief from 'colorthief';
  
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
    likeCount: number;
    dominantColor?: string;
  }

  let articles: Article[] = [];
  let loading = false;
  let error = '';
  const colorThief = new ColorThief();

  async function fetchArticles() {
    loading = true;
    error = '';
    try {
      const response = await fetch('/api/articles');
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        throw new Error('获取文章列表失败');
      }
      
      if (!contentType?.includes('application/json')) {
        throw new Error(`预期接收 JSON 数据，但收到 ${contentType}`);
      }
      
      const data = await response.json();
      articles = data.items;
      
      // 为每篇文章提取图片主色调
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
            console.error('提取图片颜色失败:', e);
          }
        }
      }
      
    } catch (e) {
      console.error('获取文章列表出错:', e);
      error = e instanceof Error ? e.message : '获取文章列表失败';
    } finally {
      loading = false;
    }
  }

  // 处理图片 URL
  function getImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;
  }

  // 处理头像 URL
  function getAvatarUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;
  }

  // 生成卡片样式
  function getCardStyle(article: Article): string {
    if (!article.dominantColor) return '';
    return `--card-color: ${article.dominantColor}`;
  }

  onMount(fetchArticles);
</script>

<style lang="postcss">
  .article-card {
    --card-color: rgb(0, 0, 0);
  }

  .article-card:hover {
    background: color-mix(in srgb, var(--card-color) 5%, transparent);
    border-color: var(--card-color);
  }

  .article-card .title-link:hover {
    color: var(--card-color);
  }

  .article-card .image-container::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--card-color) 10%, transparent) 100%);
    border-radius: 0.5rem;
    pointer-events: none;
  }
</style>

<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl mb-12 text-center">
    探索文章
  </h1>

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
    <div class="grid gap-8 sm:grid-cols-2">
      {#each articles as article}
        <article 
          class="article-card group flex flex-col rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40 transition-all duration-300 hover:shadow-lg relative"
          style={getCardStyle(article)}
        >
          {#if article.imageUrl}
            <div class="w-full h-48 mb-4 relative image-container">
              <img
                src={getImageUrl(article.imageUrl)}
                alt={article.title}
                class="w-full h-full object-cover rounded-lg"
                crossorigin="anonymous"
              />
            </div>
          {/if}
          
          <h2 class="text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 mb-2">
            <a href="/articles/{article.id}" class="title-link hover:text-lime-600 dark:hover:text-lime-400">
              <span class="absolute inset-0"></span>
              {article.title}
            </a>
          </h2>

          <p class="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-grow">
            {article.content.substring(0, 150)}...
          </p>

          <div class="mt-4 flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={getAvatarUrl(article.author.avatarUrl)}
                  alt={article.author.username}
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-zinc-600 dark:text-zinc-400">
                {article.author.username}
              </span>
            </div>
            
            <time class="text-zinc-500 dark:text-zinc-400">
              {new Date(article.createdAt).toLocaleDateString('zh-CN')}
            </time>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div> 