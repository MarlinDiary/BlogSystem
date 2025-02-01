<!-- UserButton.svelte -->
<script lang="ts">
  import UserArrowLeft from './icons/UserArrowLeft.svelte';
  import '../styles/icon.css';
  
  // 这里可以导入你的认证库
  let isLoggedIn = false; // 根据你的认证状态管理
  
  function handleAuth() {
    if (isLoggedIn) {
      // 登出逻辑
      isLoggedIn = false;
    } else {
      // 登录逻辑
      isLoggedIn = true;
    }
  }
</script>

<div class="pointer-events-auto">
  {#if isLoggedIn}
    <button
      class="group flex items-center h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      on:click={handleAuth}
    >
      <img
        src="/logo.png"
        alt="用户头像"
        class="h-9 w-9 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
      />
    </button>
  {:else}
    <button
      class="group flex items-center h-10 rounded-full bg-white/90 px-3 py-2 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      on:click={handleAuth}
    >
      <UserArrowLeft className="h-5 w-5 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:group-hover:stroke-zinc-200" />
    </button>
  {/if}
</div> 