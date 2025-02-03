// 从本地存储获取 token
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

// 保存 token 到本地存储
export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
}

// 删除本地存储的 token
export function removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
} 