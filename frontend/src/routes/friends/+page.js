export const load = async ({ fetch }) => {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  return {
    users: data.items,
    total: data.total
  };
}; 