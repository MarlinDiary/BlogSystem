<script>
  import Carousel from '$lib/components/Carousel.svelte';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { env } from '$env/dynamic/public';
  import { t, locale } from '$lib/i18n';
  import { setPageTitle } from '$lib/utils/title';
  import Loading from '$lib/components/Loading.svelte';
  
  let latestArticles = [];
  let loading = true;
  let error = '';
  
  const API_URL = env.PUBLIC_API_URL;
  
  async function fetchArticles() {
    try {
      const url = `${API_URL}/api/articles?sort=createdAt&order=desc&pageSize=5&status=published`;
      console.log('Home - API_URL:', API_URL);
      console.log('Home - Start fetching articles, URL:', url);
      
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      console.log('Home - Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Home - Received data:', data);
        latestArticles = data.items;
      } else {
        console.error('Home - Request failed:', response.status, response.statusText);
        error = $t('error.loadArticlesFailed', { status: response.status, statusText: response.statusText });
        try {
          const errorData = await response.json();
          console.error('Home - Error details:', errorData);
        } catch (e) {
          console.error('Home - Cannot parse error response');
        }
      }
    } catch (err) {
      console.error('Home - Request exception:', err);
      error = $t('error.loadArticlesRetry');
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    console.log('Home - Component mounted, start loading data');
    setPageTitle('');  // 主页不需要额外的标题
    fetchArticles();
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      // Restore scrolling when component unmounts
      document.body.style.overflow = '';
    };
  });
  
  // Convert article data to carousel format
  $: carouselSlides = latestArticles.map(article => ({
    id: article.id,
    title: article.title,
    description: article.content.substring(0, 150).replace(/[#*`]/g, '') + '...',
    image: article.imageUrl || '/images/default-cover.jpg',
    publishDate: new Date(article.createdAt).toLocaleDateString($locale === 'zh' ? 'zh-CN' : 'en-US', {
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
    <Loading fullscreen={true} size="lg" color="white" />
  {:else}
    <Carousel 
      slides={carouselSlides}
      fullscreen={true}
    />
  {/if}
</div>
