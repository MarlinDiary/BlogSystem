<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
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
  }

  interface ArticleResponse {
    items: Article[];
    total: number;
    page: number;
    pageSize: number;
  }

  let articles: Article[] = [];
  let loading = false;
  let error = '';
  let total = 0;
  let currentPage = 1;
  let pageSize = 10;
  let keyword = '';
  let sort = 'newest';

  const sortOptions = [
    { value: 'newest', label: '最新发布' },
    { value: 'title', label: '标题排序' },
    { value: 'views', label: '浏览最多' },
    { value: 'likes', label: '点赞最多' }
  ];

  async function fetchArticles() {
    loading = true;
    error = '';
    try {
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sort,
        ...(keyword && { keyword })
      });

      const response = await fetch(`/api/articles?${searchParams.toString()}`);
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        const errorData = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();
          
        throw new Error(
          typeof errorData === 'object' 
            ? errorData.message || '获取文章列表失败' 
            : errorData || `获取文章列表失败 (${response.status})`
        );
      }
      
      if (!contentType?.includes('application/json')) {
        throw new Error(`预期接收 JSON 数据，但收到 ${contentType}`);
      }
      
      const data: ArticleResponse = await response.json();
      
      if (!Array.isArray(data.items)) {
        throw new Error('返回数据格式错误：items 不是数组');
      }
      
      articles = data.items;
      total = data.total;
      
      // 更新 URL 参数
      const url = new URL(window.location.href);
      url.searchParams.set('page', currentPage.toString());
      url.searchParams.set('sort', sort);
      if (keyword) url.searchParams.set('keyword', keyword);
      history.replaceState({}, '', url.toString());
      
    } catch (e) {
      console.error('获取文章列表出错:', e);
      error = e instanceof Error ? e.message : '获取文章列表失败';
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    currentPage = 1;
    fetchArticles();
  }

  function handleSortChange() {
    currentPage = 1;
    fetchArticles();
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
    fetchArticles();
  }

  // 从 URL 参数初始化状态
  $: {
    const params = new URLSearchParams($page.url.search);
    currentPage = parseInt(params.get('page') || '1');
    sort = params.get('sort') || 'newest';
    keyword = params.get('keyword') || '';
  }

  // 处理图片 URL
  function getImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;  // 后端已经返回了完整的相对路径，例如 /uploads/covers/xxx.jpg
  }

  // 处理头像 URL
  function getAvatarUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;  // 后端已经返回了完整的相对路径，例如 /uploads/avatars/xxx.jpg
  }

  onMount(fetchArticles);
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl mb-8">
    文章列表
  </h1>

  <div class="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
    <div class="flex-1 w-full sm:max-w-md">
      <div class="relative">
        <input
          type="text"
          bind:value={keyword}
          placeholder="搜索文章..."
          class="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 text-sm text-lime-600 hover:text-lime-700 dark:text-lime-400"
          on:click={handleSearch}
        >
          搜索
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">排序：</span>
      <select
        bind:value={sort}
        on:change={handleSortChange}
        class="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
      >
        {#each sortOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
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
    <div class="space-y-6">
      {#each articles as article}
        <article class="group relative flex flex-col space-y-2 rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h2 class="text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
                <a href="/articles/{article.id}" class="hover:text-lime-600 dark:hover:text-lime-400">
                  <span class="absolute inset-0"></span>
                  {article.title}
                </a>
              </h2>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {article.content.substring(0, 200)}...
              </p>
            </div>
            {#if article.imageUrl}
              <div class="w-24 h-24 flex-shrink-0">
                <img
                  src={getImageUrl(article.imageUrl)}
                  alt={article.title}
                  class="w-full h-full object-cover rounded-lg"
                />
              </div>
            {/if}
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
              {#if article.author.avatarUrl}
                <div class="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={getAvatarUrl(article.author.avatarUrl)}
                    alt={article.author.username}
                    class="w-full h-full object-cover"
                  />
                </div>
              {/if}
              <span class="text-zinc-600 dark:text-zinc-400">
                {article.author.username}
              </span>
            </div>
            <time class="text-zinc-500 dark:text-zinc-400">
              {new Date(article.createdAt).toLocaleDateString('zh-CN')}
            </time>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
                {article.viewCount}
              </span>
              <span class="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                </svg>
                {article.likeCount}
              </span>
              <span class="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                </svg>
                {article.commentCount}
              </span>
            </div>
          </div>
        </article>
      {/each}
    </div>

    {#if total > pageSize}
      <div class="mt-8 flex justify-center gap-2">
        <button
          class="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
          disabled={currentPage === 1}
          on:click={() => handlePageChange(currentPage - 1)}
        >
          上一页
        </button>
        <span class="flex items-center px-4 text-zinc-600 dark:text-zinc-400">
          第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
        </span>
        <button
          class="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
          disabled={currentPage >= Math.ceil(total / pageSize)}
          on:click={() => handlePageChange(currentPage + 1)}
        >
          下一页
        </button>
      </div>
    {/if}
  {/if}
</div> 