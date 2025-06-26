'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, BookOpen } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'
import { DiaryCard } from '@/components/DiaryCard'

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    document.title = 'カレンダー - Voice Diary'
    loadMonthlyEntries()
  }, [currentDate])

  const loadMonthlyEntries = async () => {
    try {
      setLoading(true)
      // 現在は全エントリを取得して月でフィルタ（後で月別APIを実装可能）
      const data = await api.getDiaryEntries(1, 100) // 多めに取得
      
      // 現在の月のエントリのみフィルタ
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      const monthlyEntries = data.entries.filter(entry => {
        const entryDate = new Date(entry.recorded_at)
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
      })
      
      setDiaryEntries(monthlyEntries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '日記の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long'
    })
  }


  // カレンダーのグリッドを生成
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 週の最初（月曜始まり）に調整
    const startDate = new Date(firstDay)
    const dayOfWeek = (firstDay.getDay() + 6) % 7 // 月曜を0にする
    startDate.setDate(firstDay.getDate() - dayOfWeek)
    
    // カレンダーのセル（6週間 = 42日）
    const cells = []
    const currentCell = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(currentCell)
      const isCurrentMonth = cellDate.getMonth() === month
      const isToday = cellDate.toDateString() === new Date().toDateString()
      
      // その日のエントリを取得（ローカル時間で比較）
      const dayEntries = diaryEntries.filter(entry => {
        const entryDate = new Date(entry.recorded_at)
        return entryDate.getFullYear() === cellDate.getFullYear() &&
               entryDate.getMonth() === cellDate.getMonth() &&
               entryDate.getDate() === cellDate.getDate()
      })
      
      cells.push({
        date: cellDate,
        dayNumber: cellDate.getDate(),
        isCurrentMonth,
        isToday,
        entries: dayEntries
      })
      
      currentCell.setDate(currentCell.getDate() + 1)
    }
    
    return cells
  }

  const handleEntryClick = (entry: DiaryEntry) => {
    router.push(`/diary/${entry.id}`)
  }

  const handleDateClick = (date: Date) => {
    // ローカル時間でYYYY-MM-DD形式の文字列に変換（タイムゾーンズレを回避）
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    router.push(`/calendar/${dateString}`)
  }

  // 月間記事一覧のソート
  const sortedDiaryEntries = [...diaryEntries].sort((a, b) => {
    const timeA = new Date(a.recorded_at).getTime()
    const timeB = new Date(b.recorded_at).getTime()
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
  })

  const weekDays = ['月', '火', '水', '木', '金', '土', '日']
  const calendarCells = generateCalendarGrid()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted">カレンダーを読み込み中...</p>
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
            onClick={loadMonthlyEntries}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          カレンダー
        </h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            今日
          </button>
        </div>
      </div>

      {/* 月切り替え */}
      <div className="flex items-center justify-center gap-3 bg-bg-secondary rounded-lg p-3">
        <button
          onClick={goToPreviousMonth}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold text-text-primary min-w-[140px] text-center">
          {formatMonthYear(currentDate)}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-bg-secondary rounded-lg p-3 border border-border">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-3">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-medium text-text-secondary py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* カレンダーセル */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, index) => (
            <div
              key={index}
              onClick={() => handleDateClick(cell.date)}
              className={`min-h-[70px] p-2 rounded-lg transition-colors cursor-pointer hover:bg-bg-tertiary ${
                cell.isCurrentMonth
                  ? 'bg-bg-primary border border-border hover:border-accent-primary/30'
                  : 'bg-bg-tertiary text-text-muted'
              } ${
                cell.isToday
                  ? 'ring-2 ring-accent-primary'
                  : ''
              }`}
            >
              {/* 日付 */}
              <div className={`text-sm font-medium mb-1 ${
                cell.isToday ? 'text-accent-primary' : 'text-text-primary'
              }`}>
                {cell.dayNumber}
              </div>
              
              {/* エントリ */}
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                {cell.entries.slice(0, 2).map((entry, entryIndex) => (
                  <button
                    key={entryIndex}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEntryClick(entry)
                    }}
                    className="w-full text-left px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs hover:bg-accent-primary hover:text-white transition-colors truncate"
                    title={entry.title || '無題の日記'}
                  >
                    <BookOpen className="w-3 h-3 inline mr-1" />
                    {entry.title || '無題'}
                  </button>
                ))}
                
                {/* 3件以上ある場合の表示 */}
                {cell.entries.length > 2 && (
                  <div className="text-xs text-text-muted text-center">
                    +{cell.entries.length - 2}件
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="bg-bg-secondary rounded-lg p-4 border border-border">
        <h3 className="text-base font-semibold text-text-primary mb-3">
          {formatMonthYear(currentDate)}の統計
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">
              {diaryEntries.length}
            </div>
            <div className="text-sm text-text-muted">記事数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">
              {new Set(diaryEntries.map(entry => {
                const date = new Date(entry.recorded_at)
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              })).size}
            </div>
            <div className="text-sm text-text-muted">記録日数</div>
          </div>
        </div>
      </div>

      {/* 月間記事一覧 */}
      <div className="bg-bg-secondary rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            {formatMonthYear(currentDate)}の記事一覧
          </h3>
          
          <div className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
            </select>
          </div>
        </div>

        {diaryEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-bg-tertiary rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-muted">
              {formatMonthYear(currentDate)}には日記がありません
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDiaryEntries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                variant="compact"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}