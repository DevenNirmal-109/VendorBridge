import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'procurement' | 'approver' | 'vendor';
  orgId: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  login: (token, user) => {
    localStorage.setItem('vb_token', token);
    localStorage.setItem('vb_user', JSON.stringify(user));
    set({ token, user, loading: false });
  },

  logout: () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    set({ token: null, user: null, loading: false });
  },

  initialize: () => {
    try {
      const token = localStorage.getItem('vb_token');
      const userStr = localStorage.getItem('vb_user');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), loading: false });
      } else {
        set({ token: null, user: null, loading: false });
      }
    } catch (err) {
      console.error('Failed to initialize auth store from localStorage:', err);
      set({ token: null, user: null, loading: false });
    }
  },
}));
