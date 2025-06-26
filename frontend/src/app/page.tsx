'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RecordingInterface } from '@/components/RecordingInterface'
import { api } from '@/lib/api'

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

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
      
      // 作成された日記の詳細画面に移動
      router.push(`/diary/${uploadResult.entry_id}`)
      
      // モック用: 2秒後に文字起こし結果を取得
      setTimeout(async () => {
        try {
          const transcription = await api.getTranscriptionResult(transcribeResult.task_id)
          console.log('文字起こし完了:', transcription)
          
          // 要約処理開始
          if (transcription.transcription) {
            const summaryResult = await api.startSummarization(transcription.transcription, uploadResult.entry_id)
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
  }, [router])

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
          onClick={() => router.push('/diary')}
          className="px-6 py-2 bg-bg-secondary text-text-primary border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          過去の日記を見る
        </button>
        
        {isProcessing && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4">
            <p className="text-accent-primary">
              音声を処理中です。日記詳細ページで進捗を確認できます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}