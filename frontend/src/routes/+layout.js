import { env } from '$env/dynamic/public';

/** @type {import('./$types').LayoutLoad} */
export function load() {
  const API_URL = env.PUBLIC_API_URL || 'https://blog-production-154c.up.railway.app';
  return {
    API_BASE: API_URL,
    SERVER_BASE: API_URL
  };
} 