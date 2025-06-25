import type { Metadata } from 'next'
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
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-text-primary">
                Voice Diary
              </h1>
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-6 max-w-4xl">
            {children}
          </main>
          
          <footer className="mt-auto py-4 text-center text-text-muted">
            <p>&copy; 2024 Voice Diary</p>
          </footer>
        </div>
      </body>
    </html>
  )
}