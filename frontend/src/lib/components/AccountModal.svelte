<!-- AccountModal.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth } from '../stores/auth';
  import { userApi } from '../utils/api';
  import { env } from '$env/dynamic/public';
  import { invalidate } from '$app/navigation';
  import { browser } from '$app/environment';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let dialogRef: HTMLDialogElement;
  let isClosing = false;
  let fileInput: HTMLInputElement;
  let avatarTimestamp = Date.now();
  
  type EditableField = 'username' | 'realName' | 'dateOfBirth' | 'bio';
  
  // 编辑状态
  let editingField: EditableField | null = null;
  let editForm = {
    username: $auth.user?.username || '',
    realName: $auth.user?.realName || '',
    dateOfBirth: $auth.user?.dateOfBirth || '',
    bio: $auth.user?.bio || '',
    avatarUrl: getAvatarUrl(getUserId($auth.user))
  };
  
  // 临时编辑值
  let tempEditValue = '';
  
  // 开始编辑字段
  function startEditing(field: EditableField) {
    editingField = field;
    tempEditValue = editForm[field];
  }
  
  // 取消编辑
  function cancelEditing() {
    editingField = null;
    tempEditValue = '';
  }
  
  // 处理关闭
  function close() {
    isClosing = true;
    setTimeout(() => {
      if (dialogRef) {
        dialogRef.close();
      }
      dispatch('close');
      isClosing = false;
    }, 200);
  }
  
  // 头像 URL 依赖
  let avatarKey = '';
  
  onMount(() => {
    if (browser) {
      avatarKey = 'app:avatar';
    }
  });

  // 获取头像 URL
  function getAvatarUrl(userId: number | null | undefined): string {
    if (!userId) return '/logo.png';
    const url = `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
    console.log('AccountModal 生成的头像URL:', url);
    return url;
  }

  // 监听头像更新
  $: if (avatarKey) {
    // 强制组件重新渲染
  }

  // 重置表单状态
  function resetForms() {
    const timestamp = Date.now();
    editForm = {
      username: $auth.user?.username || '',
      realName: $auth.user?.realName || '',
      dateOfBirth: $auth.user?.dateOfBirth || '',
      bio: $auth.user?.bio || '',
      avatarUrl: getAvatarUrl(getUserId($auth.user))
    };
    passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    deleteForm = {
      password: '',
      deleteArticles: true,
      deleteComments: true
    };
  }

  // 监听 auth store 变化，更新表单状态
  $: if ($auth.user) {
    editForm = {
      username: $auth.user.username || '',
      realName: $auth.user.realName || '',
      dateOfBirth: $auth.user.dateOfBirth || '',
      bio: $auth.user.bio || '',
      avatarUrl: getAvatarUrl(getUserId($auth.user))
    };
  }

  // 保存单个字段
  async function saveField(field: EditableField) {
    try {
      loading = true;
      error = '';
      const updatedUser = await userApi.updateProfile({
        ...editForm,
        [field]: tempEditValue
      });
      
      // 更新 auth store 中的用户信息
      auth.updateUser({
        ...updatedUser,
        id: Number(updatedUser.id)
      });
      
      // 更新本地表单状态，但保持头像 URL 不变
      editForm = {
        username: updatedUser.username || '',
        realName: updatedUser.realName || '',
        dateOfBirth: updatedUser.dateOfBirth || '',
        bio: updatedUser.bio || '',
        avatarUrl: editForm.avatarUrl // 保持原有的头像 URL
      };
      
      editingField = null;
      success = '已更新';
      setTimeout(() => {
        success = '';
      }, 2000);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // 获取用户ID（确保是数字类型）
  function getUserId(user: any): number | null {
    if (!user?.id) return null;
    const id = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    return isNaN(id) ? null : id;
  }

  // 处理头像上传
  async function handleAvatarUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      error = '请上传图片文件';
      return;
    }

    // 验证文件大小
    if (file.size > 2 * 1024 * 1024) {
      error = '图片大小不能超过 2MB';
      return;
    }

    try {
      loading = true;
      error = '';
      const formData = new FormData();
      formData.append('avatar', file);
      
      console.log('开始上传头像...');
      const updatedUser = await userApi.uploadAvatar(formData);
      console.log('头像上传成功:', updatedUser);
      
      // 保持原有的用户ID
      const currentUserId = getUserId($auth.user);
      
      // 更新时间戳
      avatarTimestamp = Date.now();
      
      // 更新 auth store 中的用户信息
      auth.updateUser({
        ...$auth.user,
        ...updatedUser,
        id: currentUserId // 使用原有的用户ID
      });
      
      // 强制更新头像
      await invalidate('app:avatar');
      
      // 触发头像更新事件
      dispatch('avatarUpdate');
      
      // 更新本地表单状态
      editForm = {
        username: $auth.user?.username || '',
        realName: $auth.user?.realName || '',
        dateOfBirth: $auth.user?.dateOfBirth || '',
        bio: $auth.user?.bio || '',
        avatarUrl: getAvatarUrl(currentUserId)
      };

      success = '头像已更新';
      setTimeout(() => {
        success = '';
      }, 2000);
    } catch (err: any) {
      console.error('头像上传失败:', err);
      error = err.message;
    } finally {
      loading = false;
      // 清空 input 值，允许重复上传相同文件
      target.value = '';
    }
  }
  
  // 修改密码状态
  let isChangingPassword = false;
  let passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // 删除账户状态
  let isDeleting = false;
  let deleteForm = {
    password: '',
    deleteArticles: true,
    deleteComments: true
  };
  
  // 错误信息
  let error = '';
  let success = '';
  
  // 加载状态
  let loading = false;

  // 当前选中的菜单项
  let currentSection: 'profile' | 'security' | 'danger' = 'profile';
  
  function handleClose() {
    if (dialogRef) {
      close();
    }
  }
  
  function handleLogout() {
    auth.logout();
    close();
  }

  // 保存个人资料
  async function saveProfile() {
    try {
      loading = true;
      error = '';
      const updatedUser = await userApi.updateProfile(editForm);
      auth.updateUser(updatedUser);
      success = '个人资料已更新';
      setTimeout(() => {
        success = '';
      }, 3000);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // 修改密码
  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error = '两次输入的密码不一致';
      return;
    }
    
    try {
      loading = true;
      error = '';
      await userApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      success = '密码已修改';
      isChangingPassword = false;
      passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // 删除账户
  async function deleteAccount() {
    try {
      loading = true;
      error = '';
      await userApi.deleteAccount(deleteForm);
      auth.logout();
      close();
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
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
      <div class="relative bg-white/70 dark:bg-zinc-800/70 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full max-w-4xl h-[600px] flex overflow-hidden {isClosing ? 'modal-closing' : 'modal-open'}">
        <!-- 左侧边栏 -->
        <div class="w-64 flex flex-col">
          <div class="flex-1 p-6 space-y-6">
            <!-- 用户信息 -->
            <div class="flex items-center space-x-3">
              <!-- 小头像 -->
              {#key avatarTimestamp}
              <img
                src={getAvatarUrl(getUserId($auth.user))}
                alt={$auth.user?.username || '用户头像'}
                class="h-12 w-12 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50"
              />
              {/key}
              <div>
                <p class="font-medium dark:text-white">{$auth.user?.username || '未知用户'}</p>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">{$auth.user?.realName || ''}</p>
              </div>
            </div>

            <!-- 导航菜单 -->
            <nav class="space-y-1">
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'profile' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => currentSection = 'profile'}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>个人资料</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'security' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => currentSection = 'security'}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>安全设置</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'danger' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => currentSection = 'danger'}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <span>危险区域</span>
              </button>
            </nav>
          </div>

          <!-- 分割线 -->
          <div class="px-6 py-4">
            <div class="h-[1px] bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>
          </div>

          <!-- 退出登录按钮 -->
          <div class="p-6 pt-0">
            <button
              class="w-full px-4 py-2.5 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50 rounded-lg transition-all flex items-center space-x-3 group"
              on:click={handleLogout}
            >
              <svg class="w-5 h-5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="flex-1 border-l border-zinc-200 dark:border-zinc-700">
          <div class="h-full p-8 overflow-y-auto">
            <!-- 关闭按钮 -->
            <button 
              class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 group"
              on:click={close}
              aria-label="关闭对话框"
            >
              <svg class="w-5 h-5 transition-transform group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>

            <!-- 错误/成功提示 -->
            {#if error}
              <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-sm">
                {error}
              </div>
            {/if}
            
            {#if success}
              <div class="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-200 text-sm">
                {success}
              </div>
            {/if}

            <!-- 个人资料部分 -->
            {#if currentSection === 'profile'}
              <div>
                <h3 class="text-lg font-semibold mb-8 dark:text-white">个人资料</h3>
                <div class="space-y-8">
                  <!-- 头像部分 -->
                  <div class="flex items-start space-x-4">
                    <div class="shrink-0">
                      <div class="relative group">
                        <!-- 大头像 -->
                        {#key avatarTimestamp}
                        <img
                          src={getAvatarUrl(getUserId($auth.user))}
                          alt="用户头像"
                          class="h-20 w-20 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50 transition-opacity group-hover:opacity-75"
                        />
                        {/key}
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            class="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors {loading ? 'opacity-50 cursor-not-allowed' : ''}"
                            on:click={() => fileInput.click()}
                            disabled={loading}
                          >
                            {#if loading}
                              <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                              </svg>
                            {:else}
                              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" x2="12" y1="3" y2="15" />
                              </svg>
                            {/if}
                          </button>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        bind:this={fileInput}
                        on:change={handleAvatarUpload}
                      />
                    </div>
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">头像</h4>
                      <p class="text-sm text-zinc-500 dark:text-zinc-400">推荐使用正方形图片，支持 PNG、JPG 格式，大小不超过 2MB</p>
                    </div>
                  </div>

                  <!-- 用户名 -->
                  <div class="flex items-center space-x-4">
                    <div class="w-32 shrink-0">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">用户名</span>
                    </div>
                    <div class="flex-1 flex items-center justify-between min-h-[2.5rem]">
                      {#if editingField === 'username'}
                        <input
                          type="text"
                          bind:value={tempEditValue}
                          class="block flex-1 rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        />
                        <div class="flex items-center ml-4 space-x-2">
                          <button
                            type="button"
                            class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            on:click={cancelEditing}
                            aria-label="取消编辑"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <line x1="18" x2="6" y1="6" y2="18" />
                              <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400"
                            on:click={() => saveField('username')}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <div class="flex-1 text-zinc-900 dark:text-white">{editForm.username}</div>
                        <button
                          type="button"
                          class="ml-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          on:click={() => startEditing('username')}
                          aria-label="编辑用户名"
                        >
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 真实姓名 -->
                  <div class="flex items-center space-x-4">
                    <div class="w-32 shrink-0">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">真实姓名</span>
                    </div>
                    <div class="flex-1 flex items-center justify-between min-h-[2.5rem]">
                      {#if editingField === 'realName'}
                        <input
                          type="text"
                          bind:value={tempEditValue}
                          class="block flex-1 rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        />
                        <div class="flex items-center ml-4 space-x-2">
                          <button
                            type="button"
                            class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            on:click={cancelEditing}
                            aria-label="取消编辑"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <line x1="18" x2="6" y1="6" y2="18" />
                              <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400"
                            on:click={() => saveField('realName')}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <div class="flex-1 text-zinc-900 dark:text-white">{editForm.realName || '未设置'}</div>
                        <button
                          type="button"
                          class="ml-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          on:click={() => startEditing('realName')}
                          aria-label="编辑真实姓名"
                        >
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 出生日期 -->
                  <div class="flex items-center space-x-4">
                    <div class="w-32 shrink-0">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">出生日期</span>
                    </div>
                    <div class="flex-1 flex items-center justify-between min-h-[2.5rem]">
                      {#if editingField === 'dateOfBirth'}
                        <input
                          type="date"
                          bind:value={tempEditValue}
                          class="block flex-1 rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        />
                        <div class="flex items-center ml-4 space-x-2">
                          <button
                            type="button"
                            class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            on:click={cancelEditing}
                            aria-label="取消编辑"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <line x1="18" x2="6" y1="6" y2="18" />
                              <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400"
                            on:click={() => saveField('dateOfBirth')}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <div class="flex-1 text-zinc-900 dark:text-white">{editForm.dateOfBirth || '未设置'}</div>
                        <button
                          type="button"
                          class="ml-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          on:click={() => startEditing('dateOfBirth')}
                          aria-label="编辑出生日期"
                        >
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 个人简介 -->
                  <div class="flex items-start space-x-4">
                    <div class="w-32 shrink-0 pt-2">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">个人简介</span>
                    </div>
                    <div class="flex-1 flex items-start justify-between min-h-[2.5rem]">
                      {#if editingField === 'bio'}
                        <textarea
                          bind:value={tempEditValue}
                          rows="4"
                          class="block flex-1 rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 resize-none"
                          placeholder="写点什么来介绍一下自己吧..."
                        ></textarea>
                        <div class="flex items-center ml-4 space-x-2">
                          <button
                            type="button"
                            class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            on:click={cancelEditing}
                            aria-label="取消编辑"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <line x1="18" x2="6" y1="6" y2="18" />
                              <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400"
                            on:click={() => saveField('bio')}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <div class="flex-1 text-zinc-900 dark:text-white whitespace-pre-wrap">{editForm.bio || '未设置'}</div>
                        <button
                          type="button"
                          class="ml-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          on:click={() => startEditing('bio')}
                          aria-label="编辑个人简介"
                        >
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- 安全设置部分 -->
            {#if currentSection === 'security'}
              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">安全设置</h3>
                {#if isChangingPassword}
                  <form on:submit|preventDefault={changePassword} class="space-y-4">
                    <div>
                      <label for="currentPassword" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">当前密码</label>
                      <input
                        type="password"
                        id="currentPassword"
                        bind:value={passwordForm.currentPassword}
                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        required
                      />
                    </div>
                    
                    <div>
                      <label for="newPassword" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">新密码</label>
                      <input
                        type="password"
                        id="newPassword"
                        bind:value={passwordForm.newPassword}
                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        required
                      />
                    </div>
                    
                    <div>
                      <label for="confirmPassword" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">确认新密码</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        bind:value={passwordForm.confirmPassword}
                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        required
                      />
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        class="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        on:click={() => isChangingPassword = false}
                        disabled={loading}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        class="px-4 py-2 text-sm bg-lime-600 text-white rounded-md hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600 disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? '修改中...' : '修改密码'}
                      </button>
                    </div>
                  </form>
                {:else}
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:text-white transition-colors"
                    on:click={() => isChangingPassword = true}
                  >
                    修改密码
                  </button>
                {/if}
              </div>
            {/if}

            <!-- 危险区域 -->
            {#if currentSection === 'danger'}
              <div>
                <h3 class="text-lg font-semibold mb-4 text-red-600 dark:text-red-500">危险区域</h3>
                {#if isDeleting}
                  <form on:submit|preventDefault={deleteAccount} class="space-y-4">
                    <div>
                      <label for="deletePassword" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">输入密码确认</label>
                      <input
                        type="password"
                        id="deletePassword"
                        bind:value={deleteForm.password}
                        class="mt-1 block w-full rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        required
                      />
                    </div>
                    
                    <div class="space-y-3">
                      <label class="flex items-center">
                        <input
                          type="checkbox"
                          bind:checked={deleteForm.deleteArticles}
                          class="rounded border-zinc-300 text-lime-600 shadow-sm focus:border-lime-500 focus:ring-lime-500"
                        />
                        <span class="ml-2 text-sm text-zinc-600 dark:text-zinc-400">删除我的所有文章</span>
                      </label>
                      
                      <label class="flex items-center">
                        <input
                          type="checkbox"
                          bind:checked={deleteForm.deleteComments}
                          class="rounded border-zinc-300 text-lime-600 shadow-sm focus:border-lime-500 focus:ring-lime-500"
                        />
                        <span class="ml-2 text-sm text-zinc-600 dark:text-zinc-400">删除我的所有评论</span>
                      </label>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        class="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        on:click={() => isDeleting = false}
                        disabled={loading}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? '删除中...' : '确认删除账户'}
                      </button>
                    </div>
                  </form>
                {:else}
                  <button
                    class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    on:click={() => isDeleting = true}
                  >
                    删除账户
                  </button>
                {/if}
              </div>
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