<script lang="ts">
  import { onMount } from 'svelte';
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
    关于我们
  </h1>
  
  <div class="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
    <p>
      欢迎来到我们的博客平台！这是一个专注于分享知识和经验的社区。我们致力于为用户提供一个友好、专业的写作和阅读环境。
    </p>
    
    <p>
      在这里，你可以：
    </p>
    
    <ul class="list-inside list-disc space-y-2 pl-4">
      <li>发布原创文章，分享你的见解</li>
      <li>阅读优质内容，获取新知识</li>
      <li>与其他作者交流，建立连接</li>
      <li>收藏喜欢的文章，建立个人知识库</li>
    </ul>
    
    <p>
      如果你有任何问题或建议，欢迎随时联系我们。
    </p>
    
    <div class="mt-8 flex items-center gap-4">
      <a
        href="mailto:contact@example.com"
        class="group inline-flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600"
      >
        联系我们
        <svg
          class="h-4 w-4 transition group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </a>
    </div>
  </div>
</div> 