import type { Metadata } from 'next'
import { AuthProvider } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import { ThemeProvider } from '@/contexts/ThemeContext'
import ThemeScript from '@/components/ThemeScript'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Voice Diary',
  description: '音声で記録する日記アプリケーション',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '512x512' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}