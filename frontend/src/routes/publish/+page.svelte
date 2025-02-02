<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import TiptapImage from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import TextAlign from '@tiptap/extension-text-align';
  import Underline from '@tiptap/extension-underline';
  import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
  import { common, createLowlight } from 'lowlight';
  
  const lowlight = createLowlight(common);
  const API_BASE = 'http://localhost:3000/api';
  const SERVER_BASE = 'http://localhost:3000';
  
  // 从环境变量或其他安全位置获取API Key
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  let title = '';
  let content = '';
  let htmlContent = '';
  let imageUrl = '';
  let tags: string[] = [];
  let newTag = '';
  let loading = false;
  let error = '';
  let editor: Editor;
  let editorElement: HTMLElement;
  let imageUploading = false;
  let isGeneratingTags = false;
  let isDirty = false;
  const MAX_TITLE_LENGTH = 50;
  
  $: titleLength = title.length;
  $: isValidTitle = titleLength <= MAX_TITLE_LENGTH;
  
  // 监听内容变化
  $: {
    if (editor) {
      isDirty = true;
    }
  }

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3]
          }
        }),
        TiptapImage.configure({
          HTMLAttributes: {
            class: 'rounded-lg max-w-full',
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-lime-600 hover:text-lime-700 dark:text-lime-500 dark:hover:text-lime-400',
          },
        }),
        Placeholder.configure({
          placeholder: '开始写作...',
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Underline,
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: 'rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4',
          },
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-2',
        },
      },
      onUpdate: ({ editor }) => {
        content = editor.getText();
        htmlContent = editor.getHTML();
      },
    });
  });
  
  onDestroy(() => {
    editor?.destroy();
  });
  
  // 处理编辑器中的图片上传
  async function handleEditorImageUpload() {
    if (imageUploading) return;
    
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          imageUploading = true;
          const formData = new FormData();
          formData.append('image', file);

          const response = await fetch(`${API_BASE}/articles/images`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '上传失败' }));
            throw new Error(errorData.message || '上传失败');
          }

          const data = await response.json();
          const imageUrl = SERVER_BASE + data.url;
          
          // 先加载图片，确保图片可用
          await new Promise((resolve, reject) => {
            const imgElement = document.createElement('img');
            imgElement.onload = resolve;
            imgElement.onerror = reject;
            imgElement.src = imageUrl;
          });
          
          editor?.chain().focus().setImage({ 
            src: imageUrl, 
            alt: file.name,
            title: file.name 
          }).run();
        } catch (err) {
          console.error('上传图片失败:', err);
          error = err instanceof Error ? err.message : '上传失败';
        } finally {
          imageUploading = false;
        }
      }
    };
  }

  // 自动生成标签
  async function generateTags() {
    if (!title || isGeneratingTags) return;
    
    if (!OPENAI_API_KEY) {
      error = 'OpenAI API Key未配置，请联系管理员';
      return;
    }
    
    try {
      isGeneratingTags = true;
      error = '';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "你是一个专业的文章标签生成器。请根据文章标题生成3-5个相关的标签，每个标签不超过4个字。请直接返回标签，用逗号分隔。标签要简洁有力，突出文章主题。"
            },
            {
              role: "user",
              content: `文章标题：${title}`
            }
          ],
          temperature: 0.8,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error('生成标签失败');
      }

      const data = await response.json();
      const generatedTags = data.choices[0].message.content
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag);

      tags = [...new Set([...tags, ...generatedTags])];
    } catch (err) {
      console.error('生成标签失败:', err);
      error = err instanceof Error ? err.message : '生成标签失败';
    } finally {
      isGeneratingTags = false;
    }
  }
  
  async function uploadImage(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    
    try {
      const formData = new FormData();
      formData.append('cover', target.files[0]);
      
      const response = await fetch(`${API_BASE}/articles/cover`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '上传失败' }));
        throw new Error(errorData.message || '上传失败');
      }
      
      const data = await response.json();
      imageUrl = SERVER_BASE + data.url;
    } catch (err) {
      console.error('上传图片失败:', err);
      error = err instanceof Error ? err.message : '上传失败';
    }
  }
  
  async function handlePublish() {
    if (!title.trim()) {
      error = '请输入文章标题';
      return;
    }
    
    if (!content.trim()) {
      error = '请输入文章内容';
      return;
    }

    if (!imageUrl) {
      error = '请上传封面图片';
      return;
    }

    if (tags.length === 0) {
      error = '请至少添加一个标签';
      return;
    }
    
    try {
      loading = true;
      error = '';
      
      // 发送相对路径的 imageUrl
      const relativeImageUrl = imageUrl ? imageUrl.replace(SERVER_BASE, '') : '';
      
      const response = await fetch(`${API_BASE}/articles`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          content,
          htmlContent,
          imageUrl: relativeImageUrl,
          tags,
          status: 'published'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '发布失败' }));
        throw new Error(errorData.message || '发布失败');
      }
      
      const article = await response.json();
      isDirty = false;
      goto(`/articles/${article.id}`);
    } catch (err) {
      console.error('发布文章失败:', err);
      error = err instanceof Error ? err.message : '发布失败，请重试';
    } finally {
      loading = false;
    }
  }
  
  function addTag() {
    if (newTag && !tags.includes(newTag)) {
      if (newTag.length > 4) {
        error = '标签不能超过4个字';
        return;
      }
      tags = [...tags, newTag];
      newTag = '';
      error = '';
    }
  }
  
  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
  }
