<!-- Theme.svelte -->
<script lang="ts">
  import type { IconProps } from './types';
  
  export let type: 'light' | 'dark' | 'system' = 'system';
  export let className = '';
</script>

{#if type === 'light'}
  <svg viewBox="0 0 24 24" aria-hidden="true" class={className}>
    <path
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"
    />
  </svg>
{:else if type === 'dark'}
  <svg viewBox="0 0 24 24" aria-hidden="true" class={className}>
    <path
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
    />
  </svg>
{:else}
  <svg viewBox="0 0 24 24" aria-hidden="true" class={className}>
    <path
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2 5.25A3.25 3.25 0 015.25 2h13.5A3.25 3.25 0 0122 5.25v13.5A3.25 3.25 0 0118.75 22H5.25A3.25 3.25 0 012 18.75V5.25zm1.5 0V15h17V5.25a1.75 1.75 0 00-1.75-1.75H5.25A1.75 1.75 0 003.5 5.25zm17 11h-17v2.5c0 .966.784 1.75 1.75 1.75h13.5a1.75 1.75 0 001.75-1.75v-2.5z"
    />
  </svg>
{/if} 