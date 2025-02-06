<!-- UserIcon.svelte -->
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
      d="M15 8C15 10.2091 13.2091 12 11 12C8.79086 12 7 10.2091 7 8C7 5.79086 8.79086 4 11 4C13.2091 4 15 5.79086 15 8Z"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M3 20C3.27138 17.2744 4.36873 15.5518 6 14.4549C7.63127 13.358 9.29293 12.8579 11 12.8579C12.7071 12.8579 14.3687 13.358 16 14.4549C17.6313 15.5518 18.7286 17.2744 19 20"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</Icon> 