<script>
  import Carousel from '$lib/components/Carousel.svelte';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { env } from '$env/dynamic/public';
  
  let latestArticles = [];
  let loading = true;
  let error = '';
  
  const API_URL = env.PUBLIC_API_URL;
  
  async function fetchArticles() {
    try {
      const url = `${API_URL}/api/articles?sort=createdAt&order=desc&pageSize=5&status=published`;
      console.log('首页 - API_URL:', API_URL);
      console.log('首页 - 开始请求文章，URL:', url);
      
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      console.log('首页 - 响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('首页 - 获取到的数据:', data);
        latestArticles = data.items;
      } else {
        console.error('首页 - 请求失败:', response.status, response.statusText);
        error = `加载文章失败: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('首页 - 错误详情:', errorData);
        } catch (e) {
          console.error('首页 - 无法解析错误响应');
        }
      }
    } catch (err) {
      console.error('首页 - 请求异常:', err);
      error = '加载文章失败，请稍后重试';
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    console.log('首页 - 组件挂载，开始加载数据');
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
