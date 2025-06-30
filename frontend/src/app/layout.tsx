import type { Metadata } from 'next'
import { AuthProvider } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Voice Diary',
  description: '音声で記録する日記アプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}