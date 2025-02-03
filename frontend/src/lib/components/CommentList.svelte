<style>
  [contenteditable="true"]:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    cursor: text;
  }

  .comment__message {
    font-size: 13px;
    line-height: 1.5;
  }

  [contenteditable="true"].comment__message {
    min-height: 1.5rem;
    outline: none;
  }

  /* 添加回复按钮的基础样式 */
  .reply-button {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease-in-out;
  }

  .reply-button:hover {
    background: rgba(0, 0, 0, 0.6);
  }

  .timeline-line {
    width: 0.125rem;          /* 2px */
    background: rgb(228 228 231 / 0.4);  /* zinc-200 with 50% opacity */
    border-radius: 0.25rem;   /* 4px */
    margin-left: -1px;
    position: absolute;
    top: 0;                   
    bottom: -2rem;            
    left: 1.25rem;
  }

  /* 暗色模式 */
  :global(.dark) .timeline-line {
    background: rgb(39 39 42 / 0.4);  /* zinc-800 with 50% opacity */
  }

  .timeline-container {
    position: relative;
    padding-top: 0;
  }

  /* 移除通用的last-child规则，改用更具体的选择器 */
  /* 只在一级评论列表中的最后一个评论隐藏连线 */
  .space-y-4 > .timeline-container:last-child > .timeline-line {
    display: none;
  }

  /* 第一个评论的特殊处理 */
  .timeline-container:first-child .timeline-line {
    top: 1.25rem;
  }

  /* 修改评论列表的间距 */
  :global(.space-y-4 > :not([hidden]) ~ :not([hidden])) {
    --tw-space-y-reverse: 0;
    margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
    margin-bottom: calc(1rem * var(--tw-space-y-reverse));
  }

  /* 回复输入框的间距 */
  .temp-reply-input {
    margin-top: 1rem;
    margin-bottom: 2rem;  /* 增加底部间距 */
    position: relative;
    z-index: 1;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import CommentInput from './CommentInput.svelte';
  import { env } from '$env/dynamic/public';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  interface User {
    id: string;
    username: string;
    realName: string;
    dateOfBirth: string;
    bio?: string;
    createdAt: string;
    avatarUrl?: string;
  }

  interface Comment {
    id: number;
    content: string;
    createdAt: string;
    parentId: number | null;
    user: User;
    children?: Comment[];
  }

  interface NewComment {
    id: number;
    content: string;
    createdAt: string;
    parentId: number | null;
    user: User;
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes} 分钟前`;
    } else if (hours < 24) {
      return `${hours} 小时前`;
    } else if (days < 30) {
      return `${days} 天前`;
    } else if (months < 12) {
      return `${months} 个月前`;
    } else {
      return `${years} 年前`;
    }
  }

  export let articleId: number;
  export let user: User | null = null;

  let comments: Comment[] = [];
  let isLoading = true;
  let avatarTimestamp = Date.now();
  let replyingToId: number | null = null;
  let tempReplyContent = '';
  let editableRef: HTMLDivElement;
  let currentKeydownHandler: ((e: Event) => void) | null = null;

  function getAvatarUrl(userId: string | null | undefined): string {
    if (!userId) return '/uploads/avatars/default.png';
    return `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
  }

  async function loadComments() {
    try {
      const response = await fetch(`/api/comments/article/${articleId}`);
      if (response.ok) {
        const rawComments = await response.json();
        // 递归排序所有层级的评论
        const sortComments = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.children?.length) {
              return {
                ...comment,
                children: sortComments(comment.children)
              };
            }
            return comment;
          }).sort((a: Comment, b: Comment) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        };
        
        comments = sortComments(rawComments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleCommentAdded(event: CustomEvent<NewComment>) {
    const newComment = event.detail;
    if (newComment.parentId === null) {
      comments = [{ ...newComment, children: [] }, ...comments];
    } else {
      // 如果是回复评论，需要找到父评论并添加到其 children 中
      const updateCommentsWithNewReply = (items: Comment[]): Comment[] => {
        return items.map(item => {
          if (item.id === newComment.parentId) {
            return {
              ...item,
              children: [{ ...newComment, children: [] }, ...(item.children || [])]
            };
          }
          if (item.children?.length) {
            return {
              ...item,
              children: updateCommentsWithNewReply(item.children)
            };
          }
          return item;
        });
      };
      comments = updateCommentsWithNewReply(comments);
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      target.closest('.reply-button') || 
      target.closest('.temp-reply-input')
    ) {
      return;
    }

    const editable = document.querySelector('.temp-reply-content[contenteditable="true"]') as HTMLElement;
    if (editable) {
      const text = editable.textContent?.trim() || '';
      if (text) {
        // 如果有内容，则提交评论
        handleTempReply(event, replyingToId!, text);
      } else {
        // 如果没有内容，则取消评论
        replyingToId = null;
        tempReplyContent = '';
      }
    } else {
      replyingToId = null;
      tempReplyContent = '';
    }
  }

  function handleReplyClick(event: MouseEvent, commentId: number) {
    event.stopPropagation();
    // 如果当前已经在回复这条评论，则取消回复
    if (replyingToId === commentId) {
      replyingToId = null;
      tempReplyContent = '';
      // 移除回车键事件监听
      const editable = document.querySelector('.temp-reply-content[contenteditable="true"]');
      if (editable && currentKeydownHandler) {
        editable.removeEventListener('keydown', currentKeydownHandler);
        currentKeydownHandler = null;
      }
      return;
    }
    
    replyingToId = commentId;
    tempReplyContent = '';
    // 等待 DOM 更新后聚焦
    setTimeout(() => {
      const editable = document.querySelector('.temp-reply-content[contenteditable="true"]') as HTMLElement;
      if (editable) {
        editable.focus();
        // 创建并保存事件处理器
        currentKeydownHandler = (e: Event) => {
          handleReplyKeydown(e as KeyboardEvent);
        };
        // 添加回车键事件监听
        editable.addEventListener('keydown', currentKeydownHandler);
      }
    }, 0);
  }

  function handleReplyKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const editable = event.target as HTMLElement;
      const text = editable.textContent?.trim() || '';
      if (text) {
        handleTempReply(new MouseEvent('click'), replyingToId!, text);
      }
    }
  }

  async function handleTempReply(event: MouseEvent, commentId: number, content: string) {
    event.stopPropagation();
    if (!content.trim()) return;
    
    // 移除回车键事件监听
    const editable = document.querySelector('.temp-reply-content[contenteditable="true"]');
    if (editable && currentKeydownHandler) {
      editable.removeEventListener('keydown', currentKeydownHandler);
      currentKeydownHandler = null;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          articleId,
          content: content.trim(),
          parentId: commentId
        })
      });

      if (response.ok) {
        const newComment = await response.json();
        // 更新评论树
        if (commentId === null) {
          comments = [{ ...newComment, user, children: [] }, ...comments];
        } else {
          comments = comments.map(item => {
            if (item.id === commentId) {
              return {
                ...item,
                children: [{ ...newComment, user, children: [] }, ...(item.children || [])]
              };
            }
            if (item.children?.length) {
              return {
                ...item,
                children: item.children.map(child => {
                  if (child.id === commentId) {
                    return {
                      ...child,
                      children: [{ ...newComment, user, children: [] }, ...(child.children || [])]
                    };
                  }
                  return child;
                })
              };
            }
            return item;
          });
        }
      } else {
        const error = await response.json();
        alert(error.message || '回复发送失败');
      }
    } catch (error) {
      alert('回复发送失败');
    }

    // 清除回复状态
    replyingToId = null;
    tempReplyContent = '';
  }

  onMount(() => {
    loadComments();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="space-y-6">
  <CommentInput {articleId} {user} on:commentAdded={handleCommentAdded} />
  
  {#if isLoading}
    <div class="flex justify-center py-8">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
    </div>
  {:else if comments.length === 0}
    <div class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
      还没有评论，来说两句吧~
    </div>
  {:else}
    <div class="px-4 md:px-6">
      <ul class="space-y-4">
        {#each comments as comment (comment.id)}
          <li class="group relative timeline-container">
            <div class="timeline-line"></div>
            <article class="relative flex gap-4">
              <div class="relative flex-none group/avatar">
                <div class="relative">
                  <img
                    src={getAvatarUrl(comment.user.id)}
                    alt={comment.user.username}
                    class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900 transition-opacity group-hover/avatar:opacity-80"
                    loading="lazy"
                  />
                  <button
                    class="reply-button absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full cursor-pointer"
                    on:click={(e) => handleReplyClick(e, comment.id)}
                    aria-label={`回复 ${comment.user.username} 的评论`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex-1 min-w-0 -mt-1">
                <header class="flex items-center">
                  <div class="flex items-center gap-1 text-[14px]">
                    <span class="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                      {comment.user.username}
                    </span>
                    <time class="select-none text-zinc-400">
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </div>
                </header>

                <div class="comment__message prose-zinc dark:prose-invert text-[13px] [&>p]:m-0 [&>p:first-child]:-mt-1">
                  <MarkdownRenderer content={comment.content} />
                </div>

                {#if replyingToId === comment.id}
                  <div 
                    class="temp-reply-input flex items-start gap-4"
                  >
                    <div class="relative flex-none">
                      <img
                        src={getAvatarUrl(user?.id)}
                        alt={user?.username}
                        class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <header class="flex items-center">
                        <div class="flex items-center gap-1 text-[14px]">
                          <span class="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                            {user?.username}
                          </span>
                          <time class="select-none text-zinc-400">
                            刚刚
                          </time>
                        </div>
                      </header>

                      <div class="relative">
                        <div 
                          class="temp-reply-content comment__message prose-zinc dark:prose-invert text-[13px] [&>p]:m-0 [&>p:first-child]:-mt-1"
                          contenteditable="true"
                          role="textbox"
                          aria-label="回复内容"
                          data-placeholder="写下你的回复..."
                        ></div>
                      </div>
                    </div>
                  </div>
                {/if}

                {#if comment.children && comment.children.length > 0}
                  <ul class="mt-4 space-y-4">
                    {#each comment.children as child (child.id)}
                      <li class="group relative timeline-container">
                        <div class="timeline-line"></div>
                        <article class="relative flex gap-4">
                          <div class="relative flex-none group/avatar">
                            <div class="relative">
                              <img
                                src={getAvatarUrl(child.user.id)}
                                alt={child.user.username}
                                class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900 transition-opacity group-hover/avatar:opacity-80"
                                loading="lazy"
                              />
                              <button
                                class="reply-button absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full cursor-pointer"
                                on:click={(e) => handleReplyClick(e, child.id)}
                                aria-label={`回复 ${child.user.username} 的评论`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div class="flex-1 min-w-0 -mt-1">
                            <header class="flex items-center">
                              <div class="flex items-center gap-1 text-[14px]">
                                <span class="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                                  {child.user.username}
                                </span>
                                <time class="select-none text-zinc-400">
                                  {formatRelativeTime(child.createdAt)}
                                </time>
                              </div>
                            </header>

                            <div class="comment__message prose-zinc dark:prose-invert text-[13px] [&>p]:m-0 [&>p:first-child]:-mt-1">
                              <MarkdownRenderer content={child.content} />
                            </div>

                            {#if replyingToId === child.id}
                              <div 
                                class="temp-reply-input flex items-start gap-4"
                              >
                                <div class="relative flex-none">
                                  <img
                                    src={getAvatarUrl(user?.id)}
                                    alt={user?.username}
                                    class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                                  />
                                </div>
                                <div class="flex-1 min-w-0">
                                  <header class="flex items-center">
                                    <div class="flex items-center gap-1 text-[14px]">
                                      <span class="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                                        {user?.username}
                                      </span>
                                      <time class="select-none text-zinc-400">
                                        刚刚
                                      </time>
                                    </div>
                                  </header>

                                  <div class="relative">
                                    <div 
                                      class="temp-reply-content comment__message prose-zinc dark:prose-invert text-[13px] [&>p]:m-0 [&>p:first-child]:-mt-1"
                                      contenteditable="true"
                                      role="textbox"
                                      aria-label="回复内容"
                                      data-placeholder="写下你的回复..."
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            {/if}

                            {#if child.children && child.children.length > 0}
                              <ul class="mt-4 space-y-4">
                                {#each child.children as grandChild (grandChild.id)}
                                  <li class="group relative timeline-container">
                                    <div class="timeline-line"></div>
                                    <article class="relative flex gap-4">
                                      <div class="relative flex-none">
                                        <img
                                          src={getAvatarUrl(grandChild.user.id)}
                                          alt={grandChild.user.username}
                                          class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                                          loading="lazy"
                                        />
                                      </div>

                                      <div class="flex-1 min-w-0 -mt-1">
                                        <header class="flex items-center">
                                          <div class="flex items-center gap-1 text-[14px]">
                                            <span class="font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                                              {grandChild.user.username}
                                            </span>
                                            <time class="select-none text-zinc-400">
                                              {formatRelativeTime(grandChild.createdAt)}
                                            </time>
                                          </div>
                                        </header>

                                        <div class="comment__message prose-zinc dark:prose-invert text-[13px] [&>p]:m-0 [&>p:first-child]:-mt-1">
                                          <MarkdownRenderer content={grandChild.content} />
                                        </div>
                                      </div>
                                    </article>
                                  </li>
                                {/each}
                              </ul>
                            {/if}
                          </div>
                        </article>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </article>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div> 