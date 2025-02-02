<!-- UserButton.svelte -->
<script lang="ts">
  import UserArrowLeft from './icons/UserArrowLeft.svelte';
  import '../styles/icon.css';
  import { auth } from '../stores/auth';
  import AuthModal from './AuthModal.svelte';
  import AccountModal from './AccountModal.svelte';
  import { env } from '$env/dynamic/public';
  
  let showAuthModal = false;
  let showAccountModal = false;
  let authMode: 'login' | 'register' = 'login';
  
  function handleAuth() {
    if (!$auth.isAuthenticated) {
      showAuthModal = true;
      authMode = 'login';
    } else {
      showAccountModal = true;
    }
  }
  
  function handleCloseModal() {
    showAuthModal = false;
    showAccountModal = false;
  }

  // 获取头像 URL
  function getAvatarUrl(userId: number | null | undefined): string {
    if (!userId) return '/logo.png';
    return `${env.PUBLIC_API_URL}/api/users/${userId}/avatar`;
  }

  // 添加时间戳以破坏缓存
  function getAvatarUrlWithTimestamp(url: string): string {
    const timestamp = Date.now();
    return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
  }

  // 获取用户ID（确保是数字类型）
  function getUserId(user: any): number | null {
    if (!user?.id) return null;
    const id = Number(user.id);
    return isNaN(id) ? null : id;
  }
</script>

<div class="pointer-events-auto">
  {#if $auth.isAuthenticated}
    <button
      class="group flex items-center h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      on:click={handleAuth}
    >
      <img
        src={getAvatarUrlWithTimestamp(getAvatarUrl(getUserId($auth.user)))}
        alt={$auth.user?.username || '用户头像'}
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

<AuthModal 
  isOpen={showAuthModal} 
  mode={authMode}
  on:close={handleCloseModal}
/> 

<AccountModal
  isOpen={showAccountModal}
  on:close={handleCloseModal}
/> 