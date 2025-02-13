<!-- LanguageSettings.svelte -->
<script>
    import { t, locale, toggleLocale } from '$lib/i18n';
  </script>
  
  <div class="flex items-center justify-between">
    <span class="text-sm text-zinc-600 dark:text-zinc-400">
      {$locale === 'zh' ? '当前语言：中文' : 'Current Language: English'}
    </span>
    <button
      class="flex items-center space-x-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      on:click={toggleLocale}
    >
      <span>{$locale === 'zh' ? 'Switch to English' : '切换到中文'}</span>
    </button>
  </div> 