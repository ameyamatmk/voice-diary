'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DiaryList } from '@/components/DiaryList'
import { DiaryEntry } from '@/types'

export default function DiaryListPage() {
  const router = useRouter()

  const handleEntrySelect = useCallback((entry: DiaryEntry) => {
    router.push(`/diary/${entry.id}`)
  }, [router])

  const handleBackToRecording = useCallback(() => {
    router.push('/')
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToRecording}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
        >
          新しい録音
        </button>
      </div>
      <DiaryList onEntrySelect={handleEntrySelect} />
    </div>
  )
}