'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Tag, FileText } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from '@/components/DiaryCard'

interface TaggedDiaryListResponse {
  entries: DiaryEntry[]
  total: number
  page: number
  size: number
  has_next: boolean
  tag_name: string
}

export default function TagDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [diaryData, setDiaryData] = useState<TaggedDiaryListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const tagName = decodeURIComponent(params.name as string)

  useEffect(() => {
    document.title = `${tagName} - タグ別記事 - Voice Diary`
    loadDiaryEntries(currentPage)
  }, [currentPage, tagName])

  const loadDiaryEntries = async (page: number) => {
    try {
      setLoading(true)
      const data = await api.getDiaryEntriesByTag(tagName, page, 10)
      setDiaryData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '日記の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleEntrySelect = useCallback((entry: DiaryEntry) => {
    router.push(`/diary/${entry.id}`)
  }, [router])

  const handleBackToTags = useCallback(() => {
    router.push('/tags')
  }, [router])


  if (loading && !diaryData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted">日記を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-error mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => loadDiaryEntries(currentPage)}
              className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
            >
              再試行
            </button>
            <button
              onClick={handleBackToTags}
              className="px-4 py-2 bg-bg-secondary text-text-primary border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              タグ一覧に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!diaryData || diaryData.entries.length === 0) {
    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToTags}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            タグ一覧に戻る
          </button>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            「{tagName}」タグの日記がありません
          </h3>
          <p className="text-text-muted mb-4">
            このタグが付いた日記はまだ作成されていません
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            新しい日記を作成
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToTags}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            タグ一覧に戻る
          </button>
        </div>
      </div>

      {/* タグ情報 */}
      <div className="bg-bg-secondary rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">#{tagName}</h2>
            <p className="text-text-muted">
              {diaryData.total}件の日記が見つかりました
            </p>
          </div>
        </div>
      </div>

      {/* 日記一覧 */}
      <div className="space-y-4">
        {diaryData.entries.map((entry) => (
          <DiaryCard
            key={entry.id}
            entry={entry}
            variant="detailed"
            onClick={handleEntrySelect}
            showProcessingStatus={false}
          />
        ))}
      </div>

      {/* ページネーション */}
      {diaryData.total > 10 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            前へ
          </button>
          <span className="px-4 py-2 text-text-primary">
            {currentPage} / {Math.ceil(diaryData.total / 10)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!diaryData.has_next}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}