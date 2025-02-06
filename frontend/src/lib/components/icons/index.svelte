<!-- icons/index.svelte -->
<script>
  import Icon from './Icon.svelte';

  export let className = undefined;
  export let width = undefined;
  export let height = undefined;
</script>

<!-- 月亮图标 -->
<Icon {className} {width} {height}>
  <svg 
    viewBox="0 0 24 24" 
    aria-hidden="true"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17.25 16.22a6.937 6.937 0 0 1-9.47-9.47 7.451 7.451 0 1 0 9.47 9.47ZM12.75 7C17 7 17 2.75 17 2.75S17 7 21.25 7C17 7 17 11.25 17 11.25S17 7 12.75 7Z" />
  </svg>
</Icon>

<!-- 太阳图标 -->
<Icon {className} {width} {height}>
  <svg 
    viewBox="0 0 24 24" 
    aria-hidden="true"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M8 12.25A4.25 4.25 0 0 1 12.25 8v0a4.25 4.25 0 0 1 4.25 4.25v0a4.25 4.25 0 0 1-4.25 4.25v0A4.25 4.25 0 0 1 8 12.25v0Z" />
    <path d="M12.25 3v1.5M21.5 12.25H20M18.791 18.791l-1.06-1.06M18.791 5.709l-1.06 1.06M12.25 20v1.5M4.5 12.25H3M6.77 6.77 5.709 5.709M6.77 17.73l-1.061 1.061" />
  </svg>
</Icon>

<!-- 用户图标 -->
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

<!-- 登出图标 -->
<Icon {className} {width} {height}>
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    aria-hidden="true"
  >
    <path
      d="M16 16V17.3333C16 18.8061 14.8061 20 13.3333 20H6.66667C5.19391 20 4 18.8061 4 17.3333V6.66667C4 5.19391 5.19391 4 6.66667 4H13.3333C14.8061 4 16 5.19391 16 6.66667V8"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M19 15L21 12L19 9"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10 12H21"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</Icon>