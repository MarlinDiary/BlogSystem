<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  export let slides = [];
  export let fullscreen = false;

  let currentIndex = 0;
  let previousIndex = 0;
  let transitioning = false;
  let progress = 0;
  let interval;
  const SLIDE_DURATION = 6000; // 6秒切换一次
  const PROGRESS_INTERVAL = 60; // 进度条更新间隔

  function startAutoPlay() {
    clearInterval(interval);
    progress = 0;
    
    interval = setInterval(() => {
      progress += (PROGRESS_INTERVAL / SLIDE_DURATION) * 100;
      
      if (progress >= 100) {
        progress = 0;
        next();
      }
    }, PROGRESS_INTERVAL);
  }

  function stopAutoPlay() {
    clearInterval(interval);
  }

  function next() {
    previousIndex = currentIndex;
    currentIndex = (currentIndex + 1) % slides.length;
    progress = 0;
    startAutoPlay();
  }

  function prev() {
    previousIndex = currentIndex;
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    progress = 0;
    startAutoPlay();
  }

  function goTo(index) {
    if (index === currentIndex) return;
    previousIndex = currentIndex;
    currentIndex = index;
    progress = 0;
    startAutoPlay();
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      prev();
    } else if (event.key === 'ArrowRight') {
      next();
    }
  }

  onMount(() => {
    startAutoPlay();
  });

  onDestroy(() => {
    stopAutoPlay();
  });
</script>

<section 
  class="relative {fullscreen ? 'h-screen' : 'h-[500px]'} w-full overflow-hidden bg-black group"
  aria-label="图片轮播"
>
  {#each slides as slide, i (slide.id)}
    <a 
      href="/articles/{slide.id}"
      class="absolute inset-0 transition-all duration-1000 ease-out cursor-pointer"
      style="
        opacity: {i === currentIndex ? '1' : '0'};
        transform: scale({i === currentIndex ? '1' : '1.1'});
        pointer-events: {i === currentIndex ? 'auto' : 'none'};
      "
      aria-label="查看文章：{slide.title}"
    >
      <!-- 背景图片层 -->
      <img 
        src={slide.image} 
        alt={slide.title}
        class="h-full w-full object-cover"
      />

      <!-- 内容层 -->
      <div class="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div class="relative w-full px-8 pb-24 pt-32 sm:px-12 md:px-16">
          <div class="mx-auto max-w-6xl">
            {#if i === currentIndex}
              <div class="space-y-6" in:fly="{{ y: 40, duration: 1000, delay: 200 }}">
                {#if slide.publishDate}
                  <p class="text-sm font-medium text-lime-400">{slide.publishDate}</p>
                {/if}
                <h2 class="max-w-4xl text-4xl font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl line-clamp-2 py-1">
                  {slide.title}
                </h2>
                <p class="max-w-2xl text-lg text-zinc-300 sm:text-xl md:text-2xl line-clamp-2">
                  {slide.description}
                </p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </a>
  {/each}

  <!-- 导航按钮 -->
  <button 
    class="group absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:left-8 opacity-0 group-hover:opacity-100"
    on:click|preventDefault={prev}
    aria-label="上一张"
    on:keydown={handleKeydown}
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <button 
    class="group absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:right-8 opacity-0 group-hover:opacity-100"
    on:click|preventDefault={next}
    aria-label="下一张"
    on:keydown={handleKeydown}
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>

  <!-- 指示器 -->
  <div class="absolute bottom-12 left-1/2 flex -translate-x-1/2 space-x-3" role="tablist">
    {#each slides as slide, i}
      <button
        class="group relative h-2 overflow-hidden rounded-full transition-all {i === currentIndex ? 'w-16' : 'w-2'} bg-white/20"
        role="tab"
        aria-selected={i === currentIndex}
        aria-label="跳转到第 {i + 1} 张图片"
        on:click|preventDefault={() => goTo(i)}
        on:keydown={(e) => e.key === 'Enter' && goTo(i)}
      >
        {#if i === currentIndex}
          <div 
            class="absolute inset-0 bg-white/60"
            style="transform: scaleX({progress / 100}); transform-origin: left; transition: transform 60ms linear;"
          ></div>
        {/if}
      </button>
    {/each}
  </div>
</section> 