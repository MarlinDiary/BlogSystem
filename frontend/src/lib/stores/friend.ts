import { writable } from 'svelte/store';

export const focusingFriendId = writable<string | null>(null); 