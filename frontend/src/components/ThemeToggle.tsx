'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();

  // マウント前は何も表示しない（SSRとのミスマッチを防ぐ）
  if (!mounted) {
    return (
      <div className="flex items-center bg-bg-secondary rounded-lg p-1 border border-border">
        <div className="flex items-center justify-center p-2 rounded-md w-8 h-8">
          <div className="w-4 h-4 bg-text-muted rounded animate-pulse"></div>
        </div>
        <div className="flex items-center justify-center p-2 rounded-md w-8 h-8">
          <div className="w-4 h-4 bg-text-muted rounded animate-pulse"></div>
        </div>
        <div className="flex items-center justify-center p-2 rounded-md w-8 h-8">
          <div className="w-4 h-4 bg-text-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'ライト' },
    { value: 'dark' as const, icon: Moon, label: 'ダーク' },
    { value: 'system' as const, icon: Monitor, label: 'システム' },
  ];

  return (
    <div className="relative">
      <div className="flex items-center bg-bg-secondary rounded-lg p-1 border border-border">
        {themes.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              flex items-center justify-center p-2 rounded-md transition-all duration-200
              ${theme === value
                ? 'bg-bg-elevated text-accent-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }
            `}
            title={label}
            aria-label={`テーマを${label}に切り替え`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

    </div>
  );
}