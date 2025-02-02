declare module 'svelte-quill' {
  import { SvelteComponentTyped } from 'svelte';

  interface QuillOptions {
    theme?: string;
    placeholder?: string;
    modules?: {
      toolbar?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface QuillProps {
    options?: QuillOptions;
    class?: string;
    id?: string;
  }

  interface QuillEvents {
    ready: CustomEvent<{ quill: any }>;
  }

  export default class Quill extends SvelteComponentTyped<QuillProps, QuillEvents> {}
} 