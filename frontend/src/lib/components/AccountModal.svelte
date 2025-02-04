<!-- AccountModal.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth } from '../stores/auth';
  import { userApi } from '../utils/api';
  import { env } from '$env/dynamic/public';
  import { invalidate } from '$app/navigation';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import type { User } from '../stores/auth';
  import { toast } from '$lib/utils/toast';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let dialogRef: HTMLDialogElement;
  let isClosing = false;
  let fileInput: HTMLInputElement;
  let avatarTimestamp = Date.now();
  
  type EditableField = 'username' | 'realName' | 'dateOfBirth' | 'bio';
  type SectionType = 'profile' | 'articles' | 'comments' | 'security' | 'danger';
  
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
  
  // 添加验证规则
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  const REALNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_\s]{2,20}$/;
  
  // 验证状态
  let validationState = {
    username: true,
    realName: true,
    dateOfBirth: true,
    bio: true
  };
  
  // 验证函数
  function validateField(field: EditableField, value: string): boolean {
    switch (field) {
      case 'username':
        return USERNAME_REGEX.test(value);
      case 'realName':
        return value === '' || REALNAME_REGEX.test(value);
      case 'dateOfBirth':
        if (!value) return true;
        const date = new Date(value);
        const now = new Date();
        return date <= now;
      case 'bio':
        return value.length <= 500;
      default:
        return true;
    }
  }
  
  // 开始编辑字段
  function startEditing(field: EditableField) {
    editingField = field;
    if (field === 'dateOfBirth') {
      tempEditValue = editForm.dateOfBirth || '';
    } else {
      tempEditValue = editForm[field];
    }
    validationState[field] = validateField(field, tempEditValue);
    // 下一个事件循环中聚焦输入框
    setTimeout(() => {
      const input = document.querySelector(`[data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (input) {
        input.focus();
      }
    }, 0);
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
      // 重置为个人资料页面
      currentSection = 'profile';
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

  // 监听编辑值变化时验证
  $: if (editingField && tempEditValue !== undefined) {
    validationState[editingField] = validateField(editingField, tempEditValue);
  }

  // 保存单个字段
  async function saveField(field: EditableField) {
    if (!validationState[field]) return;
    
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
  let currentSection: SectionType = 'profile';
  
  // 评论列表状态
  let comments: Array<{
    id: number;
    content: string;
    createdAt: string;
    articleId: number;
    articleTitle: string;
    visibility: string;
  }> = [];
  
  // 加载用户文章
  async function loadUserArticles() {
    try {
      loading = true;
      error = '';
      const userId = getUserId($auth.user);
      if (!userId) {
        error = '无法获取用户ID';
        return;
      }
      const result = await userApi.getUserArticles(userId);
      // 更新用户数据中的文章列表
      auth.updateUser({
        ...$auth.user!,
        articles: result.items
      });
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // 加载用户评论
  async function loadUserComments() {
    try {
      loading = true;
      error = '';
      const userId = getUserId($auth.user);
      if (!userId) {
        error = '无法获取用户ID';
        return;
      }
      const result = await userApi.getUserComments(userId);
      comments = result.items;
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // 监听section变化，当切换到articles时加载文章
  $: if (currentSection === 'articles') {
    loadUserArticles();
  }

  // 监听section变化，当切换到comments时加载评论
  $: if (currentSection === 'comments') {
    loadUserComments();
  }

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

  // 删除文章确认状态
  let deletingArticleId: number | null = null;

  // 开始删除确认
  function startDelete(articleId: number) {
    if (deletingArticleId === articleId) {
      deleteArticle(articleId);
    } else {
      deletingArticleId = articleId;
      // 3秒后自动取消确认状态
      setTimeout(() => {
        if (deletingArticleId === articleId) {
          deletingArticleId = null;
        }
      }, 3000);
    }
  }

  // 删除文章
  async function deleteArticle(articleId: number) {
    try {
      loading = true;
      
      // 先在UI上移除文章
      if ($auth.user?.articles) {
        auth.updateUser({
          ...$auth.user,
          articles: $auth.user.articles.filter(article => article.id !== articleId)
        });
      }
      
      // 发送删除请求
      await userApi.deleteArticle(articleId);
      
      // 如果当前在文章页面，跳转到文章列表页面
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/articles/') && currentPath !== '/articles') {
        window.location.href = '/articles';
      }
      
    } catch (error) {
      console.error('删除文章失败:', error);
      // 如果删除失败，恢复文章列表
      await loadUserArticles();
    } finally {
      loading = false;
      deletingArticleId = null;
    }
  }

  // 删除评论确认状态
  let deletingCommentId: number | null = null;

  // 开始删除评论确认
  function startDeleteComment(commentId: number) {
    if (deletingCommentId === commentId) {
      deleteComment(commentId);
    } else {
      deletingCommentId = commentId;
      // 3秒后自动取消确认状态
      setTimeout(() => {
        if (deletingCommentId === commentId) {
          deletingCommentId = null;
        }
      }, 3000);
    }
  }

  // 删除评论
  async function deleteComment(commentId: number) {
    try {
      // 先在UI上移除评论
      comments = comments.filter(comment => comment.id !== commentId);
      
      // 发送删除请求
      await userApi.deleteComment(commentId);
    } catch (error: any) {
      console.error('删除评论失败:', error);
      error = error.message || '删除评论失败';
      // 如果删除失败，恢复被删除的评论
      comments = [...comments];
    } finally {
      loading = false;
      deletingCommentId = null;
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

  // 处理文章链接点击
  function handleArticleClick(articleId: number) {
    close();
    window.location.href = `/articles/${articleId}`;
  }

  // 添加响应式状态
  let isMobile: boolean;
  let showContent = false;
  
  function handleResize() {
    isMobile = window.innerWidth < 768;
    if (!isMobile) {
      showContent = false;
    }
  }
  
  onMount(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = '';
    };
  });

  // 添加日期相关的状态和函数
  let dateForm = {
    year: '',
    month: '',
    day: ''
  };
  
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }
  
  function handleDateInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length >= 4) value = value.slice(0, 4) + '-' + value.slice(4);
    if (value.length >= 7) value = value.slice(0, 7) + '-' + value.slice(7);
    input.value = value;
    tempEditValue = value;
    validationState.dateOfBirth = validateField('dateOfBirth', value);
  }

  // 修改移动端点击处理
  function handleSectionClick(section: SectionType) {
    currentSection = section;
    if (isMobile) {
      showContent = true;
    }
  }

  // 修改取消编辑函数，只在按 Escape 键时触发
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  // 修改 toggleCommentVisibility 函数实现乐观更新
  async function toggleCommentVisibility(commentId: number) {
    try {
      const targetComment = comments.find(c => c.id === commentId);
      if (!targetComment) return;

      // 乐观更新
      const newVisibility = targetComment.visibility === 'visible' ? 'hidden' : 'visible';
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, visibility: newVisibility }
          : comment
      );
      
      // 发送请求
      const response = await fetch(`/api/comments/${commentId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${$auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // 如果请求失败，回滚更改
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, visibility: targetComment.visibility }
            : comment
        );
        throw new Error('切换评论可见性失败');
      }

      // 请求成功，使用服务器返回的状态更新（以防万一）
      const updatedComment = await response.json();
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, visibility: updatedComment.visibility }
          : comment
      );
    } catch (err: any) {
      console.error('切换评论可见性失败:', err);
    }
  }
