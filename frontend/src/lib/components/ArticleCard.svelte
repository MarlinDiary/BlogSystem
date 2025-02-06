<script>
  export let article;

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<a 
  href="/articles/{article.id}" 
  class="group block overflow-hidden rounded-xl bg-white dark:bg-zinc-800/50 shadow-sm hover:shadow-md transition-all duration-300"
>
  {#if article.coverImage}
    <div class="aspect-[16/9] overflow-hidden">
      <img 
        src={article.coverImage} 
        alt={article.title}
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  {/if}
  
  <div class="p-6">
    <h3 class="text-xl font-semibold text-zinc-900 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
      {article.title}
    </h3>
    
    <p class="mt-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
      {article.content}
    </p>
    
    <div class="mt-4 flex items-center text-xs text-zinc-500 dark:text-zinc-400 space-x-4">
      <time datetime={article.createdAt}>{formatDate(article.createdAt)}</time>
      <span>阅读 {article.viewCount || 0}</span>
      <span>评论 {article.commentCount || 0}</span>
    </div>
  </div>
</a> 