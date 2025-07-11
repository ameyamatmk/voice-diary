'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from '@/components/DiaryCard'

export default function DailyDiaryPage() {
  const router = useRouter()
  const params = useParams()
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const dateString = params.date as string

  useEffect(() => {
    if (dateString) {
      // YYYY-MM-DD 形式の日付文字列をローカル時間でパース
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day) // month は 0-indexed
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        document.title = `${dateString} - 日別記事 - Voice Diary`
        loadDailyEntries(date)
      } else {
        setError('無効な日付形式です')
        setLoading(false)
      }
    }
  }, [dateString])

  const loadDailyEntries = async (date: Date) => {
    try {
      setLoading(true)
      // 現在は全エントリを取得して日付でフィルタ（後で日別APIを実装可能）
      const data = await api.getDiaryEntries(1, 100)
      
      // 選択された日のエントリのみフィルタ（ローカル時間で比較）
      const targetYear = date.getFullYear()
      const targetMonth = date.getMonth()
      const targetDay = date.getDate()
      
      const dailyEntries = data.entries.filter(entry => {
        const entryDate = new Date(entry.recorded_at)
        return entryDate.getFullYear() === targetYear &&
               entryDate.getMonth() === targetMonth &&
               entryDate.getDate() === targetDay
      })
      
      // 時間順でソート（新しい順）
      dailyEntries.sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      )
      
      setDiaryEntries(dailyEntries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '日記の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToCalendar = useCallback(() => {
    router.push('/calendar')
  }, [router])

  const handleEntrySelect = useCallback((entry: DiaryEntry) => {
    router.push(`/diary/${entry.id}`)
  }, [router])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  if (loading) {
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
          <button
            onClick={handleBackToCalendar}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            カレンダーに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToCalendar}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          カレンダーに戻る
        </button>
      </div>

      {/* 日付情報 */}
      {selectedDate && (
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                {formatDate(selectedDate)}
              </h1>
              <p className="text-text-muted">
                {diaryEntries.length}件の日記が見つかりました
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 日記一覧 */}
      {diaryEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            この日の日記がありません
          </h3>
          <p className="text-text-muted mb-4">
            {selectedDate && formatDate(selectedDate)}にはまだ日記が作成されていません
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            新しい日記を作成
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {diaryEntries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              onClick={handleEntrySelect}
            />
          ))}
        </div>
      )}

      {/* 統計情報 */}
      {diaryEntries.length > 0 && (
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            この日の統計
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-primary">
                {diaryEntries.length}
              </div>
              <div className="text-sm text-text-muted">記事数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-primary">
                {diaryEntries.filter(entry => entry.transcription_status === 'completed').length}
              </div>
              <div className="text-sm text-text-muted">完了済み</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-primary">
                {[...new Set(diaryEntries.flatMap(entry => entry.tags || []))].length}
              </div>
              <div className="text-sm text-text-muted">使用タグ数</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}