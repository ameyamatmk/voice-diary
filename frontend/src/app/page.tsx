'use client'

import { RecordingInterface } from '@/components/RecordingInterface'

export default function HomePage() {
  const handleRecordingComplete = async (audioBlob: Blob) => {
    console.log('録音完了:', audioBlob)
    
    try {
      // FormDataを作成してBlobを添付
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      
      // サーバーに音声ファイルをアップロード
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/audio/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`アップロードエラー: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('アップロード成功:', result)
      
      // 文字起こし処理を開始
      const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: result.file_id }),
      })
      
      if (transcribeResponse.ok) {
        const transcribeResult = await transcribeResponse.json()
        console.log('文字起こし開始:', transcribeResult)
        
        // TODO: 進捗確認とUI更新
        setTimeout(async () => {
          const finalResult = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transcribe/${transcribeResult.task_id}`)
          const transcription = await finalResult.json()
          console.log('文字起こし完了:', transcription)
        }, 2000) // 2秒後に結果取得（モック用）
      }
      
    } catch (error) {
      console.error('処理エラー:', error)
      alert('音声ファイルの処理中にエラーが発生しました')
    }
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