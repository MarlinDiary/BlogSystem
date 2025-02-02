<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
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

  let article: Article | null = null;
  let loading = false;
  let error = '';

  async function fetchArticle(id: string) {
    loading = true;
    error = '';
    try {
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) {
        throw new Error('获取文章详情失败');
      }
      article = await response.json();
    } catch (e) {
      console.error('获取文章详情出错:', e);
      error = e instanceof Error ? e.message : '获取文章详情失败';
    } finally {
      loading = false;
    }
  }

  // 格式化日期
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onMount(() => {
    const id = $page.params.id;
    if (id) {
      fetchArticle(id);
    }
  });
</script>

<style lang="postcss">
  .article-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .cover-container {
    position: relative;
    width: 100%;
    aspect-ratio: 240/135;
    margin-bottom: 2rem;
    @media (min-width: 768px) {
      width: 120%;
      margin-left: -10%;
    }
  }

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1rem;
    position: relative;
    z-index: 1;
    @media (min-width: 768px) {
      border-radius: 1.5rem;
    }
    ring-width: 1px;
    ring-color: rgb(24 24 27 / 0.05);
    transition: all 0.3s ease;
  }

  :global(.dark) .cover-image {
    ring-width: 0;
    ring-color: rgb(255 255 255 / 0.1);
    &:hover {
      border-color: rgb(63 63 70);
      ring-color: rgb(255 255 255 / 0.2);
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
    border-radius: 1rem;
    @media (min-width: 768px) {
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
  }
</style>

<div class="article-container">
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="p-4 mb-6 text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-200">
      {error}
    </div>
  {:else if article}
    {#if article.imageUrl}
      <div class="cover-container">
        <div 
          class="blur-background" 
          style="background-image: url({article.imageUrl})"
        ></div>
        <img src={article.imageUrl} alt={article.title} class="cover-image" />
      </div>
    {/if}
    
    <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-100">
      {article.title}
    </h1>

    <div class="article-meta">
      <img 
        src={article.author.avatarUrl || '/default-avatar.png'} 
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
        <span>点赞 {article.likeCount}</span>
      </div>
    </div>

    <div class="article-content prose dark:prose-invert max-w-none">
      {@html article.htmlContent || article.content}
    </div>
  {/if}
</div> 