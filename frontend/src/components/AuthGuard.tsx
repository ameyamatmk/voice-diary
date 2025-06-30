'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Navigation } from './Navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    // ローディング中は何もしない
    if (isLoading) return;

    // ログインページは認証不要
    if (pathname === '/login') return;

    // 未認証の場合はログインページにリダイレクト
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // ログインページは専用レイアウトで表示
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthenticated) {
    return null;
  }

  // 認証済みの場合は通常のレイアウトでコンテンツを表示
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-text-primary hover:text-accent-primary transition-colors">
              Voice Diary
            </Link>
            <Navigation />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 max-w-5xl">
        {children}
      </main>

      <footer className="mt-auto py-3 text-center text-text-muted">
        <p>&copy; 2025 Voice Diary</p>
      </footer>
    </div>
  );
}