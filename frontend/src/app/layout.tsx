import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
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
        <div className="min-h-screen bg-bg-primary">
          <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
            <div className="container mx-auto px-3 py-2">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-text-primary">
                  Voice Diary
                </h1>
                <Navigation />
              </div>
            </div>
          </header>
          
          <main className="container mx-auto px-3 py-4 max-w-5xl">
            {children}
          </main>
          
          <footer className="mt-auto py-3 text-center text-text-muted">
            <p>&copy; 2024 Voice Diary</p>
          </footer>
        </div>
      </body>
    </html>
  )
}