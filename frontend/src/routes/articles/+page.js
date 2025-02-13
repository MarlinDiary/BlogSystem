/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent }) {
    const { API_BASE } = await parent();
    console.log('文章列表页面 - API_BASE:', API_BASE);
    
    try {
      const url = `${API_BASE}/api/articles`;
      console.log('文章列表页面 - 请求URL:', url);
      
      const response = await fetch(url);
      console.log('文章列表页面 - 响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`获取文章列表失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('文章列表页面 - 获取到的数据:', data);
      return data;
    } catch (error) {
      console.error('加载文章列表时出错:', error);
      return {
        items: [],
        total: 0
      };
    }
  } 