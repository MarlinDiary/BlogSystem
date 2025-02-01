<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  interface Article {
    id: string;
    title: string;
    content: string;
    author: {
      name: string;
      avatar: string;
      bio: string;
    };
    publishDate: string;
    tags: string[];
  }
  
  // 模拟文章数据
  let article: Article = {
    id: $page.params.id,
    title: '如何使用 Svelte 构建现代化 Web 应用',
    content: `
      Svelte 是一个革命性的前端框架，它通过编译时优化来提供极致的性能体验。

      ## 为什么选择 Svelte？

      1. **更少的代码量**：Svelte 的语法简洁明了，让你用更少的代码实现相同的功能。
      2. **更好的性能**：没有运行时开销，所有优化都在编译时完成。
      3. **更容易学习**：采用类似于传统 HTML、CSS 和 JavaScript 的语法。

      ## 开始使用

      首先，你需要安装 Svelte：

      \`\`\`bash
      npm create svelte@latest my-app
      cd my-app
      npm install
      \`\`\`

      然后，你就可以开始开发了！
    `,
    author: {
      name: '张三',
      avatar: '/logo.png',
      bio: '前端开发工程师，热衷于探索新技术'
    },
    publishDate: '2024-03-15',
    tags: ['Svelte', 'Web开发', '前端']
  };
</script>

<article class="mx-auto max-w-2xl">
  <header class="flex flex-col">
    <h1 class="mt-6 text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
      {article.title}
    </h1>
    <div class="mt-6 flex items-center gap-4">
      <div class="flex items-center gap-2">
        <img
          src={article.author.avatar}
          alt={article.author.name}
          class="h-10 w-10 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
        />
        <div class="flex flex-col">
          <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {article.author.name}
          </span>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">
            {article.author.bio}
          </span>
        </div>
      </div>
      <time class="text-sm text-zinc-500 dark:text-zinc-400" datetime={article.publishDate}>
        {new Date(article.publishDate).toLocaleDateString('zh-CN')}
      </time>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      {#each article.tags as tag}
        <span class="inline-flex items-center rounded-full bg-lime-100/60 px-3 py-0.5 text-sm font-medium text-lime-900 dark:bg-lime-900/30 dark:text-lime-200">
          {tag}
        </span>
      {/each}
    </div>
  </header>

  <div class="prose prose-zinc mt-8 dark:prose-invert">
    {@html article.content}
  </div>
</article> 