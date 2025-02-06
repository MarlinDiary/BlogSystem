// 从本地存储获取 token
export function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

// 保存 token 到本地存储
export function setToken(token) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
}

// 删除本地存储的 token
export function removeToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
} 