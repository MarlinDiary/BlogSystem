<!-- UserButton.svelte -->
<script>
  import UserArrowLeft from './icons/UserArrowLeft.svelte';
  import '../styles/icon.css';
  import { auth } from '../stores/auth';
  import AuthModal from './AuthModal.svelte';
  import AccountModal from './AccountModal.svelte';
  import { env } from '$env/dynamic/public';
  
  let showAuthModal = false;
  let showAccountModal = false;
  let authMode = 'login';  // 'login' or 'register'
  let avatarTimestamp = Date.now();
  
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

  function handleAvatarUpdate() {
    console.log('收到头像更新事件');
    avatarTimestamp = Date.now();
    console.log('新的时间戳:', avatarTimestamp);
    
    // 尝试预加载新头像
    if ($auth.user) {
      const img = new Image();
      img.onload = () => {
        console.log('UserButton: 新头像加载成功');
      };
      img.onerror = (e) => {
        console.error('UserButton: 新头像加载失败:', e);
      };
      img.src = getAvatarUrl(getUserId($auth.user));
    }
  }

  // 获取头像 URL
  function getAvatarUrl(userId) {
    if (!userId) return '/logo.png';
    const url = `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
    console.log('UserButton 生成的头像URL:', url);
    return url;
  }

  // 获取用户ID（确保是数字类型）
  function getUserId(user) {
    if (!user?.id) return null;
    const id = Number(user.id);
    return isNaN(id) ? null : id;
  }

  $: if ($auth.user) {
    console.log('auth store 更新:', $auth.user);
  }
</script>

<div class="pointer-events-auto">
  {#if $auth.isAuthenticated}
    <button
      class="group flex items-center h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      on:click={handleAuth}
    >
      {#key avatarTimestamp}
      <img
        src={getAvatarUrl(getUserId($auth.user))}
        alt={$auth.user?.username || '用户头像'}
        class="h-9 w-9 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
        on:error={(e) => console.error('头像加载失败:', e)}
      />
      {/key}
    </button>
  {:else}
    <button
      class="group flex items-center h-10 rounded-full bg-white/90 px-3 py-2 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      on:click={handleAuth}
    >
      <UserArrowLeft class="h-6 w-6 stroke-zinc-900 transition group-hover:stroke-[#65a30d] dark:stroke-white dark:group-hover:stroke-[#65a30d]" />
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
  on:avatarUpdate={handleAvatarUpdate}
/> 