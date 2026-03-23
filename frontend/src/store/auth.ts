import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar: string | null;
    created_at?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    activeWorkspaceId: string | null;
    setAuth: (user: User, token: string) => void;
    setActiveWorkspace: (id: string) => void;
    updateUser: (user: Partial<User>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            activeWorkspaceId: null,

            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                })),
            logout: () => set({ user: null, token: null, isAuthenticated: false, activeWorkspaceId: null }),
        }),
        {
            name: 'seam-auth',
        }
    )
);

