'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Tag, Calendar, FileText, MessageSquare, Trash2 } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'
import { TagSelector } from './TagSelector'

interface DiaryDetailProps {
  entry: DiaryEntry
  onBack: () => void
  onUpdate: (updatedEntry: DiaryEntry) => void
}

export const DiaryDetail: React.FC<DiaryDetailProps> = ({ entry, onBack, onUpdate }) => {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry>(entry)
  const [editedEntry, setEditedEntry] = useState<Partial<DiaryEntry>>({
    title: entry.title,
    transcription: entry.transcription,
    summary: entry.summary,
    tags: entry.tags || [],
  })
  const [hasChanges, setHasChanges] = useState(false)

  // 処理中の場合は定期的に更新
  useEffect(() => {
    const isProcessing = currentEntry.transcription_status === 'processing' || currentEntry.summary_status === 'processing'
    
    if (isProcessing) {
      const interval = setInterval(async () => {
        try {
          const updatedEntry = await api.getDiaryEntry(currentEntry.id)
          setCurrentEntry(updatedEntry)
          onUpdate(updatedEntry)
        } catch (error) {
          console.error('エントリ更新エラー:', error)
        }
      }, 3000) // 3秒ごとに更新
      
      return () => clearInterval(interval)
    }
  }, [currentEntry.transcription_status, currentEntry.summary_status, currentEntry.id, onUpdate])

  // propsのentryが変更されたら現在のentryを更新
  useEffect(() => {
    setCurrentEntry(entry)
    setEditedEntry({
      title: entry.title,
      transcription: entry.transcription,
      summary: entry.summary,
      tags: entry.tags || [],
    })
  }, [entry])

  // 変更を監視
  useEffect(() => {
    const hasChanged = 
      editedEntry.title !== currentEntry.title ||
      editedEntry.transcription !== currentEntry.transcription ||
      editedEntry.summary !== currentEntry.summary ||
      JSON.stringify(editedEntry.tags) !== JSON.stringify(currentEntry.tags)
    
    setHasChanges(hasChanged)
  }, [editedEntry, currentEntry])

  // デバウンス付き自動保存
  useEffect(() => {
    if (!hasChanges) return

    const timeoutId = setTimeout(async () => {
      try {
        setSaving(true)
        const updatedEntry = await api.updateDiaryEntry(currentEntry.id, editedEntry)
        setCurrentEntry(updatedEntry)
        onUpdate(updatedEntry)
        setHasChanges(false)
      } catch (error) {
        console.error('自動保存エラー:', error)
      } finally {
        setSaving(false)
      }
    }, 1500) // 1.5秒後に保存

    return () => clearTimeout(timeoutId)
  }, [editedEntry, hasChanges, currentEntry.id, onUpdate])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10'
      case 'processing':
        return 'text-warning bg-warning/10'
      case 'failed':
        return 'text-error bg-error/10'
      default:
        return 'text-text-muted bg-bg-tertiary'
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

  const handleManualSave = async () => {
    if (!hasChanges) return
    
    try {
      setSaving(true)
      const updatedEntry = await api.updateDiaryEntry(currentEntry.id, editedEntry)
      setCurrentEntry(updatedEntry)
      onUpdate(updatedEntry)
      setHasChanges(false)
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleTagClick = (tagName: string) => {
    router.push(`/tags/${encodeURIComponent(tagName)}`)
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await api.deleteDiaryEntry(currentEntry.id)
      setShowDeleteModal(false)
      onBack() // 削除後は一覧に戻る
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }


  return (
    <div className="max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>
        
        <div className="flex items-center gap-2">
          {/* 保存状態表示 */}
          {saving && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
              保存中...
            </div>
          )}
          {hasChanges && !saving && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              未保存の変更あり
            </div>
          )}
          
          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={handleManualSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                今すぐ保存
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* タイトル */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <input
            type="text"
            value={editedEntry.title || ''}
            onChange={(e) => setEditedEntry(prev => ({ ...prev, title: e.target.value }))}
            placeholder="日記のタイトルを入力..."
            className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-text-primary placeholder-text-muted focus:ring-2 focus:ring-accent-primary/20 rounded px-2 py-1 -mx-2 -my-1"
          />
          
          <div className="flex items-center gap-3 mt-3 text-sm text-text-muted">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDateTime(currentEntry.recorded_at)}
            </div>
          </div>
        </div>

        {/* 処理状況 */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <h2 className="text-base font-semibold text-text-primary mb-3">処理状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-text-muted" />
              <span className="text-text-secondary">文字起こし:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(currentEntry.transcription_status)}`}>
                {getStatusText(currentEntry.transcription_status)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-text-muted" />
              <span className="text-text-secondary">要約:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(currentEntry.summary_status)}`}>
                {getStatusText(currentEntry.summary_status)}
              </span>
            </div>
          </div>
        </div>

        {/* 文字起こし */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <h2 className="text-base font-semibold text-text-primary mb-3">文字起こし</h2>
          <textarea
            value={editedEntry.transcription || ''}
            onChange={(e) => setEditedEntry(prev => ({ ...prev, transcription: e.target.value }))}
            placeholder={
              currentEntry.transcription_status === 'processing' 
                ? '文字起こし処理中...' 
                : '文字起こし結果がここに表示されます...'
            }
            className="w-full h-40 bg-bg-tertiary border border-border rounded-lg p-4 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
            disabled={currentEntry.transcription_status === 'processing'}
          />
        </div>

        {/* 要約 */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <h2 className="text-base font-semibold text-text-primary mb-3">要約</h2>
          <textarea
            value={editedEntry.summary || ''}
            onChange={(e) => setEditedEntry(prev => ({ ...prev, summary: e.target.value }))}
            placeholder={
              currentEntry.summary_status === 'processing' 
                ? '要約処理中...' 
                : '要約がここに表示されます...'
            }
            className="w-full h-32 bg-bg-tertiary border border-border rounded-lg p-4 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
            disabled={currentEntry.summary_status === 'processing'}
          />
        </div>

        {/* タグ */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-text-muted" />
            <h2 className="text-base font-semibold text-text-primary">タグ</h2>
          </div>
          
          <TagSelector
            selectedTags={editedEntry.tags || []}
            onTagsChange={(tags) => setEditedEntry(prev => ({ ...prev, tags }))}
            showClickableView={true}
            onTagClick={handleTagClick}
          />
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-xl p-6 max-w-md w-full border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              日記を削除しますか？
            </h3>
            <p className="text-text-secondary mb-6">
              「{currentEntry.title || '無題の日記'}」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}