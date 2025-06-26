'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, BookOpen, Home, Hash, Calendar } from 'lucide-react'

export const Navigation: React.FC = () => {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  return (
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
    </nav>
  )
}