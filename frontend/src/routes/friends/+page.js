import { env } from '$env/dynamic/public';

export const load = async ({ fetch }) => {
  const API_URL = env.PUBLIC_API_URL;
  console.log('社区页面 - API_URL:', API_URL);
  
  try {
    const response = await fetch(`${API_URL}/api/users`);
    console.log('社区页面 - 响应状态:', response.status);
    
    if (!response.ok) {
      throw new Error('获取用户列表失败');
    }
    
    const data = await response.json();
    console.log('社区页面 - 获取到的数据:', data);
    
    return {
      users: data.items,
      total: data.total
    };
  } catch (error) {
    console.error('加载用户列表失败:', error);
    return {
      users: [],
      total: 0
    };
  }
}; 