import { auth } from '../stores/auth';
import { get } from 'svelte/store';
import { env } from '$env/dynamic/public';
import { getToken } from './auth';

const API_URL = env.PUBLIC_API_URL;
console.log('当前使用的 API_URL:', API_URL);

export async function api(endpoint, options = {}) {
    const { method = 'GET', body, headers = {}, useStoredToken = true, isFormData = false, params } = options;

    // Get the token for authentication
    if (useStoredToken) {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
            console.log('使用 localStorage token');
        } else {
            const authState = get(auth);
            if (authState.token) {
                headers['Authorization'] = `Bearer ${authState.token}`;
                console.log('使用 auth store token');
            }
        }
    }

    // Set default headers
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        let url = `${API_URL}${endpoint}`;
        
        // Add URL parameters
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

        console.log('发送请求到:', url);
        console.log('请求方法:', method);
        console.log('请求头:', headers);
        if (body) console.log('请求体:', body);

        const response = await fetch(url, {
            method,
            headers,
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
            mode: 'cors',
            credentials: 'omit'
        });

        if (response.status === 404) {
            throw new Error('请求的资源不存在');
        }

        if (response.status === 403) {
            throw new Error('没有权限访问此资源');
        }

        if (response.status === 401) {
            // 清除本地存储的 token
            localStorage.removeItem('token');
            auth.update(state => ({ ...state, isAuthenticated: false, token: null, user: null }));
            throw new Error('登录已过期，请重新登录');
        }

        // For 204 status, return null
        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => {
            console.error('[API Error] Failed to parse response as JSON');
            return null;
        });

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
            throw new Error('无法连接到服务器，请检查网络连接或确保服务器正在运行');
        }

        if (error instanceof Error) {
            throw error;
        }
        throw new Error('请求失败，请稍后重试');
    }
}

// Authentication related API
export const authApi = {
    login: async (username, password) => {
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

    register: async (userData) => {
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

    checkUsername: async (username) => {
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

// User related API
export const userApi = {
    // Update user profile
    updateProfile: async (data) => {
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

    // Upload avatar
    uploadAvatar: async (formData) => {
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

    // Change password
    changePassword: async (currentPassword, newPassword) => {
        try {
            console.log('[User] Changing password');
            const result = await api('/api/users/me/password', {
                method: 'PUT',
                body: {
                    currentPassword,
                    newPassword
                }
            });
            console.log('[User] Password changed');
            return result;
        } catch (error) {
            console.error('[User] Password change failed', error);
            throw error;
        }
    },

    // Delete account
    deleteAccount: async (data) => {
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

    // Get current user info
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

    // Get user articles
    getUserArticles: async (userId) => {
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

    // Delete article
    deleteArticle: async (articleId) => {
        try {
            console.log('[User] Deleting article', { articleId });
            const result = await api(`/api/articles/${articleId}`, {
                method: 'DELETE'
            });
            console.log('[User] Article deleted');
            return result;
        } catch (error) {
            console.error('[User] Article deletion failed', error);
            throw error;
        }
    },

    // Get user comments
    getUserComments: async (userId) => {
        try {
            console.log('[User] Getting user comments', { userId });
            const result = await api(`/api/users/${userId}/comments`);
            console.log('[User] Got user comments', result);
            return result;
        } catch (error) {
            console.error('[User] Failed to get user comments', error);
            throw error;
        }
    },

    // Delete comment
    deleteComment: async (commentId) => {
        try {
            console.log('[User] Deleting comment', { commentId });
            const result = await api(`/api/comments/${commentId}`, {
                method: 'DELETE'
            });
            console.log('[User] Comment deleted');
            return result;
        } catch (error) {
            console.error('[User] Comment deletion failed', error);
            throw error;
        }
    }
};