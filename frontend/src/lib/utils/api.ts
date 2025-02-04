import { auth } from '../stores/auth';
import { get } from 'svelte/store';
import { env } from '$env/dynamic/public';
import { getToken } from './auth';

const API_URL = env.PUBLIC_API_URL;

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    useStoredToken?: boolean;
    isFormData?: boolean;
    params?: Record<string, any>;
}

export async function api(endpoint: string, options: ApiOptions = {}) {
    const { method = 'GET', body, headers = {}, useStoredToken = true, isFormData = false, params } = options;

    // 获取认证token
    if (useStoredToken) {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        } else {
            const authState = get(auth);
            if (authState.token) {
                headers['Authorization'] = `Bearer ${authState.token}`;
            }
        }
    }

    // 设置默认headers
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        let url = `${API_URL}${endpoint}`;
        
        // 添加 URL 参数
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        console.log(`[API Request] ${method} ${url}`, {
            headers,
            body: isFormData ? '[FormData]' : (body ? JSON.stringify(body) : undefined)
        });

        const response = await fetch(url, {
            method,
            headers,
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
            mode: 'cors',
            credentials: 'include'
        });

        console.log(`[API Response] ${method} ${url}`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        // 对于 204 状态码，直接返回
        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => {
            console.error('[API Error] Failed to parse response as JSON');
            return null;
        });

        console.log(`[API Data] ${method} ${url}`, data);

        if (!response.ok) {
            console.error('[API Error]', {
                status: response.status,
                statusText: response.statusText,
                data
            });
            throw new Error(data?.message || `请求失败 (${response.status})`);
        }

        return data;
    } catch (error) {
        console.error('[API Request Failed]', {
            endpoint,
            method,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error
        });

        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('无法连接到服务器，请检查网络连接或确认服务器是否正在运行');
        }

        if (error instanceof Error) {
            throw error;
        }
        throw new Error('请求失败，请稍后重试');
    }
}

// 认证相关API
export const authApi = {
    login: async (username: string, password: string) => {
        try {
            console.log('[Auth] Attempting login', { username });
            const result = await api('/api/auth/login', {
                method: 'POST',
                body: { username, password }
            });
            console.log('[Auth] Login successful', result);
            return result;
        } catch (error) {
            console.error('[Auth] Login failed', error);
            throw error;
        }
    },

    register: async (userData: {
        username: string;
        password: string;
        realName: string;
        dateOfBirth: string;
        bio?: string;
    }) => {
        try {
            console.log('[Auth] Attempting registration', { username: userData.username });
            const result = await api('/api/auth/register', {
                method: 'POST',
                body: userData
            });
            console.log('[Auth] Registration successful', result);
            return result;
        } catch (error) {
            console.error('[Auth] Registration failed', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            console.log('[Auth] Attempting logout');
            const result = await api('/api/auth/logout', {
                method: 'POST'
            });
            console.log('[Auth] Logout successful');
            return result;
        } catch (error) {
            console.error('[Auth] Logout failed', error);
            throw error;
        }
    },

    validateToken: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[Auth] No token found for validation');
            throw new Error('No token found');
        }
        try {
            console.log('[Auth] Attempting token validation');
            const result = await api('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                useStoredToken: false
            });
            console.log('[Auth] Token validation successful', result);
            return result;
        } catch (error) {
            console.error('[Auth] Token validation failed', error);
            throw error;
        }
    },

    checkUsername: async (username: string) => {
        try {
            console.log('[Auth] Checking username availability', { username });
            const result = await api(`/api/auth/check-username/${username}`);
            console.log('[Auth] Username check result', result);
            return result;
        } catch (error) {
            console.error('[Auth] Username check failed', error);
            throw error;
        }
    }
};

// 用户相关API
export const userApi = {
    // 更新个人资料
    updateProfile: async (data: {
        username: string;
        realName: string;
        dateOfBirth: string;
        bio?: string;
    }) => {
        try {
            console.log('[User] Updating profile', { username: data.username });
            const result = await api('/api/users/me', {
                method: 'PUT',
                body: data
            });
            console.log('[User] Profile updated', result);
            return result;
        } catch (error) {
            console.error('[User] Profile update failed', error);
            throw error;
        }
    },

    // 上传头像
    uploadAvatar: async (formData: FormData) => {
        try {
            console.log('[User] Uploading avatar');
            const result = await api('/api/users/me/avatar', {
                method: 'POST',
                body: formData,
                isFormData: true
            });
            console.log('[User] Avatar uploaded', result);
            return result;
        } catch (error) {
            console.error('[User] Avatar upload failed', error);
            throw error;
        }
    },

    // 修改密码
    changePassword: async (currentPassword: string, newPassword: string) => {
        try {
            console.log('[User] Changing password');
            const result = await api('/api/users/me/password', {
                method: 'PUT',
                body: { currentPassword, newPassword }
            });
            console.log('[User] Password changed');
            return result;
        } catch (error) {
            console.error('[User] Password change failed', error);
            throw error;
        }
    },

    // 删除账户
    deleteAccount: async (data: {
        password: string;
        deleteArticles: boolean;
        deleteComments: boolean;
    }) => {
        try {
            console.log('[User] Deleting account');
            const result = await api('/api/users/me', {
                method: 'DELETE',
                body: data
            });
            console.log('[User] Account deleted');
            return result;
        } catch (error) {
            console.error('[User] Account deletion failed', error);
            throw error;
        }
    },

    // 获取当前用户信息
    getCurrentUser: async () => {
        try {
            console.log('[User] Getting current user info');
            const result = await api('/api/users/me');
            console.log('[User] Got current user info', result);
            return result;
        } catch (error) {
            console.error('[User] Failed to get current user info', error);
            throw error;
        }
    },

    // 获取用户文章列表
    getUserArticles: async (userId: number | string) => {
        try {
            console.log('[User] Getting user articles', { userId });
            const result = await api(`/api/users/${userId}/articles`);
            console.log('[User] Got user articles', result);
            return result;
        } catch (error) {
            console.error('[User] Failed to get user articles', error);
            throw error;
        }
    },

    // 删除文章
    deleteArticle: async (articleId: number) => {
        try {
            console.log('[User] Deleting article', { articleId });
            const result = await api(`/api/articles/${articleId}`, {
                method: 'DELETE'
            });
            console.log('[User] Article deleted', result);
            return result;
        } catch (error) {
            console.error('[User] Article deletion failed', error);
            throw error;
        }
    }
}; 