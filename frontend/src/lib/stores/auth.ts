import { writable } from 'svelte/store';
import { authApi } from '../utils/api';

interface User {
    id: string;
    username: string;
    realName: string;
    dateOfBirth: string;
    bio?: string;
    createdAt: string;
    avatar?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
}

const createAuthStore = () => {
    const { subscribe, set, update } = writable<AuthState>({
        isAuthenticated: false,
        user: null,
        token: null
    });

    return {
        subscribe,
        login: (token: string, user: User) => {
            localStorage.setItem('token', token);
            set({ isAuthenticated: true, token, user });
        },
        logout: async () => {
            try {
                await authApi.logout();
            } catch (err) {
                console.error('Logout failed:', err);
            } finally {
                localStorage.removeItem('token');
                set({ isAuthenticated: false, token: null, user: null });
            }
        },
        initialize: async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // 验证token有效性并获取用户信息
                    const data = await authApi.validateToken();
                    update(state => ({ 
                        ...state, 
                        isAuthenticated: true,
                        token,
                        user: data.user 
                    }));
                } catch (err) {
                    console.error('Token validation failed:', err);
                    localStorage.removeItem('token');
                }
            }
        }
    };
};

export const auth = createAuthStore(); 