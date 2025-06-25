'use client'

import { RecordingInterface } from '@/components/RecordingInterface'

export default function HomePage() {
  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log('録音完了:', audioBlob)
    // TODO: サーバーに音声ファイルをアップロード
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
      
      <RecordingInterface onRecordingComplete={handleRecordingComplete} />
      
      <div className="text-center text-text-muted text-sm">
        <p>録音した音声は自動的に文字起こしされ、要約が生成されます。</p>
      </div>
    </div>
  )
}