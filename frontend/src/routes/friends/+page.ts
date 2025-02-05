import type { PageLoad } from './$types';
import type { UserListResponse } from '$lib/types/user';

export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch('/api/users');
  const data: UserListResponse = await response.json();
  
  return {
    users: data.items,
    total: data.total
  };
}; 