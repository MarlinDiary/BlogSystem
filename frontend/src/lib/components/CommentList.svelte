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

  function getAvatarUrl(userId: string | null | undefined): string {
    if (!userId) return '/uploads/avatars/default.png';
    const url = `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
    return url;
  }

  async function loadComments() {
    try {
      const response = await fetch(`/api/comments/article/${articleId}`);
      if (response.ok) {
        const rawComments = await response.json();
        // 只获取一级评论并按时间从新到旧排序
        comments = rawComments
          .filter((comment: Comment) => comment.parentId === null)
          .sort((a: Comment, b: Comment) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
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
      comments = [newComment, ...comments];
    }
  }

  onMount(loadComments);
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
    <ul class="mt-4 space-y-4 px-4 md:px-6">
      {#each comments as comment, index (comment.id)}
        <li class="group relative" transition:fade>
          {#if index !== comments.length - 1}
            <div 
              class="absolute left-5 top-10 -ml-px w-0.5 h-[calc(100%+0.5rem)] rounded bg-zinc-200 dark:bg-zinc-800"
              aria-hidden="true"
            ></div>
          {/if}

          <article class="relative flex gap-4">
            <div class="relative flex-none">
              {#key comment.user.id}
                <img
                  src={getAvatarUrl(comment.user.id)}
                  alt={comment.user.username}
                  class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                  loading="lazy"
                />
              {/key}
            </div>

            <div class="flex-1 min-w-0 pt-1">
              <header class="mb-1 flex items-center gap-2">
                <div class="flex items-center gap-1 text-[14px]">
                  <span class="font-medium text-zinc-900 dark:text-zinc-100">
                    {comment.user.username}
                  </span>
                  <time class="select-none text-zinc-400">
                    {formatRelativeTime(comment.createdAt)}
                  </time>
                </div>
              </header>

              <div class="comment__message prose-sm prose-zinc dark:prose-invert text-[13px]">
                <MarkdownRenderer content={comment.content} />
              </div>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</div> 