'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, BookOpen, Home, Hash, Calendar, Search, Settings, User, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const Navigation: React.FC = () => {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex items-center justify-between w-full">
      <nav className="flex items-center gap-2">
      <Link
        href="/"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">録音</span>
      </Link>
      
      <Link
        href="/diary"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/diary') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden sm:inline">日記一覧</span>
      </Link>
      
      <Link
        href="/tags"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/tags') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <Hash className="w-4 h-4" />
        <span className="hidden sm:inline">タグ</span>
      </Link>
      
      <Link
        href="/calendar"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/calendar') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">カレンダー</span>
      </Link>
      
      <Link
        href="/search"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/search') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">検索</span>
      </Link>
      
      <Link
        href="/settings"
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isActive('/settings') 
            ? 'bg-accent-primary text-white' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        }`}
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">設定</span>
      </Link>
    </nav>

    {/* 認証状態表示 */}
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 bg-bg-secondary rounded-lg">
          <User className="w-4 h-4 text-text-secondary" />
          <span className="text-sm text-text-primary hidden sm:inline">
            {user?.display_name || user?.username}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-2 py-1 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </div>
    </div>
  )
}