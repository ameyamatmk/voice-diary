'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Edit2, Save, X, Tag, Calendar, Clock, FileText, MessageSquare, Mic } from 'lucide-react'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'

interface DiaryDetailProps {
  entry: DiaryEntry
  onBack: () => void
  onUpdate: (updatedEntry: DiaryEntry) => void
  onNewRecording?: () => void
}

export const DiaryDetail: React.FC<DiaryDetailProps> = ({ entry, onBack, onUpdate, onNewRecording }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry>(entry)
  const [editedEntry, setEditedEntry] = useState<Partial<DiaryEntry>>({
    title: entry.title,
    transcription: entry.transcription,
    summary: entry.summary,
    tags: entry.tags || [],
  })

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
  }, [entry])

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

  const handleSave = async () => {
    try {
      setSaving(true)
      const updatedEntry = await api.updateDiaryEntry(currentEntry.id, editedEntry)
      onUpdate(updatedEntry)
      setIsEditing(false)
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedEntry({
      title: currentEntry.title,
      transcription: currentEntry.transcription,
      summary: currentEntry.summary,
      tags: currentEntry.tags || [],
    })
    setIsEditing(false)
  }

  const addTag = () => {
    if (tagInput.trim() && !editedEntry.tags?.includes(tagInput.trim())) {
      setEditedEntry(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditedEntry(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>
        
        <div className="flex gap-2">
          {!isEditing && onNewRecording && (
            <button
              onClick={onNewRecording}
              className="flex items-center gap-2 px-4 py-2 bg-recording text-white rounded-lg hover:bg-recording/90 transition-colors"
            >
              <Mic className="w-4 h-4" />
              新しい録音
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              編集
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* タイトル */}
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          {isEditing ? (
            <input
              type="text"
              value={editedEntry.title || ''}
              onChange={(e) => setEditedEntry(prev => ({ ...prev, title: e.target.value }))}
              placeholder="日記のタイトルを入力..."
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-text-primary placeholder-text-muted"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-text-primary">
              {currentEntry.title || '無題の日記'}
            </h1>
          )}
          
          <div className="flex items-center gap-4 mt-4 text-sm text-text-muted">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDateTime(currentEntry.recorded_at)}
            </div>
          </div>
        </div>

        {/* 処理状況 */}
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">処理状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">文字起こし</h2>
          {isEditing ? (
            <textarea
              value={editedEntry.transcription || ''}
              onChange={(e) => setEditedEntry(prev => ({ ...prev, transcription: e.target.value }))}
              placeholder="文字起こし結果がここに表示されます..."
              className="w-full h-40 bg-bg-tertiary border border-border rounded-lg p-4 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          ) : (
            <div className="bg-bg-tertiary rounded-lg p-4">
              {currentEntry.transcription ? (
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
                  {currentEntry.transcription}
                </p>
              ) : (
                <p className="text-text-muted italic">
                  {currentEntry.transcription_status === 'processing' ? '文字起こし処理中...' : '文字起こし結果がありません'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 要約 */}
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">要約</h2>
          {isEditing ? (
            <textarea
              value={editedEntry.summary || ''}
              onChange={(e) => setEditedEntry(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="要約がここに表示されます..."
              className="w-full h-32 bg-bg-tertiary border border-border rounded-lg p-4 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          ) : (
            <div className="bg-bg-tertiary rounded-lg p-4">
              {currentEntry.summary ? (
                <p className="text-text-primary leading-relaxed">
                  {currentEntry.summary}
                </p>
              ) : (
                <p className="text-text-muted italic">
                  {currentEntry.summary_status === 'processing' ? '要約処理中...' : '要約がありません'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* タグ */}
        <div className="bg-bg-secondary rounded-xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text-primary">タグ</h2>
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="タグを入力してEnter..."
                  className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedEntry.tags?.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-error transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentEntry.tags && currentEntry.tags.length > 0 ? (
                currentEntry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-text-muted italic">タグがありません</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}