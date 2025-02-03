// 简单的 toast 工具
export const toast = {
  error: (message: string) => {
    // 如果在浏览器环境，使用原生 alert
    if (typeof window !== 'undefined') {
      alert(message);
    }
  },
  success: (message: string) => {
    // 如果在浏览器环境，使用原生 alert
    if (typeof window !== 'undefined') {
      alert(message);
    }
  }
}; 