<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Article {
    id: string;
    title: string;
    excerpt: string;
    author: {
      name: string;
      avatar: string;
    };
    publishDate: string;
    tags: string[];
  }
  
  // 模拟文章数据
  let articles: Article[] = [
    {
      id: '1',
      title: '如何使用 Svelte 构建现代化 Web 应用',
      excerpt: 'Svelte 是一个革命性的前端框架，它通过编译时优化来提供极致的性能体验。本文将介绍如何使用 Svelte 构建一个完整的 Web 应用...',
      author: {
        name: '张三',
        avatar: '/logo.png'
      },
      publishDate: '2024-03-15',
      tags: ['Svelte', 'Web开发', '前端']
    },
    {
      id: '2',
      title: '深入理解 TypeScript 类型系统',
      excerpt: 'TypeScript 的类型系统非常强大，但也有一定的学习曲线。本文将深入探讨 TypeScript 的高级类型特性...',
      author: {
        name: '李四',
        avatar: '/logo.png'
      },
      publishDate: '2024-03-14',
      tags: ['TypeScript', '编程语言']
    }
  ];
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
    文章列表
  </h1>
  
  <div class="mt-8 space-y-6">
    {#each articles as article}
      <article class="group relative flex flex-col space-y-2 rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
        <h2 class="text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          <a href="/articles/{article.id}">
            <span class="absolute inset-0"></span>
            {article.title}
          </a>
        </h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          {article.excerpt}
        </p>
        <div class="mt-4 flex items-center gap-4">
          <div class="flex items-center gap-2">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              class="h-8 w-8 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
            />
            <span class="text-sm text-zinc-600 dark:text-zinc-400">
              {article.author.name}
            </span>
          </div>
          <time class="text-sm text-zinc-500 dark:text-zinc-400" datetime={article.publishDate}>
            {new Date(article.publishDate).toLocaleDateString('zh-CN')}
          </time>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          {#each article.tags as tag}
            <span class="inline-flex items-center rounded-full bg-lime-100/60 px-3 py-0.5 text-sm font-medium text-lime-900 dark:bg-lime-900/30 dark:text-lime-200">
              {tag}
            </span>
          {/each}
        </div>
      </article>
    {/each}
  </div>
</div> 