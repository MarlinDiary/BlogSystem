<script>
  import { enhance } from '$app/forms';
  import { fade, scale } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  import { auth } from '../stores/auth';
  import AuthModal from './AuthModal.svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import { env } from '$env/dynamic/public';

  export let articleId;
  export let user = null;
  export let parentId = null;

  let content = '';
  let isPreview = false;
  let isSubmitting = false;
  let lastTextareaHeight = '24px'; // 记住textarea的高度
  const MAX_LENGTH = 1000;
  let avatarTimestamp = Date.now();
  let showAuthModal = false;
  let authMode = 'login';

  // 鼠标位置状态
  let mouseX = 0;
  let mouseY = 0;

  // 获取头像 URL
  function getAvatarUrl(userId) {
    if (!userId) return '/uploads/avatars/default.png';
    const url = `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
    return url;
  }

  function handleMouseMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX = event.clientX - bounds.left;
    mouseY = event.clientY - bounds.top;
  }

  const dispatch = createEventDispatcher();

  function handleImageError(event) {
    const img = event.target;
    img.src = '/uploads/avatars/default.png';
  }

  async function handleSubmit() {
    if (!content.trim() || isSubmitting) return;
    
    isSubmitting = true;
    try {
      const response = await fetch(`${env.PUBLIC_API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          articleId,
          content: content.trim(),
          parentId
        })
      });

      if (response.ok) {
        const newComment = await response.json();
        dispatch('commentAdded', newComment);
        content = '';
        isPreview = false;
      } else {
        const error = await response.json();
        console.error('评论发送失败:', error);
      }
    } catch (error) {
      console.error('评论发送失败:', error);
    } finally {
      isSubmitting = false;
    }
  }

  function adjustHeight(e) {
    const textarea = e.target;
    const lineHeight = 24;
    const maxHeight = 200;
    
    // 计算实际需要的行数（向上取整）
    const lines = Math.ceil(textarea.scrollHeight / lineHeight);
    // 设置为对应行数的高度
    const newHeight = Math.min(lines * lineHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    lastTextareaHeight = `${newHeight}px`; // 保存当前高度
  }

  function handleAuth() {
    showAuthModal = true;
    authMode = 'login';
  }

  function handleCloseModal() {
    showAuthModal = false;
  }

  $: background = `radial-gradient(320px circle at ${mouseX}px ${mouseY}px, var(--spotlight-color) 0%, transparent 85%)`;
</script>

<div 
  class="group relative w-full rounded-2xl bg-gradient-to-b from-zinc-50/70 to-white/90 p-4 md:p-6 shadow-[0_2px_40px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_20px_-2px_rgba(0,0,0,0.2)] ring-1 ring-zinc-900/5 backdrop-blur-md dark:from-zinc-900/70 dark:to-zinc-800/90 dark:ring-zinc-100/10"
  style="--spotlight-color: rgb(236 252 203 / 0.25);"
  on:mousemove={handleMouseMove}
  role="region"
  aria-label="评论输入区域"
>
  <div
    class="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    style="background: {background};"
    aria-hidden="true"
  ></div>

  {#if !user}
    <div class="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
      请<button on:click={handleAuth} class="text-primary-600 hover:underline dark:text-primary-400">登录</button>后发表评论
    </div>
  {:else}
    <div class="relative flex space-x-4">
      <div class="h-10 w-10 shrink-0">
        {#key user?.id}
        <img
          src={getAvatarUrl(user?.id)}
          alt={user?.username}
          class="h-10 w-10 select-none rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
          loading="lazy"
          on:error={handleImageError}
        />
        {/key}
      </div>

      <div class="ml-2 flex-1 shrink-0 md:ml-4">
        {#if isPreview}
          <div 
            class="comment__message flex-1 shrink-0 px-2 py-1 text-sm text-zinc-800 dark:text-zinc-200"
            style="min-height: {lastTextareaHeight};"
          >
            <MarkdownRenderer {content} />
          </div>
        {:else}
          <textarea
            bind:value={content}
            placeholder="说点什么吧，万一火不了呢..."
            class="block w-full shrink-0 resize-none border-0 bg-transparent p-0 text-sm leading-6 text-zinc-800 placeholder-zinc-400 outline-none transition-[height] will-change-[height] focus:outline-none focus:ring-0 dark:text-zinc-200 dark:placeholder-zinc-500"
            maxlength={MAX_LENGTH}
            on:input={adjustHeight}
            style="height: {lastTextareaHeight};"
          ></textarea>
        {/if}
        
        <footer class="-mb-1.5 mt-3 flex h-5 w-full items-center justify-between">
          <span class="flex-1 shrink-0 select-none text-[10px] text-zinc-500 transition-opacity {content.length > 0 ? 'opacity-100' : 'opacity-0'}">
            支持 <b>Markdown</b> 与 
            <a 
              href="https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
              class="font-bold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GFM
            </a>
          </span>

          {#if content.length > 0}
            <aside 
              class="flex select-none items-center gap-2.5"
              transition:scale={{duration: 200, start: 0.96}}
            >
              <span class="font-mono text-[10px] {content.length > MAX_LENGTH ? 'text-red-500' : 'text-zinc-500'}">
                {content.length}/{MAX_LENGTH}
              </span>

              <button
                type="button"
                class="appearance-none transform transition-transform hover:scale-105 active:scale-95"
                on:click={() => isPreview = !isPreview}
                aria-label={isPreview ? '关闭预览' : '预览评论'}
              >
                <svg class="h-5 w-5 text-zinc-800 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  {#if isPreview}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  {:else}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  {/if}
                </svg>
              </button>

              <button
                type="button"
                class="appearance-none transform transition-transform hover:scale-105 active:scale-95"
                on:click={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                aria-label={isSubmitting ? '发送中...' : '发送评论'}
              >
                <svg class="h-5 w-5 text-zinc-800 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </aside>
          {/if}
        </footer>
      </div>
    </div>
  {/if}
</div>

<AuthModal 
  isOpen={showAuthModal} 
  mode={authMode}
  on:close={handleCloseModal}
/>

<style>
  :global(.dark) .comment__message {
    color: rgb(229 231 235);
  }

  textarea {
    height: 24px;           /* 初始一行高度 */
    line-height: 24px;      /* 确保行高一致 */
    max-height: 200px;
    overflow-y: hidden;     /* 隐藏滚动条 */
    resize: none;           /* 禁止手动调整大小 */
    padding: 0;             /* 去除内边距 */
    box-sizing: border-box; /* 包含边框在内的盒模型 */
  }
</style> 