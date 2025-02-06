<!-- Theme.svelte -->
<script>
  import Icon from './Icon.svelte';

  export let className = undefined;
  export let width = undefined;
  export let height = undefined;
</script>

<Icon {className} {width} {height}>
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    aria-hidden="true"
  >
    <path
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</Icon> 