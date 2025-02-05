<script lang="ts">
  import FriendCard from '$lib/components/FriendCard.svelte';
  import type { User } from '$lib/types/user';

  export let data: {
    users: User[];
    total: number;
  };
</script>

<div class="container mx-auto max-w-6xl px-4 py-12">
  <div class="space-y-12">
    <div class="text-center space-y-4">
      <h1 class="text-5xl font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100 bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-600 dark:from-zinc-100 dark:to-zinc-300">
        社区成员
      </h1>
      <p class="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
        认识有趣的人，发现精彩的故事
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each data.users as user (user.id)}
        <div class="flex justify-center">
          <div class="w-full max-w-sm">
            <FriendCard {user} />
          </div>
        </div>
      {/each}
    </div>

    {#if data.users.length === 0}
      <div class="text-center py-12">
        <p class="text-stone-600 dark:text-stone-400">暂无成员</p>
      </div>
    {/if}
  </div>
</div> 