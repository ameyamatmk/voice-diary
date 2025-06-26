'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Tag, ChevronRight } from 'lucide-react'
import { DiaryEntry } from '@/types'

interface DiaryCardProps {
  entry: DiaryEntry
  variant?: 'default' | 'compact' | 'detailed'
  showProcessingStatus?: boolean
  maxTags?: number
  onClick?: (entry: DiaryEntry) => void
}

export const DiaryCard: React.FC<DiaryCardProps> = ({
  entry,
  variant = 'default',
  showProcessingStatus = true,
  maxTags = 5,
  onClick
}) => {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick(entry)
    } else {
      router.push(`/diary/${entry.id}`)
    }
  }

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    router.push(`/tags/${encodeURIComponent(tag)}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (variant === 'compact') {
      return date.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })
    }
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

  // スタイルの定義
  const getCardStyles = () => {
    const baseStyles = "bg-bg-secondary border border-border hover:shadow-lg hover-lift cursor-pointer transition-all"
    
    switch (variant) {
      case 'compact':
        return `${baseStyles} rounded-lg p-3 shadow-md hover:border-accent-primary/30`
      case 'detailed':
        return `${baseStyles} rounded-xl p-6 shadow-md`
      default:
        return `${baseStyles} rounded-lg p-4 shadow-md`
    }
  }

  const getTitleStyles = () => {
    switch (variant) {
      case 'compact':
        return 'text-base font-medium text-text-primary mb-1 break-words'
      case 'detailed':
        return 'text-xl font-semibold text-text-primary mb-2 break-words'
      default:
        return 'text-lg font-semibold text-text-primary mb-1 break-words'
    }
  }

  const getStatusStyles = () => {
    switch (variant) {
      case 'compact':
        return 'flex items-center gap-3 mb-2 text-xs'
      default:
        return 'flex items-center gap-4 mb-3 text-sm'
    }
  }

  const getTagStyles = () => {
    switch (variant) {
      case 'compact':
        return 'px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs hover:bg-accent-primary hover:text-white transition-colors'
      default:
        return 'px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm hover:bg-accent-primary hover:text-white transition-colors'
    }
  }

  const getIconSize = () => {
    return variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'
  }

  return (
    <div className={getCardStyles()} onClick={handleClick}>
      {/* ヘッダー部分 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={getTitleStyles()}>
            {entry.title || '無題の日記'}
          </h3>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <div className="flex items-center gap-1">
              <Calendar className={getIconSize()} />
              {formatDate(entry.recorded_at)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className={getIconSize()} />
              {formatTime(entry.recorded_at)}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>

      {/* 処理状況 */}
      {showProcessingStatus && (
        <div className={getStatusStyles()}>
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
      )}

      {/* 内容プレビュー */}
      {entry.transcription && (
        <div className={variant === 'compact' ? 'mb-2' : 'mb-3'}>
          <p className="text-text-secondary text-sm line-clamp-2">
            {entry.transcription}
          </p>
        </div>
      )}

      {/* タグ */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className={`${getIconSize()} text-text-muted`} />
          {entry.tags.slice(0, maxTags).map((tag, index) => (
            <button
              key={index}
              onClick={(e) => handleTagClick(e, tag)}
              className={getTagStyles()}
            >
              {tag}
            </button>
          ))}
          {entry.tags.length > maxTags && (
            <span className="text-sm text-text-muted">
              +{entry.tags.length - maxTags}個
            </span>
          )}
        </div>
      )}
    </div>
  )
}