</script>

<style lang="postcss">
  /* TipTap 编辑器样式 */
  :global(.ProseMirror) {
    padding: 2rem;
    min-height: 500px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, transparent 100%);
  }
  
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #94a3b8;
    pointer-events: none;
    height: 0;
    font-style: italic;
  }
  
  :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    margin: 2rem 0;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
    transition: all 0.3s ease;
  }

  :global(.ProseMirror img:hover) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02);
  }
  
  /* 工具栏样式 */
  .editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom-width: 1px;
    border-color: rgb(228 228 231 / 0.5);
    background-color: rgba(255, 255, 255, 0.8);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }
  
  :global(.dark) .editor-toolbar {
    border-color: rgb(63 63 70 / 0.5);
    background-color: rgba(39, 39, 42, 0.8);
  }
  
  .toolbar-button {
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: rgb(82 82 91);
    font-weight: 500;
    min-width: 2.5rem;
    height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .toolbar-button::after {
    content: '';
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .toolbar-button:hover {
    background-color: rgb(244 244 245 / 0.8);
    transform: translateY(-1px);
  }
  
  .toolbar-button:hover::after {
    opacity: 0.08;
  }
  
  :global(.dark) .toolbar-button {
    color: rgb(212 212 216);
  }
  
  :global(.dark) .toolbar-button:hover {
    background-color: rgb(63 63 70 / 0.8);
  }
  
  .toolbar-button.is-active {
    background-color: rgb(244 244 245 / 0.9);
    color: rgb(101 163 13);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(101, 163, 13, 0.1);
  }
  
  :global(.dark) .toolbar-button.is-active {
    background-color: rgb(63 63 70 / 0.9);
    color: rgb(132 204 22);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(132, 204, 22, 0.2);
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* 编辑器内容样式优化 */
  :global(.ProseMirror h1) {
    font-size: 2.5rem;
    line-height: 1.2;
    margin: 2.5rem 0 1.5rem;
    font-weight: 800;
    background: linear-gradient(to right, #374151, #111827);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.025em;
  }

  :global(.dark) :global(.ProseMirror h1) {
    background: linear-gradient(to right, #e5e7eb, #f9fafb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global(.ProseMirror h2) {
    font-size: 2rem;
    line-height: 1.3;
    margin: 2rem 0 1.25rem;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: -0.025em;
  }

  :global(.dark) :global(.ProseMirror h2) {
    color: #f3f4f6;
  }

  :global(.ProseMirror p) {
    margin: 1.25rem 0;
    line-height: 1.8;
    color: #374151;
    font-size: 1.125rem;
  }

  :global(.dark) :global(.ProseMirror p) {
    color: #d1d5db;
  }

  :global(.ProseMirror ul, .ProseMirror ol) {
    margin: 1.25rem 0;
    padding-left: 1.75rem;
  }

  :global(.ProseMirror li) {
    margin: 0.75rem 0;
    line-height: 1.7;
  }

  :global(.ProseMirror pre) {
    margin: 2rem 0;
    padding: 1.5rem;
    border-radius: 0.75rem;
    background-color: rgb(244 244 245 / 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(0, 0, 0, 0.02);
  }

  :global(.dark) :global(.ProseMirror pre) {
    background-color: rgb(39 39 42 / 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    margin: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(163, 230, 53, 0.08);
    border-radius: 0.5rem;
    color: rgb(63, 98, 18);
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  :global(.dark) .tag-item {
    background: rgba(163, 230, 53, 0.1);
    color: rgb(163, 230, 53);
  }

  .tag-item:hover {
    background: rgba(163, 230, 53, 0.12);
  }

  :global(.dark) .tag-item:hover {
    background: rgba(163, 230, 53, 0.15);
  }

  .tag-item span {
    display: inline-flex;
    align-items: center;
  }

  .tag-item .remove-button {
    margin-left: 0.5rem;
    padding: 0.125rem;
    color: rgb(101, 163, 13);
    opacity: 0.5;
    transition: all 0.2s ease;
  }

  .tag-item:hover .remove-button {
    opacity: 0.8;
  }

  .tag-item .remove-button:hover {
    opacity: 1;
  }

  :global(.dark) .tag-item .remove-button {
    color: rgb(163, 230, 53);
  }

  .tags-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem;
    height: 100%;
    align-content: flex-start;
  }
</style>

<div class="mx-auto max-w-4xl px-4 py-12">
  <div class="space-y-12">
    <div class="text-center space-y-4">
      <h1 class="text-5xl font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100 bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-600 dark:from-zinc-100 dark:to-zinc-300">
        发布文章
      </h1>
      <p class="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
        分享你的想法，记录你的创作
      </p>
    </div>
    
    <div class="space-y-8">
      <!-- 错误提示 -->
      {#if error}
        <div class="rounded-xl bg-red-50 p-4 dark:bg-red-900/30 shadow-sm backdrop-blur-sm border border-red-100 dark:border-red-800">
          <div class="flex items-center">
            <svg class="h-5 w-5 text-red-400 dark:text-red-300 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        </div>
      {/if}
      
      <!-- 标题输入 -->
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <label for="title" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            文章标题
          </label>
          <span class="text-sm {titleLength > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-zinc-500'} dark:text-zinc-400">
            {titleLength}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <input
          id="title"
          type="text"
          bind:value={title}
          maxlength={MAX_TITLE_LENGTH}
          class="w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-lg text-zinc-800 shadow-sm backdrop-blur-sm transition-all duration-200 ease-in-out focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 hover:border-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800/80 dark:text-zinc-200 dark:focus:border-lime-400 dark:focus:ring-lime-400/20 dark:hover:border-zinc-600 {!isValidTitle ? 'border-red-300 dark:border-red-700' : ''}"
          placeholder="输入一个吸引人的标题..."
        />
      </div>
      
      <!-- 封面和标签区域 -->
      <div class="grid grid-cols-2 gap-6">
        <!-- 封面图片上传 -->
        <div>
          <label for="cover-image" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            封面图片
          </label>
          <div class="h-[240px]">
            {#if imageUrl}
              <div class="relative group h-full">
                <img 
                  src={imageUrl} 
                  alt="封面" 
                  class="h-full w-full object-cover rounded-xl shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md" 
                />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <label for="cover-image" class="cursor-pointer text-white text-sm font-medium px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                    更换封面
                  </label>
                </div>
              </div>
            {:else}
              <label 
                for="cover-image" 
                class="cursor-pointer flex flex-col items-center justify-center h-full w-full rounded-xl border-2 border-dashed border-zinc-200 bg-white/50 px-4 py-4 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-lime-500 hover:bg-lime-50/50 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:border-lime-400 dark:hover:bg-lime-950/50"
              >
                <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <div class="mt-4 flex text-sm text-zinc-600 dark:text-zinc-400">
                  <span>上传封面图片</span>
                </div>
                <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-500">点击或拖拽图片至此处</p>
              </label>
            {/if}
            <input
              id="cover-image"
              type="file"
              class="hidden"
              accept="image/*"
              on:change={uploadImage}
              aria-label="上传封面图片"
            />
          </div>
        </div>

        <!-- 文章标签 -->
        <div>
          <label for="tag-area" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            文章标签
          </label>
          <button 
            id="tag-area"
            type="button"
            class="h-[240px] w-full rounded-xl border-2 border-dashed border-zinc-200 bg-white/50 dark:border-zinc-700/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all duration-300 hover:border-lime-500 hover:bg-lime-50/50 dark:hover:border-lime-400 dark:hover:bg-lime-950/50 shadow-sm overflow-auto text-left"
            on:click={() => !isGeneratingTags && title && generateTags()}
            on:keydown={(e) => e.key === 'Enter' && !isGeneratingTags && title && generateTags()}
            disabled={isGeneratingTags || !title}
            aria-label="点击生成标签"
          >
            {#if tags.length > 0}
              <div class="tags-wrapper">
                {#each tags as tag}
                  <div class="tag-item">
                    <span>
                      <svg class="w-3.5 h-3.5 mr-1 text-lime-600/40 dark:text-lime-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      </svg>
                      {tag}
                    </span>
                    <button
                      class="remove-button"
                      on:click|stopPropagation={() => removeTag(tag)}
                      aria-label={`删除标签 ${tag}`}
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center h-full text-center p-4">
                {#if isGeneratingTags}
                  <div class="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">正在生成标签...</p>
                {:else if !title}
                  <svg class="w-12 h-12 text-zinc-400 dark:text-zinc-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">请先输入文章标题</p>
                {:else}
                  <svg class="w-12 h-12 text-zinc-400 dark:text-zinc-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">点击生成标签</p>
                  <p class="mt-1 text-xs text-zinc-400 dark:text-zinc-500">AI 将根据文章标题生成合适的标签</p>
                {/if}
              </div>
            {/if}
          </button>
        </div>
      </div>
      
      <!-- TipTap 编辑器 -->
      <div class="rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 overflow-hidden shadow-sm backdrop-blur-sm">
        <div class="editor-toolbar bg-gradient-to-b from-white to-white/95 dark:from-zinc-900 dark:to-zinc-900/95">
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('heading', { level: 1 })}
            on:click={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="标题 1"
            aria-label="标题 1"
          >
            H1
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('heading', { level: 2 })}
            on:click={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="标题 2"
            aria-label="标题 2"
          >
            H2
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('bold')}
            on:click={() => editor?.chain().focus().toggleBold().run()}
            title="加粗"
            aria-label="加粗"
          >
            B
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('italic')}
            on:click={() => editor?.chain().focus().toggleItalic().run()}
            title="斜体"
            aria-label="斜体"
          >
            I
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('underline')}
            on:click={() => editor?.chain().focus().toggleUnderline().run()}
            title="下划线"
            aria-label="下划线"
          >
            U
          </button>
          <button
            class="toolbar-button"
            on:click={handleEditorImageUpload}
            disabled={imageUploading}
            title="插入图片"
            aria-label="插入图片"
          >
            {#if imageUploading}
              <div class="w-5 h-5 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            {/if}
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('bulletList')}
            on:click={() => editor?.chain().focus().toggleBulletList().run()}
            title="无序列表"
            aria-label="无序列表"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('orderedList')}
            on:click={() => editor?.chain().focus().toggleOrderedList().run()}
            title="有序列表"
            aria-label="有序列表"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" />
            </svg>
          </button>
          <button
            class="toolbar-button"
            class:is-active={editor?.isActive('codeBlock')}
            on:click={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="代码块"
            aria-label="代码块"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>
        <div bind:this={editorElement} class="bg-white/95 dark:bg-zinc-900/95"></div>
      </div>
      
      <!-- 发布按钮 -->
      <div class="flex items-center justify-between pt-6">
        <div class="text-sm text-zinc-500 dark:text-zinc-400">
          {#if !title}
            <span class="inline-flex relative"><span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            <span class="ml-2">请输入文章标题</span>
          {:else if !content}
            <span class="inline-flex relative"><span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            <span class="ml-2">请输入文章内容</span>
          {:else if !imageUrl}
            <span class="inline-flex relative"><span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            <span class="ml-2">请上传封面图片</span>
          {:else if tags.length === 0}
            <span class="inline-flex relative"><span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            <span class="ml-2">请生成文章标签</span>
          {:else if !isDirty}
            <span class="text-zinc-400">✓ </span>文章已准备就绪
          {/if}
        </div>
        <button
          on:click={handlePublish}
          disabled={loading || !isDirty || !title || !content || !imageUrl || tags.length === 0}
          class="rounded-xl bg-lime-600 dark:bg-lime-500 backdrop-blur-sm px-8 py-3 text-base font-medium text-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none hover:bg-lime-700 dark:hover:bg-lime-600 border border-lime-500/20 dark:border-lime-400/20"
        >
          {#if loading}
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>发布中...</span>
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>发布文章</span>
            </div>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div> 