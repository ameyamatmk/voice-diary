'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, FileText, Tag, ChevronRight } from 'lucide-react'
import { DiaryEntry, DiaryEntryListResponse } from '@/types'
import { api } from '@/lib/api'

interface DiaryListProps {
  onEntrySelect?: (entry: DiaryEntry) => void
}

export const DiaryList: React.FC<DiaryListProps> = ({ onEntrySelect }) => {
  const [diaryData, setDiaryData] = useState<DiaryEntryListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    loadDiaryEntries(currentPage)
  }, [currentPage])

  // 処理中のエントリがある場合は定期的に更新
  useEffect(() => {
    if (!diaryData) return
    
    const hasProcessingEntries = diaryData.entries.some(
      entry => entry.transcription_status === 'processing' || entry.summary_status === 'processing'
    )
    
    if (hasProcessingEntries) {
      const interval = setInterval(() => {
        loadDiaryEntries(currentPage)
      }, 3000) // 3秒ごとに更新
      
      return () => clearInterval(interval)
    }
  }, [diaryData, currentPage])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success'
      case 'processing':
        return 'text-warning'
      case 'failed':
        return 'text-error'
      default:
        return 'text-text-muted'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'processing':
        return '処理中'
      case 'failed':
        return 'エラー'
      default:
        return '待機中'
    }
  }

  if (loading && !diaryData) {
    return (
      <div className="space-y-4">
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
      <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
        <p className="text-error mb-4">{error}</p>
        <button
          onClick={() => loadDiaryEntries(currentPage)}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!diaryData || diaryData.entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          まだ日記がありません
        </h3>
        <p className="text-text-muted">
          音声録音を開始して、最初の日記を作成しましょう
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-text-primary">
          日記一覧
        </h2>
        <div className="text-sm text-text-muted">
          {diaryData.total}件中 {(currentPage - 1) * 10 + 1}〜{Math.min(currentPage * 10, diaryData.total)}件
        </div>
      </div>

      <div className="space-y-4">
        {diaryData.entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-bg-secondary rounded-xl p-6 shadow-md border border-border hover:shadow-lg hover-lift cursor-pointer transition-all"
            onClick={() => onEntrySelect?.(entry)}
          >
            {/* ヘッダー部分 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-text-primary mb-2 break-words">
                  {entry.title || '無題の日記'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(entry.recorded_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(entry.recorded_at)}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>

            {/* 処理状況 */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">文字起こし:</span>
                <span className={getStatusColor(entry.transcription_status)}>
                  {getStatusText(entry.transcription_status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">要約:</span>
                <span className={getStatusColor(entry.summary_status)}>
                  {getStatusText(entry.summary_status)}
                </span>
              </div>
            </div>

            {/* 内容プレビュー */}
            {entry.transcription && (
              <div className="mb-4">
                <p className="text-text-secondary text-sm line-clamp-2">
                  {entry.transcription}
                </p>
              </div>
            )}

            {/* タグ */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-text-muted" />
                {entry.tags.slice(0, 3).map((tag, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/tags/${encodeURIComponent(tag)}`)
                    }}
                    className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm hover:bg-accent-primary hover:text-white transition-colors"
                  >
                    {tag}
                  </button>
                ))}
                {entry.tags.length > 3 && (
                  <span className="text-sm text-text-muted">
                    +{entry.tags.length - 3}個
                  </span>
                )}
              </div>
            )}
          </div>
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