<script>
  import { enhance } from '$app/forms';
  import { fade, scale } from 'svelte/transition';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { auth } from '../stores/auth';
  import AuthModal from './AuthModal.svelte';
  import { env } from '$env/dynamic/public';
  import { t } from '$lib/i18n';

  export let articleId;
  export let user = null;
  export let parentId = null;

  let content = '';
  let isSubmitting = false;
  let lastTextareaHeight = '24px'; // 记住textarea的高度
  const MAX_LENGTH = 1000;
  let avatarTimestamp = Date.now();
  let showAuthModal = false;
  let authMode = 'login';

  // 鼠标位置状态
  let mouseX = 0;
  let mouseY = 0;

  let hiddenDiv;

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
        lastTextareaHeight = '28px';
      } else {
        const error = await response.json();
        console.error($t('comment.sendFailed'), error);
      }
    } catch (error) {
      console.error($t('comment.sendFailed'), error);
    } finally {
      isSubmitting = false;
    }
  }

  function adjustHeight(e) {
    const textarea = e.target;
    const lineHeight = 28;
    const maxHeight = 200;
    
    if (!hiddenDiv) {
      hiddenDiv = document.createElement('div');
      hiddenDiv.style.cssText = `
        position: absolute;
        top: -9999px;
        width: ${textarea.clientWidth}px;
        font-size: ${getComputedStyle(textarea).fontSize};
        line-height: ${lineHeight}px;
        white-space: pre-wrap;
        word-wrap: break-word;
        visibility: hidden;
      `;
      document.body.appendChild(hiddenDiv);
    }

    hiddenDiv.textContent = textarea.value + '\n';
    const newHeight = Math.min(Math.max(hiddenDiv.clientHeight, lineHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    lastTextareaHeight = `${newHeight}px`;
  }

  onDestroy(() => {
    if (hiddenDiv) {
      hiddenDiv.remove();
    }
  });

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
  aria-label={$t('comment.inputArea')}
>
  <div
    class="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    style="background: {background};"
    aria-hidden="true"
  ></div>

  {#if !user}
    <div class="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
      {$t('comment.loginToComment')}
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
        <textarea
          bind:value={content}
          placeholder={$t('comment.placeholder')}
          class="block w-full shrink-0 resize-none border-0 bg-transparent p-0 text-base leading-7 text-zinc-800 placeholder-zinc-400 outline-none transition-[height] will-change-[height] focus:outline-none focus:ring-0 dark:text-zinc-200 dark:placeholder-zinc-500"
          maxlength={MAX_LENGTH}
          on:input={adjustHeight}
          style="height: {lastTextareaHeight};"
        ></textarea>
        
        <footer class="-mb-1.5 mt-3 flex h-5 w-full items-center justify-between">
          <span class="flex-1 shrink-0 select-none text-[10px] text-zinc-500 transition-opacity {content.length > 0 ? 'opacity-100' : 'opacity-0'}">
            Made By <b>Mia</b> & <b>Love</b>
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
                on:click={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                aria-label={isSubmitting ? $t('comment.sending') : $t('comment.send')}
              >
                <svg class="h-5 w-5 text-zinc-800 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
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
  textarea {
    height: 28px;           /* 初始一行高度 */
    line-height: 28px;      /* 确保行高一致 */
    max-height: 200px;
    overflow-y: hidden;     /* 隐藏滚动条 */
    resize: none;           /* 禁止手动调整大小 */
    padding: 0;             /* 去除内边距 */
    box-sizing: border-box; /* 包含边框在内的盒模型 */
  }
</style> 