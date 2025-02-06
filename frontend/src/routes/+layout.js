import { env } from '$env/dynamic/public';

/** @type {import('./$types').LayoutLoad} */
export function load() {
  return {
    API_BASE: env.PUBLIC_API_URL,
    SERVER_BASE: env.PUBLIC_API_URL
  };
} 