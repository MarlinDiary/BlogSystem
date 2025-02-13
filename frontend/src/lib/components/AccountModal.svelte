<script>
    //import function from Svelte
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    //import auth store that be used to manage user authentication status
    import { auth } from '../stores/auth';
    //import API tool function related to user
    import { userApi } from '../utils/api';
    //import environment variables to visit public government variable
    import { env } from '$env/dynamic/public';
    //import function to make cache invaliable
    import { invalidate } from '$app/navigation';
    //import boolean variable to check if some code run in browser environment 
    import { browser } from '$app/environment';
    //import navigation function to different pages
    import { goto } from '$app/navigation';
    //import function to get picture URL
    import { getImageUrl } from '$lib/utils/api';
    //import translation function
    import { t } from '$lib/i18n';
    //import function to locate language function and change language function
    import { locale, toggleLocale } from '$lib/i18n';
    //import components to settle languages
    import LanguageSettings from './LanguageSettings.svelte';
    import Portal from './Portal.svelte';
    import { fade, scale } from 'svelte/transition';
    import { quartOut, quartIn } from 'svelte/easing';
    //export variable to show if it is open
    export let isOpen = false;
    
    const dispatch = createEventDispatcher();
    let dialogRef;//a reference to dialog DOM element
    let isClosing = false;//indicate whether dialog is closing
    let fileInput;//A reference to a file input DOM element
    let avatarTimestamp = Date.now();//timestamp to prevent caching image
    let currentSection = 'profile'; //it maybe 'profile' | 'settings' | 'security'
    let portalContainer;

    $: if (browser && !portalContainer) {
      portalContainer = document.body;
    }
    
    let editingField = null;//nitially set to null, indicate field which is currently editing
    //create an object to store user editing form, get from auth and initial form fields
    let editForm = {
      username: $auth.user?.username || '',
      realName: $auth.user?.realName || '',
      dateOfBirth: $auth.user?.dateOfBirth || '',
      bio: $auth.user?.bio || '',
      avatarUrl: getImageUrl($auth.user?.avatarUrl)
    };
    
    let tempEditValue = '';//A temporary variable to store the value of the field being edited
    let editingRef;//A reference to the DOM element of the field being edited
    
    //verify if username if fit requests: length:3-20, only a-z, 0-9, _
    function isUsernameValid(username) {
      return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
    }
    //verify if realname if fit requests: length:2-20, only a-z, 0-9, _ and ''
    function isRealNameValid(realName) {
      return realName.length >= 2 && realName.length <= 20 && /^[\u4e00-\u9fa5a-zA-Z0-9_\s]+$/.test(realName);
    }

    //define an validationState object and check if form field is valiable
    let validationState = {
      username: true,
      realName: true,
      dateOfBirth: true,
      bio: true
    };
    
    //verify username and realname
    validationState.username = isUsernameValid(editForm.username);
    validationState.realName = isRealNameValid(editForm.realName);
    //check if input fields is ok
    function validateField(field, value) {
        if (field === 'username') {
    //if username if fit requests: length:3-20, only a-z, 0-9, _
    if (value.length >= 3 && value.length <= 20) {
      for (let i = 0; i < value.length; i++) {
        if (!/[a-zA-Z0-9_]/.test(value[i])) {
          return false;
        }
      }
      return true;
    }
  }
  
  if (field === 'realName') {
    // realname can be null or fit length
    if (value === '') {
      return true;
    }
    if (value.length >= 2 && value.length <= 20) {
      return true;
    }
  }
  
  if (field === 'dateOfBirth') {
    // 如果日期为空可以通过验证
    if (value === '') {
        return true;
    }
    // 检查日期格式是否正确 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    // 检查日期是否在今天之前
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date <= today && !isNaN(date.getTime())) {
        return true;
    }
    return false;
  }
  
  if (field === 'bio') {
    // check if length is shorter than 100
    if (value.length <= 100) {
      return true;
    }
  }
  
  return false; // if default status if false
}
    //start begin editing
    function startEditing(field) {
      editingField = field;
    //store editing field
      if (field === 'dateOfBirth') {
        tempEditValue = editForm.dateOfBirth || '';
      } else {
        tempEditValue = editForm[field];
      }
    //check if current field is ok
      validationState[field] = validateField(field, tempEditValue);
    //delay set focus for input
      setTimeout(function() {
        const input = document.querySelector('[data-field="' + field + '"]');;
        if (input) {
          input.focus();
        }
      }, 0);
    }
    //cancel editing and delete temporate value
    function cancelEditing() {
      editingField = null;
      tempEditValue = '';
    }
    
    function close() {
      isClosing = true;
      setTimeout(() => {
        dispatch('close');
        isClosing = false;
      }, 200);
    }
    
    let avatarKey = '';//inital avatar
    
    onMount(function() {
    //check if in browser environment
      if (browser) {
        avatarKey = 'app:avatar';
      }
    });
  
    //get avatar URL
    function getAvatarUrl(userId) {
    //if dont have, return default picture
      if (!userId) return '/logo.png';
    //bulid avatar URL add timestamp to avoid caching
      const url = env.PUBLIC_API_URL + '/api/users/' + userId + '/avatar?t=' + avatarTimestamp;
      console.log('AccountModal generating avatar URL:', url);
      return url;//return new avatar url
    }
  
    $: if (avatarKey) {
      // if avatar change, Force component to re-render
    }
    //reset form data
    function resetForms() {
      const timestamp = Date.now();
      //change form with default information
      editForm = {
        username: $auth.user?.username || '',
        realName: $auth.user?.realName || '',
        dateOfBirth: $auth.user?.dateOfBirth?.split('T')[0] || '',
        bio: $auth.user?.bio || '',
        avatarUrl: getAvatarUrl(getUserId($auth.user))
      };
    }
    //reaction:the following code will excute automatically when field(relied on) change
    $: if ($auth.user) {
    //check exist,then excute the following code, or the code invaliable
        editForm = {
        username: $auth.user.username || '',
        realName: $auth.user.realName || '',
        dateOfBirth: $auth.user.dateOfBirth?.split('T')[0] || '',
        bio: $auth.user.bio || '',
        avatarUrl: getAvatarUrl(getUserId($auth.user))//get avatar URL by ID
      };
    }
    //reaction: field existing and undefined will execute the following code
    $: if (editingField && tempEditValue !== undefined) {
    //call validatefield function to verify, store verified result in validationstate field
        validationState[editingField] = validateField(editingField, tempEditValue);
    }
  
    //initally error and field 
    let error = '';
    let success = '';
    
    //添加吐司消息自动消失的函数
    function showToast(type, message, duration = 3000) {
        if (duration === undefined) {
    duration = 3000;  //defined duration is 3000(毫秒)
  }
  
  if (type === 'error') {
    error = message;  //set wrong data
    setTimeout(function() {
      error = '';  //delete wrong data after duration
    }, duration);
  } else if (type === 'success') {
    success = message;  //set success
    setTimeout(function() {
      success = '';  //delete success data after duration
    }, duration);
  }
}
  
    async function saveField(field) {
      if (!validationState[field]) 
      return;
      
      try {
        loading = true;
        error = '';
        
        // 对日期进行特殊处理，确保只发送日期部分
        let fieldValue = tempEditValue;
        if (field === 'dateOfBirth' && fieldValue) {
          const date = new Date(fieldValue);
          if (!isNaN(date.getTime())) {
            fieldValue = date.toISOString().split('T')[0];
          }
        }

        const updatedUser = await userApi.updateProfile({
          ...editForm,
          [field]: fieldValue
        });

        // 更新用户数据时确保日期格式正确
        if (updatedUser.dateOfBirth) {
          updatedUser.dateOfBirth = updatedUser.dateOfBirth.split('T')[0];
        }

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
      if (!user || !user.id) {
        return null;  //if no user or id, return null
      }

    let id = user.id;  //get id
    if (typeof id === 'string') {
      id = parseInt(id);  //change string to integer
      }

    if (isNaN(id)) {
      return null;  //if id is not an available number, return null
     }

    return id;  // return user valiable ID
    }
  
    //get uploaded document
    async function handleAvatarUpload(event) {
      const target = event.target;
    //make sure files exist
      const file = target.files && target.files[0]; 
      if (!file) {
      return;
      }
      //check if document type is image
      if (!file.type.startsWith('image/')) {
        error = 'Please upload an image file';//set error
        return;//if not image, stop excute
      }
      //check if size over 2MB
      if (file.size > 2 * 1024 * 1024) {
        error = 'Image size cannot exceed 2MB';//set error
        return;//if too big, stop excute
      }
      //begin load
      try {
        loading = true;//set status is loading
        error = '';//delete error
        const formData = new FormData();//create a new object
        formData.append('avatar', file);//store the new document to Formdata
        
        console.log('Starting avatar upload...');//print begin uploading
        const updatedUser = await userApi.uploadAvatar(formData);//upload avatar API
        console.log('Avatar upload successful:', updatedUser);//print uploading success
        
        const currentUserId = getUserId($auth.user);
        
        avatarTimestamp = Date.now();
        
        auth.updateUser({
          ...($auth.user || {}),
          ...updatedUser,
          id: currentUserId
        });
        //re-render component
        await invalidate('app:avatar');
        //trigger event that update avatar
        dispatch('avatarUpdate');
        
        //update user form
        editForm = {
          username: $auth.user && $auth.user.username ? $auth.user.username : '',  
          realName: $auth.user && $auth.user.realName ? $auth.user.realName : '',  
          dateOfBirth: $auth.user && $auth.user.dateOfBirth ? $auth.user.dateOfBirth : '',  
          bio: $auth.user && $auth.user.bio ? $auth.user.bio : '',  
          avatarUrl: getAvatarUrl(currentUserId)
        };
  
        //set success message
        success = $t('account.updateSuccess');//get and reveal success
        setTimeout(function() {
          success = '';  //delete success message after 2s
        }, 2000);
      } catch (err) {
        console.log('Avatar upload failed:', err);//print error message
        error = err.message;//set error meaasge
      } finally {
        loading = false;//finish uploading, then stop loading
        target.value = '';//delete target value
      }
    }
    //change password
    let isChangingPassword = false;
    let passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    //delete somenthing
    let isDeleting = false;
    let deleteForm = {
      password: '',
      deleteArticles: true,  // 将始终为 true
      deleteComments: true   // 将始终为 true
    };
    
    let loading = false;
  
    let comments = [];
    //load userarticles
    async function loadUserArticles() {
      try {
        loading = true;//begin loading
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
    //load usercomments
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
        comments = result.items;//set comment list
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
    // load article/comment depend on current page
    $: if (currentSection === 'articles') {
      loadUserArticles();
    }
  
    $: if (currentSection === 'comments') {
      loadUserComments();
    }
    //close dialog
    function handleClose() {
      if (dialogRef) {
        close();
      }
    }
    //log out
    function handleLogout() {
      auth.logout();
      close();
    }
    //save profile
    async function saveProfile() {
      try {
        loading = true;
        error = '';
        const updatedUser = await userApi.updateProfile(editForm);
        auth.updateUser(updatedUser);
        success = $t('account.updateSuccess');
        setTimeout(function() { //delete message after 3s
          success = '';
        }, 3000);
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  
    async function changePassword() {
    //check if new password is the same as the confirm password
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {//if not match
        showToast('error', $t('validation.passwordMismatch'));
        return;//stop excute
      }
      
      try {
        loading = true;
        error = '';
        await userApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);//call interface to change password
        showToast('success', $t('success.passwordChanged'));//reveal success message
        isChangingPassword = false;//finish change password
        //clear password form
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
      if (!deleteForm.password) {//if not input password
        showToast('error', $t('validation.passwordRequired'));//tell need to input password
        return;//stop excute
      }
    //confirm if delete
      if (!confirm($t('account.deleteConfirm'))) {
        return;//if not confirm, stop excute
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
    //when deleting article, mark deleted article ID
    let deletingArticleId = null;
    //start delete article
    function startDelete(articleId) {
      if (deletingArticleId === articleId) {
        deleteArticle(articleId);
      } else {
        deletingArticleId = articleId;
        setTimeout(function() {//if not delete after 3s, clear mark
          if (deletingArticleId === articleId) {
            deletingArticleId = null;//delete deleting article ID
          }
        }, 3000);
      }
    }
    //delete article
    async function deleteArticle(articleId) {
      try {
        loading = true;
        
        if ($auth.user?.articles) {
          auth.updateUser({
            ...($auth.user || {}),
            articles: $auth.user.articles.filter(article => article.id !== articleId)
          });
        }
        
        await userApi.deleteArticle(articleId);//call interface to delete article
        
        const currentPath = window.location.pathname;//get current page path
        if (currentPath.startsWith('/articles/') && currentPath !== '/articles') {
          window.location.href = '/articles';//if current page is one article,change to article list page
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
        setTimeout(function() {
          if (deletingCommentId === commentId) {
            deletingCommentId = null;
          }
        }, 3000);
      }
    }
  
    async function deleteComment(commentId) {
      try {
        comments = comments.filter(function(comment) {
          return comment.id !== commentId;
        });

    //call API to delete comment
        await userApi.deleteComment(commentId);
      } catch (error) {
        console.error('Failed to delete comment:', error);  
        error = error.message || 'Failed to delete comment';  
    //if error,renew comment list
        comments = [...comments];
      } finally {
        loading = false;  
        deletingCommentId = null;  
      }
    }
    
    //depend isopen status to control dialog reveal or hidden
    $: if (isOpen) {
      isClosing = false;
      if (dialogRef) {
        document.body.style.overflow = 'hidden';//forbidden page overflow
        dialogRef.showModal();//reveal dialog
      }
    } else {
      if (dialogRef) {
        document.body.style.overflow = '';//permit page overflow
        if (!isClosing) {
          dialogRef.close();//close dialog
        }
      }
    }
    //clear overflow lock
    onMount(function() {
      return function() {
        document.body.style.overflow = '';
      };
    });
    //click article, close dialog and change to article page
    function handleArticleClick(articleId) {
      close();
      window.location.href = `/articles/${articleId}`;
    }
  
    let isMobile;//check if mobile
    let showContent = false;//check if content reveal
    
    //handle window size
    function handleResize() {
      isMobile = window.innerWidth < 768;
      if (!isMobile) {
        showContent = false;//if not mobile, hidden content
      }
    }
    
    onMount(function() {
      handleResize();
      window.addEventListener('resize', handleResize);
      return function() {
        window.removeEventListener('resize', handleResize);
        document.body.style.overflow = '';
      };
    });
    
    //date form
    let dateForm = {
      year: '',
      month: '',
      day: ''
    };
    
    //from past 100 years to now
    const years = [];
    for (let i = 0; i < 100; i++) {
      years.push(new Date().getFullYear() - i);  
    }

    //array from Jan to Dec
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(i);
    }

    //array from 1 to 31
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    
    function formatDate(dateStr) {
      if (!dateStr) return '';
      // 确保只处理日期部分
      const date = new Date(dateStr.split('T')[0]);
      if (isNaN(date.getTime())) return '';
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

    $: if (isOpen && browser) {
      document.body.style.overflow = 'hidden';
    } else if (browser) {
      document.body.style.overflow = '';
    }

    onDestroy(() => {
      if (browser) {
        document.body.style.overflow = '';
      }
    });
  </script>
  
  {#if isOpen && browser}
  <Portal target={portalContainer}>
    <div class="fixed inset-0 z-[999] overflow-hidden">
      <!-- Overlay layer -->
      <div
        role="button"
        tabindex="0"
        on:click={close}
        on:keydown={e => e.key === 'Escape' && close()}
        class="absolute inset-0 bg-zinc-800/40 backdrop-blur-sm dark:bg-black/80"
        in:fade={{ duration: 200 }}
        out:fade={{ duration: 150 }}
      ></div>

      <!-- Account card -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div 
          class="relative bg-white/90 dark:bg-zinc-800/90 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full {isMobile ? 'max-w-sm' : 'max-w-4xl'} h-[600px] flex overflow-hidden"
          in:scale={{ start: 0.95, duration: 150, easing: quartOut }}
          out:scale={{ start: 0.95, duration: 150, easing: quartIn }}
        >
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
  
          <div class="flex-1 relative {!showContent && isMobile ? 'hidden' : ''} {isMobile ? 'flex flex-col h-full' : 'p-8'}">
            {#if isMobile}
              <div class="flex-shrink-0 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700/50">
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
  
            <div class="h-full overflow-y-auto {isMobile ? 'flex-1 px-4 py-4' : ''} scrollbar-none">
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
                            <div class="text-zinc-900 dark:text-white">
                              <a 
                                href="/articles/{article.id}" 
                                class="block font-medium break-words hover:text-lime-600 dark:hover:text-lime-400 transition-colors {isMobile ? 'line-clamp-2' : 'truncate'}"
                                on:click|preventDefault={() => handleArticleClick(article.id)}
                              >
                                {article.title}
                              </a>
                            </div>
                            <div class="mt-2 flex items-center text-sm text-zinc-500 dark:text-zinc-400 space-x-4">
                              <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                              {#if !isMobile}
                              <span>{$t('article.views')} {article.viewCount || 0}</span>
                              <span>{$t('article.comments')} {article.commentCount || 0}</span>
                              {/if}
                            </div>
                          </div>
                          <div class="flex items-center ml-4 {isMobile ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity">
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
                        <div class="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-zinc-800/50 backdrop-blur-[1px] group transition-opacity">
                          <div class="flex-1 min-w-0 pr-2">
                            <div class="text-zinc-900 dark:text-white whitespace-pre-wrap break-words">
                              {comment.content.length > 60 ? comment.content.slice(0, 60) + '...' : comment.content}
                            </div>
                            <div class="mt-2 flex items-center text-sm text-zinc-500 dark:text-zinc-400 space-x-4">
                              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                              {#if !isMobile}
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
                              {/if}
                            </div>
                          </div>
                          <div class="flex items-center {isMobile ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity">
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
                      <p class="text-sm text-red-500 dark:text-red-400">{$t('account.deleteAllWarning')}</p>
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
  </Portal>
  {/if}
  
  <style>
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
  