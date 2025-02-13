<script>
    import { onMount, afterUpdate, onDestroy, tick } from 'svelte';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import ArticleReactions from '$lib/components/ArticleReactions.svelte';
    import CommentList from '$lib/components/CommentList.svelte';
    import { auth } from '$lib/stores/auth';
    import UserCard from '$lib/components/UserCard.svelte';
    import { env } from '$env/dynamic/public';
    import { getImageUrl } from '$lib/utils/api';
    import { t, locale } from '$lib/i18n';
    import { setPageTitle } from '$lib/utils/title';
    import Loading from '$lib/components/Loading.svelte';
  
    const API_URL = env.PUBLIC_API_URL;
    
    let article = null;
    let loading = true;
    let error = '';
    let tocItems = [];
    let activeHeadingId = '';
    let observer = null;
    let isScrolled = false;
    let showUserCard = false;
    let userCardPosition = { x: 0, y: 0 };
    let isMobile = false;
  
    function generateHeadingId(text) {
      return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .replace(/(-{2,})/g, '-');
    }
  
    function handleTocClick(e, id) {
      e.preventDefault();
      const element = document.getElementById(id);
      if (!element) return;
  
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  
      window.history.pushState({}, '', `#${id}`);
    }
  
    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    }
  
    function parseToc(content) {
      console.log('Start parsing TOC, HTML content length:', content.length);
      console.log('Heading tags in HTML content:', content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g));
  
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const headings = doc.querySelectorAll('h1, h2');
      console.log('Found heading elements:', headings.length);
  
      headings.forEach((heading, index) => {
        console.log(`Heading ${index + 1}:`, {
          tagName: heading.tagName,
          id: heading.id,
          innerHTML: heading.innerHTML,
          outerHTML: heading.outerHTML
        });
      });
  
      const items = Array.from(headings).map(heading => {
        const text = stripHtml((heading.innerHTML || '').trim());
        const id = heading.id || generateHeadingId(text);
        const item = {
          id,
          text,
          level: parseInt(heading.tagName[1]),
          isActive: false
        };
        console.log('Parsed heading:', item);
        return item;
      });
  
      console.log('TOC parsing completed:', items);
      return items;
    }
  
    function handleContentInteraction(e) {
      if (e.type === 'keydown' && e.key !== 'Enter') {
        return;
      }
      const target = e.target;
      const heading = target.closest('h1, h2');
      if (heading && heading.id) {
        e.preventDefault();
        const element = document.getElementById(heading.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  
    function handleHeadingClick(e) {
      const target = e.target;
      const heading = target.closest('h1, h2');
      if (heading && heading.id) {
        e.preventDefault();
        const element = document.getElementById(heading.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  
    function processArticleContent(content) {
      return content.replace(
        /<(h[12])([^>]*)>(.*?)<\/\1>/g,
        (match, tag, attrs, text) => {
          const cleanText = stripHtml(text.trim());
          const cleanAttrs = attrs.replace(/\s+id\s*=\s*(['"]).*?\1/, '');
          const id = generateHeadingId(cleanText);
          const tocItem = tocItems.find(item => item.text === cleanText);
          const finalId = tocItem?.id || id;
          return `<${tag}${cleanAttrs} id="${finalId}" class="heading-anchor" tabindex="0" role="link" aria-label="${$t('article.jumpToSection', { section: cleanText })}">${text}</${tag}>`;
        }
      );
    }
  
    function scrollToHeading(id) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  
    function initializeObserver() {
      if (!article?.htmlContent) return;
  
      observer?.disconnect();
  
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              activeHeadingId = entry.target.id;
              tocItems = tocItems.map(item => ({
                ...item,
                isActive: item.id === activeHeadingId
              }));
            }
          });
        },
        {
          rootMargin: '-20% 0px -80% 0px',
          threshold: 0
        }
      );
  
      const headings = document.querySelectorAll('.article-content h1[id], .article-content h2[id]');
      headings.forEach(heading => observer?.observe(heading));
    }
  
    async function fetchArticle(id) {
      loading = true;
      error = '';
      try {
        const response = await fetch(`${API_URL}/api/articles/${id}`, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) {
          throw new Error($t('error.fetchArticleDetailFailed'));
        }
        const data = await response.json();
        
        // Process image URLs
        article = {
          ...data,
          imageUrl: getImageUrl(data.imageUrl),
          author: {
            ...data.author,
            avatarUrl: getImageUrl(data.author.avatarUrl)
          }
        };
  
        console.log('Retrieved article data:', {
          title: article?.title,
          hasHtmlContent: !!article?.htmlContent,
          htmlContentLength: article?.htmlContent?.length,
          imageUrl: article?.imageUrl,
          authorAvatar: article?.author?.avatarUrl
        });
  
        if (article?.htmlContent) {
          tocItems = parseToc(article.htmlContent);
          await tick();
  
          const articleContent = document.querySelector('.article-content');
          if (articleContent) {
            console.log('文章内容区域中的标题元素:', {
              html: articleContent.innerHTML.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g),
              headings: Array.from(articleContent.querySelectorAll('h1, h2')).map(h => ({
                id: h.id,
                text: h.textContent,
                outerHTML: h.outerHTML
              }))
            });
          }
  
          console.log('目录项生成后的DOM:', {
            tocItems: tocItems.map(item => ({
              id: item.id,
              elementExists: !!document.getElementById(item.id),
              element: document.getElementById(item.id)?.outerHTML
            }))
          });
        }
      } catch (e) {
        console.error('Error fetching article detail:', e);
        error = e instanceof Error ? e.message : $t('error.fetchArticleDetailFailed');
      } finally {
        loading = false;
      }
    }
  
    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString($locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  
    function handleScroll() {
      isScrolled = window.scrollY > 200;
    }
  
    function getTimeAgo(dateString) {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
      if (diffInSeconds < 60) {
        return $t('time.justNow');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return $t('time.minutesAgo', { minutes });
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return $t('time.hoursAgo', { hours });
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return $t('time.daysAgo', { days });
      } else {
        return formatDate(dateString);
      }
    }
  
    function handleResize() {
      isMobile = browser && window.innerWidth < 768;
    }
  
    function handleAuthorClick(event) {
      event.stopPropagation();
      showUserCard = !showUserCard;
    }
  
    function handleBackgroundClick() {
      showUserCard = false;
    }
  
    function handleWindowEvents(event) {
      if (event instanceof MouseEvent) {
        handleContentInteraction(event);
      } else if (event instanceof KeyboardEvent) {
        handleContentInteraction(event);
      }
    }
  
    onMount(async () => {
      const id = $page.params.id;
      if (id) {
        await fetchArticle(id);
        await tick();
        setTimeout(() => {
          initializeObserver();
        }, 200);
      }
  
      window.addEventListener('scroll', handleScroll);
      handleResize();
      window.addEventListener('resize', handleResize);
    });
  
    onDestroy(() => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    });
  
    // 监听内容变化
    $: {
      if (article?.title) {
        setPageTitle(article.title);
      }
    }
  </script>
  
  <style lang="postcss">
    .article-container {
      position: relative;
      max-width: 800px;
      margin: 0 auto;
      padding: 0.5rem;
      @media (min-width: 640px) {
        padding: 1rem;
      }
      @media (min-width: 768px) {
        padding: 2rem;
      }
    }
  
    .cover-container {
      position: relative;
      width: 100%;
      aspect-ratio: 240/135;
      margin-bottom: 2rem;
      @media (min-width: 640px) {
        width: 108%;
        margin-left: -4%;
      }
      @media (min-width: 768px) {
        width: 112%;
        margin-left: -6%;
      }
      @media (min-width: 1024px) {
        width: 120%;
        margin-left: -10%;
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
      border-radius: 0.75rem;
      @media (min-width: 640px) {
        border-radius: 1rem;
      }
      @media (min-width: 768px) {
        border-radius: 1.25rem;
      }
      @media (min-width: 1024px) {
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
  
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 0.75rem;
      position: relative;
      z-index: 1;
      @media (min-width: 640px) {
        border-radius: 1rem;
      }
      @media (min-width: 768px) {
        border-radius: 1.25rem;
      }
      @media (min-width: 1024px) {
        border-radius: 1.5rem;
      }
    }
  
    :global(.dark) .cover-image {
      &:hover {
        border-color: rgb(63 63 70);
      }
    }
  
    .article-content {
      line-height: 1.8;
      font-size: 1.1rem;
    }
  
    .article-meta {
      display: flex;
      align-items: stretch;
      margin: 2rem 0;
      font-size: 0.875rem;
      color: rgb(161 161 170);
      height: 40px;
      width: 100%;
    }
  
    .meta-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      margin-left: 1rem;
    }
  
    .meta-text {
      display: flex;
      align-items: center;
      height: 100%;
    }
  
    .divider {
      width: 1px;
      height: 100%;
      background: linear-gradient(180deg, 
        rgba(161, 161, 170, 0) 0%,
        rgba(161, 161, 170, 0.4) 20%,
        rgba(161, 161, 170, 0.4) 80%,
        rgba(161, 161, 170, 0) 100%
      );
    }
  
    .toc {
      position: absolute;
      width: 160px;
      height: fit-content;
      display: none;
      transition: all 0.3s ease;
      @media (min-width: 1024px) {
        display: block;
        position: fixed;
        left: 50%;
        transform: translateX(calc(-50% - 480px));
        margin-left: -40px;  /* 给目录一些额外的间距 */
      }
  
      &[data-scrolled="true"] {
        top: 2rem;
        padding-top: 5rem;
      }
  
      &:not([data-scrolled="true"]) {
        top: 16rem;
      }
    }
  
    .toc-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      &:hover .toc-item:not(:hover) {
        opacity: 0.5;
      }
    }
  
    .toc-item {
      display: block;
      font-size: 12px;
      line-height: 18px;
      font-weight: 500;
      color: rgb(161 161 170);
      text-decoration: none;
      transition: all 0.2s ease;
  
      &[data-level="2"] {
        padding-left: 0;
      }
  
      &[data-level="3"] {
        padding-left: 4px;
      }
  
      &[data-level="4"] {
        padding-left: 8px;
      }
  
      &[data-active="true"] {
        color: rgb(24 24 27);
      }
  
      @media (hover: hover) {
        &:hover {
          color: rgb(24 24 27);
        }
      }
    }
  
    :global(.dark) .toc-item {
      color: rgb(113 113 122);
  
      &[data-active="true"] {
        color: rgb(244 244 245);
      }
  
      @media (hover: hover) {
        &:hover {
          color: rgb(161 161 170);
        }
      }
    }
  
    :global(.dark) .toc-list:hover .toc-item:not(:hover) {
      color: rgb(82 82 91);
    }
  
    @media (max-width: 1280px) {
      .toc {
        display: none;
      }
    }
  
    :global(.heading-anchor) {
      cursor: pointer;
      scroll-margin-top: 2rem;
      transition: color 0.2s ease;
  
      &:hover {
        color: #65a30d;
      }
    }
  
    :global(.dark) {
      :global(.heading-anchor) {
        &:hover {
          color: #65a30d;
        }
      }
    }
  
    :global(.article-reactions) {
      position: fixed;
      right: 2rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10;
  
      @media (min-width: 1024px) {
        right: max(2rem, calc((100vw - 1200px) / 2 + 2rem));
      }
  
      &[data-scrolled="true"] {
        top: 2rem;
      }
  
      &:not([data-scrolled="true"]) {
        top: 16rem;
      }
  
      @media (max-width: 1023px) {
        display: none;
      }
    }
  </style>
  
  <div class="mx-auto max-w-4xl px-2 sm:px-3 md:px-4 py-8">
    {#if loading}
      <Loading fullscreen={true} />
    {:else if error}
      <div class="py-16 text-center text-red-500">{error}</div>
    {:else if article}
      <article class="relative">
        {#if article && tocItems.length > 0}
          <nav 
            class="toc"
            data-scrolled={isScrolled}
            aria-label={$t('article.tableOfContents')}
          >
            <div class="toc-list">
              {#each tocItems as item}
                <a
                  href="#{item.id}"
                  class="toc-item"
                  data-level={item.level}
                  data-active={item.isActive}
                  on:click|preventDefault={(e) => handleTocClick(e, item.id)}
                  aria-current={item.isActive ? 'true' : undefined}
                >
                  {item.text}
                </a>
              {/each}
            </div>
          </nav>
        {/if}
  
        <aside class="article-reactions" data-scrolled={isScrolled}>
          <ArticleReactions
            articleId={article.id}
            {isScrolled}
          />
        </aside>
  
        <div class="article-container">
          {#if article.imageUrl}
            <div class="cover-container">
              <div 
                class="blur-background" 
                style="background-image: url({article.imageUrl})"
              ></div>
              <img
                src={article.imageUrl}
                alt={article.title}
                class="cover-image"
              />
            </div>
          {/if}
          
          <h1 class="text-5xl font-bold mb-8 text-zinc-800 dark:text-zinc-100">
            {article.title}
          </h1>
  
          <div class="article-meta">
            <div class="relative">
              <button
                class="block rounded-full overflow-hidden hover:ring-2 hover:ring-offset-2 hover:ring-lime-500/50 dark:hover:ring-lime-400/50 dark:hover:ring-offset-zinc-900 transition-all"
                on:click={handleAuthorClick}
              >
                <img
                  src={article.author.avatarUrl || `${env.PUBLIC_API_URL}/uploads/avatars/default.png`}
                  alt={article.author.username}
                  class="w-10 h-10 object-cover"
                />
              </button>

              <UserCard
                userId={article?.author?.id}
                username={article?.author?.username}
                avatarUrl={article?.author?.avatarUrl}
                realName={article?.author?.realName}
                bio={article?.author?.bio}
                dateOfBirth={article?.author?.dateOfBirth}
                bind:isOpen={showUserCard}
                on:close={() => showUserCard = false}
              />
            </div>
            <div class="meta-item">
              <span class="meta-text text-zinc-500 uppercase">
                {article.author.username}
              </span>
              <div class="divider"></div>
              <span class="meta-text">{getTimeAgo(article.createdAt)}</span>
              <div class="divider"></div>
              <span class="meta-text">{article.viewCount} {$t('article.views')}</span>
              <div class="hidden md:contents">
                <div class="divider"></div>
                <span class="meta-text">{article.commentCount} {$t('article.comments')}</span>
              </div>
              <div class="hidden md:contents">
                {#if article.tags && article.tags.length > 0}
                  <div class="divider"></div>
                  <span class="meta-text">{article.tags[0].name}</span>
                  {#if article.tags.length > 1}
                    <div class="divider"></div>
                    <span class="meta-text">{article.tags[1].name}</span>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
  
          <!-- 文章内容 -->
          <div 
            class="article-content prose dark:prose-invert max-w-none" 
            role="article"
          >
            {#if article?.htmlContent}
              {@html processArticleContent(article.htmlContent)}
            {/if}
          </div>
  
          <div class="mt-16">
            <CommentList 
              articleId={article.id} 
              user={$auth.user} 
              isAuthor={$auth.user?.id ? parseInt($auth.user.id) === article.author.id : false} 
              isAdmin={$auth.user?.role === 'admin'} 
            />
          </div>
        </div>
      </article>
    {/if}
  </div>
  
  <svelte:window 
    on:click={handleWindowEvents} 
    on:keydown={handleWindowEvents} 
  /> 