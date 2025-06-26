'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DiaryDetail } from '@/components/DiaryDetail'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'

export default function DiaryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const entryId = params.id as string

  useEffect(() => {
    const loadEntry = async () => {
      try {
        setLoading(true)
        const data = await api.getDiaryEntry(entryId)
        setEntry(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '日記の読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (entryId) {
      loadEntry()
    }
  }, [entryId])

  const handleBack = useCallback(() => {
    router.push('/diary')
  }, [router])

  const handleUpdate = useCallback((updatedEntry: DiaryEntry) => {
    setEntry(updatedEntry)
  }, [])

  const handleNewRecording = useCallback(() => {
    router.push('/')
  }, [router])

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
            onClick={handleBack}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
          >
            日記一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">日記が見つかりません</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
        >
          日記一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <DiaryDetail
      entry={entry}
      onBack={handleBack}
      onUpdate={handleUpdate}
      onNewRecording={handleNewRecording}
    />
  )
}