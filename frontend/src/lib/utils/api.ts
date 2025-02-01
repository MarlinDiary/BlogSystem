import { auth } from '../stores/auth';
import { get } from 'svelte/store';
import { env } from '$env/dynamic/public';

const API_URL = env.PUBLIC_API_URL;

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

export async function api(endpoint: string, options: ApiOptions = {}) {
    const { method = 'GET', body, headers = {} } = options;

    // 获取认证token
    const authState = get(auth);
    if (authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
    }

    // 设置默认headers
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || '请求失败');
    }

    return data;
}

// 认证相关API
export const authApi = {
    login: async (username: string, password: string) => {
        return api('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    },

    register: async (userData: {
        username: string;
        password: string;
        realName: string;
        dateOfBirth: string;
        bio?: string;
    }) => {
        return api('/api/auth/register', {
            method: 'POST',
            body: userData
        });
    },

    logout: async () => {
        return api('/api/auth/logout', {
            method: 'POST'
        });
    },

    validateToken: async () => {
        return api('/api/auth/validate');
    },

    checkUsername: async (username: string) => {
        return api(`/api/auth/check-username/${username}`);
    }
}; 