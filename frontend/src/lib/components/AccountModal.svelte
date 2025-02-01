<!-- AccountModal.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth } from '../stores/auth';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let dialogRef: HTMLDialogElement;
  let isClosing = false;
  
  function handleClose() {
    if (dialogRef) {
      close();
    }
  }
  
  function handleLogout() {
    auth.logout();
    close();
  }

  function close() {
    isClosing = true;
    setTimeout(() => {
      dispatch('close');
      isClosing = false;
    }, 200);
  }

  // 监听isOpen变化，控制对话框显示状态
  $: if (isOpen) {
    isClosing = false;
    if (dialogRef) {
      document.body.style.overflow = 'hidden';
      dialogRef.showModal();
    }
  } else {
    if (dialogRef) {
      document.body.style.overflow = '';
      if (!isClosing) {
        dialogRef.close();
      }
    }
  }

  // 组件卸载时恢复滚动
  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

{#if isOpen}
<dialog
  bind:this={dialogRef}
  class="fixed inset-0 z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-screen h-screen {isClosing ? 'closing' : ''}"
  on:close={handleClose}
>
  <!-- 卡片容器 -->
  <div class="h-full overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- 背景遮罩按钮 - 用于处理点击背景关闭 -->
      <div class="fixed inset-0 bg-zinc-50/80 backdrop-blur-sm dark:bg-zinc-900/80"></div>
      <button
        class="fixed inset-0 w-full h-full bg-transparent cursor-default"
        on:click={close}
        aria-label="关闭对话框"
      ></button>

      <!-- 卡片 -->
      <div class="relative bg-white/70 dark:bg-zinc-800/70 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full max-w-md {isClosing ? 'modal-closing' : 'modal-open'}">
        <div class="p-8">
          <!-- 关闭按钮 -->
          <button 
            class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            on:click={close}
            aria-label="关闭对话框"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- 标题 -->
          <h2 class="text-2xl font-bold mb-2 dark:text-white">账户</h2>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-8">管理您的账户信息</p>
          
          <!-- 个人资料部分 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4 dark:text-white">个人资料</h3>
            <div class="flex items-center space-x-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <img
                src={$auth.user?.avatar || '/logo.png'}
                alt={$auth.user?.username || '用户头像'}
                class="h-16 w-16 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50"
              />
              <div>
                <p class="font-medium dark:text-white">{$auth.user?.username || '未知用户'}</p>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">{$auth.user?.realName || ''}</p>
              </div>
            </div>
          </div>
          
          <!-- 安全设置部分 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4 dark:text-white">安全</h3>
            <button
              class="w-full text-left px-4 py-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:text-white transition-colors"
            >
              修改密码
            </button>
          </div>
          
          <!-- 退出登录按钮 -->
          <button
            class="w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            on:click={handleLogout}
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  </div>
</dialog>
{/if}

<style>
  dialog::backdrop {
    display: none;
  }

  dialog {
    border: none;
    background: transparent;
  }

  .modal-open {
    animation: modal-open 0.2s ease-out;
  }

  .modal-closing {
    animation: modal-close 0.2s ease-in;
  }

  @keyframes modal-open {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes modal-close {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }
</style> 