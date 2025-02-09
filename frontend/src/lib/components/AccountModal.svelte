<!-- AccountModal.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth } from '../stores/auth';
  import { userApi } from '../utils/api';
  import { env } from '$env/dynamic/public';
  import { invalidate } from '$app/navigation';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/utils/toast';
  import { getImageUrl } from '$lib/utils/api';
  import { t } from '$lib/i18n';
  import { locale, toggleLocale } from '$lib/i18n';
  import LanguageSettings from './LanguageSettings.svelte';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let dialogRef;
  let isClosing = false;
  let fileInput;
  let avatarTimestamp = Date.now();
  let currentSection = 'profile'; // 'profile' | 'settings' | 'security'
  
  let editingField = null;
  let editForm = {
    username: $auth.user?.username || '',
    realName: $auth.user?.realName || '',
    dateOfBirth: $auth.user?.dateOfBirth || '',
    bio: $auth.user?.bio || '',
    avatarUrl: getImageUrl($auth.user?.avatarUrl)
  };
  
  let tempEditValue = '';
  let editingRef;
  
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  const REALNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_\s]{2,20}$/;
  
  let validationState = {
    username: true,
    realName: true,
    dateOfBirth: true,
    bio: true
  };
  
  function validateField(field, value) {
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
        return value.length <= 100; // 限制bio最大长度为100字符
      default:
        return true;
    }
  }
  
  function startEditing(field) {
    editingField = field;
    if (field === 'dateOfBirth') {
      tempEditValue = editForm.dateOfBirth || '';
    } else {
      tempEditValue = editForm[field];
    }
    validationState[field] = validateField(field, tempEditValue);
    setTimeout(() => {
      const input = document.querySelector(`[data-field="${field}"]`);
      if (input) {
        input.focus();
      }
    }, 0);
  }
  
  function cancelEditing() {
    editingField = null;
    tempEditValue = '';
  }
  
  function close() {
    isClosing = true;
    setTimeout(() => {
      if (dialogRef) {
        dialogRef.close();
      }
      dispatch('close');
      isClosing = false;
      currentSection = 'profile';
    }, 200);
  }
  
  let avatarKey = '';
  
  onMount(() => {
    if (browser) {
      avatarKey = 'app:avatar';
    }
  });

  function getAvatarUrl(userId) {
    if (!userId) return '/logo.png';
    const url = `${env.PUBLIC_API_URL}/api/users/${userId}/avatar?t=${avatarTimestamp}`;
    console.log('AccountModal generating avatar URL:', url);
    return url;
  }

  $: if (avatarKey) {
    // 强制组件重新渲染
  }

  function resetForms() {
    const timestamp = Date.now();
    editForm = {
      username: $auth.user?.username || '',
      realName: $auth.user?.realName || '',
      dateOfBirth: $auth.user?.dateOfBirth || '',
      bio: $auth.user?.bio || '',
      avatarUrl: getAvatarUrl(getUserId($auth.user))
    };
  }

  $: if ($auth.user) {
    editForm = {
      username: $auth.user.username || '',
      realName: $auth.user.realName || '',
      dateOfBirth: $auth.user.dateOfBirth || '',
      bio: $auth.user.bio || '',
      avatarUrl: getAvatarUrl(getUserId($auth.user))
    };
  }

  $: if (editingField && tempEditValue !== undefined) {
    validationState[editingField] = validateField(editingField, tempEditValue);
  }

  let error = '';
  let success = '';
  
  // 添加吐司消息自动消失的函数
  function showToast(type, message, duration = 3000) {
    if (type === 'error') {
      error = message;
      setTimeout(() => {
        error = '';
      }, duration);
    } else if (type === 'success') {
      success = message;
      setTimeout(() => {
        success = '';
      }, duration);
    }
  }

  async function saveField(field) {
    if (!validationState[field]) return;
    
    try {
      loading = true;
      error = '';
      const updatedUser = await userApi.updateProfile({
        ...editForm,
        [field]: tempEditValue
      });
      
      auth.updateUser({
        ...($auth.user || {}),
        ...updatedUser,
        id: Number(updatedUser.id)
      });
      
      editForm = {
        username: updatedUser.username || '',
        realName: updatedUser.realName || '',
        dateOfBirth: updatedUser.dateOfBirth || '',
        bio: updatedUser.bio || '',
        avatarUrl: editForm.avatarUrl
      };
      
      editingField = null;
      showToast('success', $t('account.updateSuccess'));
    } catch (err) {
      showToast('error', err.message);
    } finally {
      loading = false;
    }
  }

  function getUserId(user) {
    if (!user?.id) return null;
    const id = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    return isNaN(id) ? null : id;
  }

  async function handleAvatarUpload(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error = 'Please upload an image file';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error = 'Image size cannot exceed 2MB';
      return;
    }

    try {
      loading = true;
      error = '';
      const formData = new FormData();
      formData.append('avatar', file);
      
      console.log('Starting avatar upload...');
      const updatedUser = await userApi.uploadAvatar(formData);
      console.log('Avatar upload successful:', updatedUser);
      
      const currentUserId = getUserId($auth.user);
      
      avatarTimestamp = Date.now();
      
      auth.updateUser({
        ...($auth.user || {}),
        ...updatedUser,
        id: currentUserId
      });
      
      await invalidate('app:avatar');
      
      dispatch('avatarUpdate');
      
      editForm = {
        username: $auth.user?.username || '',
        realName: $auth.user?.realName || '',
        dateOfBirth: $auth.user?.dateOfBirth || '',
        bio: $auth.user?.bio || '',
        avatarUrl: getAvatarUrl(currentUserId)
      };

      success = $t('account.updateSuccess');
      setTimeout(() => {
        success = '';
      }, 2000);
    } catch (err) {
      console.log('Avatar upload failed:', err);
      error = err.message;
    } finally {
      loading = false;
      target.value = '';
    }
  }
  
  let isChangingPassword = false;
  let passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  let isDeleting = false;
  let deleteForm = {
    password: '',
    deleteArticles: true,
    deleteComments: true
  };
  
  let loading = false;

  let comments = [];
  
  async function loadUserArticles() {
    try {
      loading = true;
      error = '';
      const userId = getUserId($auth.user);
      if (!userId) {
        error = 'Unable to get user ID';
        return;
      }
      const result = await userApi.getUserArticles(userId);
      auth.updateUser({
        ...($auth.user || {}),
        articles: result.items
      });
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadUserComments() {
    try {
      loading = true;
      error = '';
      const userId = getUserId($auth.user);
      if (!userId) {
        error = 'Unable to get user ID';
        return;
      }
      const result = await userApi.getUserComments(userId);
      comments = result.items;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  $: if (currentSection === 'articles') {
    loadUserArticles();
  }

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

  async function saveProfile() {
    try {
      loading = true;
      error = '';
      const updatedUser = await userApi.updateProfile(editForm);
      auth.updateUser(updatedUser);
      success = $t('account.updateSuccess');
      setTimeout(() => {
        success = '';
      }, 3000);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', $t('validation.passwordMismatch'));
      return;
    }
    
    try {
      loading = true;
      error = '';
      await userApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      showToast('success', $t('success.passwordChanged'));
      isChangingPassword = false;
      passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    } catch (err) {
      showToast('error', err.message);
    } finally {
      loading = false;
    }
  }

  async function deleteAccount() {
    if (!deleteForm.password) {
      showToast('error', $t('validation.passwordRequired'));
      return;
    }

    if (!confirm($t('account.deleteConfirm'))) {
      return;
    }

    try {
      loading = true;
      error = '';
      await userApi.deleteAccount({
        password: deleteForm.password,
        deleteArticles: deleteForm.deleteArticles,
        deleteComments: deleteForm.deleteComments
      });
      auth.logout();
      close();
    } catch (err) {
      console.error('删除账号失败:', err);
      showToast('error', err.message);
    } finally {
      loading = false;
    }
  }

  let deletingArticleId = null;

  function startDelete(articleId) {
    if (deletingArticleId === articleId) {
      deleteArticle(articleId);
    } else {
      deletingArticleId = articleId;
      setTimeout(() => {
        if (deletingArticleId === articleId) {
          deletingArticleId = null;
        }
      }, 3000);
    }
  }

  async function deleteArticle(articleId) {
    try {
      loading = true;
      
      if ($auth.user?.articles) {
        auth.updateUser({
          ...($auth.user || {}),
          articles: $auth.user.articles.filter(article => article.id !== articleId)
        });
      }
      
      await userApi.deleteArticle(articleId);
      
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/articles/') && currentPath !== '/articles') {
        window.location.href = '/articles';
      }
      
    } catch (error) {
      console.error('Failed to delete article:', error);
      await loadUserArticles();
    } finally {
      loading = false;
      deletingArticleId = null;
    }
  }

  let deletingCommentId = null;

  function startDeleteComment(commentId) {
    if (deletingCommentId === commentId) {
      deleteComment(commentId);
    } else {
      deletingCommentId = commentId;
      setTimeout(() => {
        if (deletingCommentId === commentId) {
          deletingCommentId = null;
        }
      }, 3000);
    }
  }

  async function deleteComment(commentId) {
    try {
      comments = comments.filter(comment => comment.id !== commentId);
      await userApi.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      error = error.message || 'Failed to delete comment';
      comments = [...comments];
    } finally {
      loading = false;
      deletingCommentId = null;
    }
  }

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

  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });

  function handleArticleClick(articleId) {
    close();
    window.location.href = `/articles/${articleId}`;
  }

  let isMobile;
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

  let dateForm = {
    year: '',
    month: '',
    day: ''
  };
  
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return $t('common.dateFormat', {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    });
  }
  
  function handleDateInput(event) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length >= 4) value = value.slice(0, 4) + (value.length > 4 ? '-' : '') + value.slice(4);
    if (value.length >= 7) value = value.slice(0, 7) + (value.length > 7 ? '-' : '') + value.slice(7);
    input.value = value;
    tempEditValue = value;
    validationState.dateOfBirth = validateField('dateOfBirth', value);
  }

  function handleSectionChange(section) {
    currentSection = section;
    if (isMobile) {
      showContent = true;
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  async function toggleCommentVisibility(commentId) {
    try {
      const targetComment = comments.find(c => c.id === commentId);
      if (!targetComment) return;

      const newVisibility = targetComment.visibility === 'visible' ? 'hidden' : 'visible';
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, visibility: newVisibility }
          : comment
      );
      
      const response = await fetch(`/api/comments/${commentId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${$auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, visibility: targetComment.visibility }
            : comment
        );
        throw new Error('Failed to toggle comment visibility');
      }

      const updatedComment = await response.json();
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, visibility: updatedComment.visibility }
          : comment
      );
    } catch (err) {
      console.log('Failed to toggle comment visibility:', err);
    }
  }

  function handleClickOutside(event) {
    if (editingField && editingRef && !editingRef.contains(event.target)) {
      cancelEditing();
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
  <div class="h-full overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="fixed inset-0 bg-zinc-50/80 backdrop-blur-sm dark:bg-zinc-900/80"></div>
      <button
        class="fixed inset-0 w-full h-full bg-transparent cursor-default"
        on:click={close}
        aria-label={$t('account.closeDialog')}
      ></button>

      <div class="relative bg-white/90 dark:bg-zinc-800/90 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full {isMobile ? 'max-w-sm' : 'max-w-4xl'} h-[600px] flex overflow-hidden {isClosing ? 'modal-closing' : 'modal-open'}">
        <!-- 左侧边栏 -->
        <div class="w-full md:w-64 flex flex-col {showContent && isMobile ? 'hidden' : ''}">
          <div class="flex-1 p-6 space-y-6">
            <!-- 用户信息 -->
            <div class="flex items-center space-x-3">
              <!-- 小头像和在线状态 -->
              <div class="relative">
                {#if $auth.user?.avatarUrl}
                  <img
                    src={getImageUrl($auth.user.avatarUrl)}
                    alt={$auth.user?.username || $t('account.unknownUser')}
                    class="h-12 w-12 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50"
                  />
                {:else}
                  <div class="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <span class="text-zinc-500 dark:text-zinc-400 text-lg font-medium uppercase">
                      {$auth.user?.username?.[0] || '?'}
                    </span>
                  </div>
                {/if}
                <!-- 在线状态指示器 -->
                <div class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white dark:ring-zinc-800"></div>
              </div>
              <div>
                <p class="font-medium dark:text-white uppercase">{$auth.user?.username || $t('account.unknownUser')}</p>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">{$auth.user?.realName || ''}</p>
              </div>
            </div>

            <!-- 导航菜单 -->
            <nav class="space-y-1">
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'profile' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('profile')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{$t('account.profile')}</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'settings' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('settings')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
                <span>{$t('account.generalSettings')}</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'articles' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('articles')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span>{$t('account.articles')}</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'comments' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('comments')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{$t('account.comments')}</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'security' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('security')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{$t('account.security')}</span>
              </button>
              <button
                class="w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-3 {currentSection === 'danger' ? 'bg-zinc-100 dark:bg-zinc-700/70 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                on:click={() => handleSectionChange('danger')}
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <span>{$t('account.danger')}</span>
              </button>
            </nav>
          </div>

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
              <span>{$t('account.logout')}</span>
            </button>
          </div>
        </div>

        <div class="flex-1 relative {!showContent && isMobile ? 'hidden' : ''} p-8">
          {#if isMobile}
            <div class="fixed top-0 left-0 right-0 z-10 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700/50">
              <div class="h-14 px-4 flex items-center">
                <button
                  class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                  on:click={() => showContent = false}
                  aria-label={$t('common.back')}
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <h3 class="absolute left-1/2 -translate-x-1/2 text-base font-medium dark:text-white">
                  {currentSection === 'profile' ? $t('account.profile') : 
                   currentSection === 'articles' ? $t('account.articles') : 
                   currentSection === 'comments' ? $t('account.comments') : 
                   currentSection === 'security' ? $t('account.security') : 
                   currentSection === 'settings' ? $t('account.generalSettings') :
                   $t('account.danger')}
                </h3>
              </div>
            </div>
          {/if}

          <div class="h-full overflow-y-auto {isMobile ? 'mt-14' : ''} scrollbar-none">
            <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
              {#if error}
                <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50/80 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-sm backdrop-blur-md shadow-lg shadow-red-900/10 dark:shadow-red-900/20 border border-red-100/50 dark:border-red-800/50 animate-in fade-in slide-in-from-top duration-300 transition-all">
                  <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="font-medium">{error}</span>
                </div>
              {/if}
              
              {#if success}
                <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50/80 dark:bg-green-900/20 text-green-600 dark:text-green-200 text-sm backdrop-blur-md shadow-lg shadow-green-900/10 dark:shadow-green-900/20 border border-green-100/50 dark:border-green-800/50 animate-in fade-in slide-in-from-top duration-300 transition-all">
                  <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="font-medium">{success}</span>
                </div>
              {/if}
            </div>

            {#if currentSection === 'profile'}
              <div class="space-y-8">
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.profile')}</h3>
                {/if}
                <div class="flex items-start space-x-4">
                  <div class="shrink-0">
                    <div class="relative group">
                      {#if $auth.user?.avatarUrl}
                        <img
                          src={getImageUrl($auth.user.avatarUrl)}
                          alt={$t('account.defaultAvatar')}
                          class="h-20 w-20 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50 transition-opacity group-hover:opacity-75"
                        />
                      {:else}
                        <div class="h-20 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span class="text-zinc-500 dark:text-zinc-400 text-lg font-medium uppercase">
                            {$auth.user?.username?.[0] || '?'}
                          </span>
                        </div>
                      {/if}
                      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          class="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors {loading ? 'opacity-50 cursor-not-allowed' : ''}"
                          on:click={() => fileInput.click()}
                          disabled={loading}
                          aria-label={$t('account.uploadAvatar')}
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
                    <h4 class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{$t('account.avatar')}</h4>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">{$t('account.avatarTip')}</p>
                  </div>
                </div>

                <div class="space-y-6">
                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">{$t('account.username')}</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'username'}
                        <div class="flex items-center space-x-2" bind:this={editingRef}>
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
                            aria-label={$t('common.save')}
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

                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">{$t('account.realName')}</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'realName'}
                        <div class="flex items-center space-x-2" bind:this={editingRef}>
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
                            aria-label={$t('common.save')}
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
                            <span class="text-zinc-400 dark:text-zinc-500 italic">{$t('common.noData')}</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">{$t('account.dateOfBirth')}</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'dateOfBirth'}
                        <div class="flex items-center space-x-2" bind:this={editingRef}>
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            data-field="dateOfBirth"
                            placeholder="YYYY-MM-DD"
                            pattern="\d{4}-\d{2}-\d{2}"
                            maxlength="10"
                            on:keydown={e => {
                              handleKeydown(e);
                              // 允许删除键和退格键
                              if (e.key === 'Backspace' || e.key === 'Delete') {
                                return;
                              }
                              
                              // 阻止非数字输入
                              if (!/^\d$/.test(e.key) && !['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                e.preventDefault();
                              }

                              // 按回车保存
                              if (e.key === 'Enter' && validationState.dateOfBirth) {
                                saveField('dateOfBirth');
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
                              tempEditValue = value;
                              validationState.dateOfBirth = validateField('dateOfBirth', value);
                            }}
                            class="block flex-1 h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 {!validationState.dateOfBirth ? 'border-red-300' : ''}"
                          />
                          <button
                            type="button"
                            class="p-1 {validationState.dateOfBirth ? 'text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300' : 'text-zinc-400 cursor-not-allowed'}"
                            on:click={() => validationState.dateOfBirth && saveField('dateOfBirth')}
                            disabled={!validationState.dateOfBirth}
                            aria-label={$t('common.save')}
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
                            <span class="text-zinc-400 dark:text-zinc-500 italic">{$t('common.noData')}</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <div class="flex {isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}">
                    <div class="{isMobile ? 'w-full' : 'w-32 shrink-0'}">
                      <span class="block text-sm font-medium text-zinc-500 dark:text-zinc-400">{$t('account.bio')}</span>
                    </div>
                    <div class="flex-1">
                      {#if editingField === 'bio'}
                        <div class="flex items-center space-x-2" bind:this={editingRef}>
                          <input
                            type="text"
                            bind:value={tempEditValue}
                            placeholder={$t('account.bioPlaceholder')}
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
                            aria-label={$t('common.save')}
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
                            <span class="text-zinc-900 dark:text-white truncate block" title={editForm.bio}>
                              {isMobile 
                                ? (editForm.bio.length > 25 ? editForm.bio.slice(0, 25) + '...' : editForm.bio)
                                : (editForm.bio.length > 50 ? editForm.bio.slice(0, 50) + '...' : editForm.bio)
                              }
                            </span>
                          {:else}
                            <span class="text-zinc-400 dark:text-zinc-500 italic">{$t('common.noData')}</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {:else if currentSection === 'settings'}
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.generalSettings')}</h3>
                {/if}
                <div class="space-y-4">
                  <LanguageSettings />
                </div>
              </div>
            {:else if currentSection === 'articles'}
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.articles')}</h3>
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
                    <p class="mb-6 text-zinc-500 dark:text-zinc-400">{$t('account.noArticles')}</p>
                    <a 
                      href="/publish" 
                      class="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                      on:click={close}
                    >
                      {$t('account.writeArticle')}
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
                            <span>{$t('article.views')} {article.viewCount || 0}</span>
                            <span>{$t('article.comments')} {article.commentCount || 0}</span>
                          </div>
                        </div>
                        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href="/articles/{article.id}/edit"
                            class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                            aria-label={$t('account.editArticle')}
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
                                aria-label={$t('account.cancelDelete')}
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
                                aria-label={$t('account.confirmDelete')}
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
                              aria-label={$t('account.deleteArticle')}
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
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.comments')}</h3>
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
                    <p class="text-zinc-500 dark:text-zinc-400">{$t('account.noComments')}</p>
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
                              {$t('account.commentOn', { title: comment.articleTitle })}
                            </a>
                          </div>
                        </div>
                        <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {#if comment.visibility === 'hidden'}
                            <button
                              type="button"
                              class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                              on:click={() => toggleCommentVisibility(comment.id)}
                              disabled={loading}
                              aria-label={$t('account.showComment')}
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
                              aria-label={$t('account.hideComment')}
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
                                aria-label={$t('account.cancelDelete')}
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
                                aria-label={$t('account.confirmDelete')}
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
                              aria-label={$t('account.deleteComment')}
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
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.security')}</h3>
                {/if}
                <div class="space-y-6">
                  <div class="space-y-4">
                    <div>
                      <label for="currentPassword" class="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{$t('account.currentPassword')}</label>
                      <input
                        type="password"
                        id="currentPassword"
                        bind:value={passwordForm.currentPassword}
                        class="block w-full h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label for="newPassword" class="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{$t('account.newPassword')}</label>
                      <input
                        type="password"
                        id="newPassword"
                        bind:value={passwordForm.newPassword}
                        class="block w-full h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label for="confirmPassword" class="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{$t('account.confirmPassword')}</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        bind:value={passwordForm.confirmPassword}
                        class="block w-full h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                      />
                    </div>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      on:click={changePassword}
                      disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    >
                      {#if loading}
                        <span class="flex items-center justify-center">
                          <svg class="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                          </svg>
                          {$t('account.changing')}
                        </span>
                      {:else}
                        {$t('account.changePassword')}
                      {/if}
                    </button>
                  </div>
                </div>
              </div>
            {:else if currentSection === 'danger'}
              <div>
                {#if !isMobile}
                  <h3 class="text-lg font-semibold mb-8 dark:text-white">{$t('account.danger')}</h3>
                {/if}
                <div class="space-y-6">
                  <div class="space-y-4">
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">{$t('account.dangerZoneDesc')}</p>
                    <div>
                      <label for="deletePassword" class="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{$t('account.password')}</label>
                      <input
                        type="password"
                        id="deletePassword"
                        bind:value={deleteForm.password}
                        class="block w-full h-[38px] rounded-md border-zinc-300 bg-white/50 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                        placeholder={$t('account.enterPassword')}
                      />
                    </div>
                    <div class="space-y-2">
                      <div class="flex items-center">
                        <input
                          type="checkbox"
                          id="deleteArticles"
                          bind:checked={deleteForm.deleteArticles}
                          class="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50"
                        />
                        <label for="deleteArticles" class="ml-2 block text-sm text-zinc-500 dark:text-zinc-400">{$t('account.deleteArticlesConfirm')}</label>
                      </div>
                      <div class="flex items-center">
                        <input
                          type="checkbox"
                          id="deleteComments"
                          bind:checked={deleteForm.deleteComments}
                          class="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50"
                        />
                        <label for="deleteComments" class="ml-2 block text-sm text-zinc-500 dark:text-zinc-400">{$t('account.deleteCommentsConfirm')}</label>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      on:click={deleteAccount}
                      disabled={loading || !deleteForm.password}
                    >
                      {#if loading}
                        <span class="flex items-center justify-center">
                          <svg class="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                          </svg>
                          {$t('account.deleting')}
                        </span>
                      {:else}
                        {$t('account.deleteAccount')}
                      {/if}
                    </button>
                  </div>
                </div>
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

  .scrollbar-none {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
</style>
