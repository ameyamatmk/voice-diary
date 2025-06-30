'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでマウント後に初期化
  useEffect(() => {
    setMounted(true);
    
    // ローカルストレージからテーマ設定を読み込み
    try {
      const savedTheme = localStorage.getItem('voice-diary-theme') as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log('Failed to load theme from localStorage:', error);
    }
  }, []);

  // テーマ変更時の処理
  useEffect(() => {
    if (!mounted) return;

    const updateTheme = () => {
      const root = window.document.documentElement;
      
      let newResolvedTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        // システム設定を使用
        newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        newResolvedTheme = theme;
      }
      
      // 以前のテーマクラスを削除
      root.classList.remove('light', 'dark');
      
      // data-theme属性を設定（CSS変数用）
      root.setAttribute('data-theme', newResolvedTheme);
      
      // クラスも設定
      root.classList.add(newResolvedTheme);
      
      setResolvedTheme(newResolvedTheme);
      
      // ローカルストレージに保存
      try {
        localStorage.setItem('voice-diary-theme', theme);
      } catch (error) {
        console.log('Failed to save theme to localStorage:', error);
      }
    };

    updateTheme();
  }, [theme, mounted]);

  // システム設定の変更を監視
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const newResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
      const root = window.document.documentElement;
      
      root.classList.remove('light', 'dark');
      root.setAttribute('data-theme', newResolvedTheme);
      root.classList.add(newResolvedTheme);
      
      setResolvedTheme(newResolvedTheme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const value = {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}