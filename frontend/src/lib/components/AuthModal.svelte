<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { auth } from '../stores/auth';
    import { authApi } from '../utils/api';
    import { t } from '$lib/i18n';
    
    export let isOpen = false;
    export let mode = 'login';
    
    const dispatch = createEventDispatcher();
    
    let username = '';
    let password = '';
    let realName = '';
    let dateOfBirth = '';
    let bio = '';
    let error = '';
    let showPassword = false;
    let loading = false;
    let dialogRef;
    let isClosing = false;
    
    // 表单验证状态
    let usernameError = '';
    let passwordError = '';
    let realNameError = '';
    let dateOfBirthError = '';
    
    let showFieldError = false;
    
    let usernameChecking = false;
    let usernameExists = false;
    
    let isShaking = false;
    
    // 防抖函数
    function debounce(fn, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(null, args), delay);
        };
    }
    
    // 检查用户名是否已存在
    const checkUsername = debounce(async (value) => {
        if (!value || !isValidUsername(value)) return;
        try {
            usernameChecking = true;
            usernameExists = false; // 重置状态
            const response = await authApi.checkUsername(value);
            usernameExists = !response.available;
        } catch (err) {
            console.error($t('log.checkUsernameError'), err);
            usernameExists = true; // 检查失败时假设用户名不可用
        } finally {
            usernameChecking = false;
        }
    }, 500);
    
    // 验证用户名格式
    const isValidUsername = (value) => {
        return /^[a-zA-Z0-9_]{6,20}$/.test(value);
    };
    
    // 实时验证用户名
    $: if (username && mode === 'register') {
        if (isValidUsername(username)) {
            checkUsername(username);
        } else {
            usernameExists = false;
            usernameChecking = false;
        }
    } else {
        usernameExists = false;
        usernameChecking = false;
    }
    
    // 实时验证密码
    $: {
        if (password && mode === 'register') {
            if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
                passwordError = $t('validation.passwordMinLength');
            } else {
                passwordError = '';
            }
        } else {
            passwordError = '';
        }
    }
    
    // 验证真实姓名
    $: {
        if (mode === 'register' && realName) {
            if (realName.length < 2) {
                realNameError = $t('validation.required');
            } else {
                realNameError = '';
            }
        } else {
            realNameError = '';
        }
    }
    
    // 验证出生日期
    $: {
        if (mode === 'register' && dateOfBirth) {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            if (isNaN(birthDate.getTime())) {
                dateOfBirthError = $t('validation.invalidDate');
            } else if (birthDate > today) {
                dateOfBirthError = $t('validation.invalidDate');
            } else {
                dateOfBirthError = '';
            }
        } else {
            dateOfBirthError = '';
        }
    }
    
    // 表单验证
    const validateForm = () => {
        if (mode === 'register') {
            return !usernameError && !passwordError && !realNameError && !dateOfBirthError &&
                   username && password && realName && dateOfBirth && !usernameExists;
        }
        // 登录时只验证字段非空
        return username && password;
    };
    
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
        setTimeout(() => {
            dispatch('close');
            error = '';
            username = '';
            password = '';
            realName = '';
            dateOfBirth = '';
            bio = '';
            usernameExists = false;
            usernameChecking = false;
            isClosing = false;
        }, 200);
    };
    
    const handleClose = () => {
        if (dialogRef) {
            close();
        }
    };
    
    const toggleMode = () => {
        mode = mode === 'login' ? 'register' : 'login';
        error = '';
        usernameExists = false;
        usernameChecking = false;
    };
    
    const handleSubmit = async () => {
        try {
            if (!validateForm()) {
                if (mode === 'login') {
                    error = $t('error.invalidCredentials');
                    // 添加抖动动画
                    isShaking = true;
                    setTimeout(() => {
                        isShaking = false;
                    }, 500);
                }
                return;
            }

            loading = true;
            error = '';
            showFieldError = false;
            
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
        } catch (err) {
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
                class="fixed inset-0 w-full h-full bg-transparent cursor-pointer"
                on:click={close}
                aria-label="关闭对话框"
            ></button>
            <!-- 卡片 -->
            <div class="relative bg-white/70 dark:bg-zinc-800/70 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full max-w-md max-h-[90vh] overflow-y-auto {isClosing ? 'modal-closing' : 'modal-open'}">
                <div class="p-8">
                    <!-- 标题 -->
                    <h2 id="modal-title" class="text-2xl font-bold text-center mb-6 text-zinc-800 dark:text-zinc-100">
                        {mode === 'login' ? $t('common.login') : $t('common.register')}
                    </h2>
                    
                    <!-- 表单 -->
                    <form 
                        on:submit|preventDefault={handleSubmit} 
                        class="space-y-4 {isShaking ? 'shake' : ''}" 
                        novalidate
                    >
                        {#if error}
                            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                <span class="block sm:inline">{error}</span>
                                <button
                                    type="button"
                                    class="absolute top-0 bottom-0 right-0 px-4 py-3"
                                    on:click={() => error = ''}
                                    aria-label="关闭错误提示"
                                >
                                    <svg class="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                        <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" fill-rule="evenodd"></path>
                                    </svg>
                                </button>
                            </div>
                        {/if}
                        
                        <div>
                            <label for="username-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{$t('user.username')}</label>
                            <div class="relative">
                                <input
                                    id="username-input"
                                    type="text"
                                    bind:value={username}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 {usernameError && showFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}"
                                    required
                                />
                                {#if mode === 'register' && showFieldError && !username}
                                    <div class="absolute left-0 -bottom-1 transform translate-y-full">
                                        <div class="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-xs rounded-md p-2 mt-1 shadow-sm">
                                            {$t('validation.required')}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            {#if mode === 'register'}
                                <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    {#if !isValidUsername(username)}
                                        <span class={username && (username.length >= 6 && username.length <= 20) ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                            {username && (username.length >= 6 && username.length <= 20) ? '✓' : '•'}
                                        </span>
                                        <span class={username && (username.length < 6 || username.length > 20) ? 'text-red-500' : ''}>{$t('validation.usernameLength')}</span>
                                        <span class={username && /^[a-zA-Z0-9_]*$/.test(username) ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                            {username && /^[a-zA-Z0-9_]*$/.test(username) ? '✓' : '•'}
                                        </span>
                                        <span class={username && !/^[a-zA-Z0-9_]*$/.test(username) ? 'text-red-500' : ''}>{$t('validation.usernameFormat')}</span>
                                    {:else if username}
                                        {#if usernameChecking}
                                            <svg class="animate-spin h-3 w-3 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        {:else}
                                            <span class={usernameExists ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                                                {usernameExists ? '✗' : '✓'}
                                            </span>
                                            <span class={usernameExists ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                                                {usernameExists ? $t('validation.usernameExists') : $t('validation.usernameAvailable')}
                                            </span>
                                        {/if}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        
                        <div class="relative">
                            <label for="password-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{$t('user.password')}</label>
                            <div class="relative">
                                <input
                                    id="password-input"
                                    type={showPassword ? 'text' : 'password'}
                                    bind:value={password}
                                    class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 {passwordError && showFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}"
                                    required
                                />
                                {#if mode === 'register' && showFieldError && !password}
                                    <div class="absolute left-0 -bottom-1 transform translate-y-full">
                                        <div class="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-xs rounded-md p-2 mt-1 shadow-sm">
                                            {$t('validation.required')}
                                        </div>
                                    </div>
                                {/if}
                                <button
                                    type="button"
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    on:click={() => showPassword = !showPassword}
                                    aria-label={showPassword ? $t('common.hidePassword') : $t('common.showPassword')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        {#if showPassword}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        {:else}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        {/if}
                                    </svg>
                                </button>
                            </div>
                            {#if mode === 'register'}
                                <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    <span class={password && password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                        {password && password.length >= 8 ? '✓' : '•'}
                                    </span>
                                    <span class={password && password.length < 8 ? 'text-red-500' : ''}>{$t('validation.passwordMinLength')}</span>
                                    <span class={password && /[A-Za-z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                        {password && /[A-Za-z]/.test(password) ? '✓' : '•'}
                                    </span>
                                    <span class={password && !/[A-Za-z]/.test(password) ? 'text-red-500' : ''}>{$t('validation.passwordRequireLetter')}</span>
                                    <span class={password && /\d/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                        {password && /\d/.test(password) ? '✓' : '•'}
                                    </span>
                                    <span class={password && !/\d/.test(password) ? 'text-red-500' : ''}>{$t('validation.passwordRequireNumber')}</span>
                                </div>
                            {/if}
                        </div>
                        
                        {#if mode === 'register'}
                            <div>
                                <label for="realname-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{$t('account.realName')}</label>
                                <div class="relative">
                                    <input
                                        id="realname-input"
                                        type="text"
                                        bind:value={realName}
                                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 {realNameError && showFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}"
                                        required
                                    />
                                    {#if showFieldError && !realName}
                                        <div class="absolute left-0 -bottom-1 transform translate-y-full">
                                            <div class="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-xs rounded-md p-2 mt-1 shadow-sm">
                                                {$t('validation.required')}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    <span class={realName && realName.length >= 2 ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                        {realName && realName.length >= 2 ? '✓' : '•'}
                                    </span>
                                    <span class={realName && realName.length < 2 ? 'text-red-500' : ''}>{$t('validation.realNameMinLength')}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label for="birth-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{$t('account.dateOfBirth')}</label>
                                <div class="relative">
                                    <input
                                        id="birth-input"
                                        type="text"
                                        bind:value={dateOfBirth}
                                        placeholder="YYYY-MM-DD"
                                        pattern="\d{4}-\d{2}-\d{2}"
                                        maxlength="10"
                                        on:keydown={(e) => {
                                            // 允许删除键和退格键
                                            if (e.key === 'Backspace' || e.key === 'Delete') {
                                                return;
                                            }
                                            
                                            // 阻止非数字输入
                                            if (!/^\d$/.test(e.key) && !['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        on:input={(e) => {
                                            let value = e.target.value.replace(/\D/g, '');
                                            if (value.length >= 4) {
                                                value = value.slice(0, 4) + (value.length > 4 ? '-' : '') + value.slice(4);
                                            }
                                            if (value.length >= 7) {
                                                value = value.slice(0, 7) + (value.length > 7 ? '-' : '') + value.slice(7);
                                            }
                                            if (value.length > 10) {
                                                value = value.slice(0, 10);
                                            }
                                            dateOfBirth = value;
                                        }}
                                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 {dateOfBirthError && showFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}"
                                        required
                                    />
                                    {#if showFieldError && !dateOfBirth}
                                        <div class="absolute left-0 -bottom-1 transform translate-y-full">
                                            <div class="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 text-xs rounded-md p-2 mt-1 shadow-sm">
                                                {$t('validation.required')}
                                            </div>
                                        </div>
                                    {/if}
                                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg class="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    <span class={dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}>
                                        {dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? '✓' : '•'}
                                    </span>
                                    <span>{$t('validation.dateFormat')}</span>
                                    {#if dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)}
                                        <span class="text-red-500">{$t('validation.invalidFormat')}</span>
                                    {:else if dateOfBirth && new Date(dateOfBirth) > new Date()}
                                        <span class="text-red-500">{$t('validation.invalidDate')}</span>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="hidden md:block">
                                <label for="bio-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{$t('user.bio')}</label>
                                <textarea
                                    id="bio-input"
                                    bind:value={bio}
                                    class="mt-1 w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 resize-none"
                                    rows="3"
                                ></textarea>
                            </div>
                        {/if}
                        
                        <button
                            type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-700 dark:hover:bg-zinc-600"
                            disabled={loading || (mode === 'register' && !validateForm())}
                        >
                            {#if loading}
                                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {$t('common.processing')}
                            {:else}
                                {mode === 'login' ? $t('common.login') : $t('common.register')}
                            {/if}
                        </button>
                    </form>
                    
                    <!-- 切换模式 -->
                    <div class="mt-4 text-center text-sm">
                        {#if mode === 'login'}
                            <span class="text-zinc-600 dark:text-zinc-400">{$t('account.noAccount')}</span>
                            <button
                                class="text-zinc-900 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 underline underline-offset-2"
                                on:click={toggleMode}
                            >
                                {$t('common.register')}
                            </button>
                        {:else}
                            <span class="text-zinc-600 dark:text-zinc-400">{$t('account.hasAccount')}</span>
                            <button
                                class="text-zinc-900 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 underline underline-offset-2"
                                on:click={toggleMode}
                            >
                                {$t('common.login')}
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

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
    }

    .shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
</style> 