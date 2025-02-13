<script>
    import { createEventDispatcher } from 'svelte';
    import { auth } from '../stores/auth';
    import AuthModal from './AuthModal.svelte';
  
    export let type;
    export let count = 0;
    export let isActive = false;
  
    const dispatch = createEventDispatcher();
    let showAuthModal = false;
    let hasShownAuthModal = false;
  
    // 格式化数字
    function prettifyNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    }
  
    // 检查用户是否已登录
    function checkAuth(e) {
      if (!$auth.isAuthenticated && !hasShownAuthModal) {
        e?.preventDefault();
        showAuthModal = true;
        hasShownAuthModal = true;
        return false;
      }
      return $auth.isAuthenticated;
    }
  
    function handleReact(e) {
      if (checkAuth(e)) {
        dispatch('react');
      }
    }
  </script>
  
  <AuthModal 
    isOpen={showAuthModal}
    mode="login"
    on:close={() => {
      showAuthModal = false;
      hasShownAuthModal = false;
    }}
  />
  
  <div class="relative flex flex-col items-center">
    <button
      on:click={handleReact}
      class="relative flex h-10 w-10 items-center justify-center
        transition-transform duration-200 ease-in-out
        hover:scale-110 active:scale-95"
      class:active={isActive}
    >
      <img
        src="/reactions/{type}.png"
        alt={type}
        class="h-8 w-8"
      />
    </button>
    
    <span 
      class="mt-0.5 flex w-full items-center justify-center
        whitespace-nowrap text-[12px] font-semibold
        text-zinc-700/30 dark:text-zinc-200/25"
      class:active={isActive}
    >
      {prettifyNumber(count)}
    </span>
  </div>
  
  <style lang="postcss">
    .active {
      @apply text-lime-600 dark:text-lime-500;
    }
  
    button.active {
      @apply scale-110;
    }
  
    button.active:hover {
      @apply scale-125;
    }
  
    @keyframes wiggle {
      0% { transform: rotate(0deg) scale(1.1); }
      25% { transform: rotate(-5deg) scale(1.1); }
      75% { transform: rotate(5deg) scale(1.1); }
      100% { transform: rotate(0deg) scale(1.1); }
    }
  
    button:hover {
      animation: wiggle 0.2s ease-in-out infinite;
    }
  
    button:hover:active {
      animation: none;
    }
  </style> 