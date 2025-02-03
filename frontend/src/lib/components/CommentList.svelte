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

  function getAvatarUrl(userId: string | null | undefined): string {
    if (!userId) return '/uploads/avatars/default.png';
    return `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
  }

  async function loadComments() {
    try {
      const response = await fetch(`/api/comments/article/${articleId}`);
      if (response.ok) {
        comments = await response.json();
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
              children: [...(item.children || []), { ...newComment, children: [] }]
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
    <div class="px-4 md:px-6">
      <ul class="space-y-4">
        {#each comments as comment (comment.id)}
          <li class="group relative" transition:fade>
            <article 
              class="relative flex gap-4"
              style="margin-left: 0;"
            >
              <div class="relative flex-none">
                <img
                  src={getAvatarUrl(comment.user.id)}
                  alt={comment.user.username}
                  class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                  loading="lazy"
                />
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

                {#if comment.children && comment.children.length > 0}
                  <ul class="mt-4 space-y-4">
                    {#each comment.children as child (child.id)}
                      <li class="group relative" transition:fade>
                        <article 
                          class="relative flex gap-4"
                          style="margin-left: 0;"
                        >
                          <div class="relative flex-none">
                            <img
                              src={getAvatarUrl(child.user.id)}
                              alt={child.user.username}
                              class="h-10 w-10 select-none rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 relative z-10 bg-white dark:bg-zinc-900"
                              loading="lazy"
                            />
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

                            {#if child.children && child.children.length > 0}
                              <ul class="mt-4 space-y-4">
                                {#each child.children as grandChild (grandChild.id)}
                                  <li class="group relative" transition:fade>
                                    <article 
                                      class="relative flex gap-4"
                                      style="margin-left: 0;"
                                    >
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