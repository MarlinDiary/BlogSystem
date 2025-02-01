<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { auth } from '../stores/auth';
    import { authApi } from '../utils/api';
    
    export let isOpen = false;
    export let mode: 'login' | 'register' = 'login';
    
    const dispatch = createEventDispatcher();
    
    let username = '';
    let password = '';
    let realName = '';
    let dateOfBirth = '';
    let bio = '';
    let error = '';
    let showPassword = false;
    let loading = false;
    let dialogRef: HTMLDialogElement;
    let isClosing = false;
    
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
    
    const close = () => {
        isClosing = true;
        // 等待动画完成后再关闭
        setTimeout(() => {
            dispatch('close');
            error = '';
            // 清空表单
            username = '';
            password = '';
            realName = '';
            dateOfBirth = '';
            bio = '';
            isClosing = false;
        }, 200); // 动画持续时间
    };
    
    const handleClose = () => {
        if (dialogRef) {
            close();
        }
    };
    
    const toggleMode = () => {
        mode = mode === 'login' ? 'register' : 'login';
        error = '';
    };
    
    const handleSubmit = async () => {
        try {
            loading = true;
            error = '';
            
            if (mode === 'login') {
                const data = await authApi.login(username, password);
                auth.login(data.token, data.user);
            } else {
                const data = await authApi.register({
                    username,
                    password,
                    realName,
                    dateOfBirth,
                    bio
                });
                auth.login(data.token, data.user);
            }
            
            close();
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    };
</script>

{#if isOpen}
<dialog
    bind:this={dialogRef}
    class="fixed inset-0 z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-screen h-screen backdrop:bg-zinc-50/80 backdrop:backdrop-blur-sm dark:backdrop:bg-zinc-900/80 {isClosing ? 'closing' : ''}"
    on:close={handleClose}
>
    <!-- 卡片容器 -->
    <div class="h-full overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
            <!-- 背景遮罩按钮 - 用于处理点击背景关闭 -->
            <button
                class="fixed inset-0 w-full h-full bg-transparent cursor-default"
                on:click={close}
                aria-label="关闭对话框"
            ></button>
            <!-- 卡片 -->
            <div class="relative bg-white/80 dark:bg-zinc-800/80 backdrop-blur-[2px] rounded-lg shadow-xl w-full max-w-md {isClosing ? 'modal-closing' : 'modal-open'}">
                <div class="p-6">
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
                    <h2 id="modal-title" class="text-2xl font-bold text-center mb-6 text-zinc-800 dark:text-zinc-100">
                        {mode === 'login' ? '登录' : '注册'}
                    </h2>
                    
                    <!-- 表单 -->
                    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
                        {#if error}
                            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        {/if}
                        
                        <div>
                            <label for="username-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">用户名</label>
                            <input
                                id="username-input"
                                type="text"
                                bind:value={username}
                                class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                required
                            />
                        </div>
                        
                        <div class="relative">
                            <label for="password-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">密码</label>
                            <div class="relative">
                                <input
                                    id="password-input"
                                    type={showPassword ? 'text' : 'password'}
                                    bind:value={password}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                />
                                <button
                                    type="button"
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    on:click={() => showPassword = !showPassword}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {#if showPassword}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        {:else}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        {/if}
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {#if mode === 'register'}
                            <div>
                                <label for="realname-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">真实姓名</label>
                                <input
                                    id="realname-input"
                                    type="text"
                                    bind:value={realName}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label for="birth-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">出生日期</label>
                                <input
                                    id="birth-input"
                                    type="date"
                                    bind:value={dateOfBirth}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label for="bio-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">个人简介</label>
                                <textarea
                                    id="bio-input"
                                    bind:value={bio}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 resize-none"
                                    rows="3"
                                ></textarea>
                            </div>
                        {/if}
                        
                        <button
                            type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-700 dark:hover:bg-zinc-600"
                            disabled={loading}
                        >
                            {#if loading}
                                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                处理中...
                            {:else}
                                {mode === 'login' ? '登录' : '注册'}
                            {/if}
                        </button>
                    </form>
                    
                    <!-- 切换模式 -->
                    <div class="mt-4 text-center text-sm">
                        {#if mode === 'login'}
                            <span class="text-zinc-600 dark:text-zinc-400">还没有账户？</span>
                            <button
                                class="text-zinc-900 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 underline underline-offset-2"
                                on:click={toggleMode}
                            >
                                注册
                            </button>
                        {:else}
                            <button
                                class="text-zinc-900 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
                                on:click={toggleMode}
                            >
                                已有账户？登录
                            </button>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>
{/if}

<style>
    dialog::backdrop {
        animation: fadeIn 0.2s ease-out;
    }
    
    dialog {
        animation: fadeIn 0.2s ease-out;
    }
    
    dialog.closing::backdrop {
        animation: fadeOut 0.2s ease-out;
    }
    
    dialog.closing {
        animation: fadeOut 0.2s ease-out;
    }
    
    .modal-open {
        animation: slideIn 0.2s ease-out;
    }
    
    .modal-closing {
        animation: slideOut 0.2s ease-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    @keyframes slideIn {
        from {
            transform: translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(10px);
            opacity: 0;
        }
    }
    
    /* 移除默认的dialog样式 */
    dialog {
        border: none;
        background: transparent;
    }
    
    dialog:focus {
        outline: none;
    }
</style> 