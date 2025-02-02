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
    try {
      loading = true;
      error = '';
      
      if (!title.trim()) {
        error = '请输入文章标题';
        return;
      }
      
      if (!content.trim()) {
        error = '请输入文章内容';
        return;
      }
      
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
          tags
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '发布失败' }));
        throw new Error(errorData.message || '发布失败');
      }
      
      const article = await response.json();
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
      tags = [...tags, newTag];
      newTag = '';
    }
  }
  
  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
  }
</script>

<style lang="postcss">
  /* TipTap 编辑器样式 */
  :global(.ProseMirror) {
    padding: 1rem;
  }
  
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }
  
  :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
  }
  
  /* 工具栏样式 */
  .editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.5rem;
    border-bottom-width: 1px;
    border-color: rgb(228 228 231);
    background-color: white;
  }
  
  :global(.dark) .editor-toolbar {
    border-color: rgb(63 63 70);
    background-color: rgb(39 39 42);
  }
  
  .toolbar-button {
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: rgb(82 82 91);
  }
  
  .toolbar-button:hover {
    background-color: rgb(244 244 245);
  }
  
  :global(.dark) .toolbar-button {
    color: rgb(212 212 216);
  }
  
  :global(.dark) .toolbar-button:hover {
    background-color: rgb(63 63 70);
  }
  
  .toolbar-button.is-active {
    background-color: rgb(244 244 245);
    color: rgb(101 163 13);
  }
  
  :global(.dark) .toolbar-button.is-active {
    background-color: rgb(63 63 70);
    color: rgb(132 204 22);
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

<div class="mx-auto max-w-4xl px-4">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
    发布文章
  </h1>
  
  <div class="mt-8 space-y-6">
    <!-- 错误提示 -->
    {#if error}
      <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/50">
        <div class="flex">
          <div class="text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        </div>
      </div>
    {/if}
    
    <!-- 标题输入 -->
    <div>
      <label for="title" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        文章标题
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        class="mt-1 w-full rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
        placeholder="输入文章标题..."
      />
    </div>
    
    <!-- 封面图片上传 -->
    <div>
      <label for="cover-image" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        封面图片
      </label>
      <div class="mt-1 flex items-center gap-4">
        {#if imageUrl}
          <img src={imageUrl} alt="封面" class="h-32 w-48 object-cover rounded-lg" />
        {/if}
        <label for="cover-image" class="cursor-pointer inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          上传封面
          <input
            id="cover-image"
            type="file"
            class="hidden"
            accept="image/*"
            on:change={uploadImage}
          />
        </label>
      </div>
    </div>
    
    <!-- 标签输入 -->
    <div>
      <label for="tag-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        文章标签
      </label>
      <div class="mt-1 flex items-center gap-2">
        <input
          id="tag-input"
          type="text"
          bind:value={newTag}
          class="flex-1 rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
          placeholder="添加标签..."
          on:keydown={e => e.key === 'Enter' && addTag()}
        />
        <button
          on:click={addTag}
          class="rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600"
        >
          添加
        </button>
      </div>
      {#if tags.length > 0}
        <div class="mt-2 flex flex-wrap gap-2">
          {#each tags as tag}
            <span class="inline-flex items-center rounded-full bg-lime-100 px-3 py-0.5 text-sm font-medium text-lime-800 dark:bg-lime-900 dark:text-lime-200">
              {tag}
              <button
                type="button"
                class="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-lime-600 hover:bg-lime-200 hover:text-lime-900 focus:bg-lime-500 focus:text-white dark:text-lime-400 dark:hover:bg-lime-800"
                on:click={() => removeTag(tag)}
                aria-label={`删除标签 ${tag}`}
              >
                ×
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- TipTap 编辑器 -->
    <div class="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div class="editor-toolbar">
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('heading', { level: 1 })}
          on:click={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          title="标题 1"
        >
          H1
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('heading', { level: 2 })}
          on:click={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          title="标题 2"
        >
          H2
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('bold')}
          on:click={() => editor?.chain().focus().toggleBold().run()}
          title="加粗"
        >
          B
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('italic')}
          on:click={() => editor?.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          I
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('underline')}
          on:click={() => editor?.chain().focus().toggleUnderline().run()}
          title="下划线"
        >
          U
        </button>
        <button
          class="toolbar-button"
          on:click={handleEditorImageUpload}
          disabled={imageUploading}
          title="插入图片"
        >
          {#if imageUploading}
            <div class="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
          {:else}
            图片
          {/if}
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('bulletList')}
          on:click={() => editor?.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          •
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('orderedList')}
          on:click={() => editor?.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          1.
        </button>
        <button
          class="toolbar-button"
          class:is-active={editor?.isActive('codeBlock')}
          on:click={() => editor?.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          {'</>'}
        </button>
      </div>
      <div bind:this={editorElement}></div>
    </div>
    
    <!-- 发布按钮 -->
    <div class="flex justify-end">
      <button
        on:click={handlePublish}
        disabled={loading}
        class="rounded-lg bg-lime-600 px-6 py-2 text-base font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '发布中...' : '发布文章'}
      </button>
    </div>
  </div>
</div> 