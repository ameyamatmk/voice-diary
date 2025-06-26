'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, FileText, ArrowLeft } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from '@/components/DiaryCard'

interface SearchResultResponse {
  entries: DiaryEntry[]
  total: number
  page: number
  size: number
  has_next: boolean
  query: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    document.title = '検索 - Voice Diary'
    
    // URLからクエリパラメータを取得
    const q = searchParams.get('q')
    if (q && q.trim()) {
      setSearchQuery(q)
      performSearch(q, 1)
    }
  }, [searchParams])

  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setError('検索クエリを入力してください')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.searchDiaryEntries(query.trim(), page, 10)
      setSearchResults(data)
      setCurrentPage(page)
      setHasSearched(true)
      
      // URLを更新（ブラウザ履歴に追加）
      const url = new URL(window.location.href)
      url.searchParams.set('q', query.trim())
      window.history.pushState({}, '', url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery, 1)
  }, [searchQuery])

  const handleEntrySelect = useCallback((entry: DiaryEntry) => {
    router.push(`/diary/${entry.id}`)
  }, [router])

  const handleBackToDiary = useCallback(() => {
    router.push('/diary')
  }, [router])

  const handlePageChange = useCallback((newPage: number) => {
    if (searchQuery.trim()) {
      performSearch(searchQuery, newPage)
    }
  }, [searchQuery])

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToDiary}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            日記一覧に戻る
          </button>
        </div>
      </div>

      {/* 検索フォーム */}
      <div className="bg-bg-secondary rounded-lg p-4 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-accent-primary/10 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-accent-primary" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">日記検索</h1>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タイトル、本文、要約から検索..."
            className="flex-1 px-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
            検索
          </button>
        </form>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* ローディング表示 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-muted">検索中...</p>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {searchResults && hasSearched && !loading && (
        <div className="space-y-4">
          {/* 検索結果ヘッダー */}
          <div className="bg-bg-secondary rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  「{searchResults.query}」の検索結果
                </h2>
                <p className="text-text-muted">
                  {searchResults.total}件の日記が見つかりました
                </p>
              </div>
              {searchResults.total > 0 && (
                <div className="text-sm text-text-muted">
                  {currentPage} / {Math.ceil(searchResults.total / 10)} ページ
                </div>
              )}
            </div>
          </div>

          {/* 検索結果一覧 */}
          {searchResults.entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                検索結果が見つかりません
              </h3>
              <p className="text-text-muted mb-4">
                「{searchResults.query}」に一致する日記はありませんでした
              </p>
              <div className="text-sm text-text-muted">
                <p>検索のヒント：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>別のキーワードを試してみてください</li>
                  <li>より短いキーワードを使ってみてください</li>
                  <li>処理が完了した日記のみが検索対象です</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.entries.map((entry) => (
                <DiaryCard
                  key={entry.id}
                  entry={entry}
                  variant="detailed"
                  onClick={handleEntrySelect}
                  searchQuery={searchResults.query}
                />
              ))}
            </div>
          )}

          {/* ページネーション */}
          {searchResults.total > 10 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              <span className="px-4 py-2 text-text-primary">
                {currentPage} / {Math.ceil(searchResults.total / 10)}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!searchResults.has_next}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      )}

      {/* 初期表示（検索前） */}
      {!hasSearched && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            日記を検索
          </h3>
          <p className="text-text-muted">
            タイトル、本文、要約からキーワードを検索できます
          </p>
        </div>
      )}
    </div>
  )
}