</script>

{#if isOpen}
<dialog
  bind:this={dialogRef}
  class="fixed inset-0 z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-screen h-screen {isClosing ? 'closing' : ''}"
  on:close={handleClose}
>
  <div class="h-full overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="fixed inset-0 bg-zinc-50/80 backdrop-blur-sm dark:bg-zinc-900/80"></div>
      <button
        class="fixed inset-0 w-full h-full bg-transparent cursor-default"
        on:click={close}
        aria-label="关闭对话框"
      ></button>

      <div class="relative bg-white/90 dark:bg-zinc-800/90 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full {isMobile ? 'max-w-sm' : 'max-w-4xl'} h-[600px] flex overflow-hidden {isClosing ? 'modal-closing' : 'modal-open'}">
        <!-- 左侧边栏 -->
        <div class="w-full md:w-64 flex flex-col {showContent && isMobile ? 'hidden' : ''}">
          <div class="flex-1 p-6 space-y-6">
            <!-- 用户信息 -->
            <div class="flex items-center space-x-3">
              <!-- 小头像和在线状态 -->
              <div class="relative">
                {#key avatarTimestamp}
                <img
                  src={getAvatarUrl(getUserId($auth.user))}
                  alt={$auth.user?.username || '用户头像'}
                  class="h-12 w-12 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50"
                />
                {/key}
                <!-- 在线状态指示器 -->
                <div class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white dark:ring-zinc-800"></div>
              </div>
              <div>
                <p class="font-medium dark:text-white uppercase">{$auth.user?.username || '未知用户'}</p>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">{$auth.user?.realName || ''}</p>
              </div>
            </div>

            <!-- 导航菜单 -->
            <nav class="space-y-1">
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'profile' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionClick('profile')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>个人资料</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'articles' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionClick('articles')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span>我的文章</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'comments' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionClick('comments')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>我的评论</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'security' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionClick('security')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>安全设置</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'danger' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionClick('danger')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <span>危险区域</span>
              </button>
            </nav>
          </div>

          <!-- 退出登录按钮 -->
          <div class="p-6">
            <button
              class="w-full px-4 py-2.5 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50 rounded-lg transition-all flex items-center space-x-3 group"
              on:click={handleLogout}
            >
              <svg class="w-5 h-5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="flex-1 relative {!showContent && isMobile ? 'hidden' : ''} p-8">
          <!-- 移动端顶部栏 -->
          {#if isMobile}
            <div class="fixed top-0 left-0 right-0 z-10 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700/50">
              <div class="h-14 px-4 flex items-center">
                <button
                  class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                  on:click={() => showContent = false}
                  aria-label="返回"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <h3 class="absolute left-1/2 -translate-x-1/2 text-base font-medium dark:text-white">{currentSection === 'profile' ? '个人资料' : currentSection === 'articles' ? '我的文章' : currentSection === 'comments' ? '我的评论' : currentSection === 'security' ? '安全设置' : '危险区域'}</h3>
              </div>
            </div>
          {/if}

          <div class="h-full overflow-y-auto {isMobile ? 'mt-14' : ''} scrollbar-none">
            <!-- 错误/成功提示 -->
            <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
              {#if error}
                <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300">
                  {error}
                </div>
              {/if}
              
              {#if success}
                <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-200 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300">
                  {success}
                </div>
              {/if}
            </div>

            {#if currentSection === 'profile'}
              <!-- 个人资料部分 -->
              <div class="space-y-8">
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">个人资料</h3>
                {/if}
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
                          aria-label="上传头像"
                        >
                          {#if loading}
                            <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                            </svg>
                          {:else}
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">{'推荐使用正方形图片，支持 PNG、JPG 格式，大小不超过 2 MB'}</p>
                  </div>
                </div>

                <!-- 用户信息表单 -->
                <div class="space-y-6">
                  <!-- 用户名 -->
                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">用户名</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'username'}
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            on:keydown={e => {
                              handleKeydown(e);
                              if (e.key === 'Enter' && validationState.username) saveField('username');
                            }}
                            data-field="username"
                            class="block flex-1 h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 {!validationState.username ? 'border-red-300' : ''}"
                          />
                          <button
                            type="button"
                            class="p-1 {validationState.username ? 'text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300' : 'text-zinc-400 cursor-not-allowed'}"
                            on:click={() => validationState.username && saveField('username')}
                            disabled={!validationState.username}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <button 
                          type="button"
                          class="w-full h-[38px] flex items-center text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 px-3 rounded-md transition-colors text-left"
                          on:click={() => startEditing('username')}
                        >
                          {editForm.username}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 真实姓名 -->
                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">真实姓名</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'realName'}
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            on:keydown={e => {
                              handleKeydown(e);
                              if (e.key === 'Enter' && validationState.realName) saveField('realName');
                            }}
                            data-field="realName"
                            class="block flex-1 h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 {!validationState.realName ? 'border-red-300' : ''}"
                          />
                          <button
                            type="button"
                            class="p-1 {validationState.realName ? 'text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300' : 'text-zinc-400 cursor-not-allowed'}"
                            on:click={() => validationState.realName && saveField('realName')}
                            disabled={!validationState.realName}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <button 
                          type="button"
                          class="w-full h-[38px] flex items-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 px-3 rounded-md transition-colors text-left"
                          on:click={() => startEditing('realName')}
                        >
                          {#if editForm.realName}
                            <span class="text-zinc-900 dark:text-white">{editForm.realName}</span>
                          {:else}
                            <span class="text-zinc-400 dark:text-zinc-500 italic">未设置</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 出生日期 -->
                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">出生日期</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'dateOfBirth'}
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            placeholder="YYYY-MM-DD"
                            pattern="\d{4}-\d{2}-\d{2}"
                            on:input={handleDateInput}
                            on:keydown={e => {
                              handleKeydown(e);
                              if (e.key === 'Enter' && validationState.dateOfBirth) saveField('dateOfBirth');
                            }}
                            data-field="dateOfBirth"
                            class="block flex-1 h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            class="p-1 text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
                            on:click={() => saveField('dateOfBirth')}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <button 
                          type="button"
                          class="w-full h-[38px] flex items-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 px-3 rounded-md transition-colors text-left"
                          on:click={() => startEditing('dateOfBirth')}
                        >
                          {#if editForm.dateOfBirth}
                            <span class="text-zinc-900 dark:text-white">{formatDate(editForm.dateOfBirth)}</span>
                          {:else}
                            <span class="text-zinc-400 dark:text-zinc-500 italic">未设置</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- 个人简介 -->
                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">个人简介</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'bio'}
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            placeholder="写点什么来介绍一下自己吧..."
                            on:keydown={e => {
                              handleKeydown(e);
                              if (e.key === 'Enter' && validationState.bio) saveField('bio');
                            }}
                            data-field="bio"
                            class="block flex-1 h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            class="p-1 {validationState.bio ? 'text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300' : 'text-zinc-400 cursor-not-allowed'}"
                            on:click={() => validationState.bio && saveField('bio')}
                            disabled={!validationState.bio}
                            aria-label="保存修改"
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </div>
                      {:else}
                        <button 
                          type="button"
                          class="w-full h-[38px] flex items-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 px-3 rounded-md transition-colors text-left"
                          on:click={() => startEditing('bio')}
                        >
                          {#if editForm.bio}
                            <span class="text-zinc-900 dark:text-white whitespace-pre-wrap">{editForm.bio}</span>
                          {:else}
                            <span class="text-zinc-400 dark:text-zinc-500 italic">未设置</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {:else if currentSection === 'articles'}
              <!-- 我的文章部分 -->
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">我的文章</h3>
                {/if}
                {#if loading}
                  <div class="flex justify-center py-12">
                    <svg class="w-8 h-8 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                    </svg>
                  </div>
                {:else if !$auth.user?.articles?.length}
                  <div class="flex flex-col items-center justify-center py-20">
                    <svg class="w-16 h-16 text-zinc-300 dark:text-zinc-600 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <p class="mb-6 text-zinc-500 dark:text-zinc-400">还没有发布过文章</p>
                    <a 
                      href="/publish" 
                      class="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                      on:click={close}
                    >
                      写一篇文章
                    </a>
                  </div>
                {:else}
                  <div class="space-y-4">
                    {#each $auth.user?.articles || [] as article (article.id)}
                      <div class="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-zinc-800/50 backdrop-blur-[1px] group">
                        <div class="flex-1 min-w-0">
                          <a 
                            href="/articles/{article.id}" 
                            class="block text-zinc-900 dark:text-white font-medium truncate hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                            on:click|preventDefault={() => handleArticleClick(article.id)}
                          >
                            {article.title}
                          </a>
                          <div class="mt-1 flex items-center text-sm text-zinc-500 dark:text-zinc-400 space-x-4">
                            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                            <span>阅读 {article.viewCount || 0}</span>
                            <span>评论 {article.commentCount || 0}</span>
                          </div>
                        </div>
                        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href="/articles/{article.id}/edit"
                            class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                            aria-label="编辑文章"
                            on:click|preventDefault={() => {
                              close();
                              window.location.href = `/articles/${article.id}/edit`;
                            }}
                          >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </a>
                          {#if deletingArticleId === article.id}
                            <div class="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-700/50 rounded-full">
                              <button
                                type="button"
                                class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                on:click={() => deletingArticleId = null}
                                disabled={loading}
                                aria-label="取消删除"
                              >
                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <line x1="18" x2="6" y1="6" y2="18" />
                                  <line x1="6" x2="18" y1="6" y2="18" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                on:click={() => deleteArticle(article.id)}
                                disabled={loading}
                                aria-label="确认删除"
                              >
                                {#if loading}
                                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                                  </svg>
                                {:else}
                                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                {/if}
                              </button>
                            </div>
                          {:else}
                            <button
                              type="button"
                              class="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                              on:click={() => deletingArticleId = article.id}
                              disabled={loading}
                              aria-label="删除文章"
                            >
                              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else if currentSection === 'comments'}
              <!-- 我的评论部分 -->
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">我的评论</h3>
                {/if}
                {#if loading}
                  <div class="flex justify-center py-12">
                    <svg class="w-8 h-8 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                    </svg>
                  </div>
                {:else if !comments.length}
                  <div class="flex flex-col items-center justify-center py-20">
                    <svg class="w-16 h-16 text-zinc-300 dark:text-zinc-600 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p class="text-zinc-500 dark:text-zinc-400">还没有发表过评论</p>
                  </div>
                {:else}
                  <div class="space-y-4">
                    {#each comments as comment (comment.id)}
                      <div class="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-zinc-800/50 backdrop-blur-[1px] group {comment.visibility === 'hidden' ? 'opacity-50' : ''} transition-opacity">
                        <div class="flex-1 min-w-0">
                          <div class="text-zinc-900 dark:text-white whitespace-pre-wrap break-words">
                            {comment.content}
                          </div>
                          <div class="mt-2 flex items-center text-sm text-zinc-500 dark:text-zinc-400 space-x-4">
                            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            <a 
                              href="/articles/{comment.articleId}" 
                              class="hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                              on:click|preventDefault={() => {
                                close();
                                window.location.href = `/articles/${comment.articleId}`;
                              }}
                            >
                              评论于：{comment.articleTitle}
                            </a>
                          </div>
                        </div>
                        <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <!-- 可见性控制按钮 -->
                          {#if comment.visibility === 'hidden'}
                            <button
                              type="button"
                              class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                              on:click={() => toggleCommentVisibility(comment.id)}
                              disabled={loading}
                              aria-label="显示评论"
                            >
                              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          {:else}
                            <button
                              type="button"
                              class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                              on:click={() => toggleCommentVisibility(comment.id)}
                              disabled={loading}
                              aria-label="隐藏评论"
                            >
                              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            </button>
                          {/if}
                          
                          {#if deletingCommentId === comment.id}
                            <div class="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-700/50 rounded-full">
                              <button
                                type="button"
                                class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                on:click={() => deletingCommentId = null}
                                disabled={loading}
                                aria-label="取消删除"
                              >
                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <line x1="18" x2="6" y1="6" y2="18" />
                                  <line x1="6" x2="18" y1="6" y2="18" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                on:click={() => deleteComment(comment.id)}
                                disabled={loading}
                                aria-label="确认删除"
                              >
                                {#if loading}
                                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                                  </svg>
                                {:else}
                                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                {/if}
                              </button>
                            </div>
                          {:else}
                            <button
                              type="button"
                              class="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                              on:click={() => startDeleteComment(comment.id)}
                              disabled={loading}
                              aria-label="删除评论"
                            >
                              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else if currentSection === 'security'}
              <!-- 安全设置部分 -->
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">安全设置</h3>
                {/if}
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
                        class="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
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
            {:else if currentSection === 'danger'}
              <!-- 危险区域 -->
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">危险区域</h3>
                {/if}
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

  /* 添加移动端过渡动画 */
  @media (max-width: 767px) {
    .modal-open {
      animation: modal-slide-in 0.2s ease-out;
    }
    
    .modal-closing {
      animation: modal-slide-out 0.2s ease-in;
    }
  }
  
  @keyframes modal-slide-in {
    from {
      opacity: 0;
      transform: translateX(-100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes modal-slide-out {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-100%);
    }
  }

  /* 优化滚动条样式 */
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  :global(.dark) ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* 隐藏滚动条但保持可滚动 */
  .scrollbar-none {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
</style> 