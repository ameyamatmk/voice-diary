import React, { useState, useRef, useCallback } from 'react'
import { Mic, Square, Play, Pause, Volume2 } from 'lucide-react'

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing'

interface RecordingInterfaceProps {
  onRecordingComplete?: (audioBlob: Blob) => void
}

export const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
  onRecordingComplete
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      streamRef.current = stream
      
      // 音声レベル表示用のAudioContext設定
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      
      // MediaRecorder設定
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        onRecordingComplete?.(audioBlob)
        setRecordingState('idle')
        setRecordingTime(0)
        setAudioLevel(0)
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecordingState('recording')
      
      // タイマー開始
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 600) { // 10分制限
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
      
      // 音声レベル監視開始
      updateAudioLevel()
      
    } catch (error) {
      console.error('録音開始エラー:', error)
      alert('マイクにアクセスできませんでした。ブラウザの設定を確認してください。')
    }
  }, [onRecordingComplete])

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    setAudioLevel(average / 255) // 0-1の範囲に正規化
    
    if (recordingState === 'recording') {
      animationRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [recordingState])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [recordingState])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      
      // タイマー再開
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 600) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
      
      // 音声レベル監視再開
      updateAudioLevel()
    }
  }, [recordingState, updateAudioLevel])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setRecordingState('processing')
    }
    
    // リソースクリーンアップ
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }, [])

  const getRecordingButtonStyle = () => {
    switch (recordingState) {
      case 'recording':
        return 'bg-recording animate-recording-pulse shadow-lg hover:bg-recording'
      case 'paused':
        return 'bg-warning hover:bg-warning/80'
      case 'processing':
        return 'bg-accent-primary animate-spin cursor-not-allowed'
      default:
        return 'bg-accent-primary hover:bg-accent-secondary'
    }
  }

  const getRecordingButtonIcon = () => {
    switch (recordingState) {
      case 'recording':
        return <Square className="w-6 h-6" />
      case 'paused':
        return <Play className="w-6 h-6" />
      case 'processing':
        return <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
      default:
        return <Mic className="w-6 h-6" />
    }
  }

  const renderAudioLevelBars = () => {
    const bars = Array.from({ length: 20 }, (_, i) => {
      const intensity = Math.max(0, audioLevel - (i * 0.05))
      const height = intensity > 0 ? Math.min(100, intensity * 100) : 8
      
      return (
        <div
          key={i}
          className="w-2 bg-success rounded-full transition-all duration-75"
          style={{ height: `${height}%` }}
        />
      )
    })
    
    return (
      <div className="flex items-end justify-center gap-1 h-24 w-full bg-bg-tertiary rounded-lg mb-6 p-4">
        {recordingState === 'recording' ? bars : (
          <div className="text-text-muted text-sm">音声レベル表示</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-2xl p-8 shadow-lg border border-border">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          音声録音
        </h2>
        
        {/* 音声レベル表示 */}
        {renderAudioLevelBars()}
        
        {/* 録音時間 */}
        <div className="text-3xl font-mono text-text-primary mb-6">
          {formatTime(recordingTime)}
        </div>
        
        {/* 録音制御ボタン */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={
              recordingState === 'idle' ? startRecording :
              recordingState === 'recording' ? stopRecording :
              recordingState === 'paused' ? resumeRecording :
              undefined
            }
            disabled={recordingState === 'processing'}
            className={`
              w-16 h-16 rounded-full text-white font-semibold
              touch-target focus-visible transition-all duration-200
              ${getRecordingButtonStyle()}
            `}
          >
            {getRecordingButtonIcon()}
          </button>
          
          {recordingState === 'recording' && (
            <button
              onClick={pauseRecording}
              className="w-12 h-12 rounded-full bg-bg-tertiary text-text-primary hover:bg-border touch-target focus-visible transition-all duration-200"
            >
              <Pause className="w-5 h-5 mx-auto" />
            </button>
          )}
        </div>
        
        {/* 状態表示 */}
        <div className="text-sm text-text-muted">
          {recordingState === 'idle' && '録音ボタンを押して開始'}
          {recordingState === 'recording' && '録音中... (最大10分)'}
          {recordingState === 'paused' && '一時停止中'}
          {recordingState === 'processing' && '処理中...'}
        </div>
        
        {recordingTime >= 600 && (
          <div className="mt-2 text-sm text-warning">
            最大録音時間に達しました
          </div>
        )}
      </div>
    </div>
  )
}