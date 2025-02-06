/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent }) {
  const { API_BASE } = await parent();
  try {
    const response = await fetch(`${API_BASE}/api/articles`);
    if (!response.ok) {
      throw new Error('获取文章列表失败');
    }
    return await response.json();
  } catch (error) {
    console.error('加载文章列表时出错:', error);
    return {
      items: [],
      total: 0
    };
  }
} 