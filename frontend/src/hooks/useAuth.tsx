'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, AuthState, AuthAPI } from '../lib/auth';

interface AuthContextType extends AuthState {
  login: (username?: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, displayName?: string, deviceName?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 初期化時に認証状態をチェック
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await AuthAPI.getCurrentUser();
      setAuthState({
        user: response.user,
        isAuthenticated: response.authenticated,
        isLoading: false,
      });
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (username?: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { authenticateWithWebAuthn } = await import('../lib/auth');
      const result = await authenticateWithWebAuthn(username);
      
      if (result.success) {
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (username: string, displayName?: string, deviceName?: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { registerWithWebAuthn } = await import('../lib/auth');
      const result = await registerWithWebAuthn(username, displayName, deviceName);
      
      if (result.success) {
        // 登録成功後は自動的にログイン状態にはしない
        // ユーザーに改めてログインしてもらう
        setAuthState(prev => ({ ...prev, isLoading: false }));
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 認証が必要なコンポーネント用のフック
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // 認証されていない場合の処理
      // 実際の実装では、ログインページにリダイレクトなど
      console.warn('Authentication required');
    }
  }, [auth.isAuthenticated, auth.isLoading]);
  
  return auth;
}