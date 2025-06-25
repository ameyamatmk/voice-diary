'use client'

import React, { useState, useCallback } from 'react'
import { RecordingInterface } from '@/components/RecordingInterface'
import { DiaryList } from '@/components/DiaryList'
import { DiaryDetail } from '@/components/DiaryDetail'
import { DiaryEntry } from '@/types'
import { api } from '@/lib/api'

type ViewMode = 'recording' | 'list' | 'detail'

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('recording')
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    console.log('録音完了:', audioBlob)
    setIsProcessing(true)
    
    try {
      // 音声アップロード
      const uploadResult = await api.uploadAudio(audioBlob)
      console.log('アップロード成功:', uploadResult)
      
      // 文字起こし開始
      const transcribeResult = await api.startTranscription(uploadResult.file_id)
      console.log('文字起こし開始:', transcribeResult)
      
      // 日記一覧画面に移動
      setViewMode('list')
      
      // モック用: 2秒後に文字起こし結果を取得
      setTimeout(async () => {
        try {
          const transcription = await api.getTranscriptionResult(transcribeResult.task_id)
          console.log('文字起こし完了:', transcription)
          
          // 要約処理開始
          if (transcription.transcription) {
            const summaryResult = await api.startSummarization(transcription.transcription)
            console.log('要約開始:', summaryResult)
            
            // さらに2秒後に要約結果を取得
            setTimeout(async () => {
              try {
                const summary = await api.getSummaryResult(summaryResult.task_id)
                console.log('要約完了:', summary)
              } catch (error) {
                console.error('要約取得エラー:', error)
              }
            }, 2000)
          }
        } catch (error) {
          console.error('文字起こし取得エラー:', error)
        }
      }, 2000)
      
    } catch (error) {
      console.error('処理エラー:', error)
      alert('音声ファイルの処理中にエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleEntrySelect = useCallback((entry: DiaryEntry) => {
    setSelectedEntry(entry)
    setViewMode('detail')
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedEntry(null)
    setViewMode('list')
  }, [])

  const handleBackToRecording = useCallback(() => {
    setSelectedEntry(null)
    setViewMode('recording')
  }, [])

  const handleEntryUpdate = useCallback((updatedEntry: DiaryEntry) => {
    setSelectedEntry(updatedEntry)
  }, [])

  if (viewMode === 'detail' && selectedEntry) {
    return (
      <DiaryDetail
        entry={selectedEntry}
        onBack={handleBackToList}
        onUpdate={handleEntryUpdate}
      />
    )
  }

  if (viewMode === 'list') {
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4">
          音声日記を始めましょう
        </h2>
        <p className="text-text-secondary">
          録音ボタンを押して、今日の出来事を音声で記録してください。
        </p>
      </div>
      
      <RecordingInterface 
        onRecordingComplete={handleRecordingComplete}
        disabled={isProcessing}
      />
      
      <div className="text-center space-y-4">
        <p className="text-text-muted text-sm">
          録音した音声は自動的に文字起こしされ、要約が生成されます。
        </p>
        
        <button
          onClick={() => setViewMode('list')}
          className="px-6 py-2 bg-bg-secondary text-text-primary border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          過去の日記を見る
        </button>
        
        {isProcessing && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4">
            <p className="text-accent-primary">
              音声を処理中です。日記一覧で進捗を確認できます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}