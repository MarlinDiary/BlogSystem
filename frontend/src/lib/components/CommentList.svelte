<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import CommentInput from './CommentInput.svelte';
  import { env } from '$env/dynamic/public';

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

  export let articleId: number;
  export let user: User | null = null;

  let comments: Comment[] = [];
  let isLoading = true;

  let avatarTimestamp = Date.now();

  // 获取头像 URL
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
        // 一级评论按时间从新到旧排序
        comments = rawComments
          .sort((a: Comment, b: Comment) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((comment: Comment) => ({
            ...comment,
            // 如果有子评论，按时间从旧到新排序
            children: comment.children?.sort((a: Comment, b: Comment) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          }));
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
      // 一级评论添加到顶部
      comments = [{ ...newComment, children: [] }, ...comments];
    } else {
      comments = comments.map(comment => {
        if (comment.id === newComment.parentId) {
          const updatedChildren = [...(comment.children || []), { ...newComment }];
          // 子评论按时间从旧到新排序
          updatedChildren.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return {
            ...comment,
            children: updatedChildren
          };
        }
        return comment;
      });
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
    <div class="space-y-4">
      {#each comments as comment (comment.id)}
        <div
          transition:fade
          class="rounded-lg bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-zinc-800/80"
        >
          <div class="flex gap-3">
            {#key comment.user.id}
            <img
              src={getAvatarUrl(comment.user.id)}
              alt={comment.user.username}
              class="h-10 w-10 rounded-full"
            />
            {/key}
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-zinc-900 dark:text-zinc-100">
                  {comment.user.username}
                </span>
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <div class="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
                {comment.content}
              </div>
              
              {#if comment.children && comment.children.length > 0}
                <div class="mt-4 space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/50">
                  {#each comment.children as reply (reply.id)}
                    <div class="flex gap-3">
                      {#key reply.user.id}
                      <img
                        src={getAvatarUrl(reply.user.id)}
                        alt={reply.user.username}
                        class="h-8 w-8 rounded-full"
                      />
                      {/key}
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-zinc-900 dark:text-zinc-100">
                            {reply.user.username}
                          </span>
                          <span class="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div class="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
                          {reply.content}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
              
              {#if user}
                <div class="mt-4">
                  <CommentInput
                    {articleId}
                    {user}
                    parentId={comment.id}
                    on:commentAdded={handleCommentAdded}
                  />
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div> 