<script>
  import Carousel from '$lib/components/Carousel.svelte';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  
  let latestArticles = [];
  let loading = true;
  let error = '';
  
  async function fetchArticles() {
    try {
      const response = await fetch('/api/articles?sort=createdAt&order=desc&pageSize=5&status=published');
      
      if (response.ok) {
        const data = await response.json();
        latestArticles = data.items;
      } else {
        error = '加载文章失败';
      }
    } catch (err) {
      error = '加载文章失败，请稍后重试';
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchArticles();
    // 禁用滚动
    document.body.style.overflow = 'hidden';
    return () => {
      // 组件卸载时恢复滚动
      document.body.style.overflow = '';
    };
  });
  
  // 将文章数据转换为轮播图格式
  $: carouselSlides = latestArticles.map(article => ({
    id: article.id,
    title: article.title,
    description: article.content.substring(0, 150).replace(/[#*`]/g, '') + '...',
    image: article.imageUrl || '/images/default-cover.jpg',
    publishDate: new Date(article.createdAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }));
</script>

<div class="fixed inset-0 bg-black">
  {#if error}
    <div class="absolute inset-x-0 top-4 z-50 mx-auto max-w-lg" transition:fade>
      <div class="rounded-lg bg-red-50 p-4 shadow-lg dark:bg-red-900/50">
        <p class="text-sm text-red-600 dark:text-red-200">{error}</p>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="flex h-screen items-center justify-center">
      <div class="h-32 w-32 animate-pulse rounded-full bg-white/10"></div>
    </div>
  {:else}
    <Carousel 
      slides={carouselSlides}
      fullscreen={true}
    />
  {/if}
</div>
