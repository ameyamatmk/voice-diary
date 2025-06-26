'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { DiaryEntry, DiaryEntryListResponse } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from './DiaryCard'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          日記一覧
        </h2>
        <div className="text-sm text-text-muted">
          {diaryData.total}件中 {(currentPage - 1) * 10 + 1}〜{Math.min(currentPage * 10, diaryData.total)}件
        </div>
      </div>

      <div className="space-y-3">
        {diaryData.entries.map((entry) => (
          <DiaryCard
            key={entry.id}
            entry={entry}
            onClick={onEntrySelect}
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