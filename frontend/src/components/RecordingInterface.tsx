'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, MessageSquare } from 'lucide-react'
import '../types/speech-recognition'
import { useFlashMessage } from './FlashMessage'

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
  const [realtimeText, setRealtimeText] = useState('')
  const [isListening, setIsListening] = useState(false)

  const { showError, showWarning, FlashMessageContainer } = useFlashMessage()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recordingTimeRef = useRef<number>(0)

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

        // 録音時間が10秒未満の場合は保存しない
        if (recordingTimeRef.current < 10) {
          showError(
            '録音時間が短すぎます。10秒以上録音してください。',
            '録音時間不足'
          )
          setRecordingState('idle')
          setRecordingTime(0)
          recordingTimeRef.current = 0
          return
        }

        onRecordingComplete?.(audioBlob)
        setRecordingState('idle')
        setRecordingTime(0)
        recordingTimeRef.current = 0
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecordingState('recording')

      // Web Speech API開始
      startSpeechRecognition()

      // タイマー開始
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          recordingTimeRef.current = newTime
          if (newTime >= 600) { // 10分制限
            stopRecording()
            return newTime
          }
          return newTime
        })
      }, 1000)

    } catch (error) {
      console.error('録音開始エラー:', error)
      showError(
        'マイクにアクセスできませんでした。ブラウザの設定を確認してください。',
        'マイクアクセスエラー'
      )
    }
  }, [onRecordingComplete, startSpeechRecognition])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')

      // Web Speech API停止
      stopSpeechRecognition()

      if (timerRef.current) {
        clearInterval(timerRef.current)
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
          const newTime = prev + 1
          recordingTimeRef.current = newTime
          if (newTime >= 600) {
            stopRecording()
            return newTime
          }
          return newTime
        })
      }, 1000)
    }
  }, [recordingState, startSpeechRecognition])

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

  const renderRecordingStatus = () => {
    return (
      <div className="flex items-center justify-center h-24 w-full bg-bg-tertiary rounded-lg mb-6 p-4 border border-border">
        <div className="text-center">
          {recordingState === 'idle' && (
            <div className="text-text-muted text-sm">
              録音ボタンを押して開始
            </div>
          )}
          {recordingState === 'recording' && (
            <div className="text-center">
              <div className="w-4 h-4 bg-recording rounded-full animate-pulse mx-auto mb-2"></div>
              <div className="text-recording text-sm font-medium">録音中...</div>
            </div>
          )}
          {recordingState === 'paused' && (
            <div className="text-center">
              <div className="w-4 h-4 bg-warning rounded-full mx-auto mb-2"></div>
              <div className="text-warning text-sm font-medium">一時停止中</div>
            </div>
          )}
          {recordingState === 'processing' && (
            <div className="text-center">
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-accent-primary text-sm font-medium">処理中...</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <FlashMessageContainer />
      <div className="bg-bg-secondary rounded-2xl p-8 shadow-lg border border-border">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            音声録音
          </h2>

          {/* リアルタイム文字起こし表示 */}
          {enableRealtimeTranscription && (
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

          {/* 追加情報表示 */}
          <div className="text-sm text-text-muted">
            {recordingState === 'idle' && (
              <div className="text-center">
                <span>最低10秒、最大10分まで録音可能</span>
              </div>
            )}
            {recordingState === 'recording' && (
              <div className="flex flex-col items-center gap-1">
                <span className={recordingTime < 10 ? "text-warning" : ""}>
                  {recordingTime < 10 ? `あと${10 - recordingTime}秒で保存可能` : '最大10分まで録音可能'}
                </span>
                {enableRealtimeTranscription && (
                  <span className="text-xs">
                    {isListening ? '🎤 音声認識中' : '🔇 音声認識待機中'}
                  </span>
                )}
              </div>
            )}
          </div>

          {recordingTime >= 600 && (
            <div className="mt-2 text-sm text-warning">
              最大録音時間に達しました
            </div>
          )}
        </div>
      </div>
    </>
  )
}