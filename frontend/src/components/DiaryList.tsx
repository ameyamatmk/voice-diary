'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Search, X } from 'lucide-react'
import { DiaryEntry, DiaryEntryListResponse } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from './DiaryCard'

interface SearchResultResponse {
  entries: DiaryEntry[]
  total: number
  page: number
  size: number
  has_next: boolean
  query: string
}

interface DiaryListProps {
  onEntrySelect?: (entry: DiaryEntry) => void
}

export const DiaryList: React.FC<DiaryListProps> = ({ onEntrySelect }) => {
  const [diaryData, setDiaryData] = useState<DiaryEntryListResponse | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResultResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // URLからクエリパラメータを取得
    const q = searchParams.get('q')
    if (q && q.trim()) {
      setSearchQuery(q)
      setIsSearchMode(true)
      performSearch(q, 1)
    } else {
      loadDiaryEntries(currentPage)
    }
  }, [currentPage, searchParams])

  // 処理中のエントリがある場合は定期的に更新
  useEffect(() => {
    const currentData = isSearchMode ? searchResults : diaryData
    if (!currentData) return
    
    const hasProcessingEntries = currentData.entries.some(
      entry => entry.transcription_status === 'processing' || entry.summary_status === 'processing'
    )
    
    if (hasProcessingEntries) {
      const interval = setInterval(() => {
        if (isSearchMode && searchQuery.trim()) {
          performSearch(searchQuery, currentPage)
        } else {
          loadDiaryEntries(currentPage)
        }
      }, 3000) // 3秒ごとに更新
      
      return () => clearInterval(interval)
    }
  }, [diaryData, searchResults, currentPage, isSearchMode, searchQuery])

  const loadDiaryEntries = async (page: number) => {
    try {
      setLoading(true)
      const data = await api.getDiaryEntries(page, 10)
      setDiaryData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '日記の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      // 空の検索の場合は通常の一覧表示に戻る
      setIsSearchMode(false)
      setSearchResults(null)
      setCurrentPage(1)
      loadDiaryEntries(1)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.searchDiaryEntries(query.trim(), page, 10)
      setSearchResults(data)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearchMode(true)
      performSearch(searchQuery, 1)
      // URLを更新
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchQuery.trim())
      window.history.pushState({}, '', url)
    } else {
      handleClearSearch()
    }
  }, [searchQuery])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setIsSearchMode(false)
    setSearchResults(null)
    setCurrentPage(1)
    loadDiaryEntries(1)
    // URLからクエリパラメータを削除
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    window.history.pushState({}, '', url)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    if (isSearchMode && searchQuery.trim()) {
      performSearch(searchQuery, newPage)
    } else {
      loadDiaryEntries(newPage)
    }
  }, [isSearchMode, searchQuery])


  const currentData = isSearchMode ? searchResults : diaryData

  if (loading && !currentData) {
    return (
      <div className="space-y-4">
        {/* 検索フォーム */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <form className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タイトル、本文、要約から検索..."
              className="flex-1 px-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={true}
              className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
          </form>
        </div>
        
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-xl p-6 border border-border animate-pulse">
            <div className="h-4 bg-bg-tertiary rounded mb-2"></div>
            <div className="h-3 bg-bg-tertiary rounded mb-4 w-3/4"></div>
            <div className="h-3 bg-bg-tertiary rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {/* 検索フォーム */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
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
              disabled={loading}
              className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
            {isSearchMode && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-primary transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                クリア
              </button>
            )}
          </form>
        </div>

        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => isSearchMode ? performSearch(searchQuery, currentPage) : loadDiaryEntries(currentPage)}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!currentData || currentData.entries.length === 0) {
    return (
      <div className="space-y-4">
        {/* 検索フォーム */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
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
              disabled={loading}
              className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
            {isSearchMode && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-primary transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                クリア
              </button>
            )}
          </form>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
            {isSearchMode ? <Search className="w-8 h-8 text-text-muted" /> : <FileText className="w-8 h-8 text-text-muted" />}
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isSearchMode ? `「${searchQuery}」の検索結果が見つかりません` : 'まだ日記がありません'}
          </h3>
          <p className="text-text-muted">
            {isSearchMode ? '別のキーワードを試してみてください' : '音声録音を開始して、最初の日記を作成しましょう'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 検索フォーム */}
      <div className="bg-bg-secondary rounded-lg p-4 border border-border">
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
            disabled={loading}
            className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
            検索
          </button>
          {isSearchMode && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-primary transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              クリア
            </button>
          )}
        </form>
      </div>

      {/* 検索結果ヘッダー */}
      {isSearchMode && searchResults && (
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
      )}

      {/* 通常の一覧ヘッダー */}
      {!isSearchMode && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            日記一覧
          </h2>
          <div className="text-sm text-text-muted">
            {currentData.total}件中 {(currentPage - 1) * 10 + 1}〜{Math.min(currentPage * 10, currentData.total)}件
          </div>
        </div>
      )}

      <div className="space-y-3">
        {currentData.entries.map((entry) => (
          <DiaryCard
            key={entry.id}
            entry={entry}
            variant={isSearchMode ? "detailed" : "default"}
            onClick={onEntrySelect}
            searchQuery={isSearchMode ? searchResults?.query : undefined}
          />
        ))}
      </div>

      {/* ページネーション */}
      {currentData.total > 10 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            前へ
          </button>
          <span className="px-4 py-2 text-text-primary">
            {currentPage} / {Math.ceil(currentData.total / 10)}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!currentData.has_next}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}