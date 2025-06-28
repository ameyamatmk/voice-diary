'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, MessageSquare } from 'lucide-react'
import '../types/speech-recognition'

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing'

interface RecordingInterfaceProps {
  onRecordingComplete?: (audioBlob: Blob) => void
  disabled?: boolean
  enableRealtimeTranscription?: boolean
}

export const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
  onRecordingComplete,
  disabled = false,
  enableRealtimeTranscription = true
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [realtimeText, setRealtimeText] = useState('')
  const [isListening, setIsListening] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Web Speech APIの初期化
  useEffect(() => {
    if (!enableRealtimeTranscription) return
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'ja-JP'
      
      recognition.onstart = () => {
        setIsListening(true)
      }
      
      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        // 確定テキスト + 仮確定テキストを表示
        setRealtimeText(prev => {
          const lines = prev.split('\n')
          const lastLine = lines[lines.length - 1]
          
          if (finalTranscript) {
            // 確定テキストがある場合は追加
            return prev + finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')
          } else {
            // 仮確定テキストのみの場合は最終行を更新
            const baseText = lines.slice(0, -1).join('\n')
            return baseText + (baseText ? '\n' : '') + interimTranscript
          }
        })
      }
      
      recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      recognitionRef.current = recognition
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [enableRealtimeTranscription])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const startSpeechRecognition = useCallback(() => {
    if (enableRealtimeTranscription && recognitionRef.current && !isListening) {
      setRealtimeText('')
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.log('Speech recognition start error:', error)
      }
    }
  }, [enableRealtimeTranscription, isListening])

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setRealtimeText('')
    }
  }, [isListening])

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
      
      // Web Speech API開始
      startSpeechRecognition()
      
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
  }, [onRecordingComplete, startSpeechRecognition])

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteTimeDomainData(dataArray)
    
    // RMS (Root Mean Square) 計算でより正確な音声レベルを取得
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128 // -1から1の範囲に正規化
      sum += sample * sample
    }
    const rms = Math.sqrt(sum / bufferLength)
    
    // 音声レベルを0-1の範囲に調整（感度を上げる）
    const level = Math.min(rms * 5, 1)
    setAudioLevel(level)
    
    if (recordingState === 'recording') {
      animationRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [recordingState])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      
      // Web Speech API停止
      stopSpeechRecognition()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [recordingState, stopSpeechRecognition])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      
      // Web Speech API再開
      startSpeechRecognition()
      
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
  }, [recordingState, updateAudioLevel, startSpeechRecognition])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setRecordingState('processing')
    }
    
    // Web Speech API停止・クリア
    stopSpeechRecognition()
    
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
  }, [stopSpeechRecognition])

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
      const barThreshold = i / 20 // 0から1の範囲
      const isActive = audioLevel > barThreshold
      const height = isActive ? Math.max(20, audioLevel * 80) : 10 // 最小20%, 最大80%
      
      return (
        <div
          key={i}
          className={`w-2 rounded-full transition-all duration-100 ${
            isActive ? 'bg-success' : 'bg-border'
          }`}
          style={{ height: `${height}%` }}
        />
      )
    })
    
    return (
      <div className="flex items-end justify-center gap-1 h-24 w-full bg-bg-tertiary rounded-lg mb-6 p-4">
        {recordingState === 'recording' ? bars : (
          <div className="text-text-muted text-sm flex items-center justify-center h-full">
            音声レベル表示
          </div>
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
        
        {/* リアルタイム文字起こし表示 */}
        {enableRealtimeTranscription && (recordingState === 'recording' || recordingState === 'paused') && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-muted">
                リアルタイム文字起こし
              </span>
              {isListening && (
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </div>
            <div className="bg-bg-primary rounded-lg p-4 min-h-[120px] max-h-[200px] overflow-y-auto text-left border border-border">
              {realtimeText ? (
                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {realtimeText}
                </p>
              ) : (
                <p className="text-text-muted text-sm italic text-center flex items-center justify-center h-full">
                  {isListening ? '音声を認識中...' : '文字起こし待機中'}
                </p>
              )}
            </div>
          </div>
        )}
        
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
            disabled={recordingState === 'processing' || disabled}
            className={`
              w-16 h-16 rounded-full text-white font-semibold
              flex items-center justify-center
              touch-target focus-visible transition-all duration-200
              ${getRecordingButtonStyle()}
            `}
          >
            {getRecordingButtonIcon()}
          </button>
          
          {recordingState === 'recording' && (
            <button
              onClick={pauseRecording}
              className="w-12 h-12 rounded-full bg-bg-tertiary text-text-primary hover:bg-border touch-target focus-visible transition-all duration-200 flex items-center justify-center"
            >
              <Pause className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* 状態表示 */}
        <div className="text-sm text-text-muted">
          {recordingState === 'idle' && '録音ボタンを押して開始'}
          {recordingState === 'recording' && (
            <div className="flex flex-col items-center gap-1">
              <span>録音中... (最大10分)</span>
              {enableRealtimeTranscription && (
                <span className="text-xs">
                  {isListening ? '🎤 音声認識中' : '🔇 音声認識待機中'}
                </span>
              )}
            </div>
          )}
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